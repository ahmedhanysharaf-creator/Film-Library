/**
 * VLC Media Player Launcher Service
 * Generates clean, unencoded .m3u playlists that VLC Media Player opens instantly on Windows/Mac/Linux!
 */

export const getSecurityToken = () => {
  return localStorage.getItem("filmlibrary_security_token") || "FILM_LIBRARY_SECRET";
};

export const setSecurityToken = (token) => {
  localStorage.setItem("filmlibrary_security_token", token);
};

export const downloadWindowsRegistryFix = () => {};

export const copyPathToClipboard = (path, addToast) => {
  if (!path) return;
  let cleanPath = path;
  try {
    cleanPath = decodeURIComponent(path).replace(/\//g, "\\");
  } catch (e) {}

  navigator.clipboard.writeText(cleanPath).then(
    () => {
      if (addToast) addToast("Copied local file path to clipboard!", "info");
    },
    (err) => {}
  );
};

/**
 * Generate and trigger instant .m3u playlist download with subtitle track embed
 * Decodes URL-encoded paths (e.g. Marvel%20Series -> Marvel Series) so VLC opens real files on disk!
 */
export const downloadVlcM3uPlaylist = (path, title, subPath) => {
  if (!path) return;
  
  let cleanPath = path;
  try {
    cleanPath = decodeURIComponent(path).replace(/\//g, "\\");
  } catch (e) {
    cleanPath = path.replace(/\//g, "\\");
  }

  let cleanSub = "";
  if (subPath) {
    try {
      cleanSub = decodeURIComponent(subPath).replace(/\//g, "\\");
    } catch (e) {
      cleanSub = subPath.replace(/\//g, "\\");
    }
  }

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
 * Master 1-Click VLC Direct Launcher
 */
export const launchInVlc = (path, title, addToast, subPath = "") => {
  if (!path) {
    if (addToast) addToast("No local file path configured for this item.", "warning");
    return false;
  }

  // 1. Copy decoded clean path to clipboard
  copyPathToClipboard(path);

  // 2. Download clean .m3u playlist file for instant VLC opening
  downloadVlcM3uPlaylist(path, title, subPath);

  if (addToast) {
    const subMsg = subPath ? " with subtitle attached!" : "...";
    addToast(`Opening "${title || 'Media'}" in VLC Player (Playlist downloaded!)${subMsg}`, "success");
  }

  return true;
};
