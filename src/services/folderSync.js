import JSZip from "jszip";
import { cleanLocalPath, getItemPathsAndSubtitles } from "./vlcLauncher";

const DB_NAME = "FilmLibrarySyncDB";
const STORE_NAME = "handles";
const HANDLE_KEY = "playlist_dir_handle";

// Open IndexedDB for persisting DirectoryHandle across browser restarts
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getStoredDirectoryHandle = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

export const saveDirectoryHandle = async (handle) => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(handle, HANDLE_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
};

export const clearStoredDirectoryHandle = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(HANDLE_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) { }
};

/**
 * Connects a local PC folder via HTML5 File System Access API
 */
export const connectLocalPlaylistFolder = async (addToast) => {
  if (!("showDirectoryPicker" in window)) {
    if (addToast) addToast("Directory Picker not supported in this browser. Use ZIP Export option instead.", "warning");
    return null;
  }

  try {
    const dirHandle = await window.showDirectoryPicker({
      id: "filmlibrary_playlists",
      mode: "readwrite",
      startIn: "documents"
    });

    await saveDirectoryHandle(dirHandle);
    if (addToast) addToast(`Connected local folder: "${dirHandle.name}". Playlist auto-sync active!`, "success");
    return dirHandle;
  } catch (err) {
    if (err.name !== "AbortError" && addToast) {
      addToast(`Folder connection failed: ${err.message}`, "error");
    }
    return null;
  }
};

/**
 * Helper to write a file into a DirectoryHandle
 */
const writeFileToDir = async (dirHandle, fileName, content) => {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  } catch (e) { }
};

/**
 * Syncs all library items as individual .m3u files into a connected local directory
 */
export const syncAllPlaylistsToFolder = async (items, dirHandle, addToast) => {
  if (!dirHandle || !items) return;

  try {
    // Verify permission
    const options = { mode: "readwrite" };
    if ((await dirHandle.queryPermission(options)) !== "granted") {
      if ((await dirHandle.requestPermission(options)) !== "granted") {
        if (addToast) addToast("Folder write permission denied.", "warning");
        return;
      }
    }

    // Create subfolders: Movies/ and Series/
    const moviesDir = await dirHandle.getDirectoryHandle("Movies", { create: true });
    const seriesDir = await dirHandle.getDirectoryHandle("Series", { create: true });

    let masterContent = `#EXTM3U\n`;
    let count = 0;

    items.forEach((item) => {
      const entries = getItemPathsAndSubtitles(item);
      if (entries.length === 0) return;

      const cleanTitle = (item.title || "Media").replace(/[^a-zA-Z0-9_\-\s]/g, "");
      let itemM3uContent = `#EXTM3U\n`;

      entries.forEach((entry) => {
        const cleanPath = cleanLocalPath(entry.path);
        const cleanSub = cleanLocalPath(entry.subPath);
        const entryTitle = (entry.title || cleanTitle).replace(/[^a-zA-Z0-9_\-\s]/g, "");

        if (cleanSub) {
          itemM3uContent += `#EXTVLCOPT:sub-file=${cleanSub}\n#EXTVLCOPT:sub-track=0\n`;
          masterContent += `#EXTVLCOPT:sub-file=${cleanSub}\n#EXTVLCOPT:sub-track=0\n`;
        }
        itemM3uContent += `#EXTINF:-1,${entryTitle}\n${cleanPath}\n\n`;
        masterContent += `#EXTINF:-1,${entryTitle}\n${cleanPath}\n\n`;
        count++;
      });

      const safeFileName = `${cleanTitle.replace(/\s+/g, "_")}.m3u`;
      if (item.type === "movie") {
        writeFileToDir(moviesDir, safeFileName, itemM3uContent);
      } else {
        writeFileToDir(seriesDir, safeFileName, itemM3uContent);
      }
    });

    // Write Master Playlist to folder root
    await writeFileToDir(dirHandle, "Master_Library_Playlist.m3u", masterContent);

    if (addToast) {
      addToast(`Synced ${items.length} media items (${count} entries) into "${dirHandle.name}"!`, "success");
    }
  } catch (err) {
    if (addToast) addToast(`Auto-sync error: ${err.message}`, "error");
  }
};

/**
 * Triggers auto-sync if a local folder handle is stored
 */
export const autoSyncIfConnected = async (items) => {
  const handle = await getStoredDirectoryHandle();
  if (handle) {
    await syncAllPlaylistsToFolder(items, handle, null);
  }
};

/**
 * Exports all movies and series as a structured ZIP archive containing individual .m3u files
 */
export const exportPlaylistsAsZip = async (items, addToast) => {
  if (!items || items.length === 0) {
    if (addToast) addToast("No media items found in library.", "warning");
    return;
  }

  const zip = new JSZip();
  const rootFolder = zip.folder("Film_Library_Playlists");
  const moviesFolder = rootFolder.folder("Movies");
  const seriesFolder = rootFolder.folder("Series");

  let masterContent = `#EXTM3U\n`;
  let count = 0;

  items.forEach((item) => {
    const entries = getItemPathsAndSubtitles(item);
    if (entries.length === 0) return;

    const cleanTitle = (item.title || "Media").replace(/[^a-zA-Z0-9_\-\s]/g, "");
    let itemM3uContent = `#EXTM3U\n`;

    entries.forEach((entry) => {
      const cleanPath = cleanLocalPath(entry.path);
      const cleanSub = cleanLocalPath(entry.subPath);
      const entryTitle = (entry.title || cleanTitle).replace(/[^a-zA-Z0-9_\-\s]/g, "");

      if (cleanSub) {
        itemM3uContent += `#EXTVLCOPT:sub-file=${cleanSub}\n#EXTVLCOPT:sub-track=0\n`;
        masterContent += `#EXTVLCOPT:sub-file=${cleanSub}\n#EXTVLCOPT:sub-track=0\n`;
      }
      itemM3uContent += `#EXTINF:-1,${entryTitle}\n${cleanPath}\n\n`;
      masterContent += `#EXTINF:-1,${entryTitle}\n${cleanPath}\n\n`;
      count++;
    });

    const safeFileName = `${cleanTitle.replace(/\s+/g, "_")}.m3u`;
    if (item.type === "movie") {
      moviesFolder.file(safeFileName, itemM3uContent);
    } else {
      seriesFolder.file(safeFileName, itemM3uContent);
    }
  });

  rootFolder.file("Master_Library_Playlist.m3u", masterContent);

  if (addToast) addToast("Packaging playlist folder into ZIP archive...", "info");

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Film_Library_Playlists.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (addToast) addToast(`Exported Playlist ZIP Folder with ${count} media files!`, "success");
};

/**
 * Searches a connected DirectoryHandle recursively for a media file matching targetPathOrTitle
 */
export const findMediaFileInDirectoryHandle = async (dirHandle, targetPathOrTitle) => {
  if (!dirHandle || !targetPathOrTitle) return null;

  const normalized = String(targetPathOrTitle).replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const targetFileName = parts.length > 0 ? parts[parts.length - 1].toLowerCase() : normalized.toLowerCase();

  const targetExtIdx = targetFileName.lastIndexOf(".");
  const targetBaseName = targetExtIdx !== -1 ? targetFileName.substring(0, targetExtIdx) : targetFileName;

  const queue = [dirHandle];
  let searched = 0;

  while (queue.length > 0 && searched < 400) {
    const currentDir = queue.shift();
    try {
      for await (const entry of currentDir.values()) {
        searched++;
        if (entry.kind === "file") {
          const entryNameLower = entry.name.toLowerCase();
          const entryExtIdx = entryNameLower.lastIndexOf(".");
          const entryBaseName = entryExtIdx !== -1 ? entryNameLower.substring(0, entryExtIdx) : entryNameLower;

          // Exact match or base name match
          if (entryNameLower === targetFileName || 
              (targetBaseName.length > 3 && (entryBaseName === targetBaseName || entryNameLower.includes(targetBaseName) || targetFileName.includes(entryBaseName)))) {
            const file = await entry.getFile();
            return file;
          }
        } else if (entry.kind === "directory") {
          // Avoid scanning unrelated system directories
          if (!["node_modules", ".git", "$recycle.bin", "system volume information"].includes(entry.name.toLowerCase())) {
            queue.push(entry);
          }
        }
      }
    } catch (e) {}
  }
  return null;
};

