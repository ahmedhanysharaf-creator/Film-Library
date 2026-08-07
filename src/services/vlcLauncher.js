/**
 * VLC Media Player Launcher Service
 * Instant .m3u playlist launcher and Master Library Playlist exporter
 */

export const getSecurityToken = () => {
  return localStorage.getItem("filmlibrary_security_token") || "FILM_LIBRARY_SECRET";
};

export const setSecurityToken = (token) => {
  localStorage.setItem("filmlibrary_security_token", token);
};

export const downloadWindowsRegistryFix = () => {};

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
 * Generate and trigger instant .m3u playlist download with clean Windows path & subtitle track embed
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
 * Master Direct VLC Launcher via Instant .m3u Playlist
 */
export const launchInVlc = (path, title, addToast, subPath = "") => {
  if (!path) {
    if (addToast) addToast("No local file path configured for this item.", "warning");
    return false;
  }

  // 1. Copy decoded path to clipboard
  copyPathToClipboard(path);

  // 2. Generate & download clean .m3u playlist for instant VLC opening
  downloadVlcM3uPlaylist(path, title, subPath);

  if (addToast) {
    const subMsg = subPath ? " with subtitle attached!" : "...";
    addToast(`Opening "${title || 'Media'}" in VLC Player!${subMsg}`, "success");
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

    if (moviePath) {
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
      if (epKey === "default" || epKey === "movie") return;

      const pathVal =
        pathsMap[epKey] ||
        (typeof item.episodes?.[epKey] === "string"
          ? item.episodes[epKey]
          : item.episodes?.[epKey]?.path || item.episodes?.[epKey]?.localPath);

      const subVal =
        (typeof item.episodes?.[epKey] === "object" ? item.episodes[epKey]?.subPath : "") ||
        globalSub;

      if (pathVal) {
        result.push({
          title: `${item.title || "Series"} - ${epKey}`,
          path: pathVal,
          subPath: subVal || ""
        });
      }
    });

    // Fallback if series has a single default path configured
    if (result.length === 0) {
      const defaultSeriesPath = pathsMap.default || item.localPath || item.path || "";
      if (defaultSeriesPath) {
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
