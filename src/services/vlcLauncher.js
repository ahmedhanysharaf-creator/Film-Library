/**
 * VLC Media Player Launcher Service
 * Supports 3 Launch Modes:
 * 1. Direct Native Protocol (`filmlibrary://open?path=...`) with Windows cmd parser
 * 2. Standard VLC Protocol (`vlc://file:///...`)
 * 3. Instant Auto-Generated VLC Playlist Stream (`.m3u`)
 */

export const getSecurityToken = () => {
  return localStorage.getItem("filmlibrary_security_token") || "FILM_LIBRARY_SECRET_2026";
};

export const setSecurityToken = (token) => {
  localStorage.setItem("filmlibrary_security_token", token);
};

export const copyPathToClipboard = (path, addToast) => {
  if (!path) return;
  navigator.clipboard.writeText(path).then(
    () => {
      if (addToast) addToast("File path copied to clipboard! (Press Ctrl+V in VLC)", "success");
    },
    (err) => {
      console.error("Clipboard copy error:", err);
    }
  );
};

/**
 * Generate and trigger instant .m3u playlist download for 1-click VLC playback
 */
export const downloadVlcM3uPlaylist = (path, title) => {
  if (!path) return;
  const cleanTitle = (title || "Movie").replace(/[^a-zA-Z0-9_\-\s]/g, "");
  const normalizedPath = path.replace(/\//g, "\\");
  const m3uContent = `#EXTM3U\n#EXTINF:-1,${cleanTitle}\n${normalizedPath}\n`;
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
 * Generate and trigger downloadable .reg file
 * Uses native Windows cmd URL parser to strip protocol wrapper and pass exact local file path to VLC.exe!
 */
export const downloadWindowsRegistryFix = () => {
  const regContent = `Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary]
@="URL:Film Library Protocol"
"URL Protocol"=""

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell\\open\\command]
@="cmd.exe /c \\"for /f \\\"tokens=2 delims==\\\" %a in (\\\"%1\\\") do for /f \\\"tokens=1 delims=^&\\\" %b in (\\\"%a\\\") do start \\\"\\\" \\\"C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe\\\" \\\"%~b\\\"\\""

[HKEY_CURRENT_USER\\Software\\Classes\\vlc]
@="URL:VLC Protocol"
"URL Protocol"=""

[HKEY_CURRENT_USER\\Software\\Classes\\vlc\\shell\\open\\command]
@="cmd.exe /c \\"for /f \\\"tokens=2 delims==\\\" %a in (\\\"%1\\\") do for /f \\\"tokens=1 delims=^&\\\" %b in (\\\"%a\\\") do start \\\"\\\" \\\"C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe\\\" \\\"%~b\\\"\\""
`;

  const blob = new Blob([regContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Register-VLC-Protocol-CmdFix.reg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Master VLC Launcher
 */
export const launchInVlc = (path, title, addToast) => {
  if (!path) {
    if (addToast) addToast("No local file path configured for this item.", "warning");
    return false;
  }

  const token = getSecurityToken();
  const rawPath = path;
  const encodedPath = encodeURIComponent(path);
  const encodedToken = encodeURIComponent(token);
  
  // Protocol 1: Custom filmlibrary:// scheme with raw path parameter
  const customProtocolUrl = `filmlibrary://open?path=${rawPath}&token=${encodedToken}`;

  console.log(`[VLC Launcher] Triggering protocol: ${customProtocolUrl}`);

  // 1. Copy file path to clipboard
  copyPathToClipboard(path);

  // 2. Generate instant .m3u playlist download for guaranteed 1-click playback
  downloadVlcM3uPlaylist(path, title);

  // 3. Trigger protocol launcher
  try {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = customProtocolUrl;
    document.body.appendChild(iframe);
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  } catch (e) {}

  if (addToast) {
    addToast(
      `Playing "${title || 'Media'}": Generated VLC file (.m3u) & copied path! Double-click .m3u file to play.`,
      "success"
    );
  }

  return true;
};
