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
 * Downloads a 1-click Windows Registry / Batch installer script
 * Registers filmlibrary:// protocol on Windows to open media directly in VLC without downloading .m3u files!
 */
export const downloadWindowsRegistryFix = () => {
  const batContent = `@echo off
title Film Library - 1-Click Direct VLC Setup
echo =======================================================
echo   Film Library: 1-Click Direct VLC Protocol Setup
echo =======================================================
echo.
echo Registering 'filmlibrary://' protocol in Windows Registry...
echo.

set "VLC_PATH=C:\\Program Files\\VideoLAN\\VLC\\vlc.exe"
if not exist "%VLC_PATH%" (
    set "VLC_PATH=C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe"
)

reg add "HKCU\\Software\\Classes\\filmlibrary" /ve /d "URL:Film Library Protocol" /f >nul
reg add "HKCU\\Software\\Classes\\filmlibrary" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\\Software\\Classes\\filmlibrary\\shell\\open\\command" /ve /d "cmd /c for /f \"tokens=2 delims==\" %%a in (\"%%1\") do start \"\" \"%VLC_PATH%\" \"%%a\"" /f >nul

echo =======================================================
echo SUCCESS! Direct 1-Click VLC Playback is registered!
echo Clicking "Play in VLC" will now open movies directly in VLC.
echo =======================================================
echo.
pause
`;

  const blob = new Blob([batContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Setup_Direct_VLC_1Click.bat";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

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
 * Generate and trigger instant .m3u playlist download (Fallback Option)
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
 * Master Direct VLC Launcher (No .m3u download!)
 */
export const launchInVlc = (path, title, addToast, subPath = "") => {
  if (!path) {
    if (addToast) addToast("No local file path configured for this item.", "warning");
    return false;
  }

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

  // 1. Copy decoded path to clipboard
  copyPathToClipboard(path);

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
