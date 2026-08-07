/**
 * VLC Media Player Launcher Service
 * Direct 1-Click VLC playback using custom URI protocol (filmlibrary://)
 */

export const getSecurityToken = () => {
  return localStorage.getItem("filmlibrary_security_token") || "FILM_LIBRARY_SECRET";
};

export const setSecurityToken = (token) => {
  localStorage.setItem("filmlibrary_security_token", token);
};

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
 * Downloads a 1-click Windows Registry (.reg) installer script
 * Registers filmlibrary:// protocol on Windows to open media directly in VLC without downloading .m3u files!
 */
export const downloadWindowsRegistryFix = () => {
  const regContent = `Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary]
@="URL:Film Library Protocol"
"URL Protocol"=""

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell]

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell\\open]

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell\\open\\command]
@="powershell -windowstyle hidden -command \\"$u='%1'; $p=[System.Uri]::UnescapeDataString(($u -split 'path=')[1] -split '&'); if (Test-Path 'C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe') { start 'C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe' -ArgumentList ('\\\\\\\"' + $p + '\\\\\\\"') } else { start 'C:\\\\Program Files (x86)\\\\VideoLAN\\\\VLC\\\\vlc.exe' -ArgumentList ('\\\\\\\"' + $p + '\\\\\\\"') }\\""
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
 * Master Direct VLC Launcher (No .m3u download!)
 */
export const launchInVlc = (path, title, addToast, subPath = "") => {
  if (!path) {
    if (addToast) addToast("No local file path configured for this item.", "warning");
    return false;
  }

  const cleanPath = cleanLocalPath(path);
  const cleanSub = cleanLocalPath(subPath);

  // 1. Copy decoded path to clipboard
  copyPathToClipboard(cleanPath);

  // 2. Direct 1-Click Launch via URI Protocol scheme (No file download!)
  const token = getSecurityToken();
  const protocolUri = `filmlibrary://open?path=${encodeURIComponent(cleanPath)}${cleanSub ? `&sub=${encodeURIComponent(cleanSub)}` : ''}&token=${encodeURIComponent(token)}`;

  // Trigger direct protocol link launch
  window.location.href = protocolUri;

  if (addToast) {
    addToast(`Launching "${title || 'Media'}" directly in VLC...`, "success");
  }

  return true;
};
