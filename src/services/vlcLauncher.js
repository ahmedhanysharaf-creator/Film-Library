/**
 * VLC Media Player Launcher Service
 * Supports 3 Launch Modes:
 * 1. Direct Native Protocol (`filmlibrary://open?path=...`)
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
  const m3uContent = `#EXTM3U\n#EXTINF:-1,${cleanTitle}\n${path}\n`;
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
 * Generate and trigger downloadable .reg file (HKEY_CURRENT_USER scoped — no Admin rights required!)
 */
export const downloadWindowsRegistryFix = () => {
  const regContent = `Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary]
@="URL:Film Library VLC Protocol"
"URL Protocol"=""

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell]

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell\\open]

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell\\open\\command]
@="\\"C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe\\" \\"%1\\""

[HKEY_CURRENT_USER\\Software\\Classes\\vlc]
@="URL:VLC Protocol"
"URL Protocol"=""

[HKEY_CURRENT_USER\\Software\\Classes\\vlc\\shell]

[HKEY_CURRENT_USER\\Software\\Classes\\vlc\\shell\\open]

[HKEY_CURRENT_USER\\Software\\Classes\\vlc\\shell\\open\\command]
@="\\"C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe\\" \\"%1\\""
`;

  const blob = new Blob([regContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Register-VLC-Protocol-UserScope.reg";
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
  const normalizedPath = path.replace(/\\/g, "/");
  const encodedPath = encodeURIComponent(path);
  const encodedToken = encodeURIComponent(token);
  
  // Protocol 1: Custom filmlibrary:// scheme
  const customProtocolUrl = `filmlibrary://open?path=${encodedPath}&token=${encodedToken}`;
  
  // Protocol 2: Standard vlc:// scheme
  const nativeVlcUrl = `vlc://file:///${normalizedPath}`;

  console.log(`[VLC Launcher] Triggering custom protocol: ${customProtocolUrl}`);

  // 1. Copy file path to clipboard
  copyPathToClipboard(path);

  // 2. Generate instant .m3u playlist download for guaranteed 1-click playback
  downloadVlcM3uPlaylist(path, title);

  // 3. Trigger protocol launchers
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

  try {
    window.location.href = nativeVlcUrl;
  } catch (e) {}

  if (addToast) {
    addToast(
      `Playing "${title || 'Media'}": Generated VLC file (.m3u) & copied file path! Double-click file to play in VLC.`,
      "success"
    );
  }

  return true;
};
