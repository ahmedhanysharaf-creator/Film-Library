/**
 * VLC Media Player Launcher Service
 * Direct Automatic opening of existing local .m3u playlist files from your hard drive
 */

export const getSecurityToken = () => {
  return localStorage.getItem("filmlibrary_security_token") || "FILM_LIBRARY_SECRET";
};

export const setSecurityToken = (token) => {
  localStorage.setItem("filmlibrary_security_token", token);
};

export const getLocalPlaylistFolderPath = () => {
  return localStorage.getItem("filmlibrary_local_playlist_folder") || "C:\\Users\\Ahmed\\Downloads\\Film_Library_Playlists";
};

export const setLocalPlaylistFolderPath = (folderPath) => {
  if (folderPath) {
    localStorage.setItem("filmlibrary_local_playlist_folder", cleanLocalPath(folderPath));
  } else {
    localStorage.removeItem("filmlibrary_local_playlist_folder");
  }
};

const SUBTITLE_EXTENSIONS = [".srt", ".ass", ".vtt", ".sub"];
const isSubtitleFile = (p) => p && typeof p === "string" && SUBTITLE_EXTENSIONS.some((ext) => p.toLowerCase().endsWith(ext));

/**
 * Normalizes and decodes raw paths, removing file:///, %20, %27, etc.
 * Converts to a clean, native Windows file path (e.g. C:\Users\Ahmed\Movies\Film.mp4)
 */
export const cleanLocalPath = (rawPath) => {
  if (!rawPath) return "";
  let path = String(rawPath).trim();

  // Strip file:/// or file:// prefix
  path = path.replace(/^file:\/\/\/?/gi, "");

  // Iteratively decode URI components (%20 -> space, %27 -> ', etc.)
  try {
    let prev = "";
    while (path.includes("%") && path !== prev) {
      prev = path;
      path = decodeURIComponent(path);
    }
  } catch (e) {}

  // Convert forward slashes to Windows backslashes
  return path.replace(/\//g, "\\");
};

/**
 * Safely Base64 encodes UTF-8 path strings to prevent URL parsing errors
 */
export const encodePathB64 = (str) => {
  if (!str) return "";
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    return "";
  }
};

/**
 * Downloads a 1-click Windows Registry (.reg) installer script
 * Registers filmlibrary:// protocol on Windows to open existing local .m3u files in VLC automatically!
 */
export const downloadWindowsRegistryFix = () => {
  const regContent = `Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary]
@="URL:Film Library Protocol"
"URL Protocol"=""

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell]

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell\\open]

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell\\open\\command]
@="powershell -windowstyle hidden -command \\"$u='%1'; $fB64=[regex]::Match($u, 'f=([^&]+)').Groups[1].Value; if ($fB64) { $file=[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($fB64)); $vlc=if (Test-Path 'C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe') { 'C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe' } else { 'C:\\\\Program Files (x86)\\\\VideoLAN\\\\VLC\\\\vlc.exe' }; if (Test-Path -LiteralPath $file) { Start-Process $vlc -ArgumentList ('\\\\\\\"' + $file + '\\\\\\\"') } }\\""
`;

  const blob = new Blob([regContent], { type: "application/x-msregedit" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Register_1Click_VLC_Player.reg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const copyPathToClipboard = (path, addToast) => {
  if (!path) return;
  const cleanPath = cleanLocalPath(path);

  navigator.clipboard.writeText(cleanPath).then(
    () => {
      if (addToast) addToast("Copied local file path to clipboard!", "info");
    },
    (err) => {}
  );
};

/**
 * Generate and trigger instant .m3u playlist download (Fallback Option)
 */
export const downloadVlcM3uPlaylist = (path, title, subPath) => {
  if (!path) return;
  
  const cleanPath = cleanLocalPath(path);
  const cleanSub = cleanLocalPath(subPath);
  const cleanTitle = (title || "Media").replace(/[^a-zA-Z0-9_\-\s]/g, "");

  let m3uContent = `#EXTM3U\n`;
  if (cleanSub) {
    m3uContent += `#EXTVLCOPT:sub-file=${cleanSub}\n`;
    m3uContent += `#EXTVLCOPT:sub-track=0\n`;
  }
  m3uContent += `#EXTINF:-1,${cleanTitle}\n${cleanPath}\n`;

  const blob = new Blob([m3uContent], { type: "audio/x-mpegurl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${cleanTitle.replace(/\s+/g, "_")}_vlc.m3u`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Master Direct Automatic VLC Launcher (Opens existing local .m3u files from your hard drive!)
 */
export const launchInVlc = (path, title, addToast, subPath = "", itemType = "movie") => {
  if (!path) {
    if (addToast) addToast("No local file path configured for this item.", "warning");
    return false;
  }

  const cleanPath = cleanLocalPath(path);
  const cleanSub = cleanLocalPath(subPath);
  const cleanTitle = (title || "Media").replace(/[^a-zA-Z0-9_\-\s]/g, "");

  // 1. Copy clean path to clipboard
  copyPathToClipboard(cleanPath);

  // 2. Resolve local .m3u file path on disk
  const baseFolder = getLocalPlaylistFolderPath();
  const subFolder = itemType === "series" ? "Series" : "Movies";
  const m3uFilePath = `${baseFolder}\\${subFolder}\\${cleanTitle.replace(/\s+/g, "_")}.m3u`;

  // 3. Base64 encode full .m3u file path to prevent URL syntax errors
  const m3uB64 = encodePathB64(m3uFilePath);

  // 4. Trigger filmlibrary:// protocol to open the existing .m3u file on disk in VLC
  const protocolUri = `filmlibrary://playm3u?f=${encodeURIComponent(m3uB64)}`;
  window.location.href = protocolUri;

  if (addToast) {
    addToast(`Opening "${cleanTitle}" from your local M3U playlist folder in VLC!`, "success");
  }

  return true;
};

/**
 * Resolves local file paths and subtitles for movies and series episodes across all schema structures
 */
export const getItemPathsAndSubtitles = (item, currentUserUid = "") => {
  const result = [];
  if (!item) return result;

  // Find userPathObj matching currentUser, or fallback to first userPathObj in item.user_paths
  const userPathObj =
    (item.user_paths || []).find((up) => currentUserUid && up.uid === currentUserUid) ||
    (item.user_paths || [])[0] ||
    {};

  const pathsMap = userPathObj.paths || item.paths || {};
  const globalSub = userPathObj.subPath || item.subPath || item.subtitle_path || "";

  if (item.type === "movie") {
    const moviePath =
      pathsMap.default ||
      pathsMap.movie ||
      item.localPath ||
      item.path ||
      item.local_path ||
      (typeof pathsMap === "object" ? Object.values(pathsMap)[0] : "") ||
      "";

    if (moviePath && !isSubtitleFile(moviePath)) {
      result.push({
        title: item.title || "Movie",
        path: moviePath,
        subPath: globalSub
      });
    }
  } else if (item.type === "series") {
    const allEpKeys = new Set([
      ...Object.keys(pathsMap),
      ...Object.keys(item.episodes || {})
    ]);

    allEpKeys.forEach((epKey) => {
      if (epKey === "subtitle" || epKey.endsWith("_sub")) return;

      const pathVal =
        pathsMap[epKey] ||
        (typeof item.episodes?.[epKey] === "string"
          ? item.episodes[epKey]
          : item.episodes?.[epKey]?.path || item.episodes?.[epKey]?.localPath);

      if (pathVal && typeof pathVal === "string" && !isSubtitleFile(pathVal)) {
        const subVal =
          (typeof item.episodes?.[epKey] === "object" ? item.episodes[epKey]?.subPath : "") ||
          pathsMap[`${epKey}_sub`] ||
          globalSub;

        const epTitle = epKey === "default" ? (item.title || "Series") : `${item.title || "Series"} - ${epKey}`;

        result.push({
          title: epTitle,
          path: pathVal,
          subPath: subVal || ""
        });
      }
    });

    // Fallback if series has a single default path configured
    if (result.length === 0) {
      const defaultSeriesPath = pathsMap.default || item.localPath || item.path || "";
      if (defaultSeriesPath && !isSubtitleFile(defaultSeriesPath)) {
        result.push({
          title: item.title || "Series",
          path: defaultSeriesPath,
          subPath: globalSub
        });
      }
    }
  }

  return result;
};

/**
 * Generates and downloads a Master .m3u playlist containing ALL movies & TV series episodes in the library
 */
export const exportMasterM3uPlaylist = (mediaItems, addToast, currentUserUid = "") => {
  if (!mediaItems || mediaItems.length === 0) {
    if (addToast) addToast("No items found in your library to export.", "warning");
    return;
  }

  let m3uContent = `#EXTM3U\n`;
  let itemCounter = 0;

  mediaItems.forEach((item) => {
    const entries = getItemPathsAndSubtitles(item, currentUserUid);
    entries.forEach((entry) => {
      const cleanPath = cleanLocalPath(entry.path);
      const cleanSub = cleanLocalPath(entry.subPath);
      const cleanTitle = (entry.title || "Media").replace(/[^a-zA-Z0-9_\-\s]/g, "");

      if (cleanSub) {
        m3uContent += `#EXTVLCOPT:sub-file=${cleanSub}\n`;
        m3uContent += `#EXTVLCOPT:sub-track=0\n`;
      }
      m3uContent += `#EXTINF:-1,${cleanTitle}\n${cleanPath}\n\n`;
      itemCounter++;
    });
  });

  if (itemCounter === 0) {
    if (addToast) addToast("No local media paths configured in library items.", "warning");
    return;
  }

  const blob = new Blob([m3uContent], { type: "audio/x-mpegurl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Film_Library_Master_Playlist.m3u";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (addToast) {
    addToast(`Exported Master VLC Playlist with ${itemCounter} media entries!`, "success");
  }
};
