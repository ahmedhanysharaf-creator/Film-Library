/**
 * VLC Media Player Launcher Service
 * Triggers direct 1-click automatic VLC opening!
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
      if (addToast) addToast("File path copied to clipboard!", "info");
    },
    (err) => {}
  );
};

/**
 * Generate and trigger instant .m3u playlist download for optional playback
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
 * Registers filmlibrary:// protocol with auto-detecting VLC launcher
 */
export const downloadWindowsRegistryFix = () => {
  const regContent = `Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary]
@="URL:Film Library Protocol"
"URL Protocol"=""

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell]

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell\\open]

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell\\open\\command]
@="powershell.exe -NoProfile -WindowStyle Hidden -Command \\"$url='%1'; $v='C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe'; if (-not (Test-Path $v)){$v='C:\\\\Program Files (x86)\\\\VideoLAN\\\\VLC\\\\vlc.exe'}; if ($url -match 'path=(.*?)(?:&|$)') { $p=[System.Uri]::UnescapeDataString($matches[1]); Start-Process $v -ArgumentList ('\\\"' + $p + '\\\"') }\\""
`;

  const blob = new Blob([regContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Register-1Click-VLC-Protocol.reg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Master 1-Click VLC Direct Launcher
 */
export const launchInVlc = (path, title, addToast) => {
  if (!path) {
    if (addToast) addToast("No local file path configured for this item.", "warning");
    return false;
  }

  const token = getSecurityToken();
  const encodedPath = encodeURIComponent(path);
  const encodedToken = encodeURIComponent(token);
  
  // Custom filmlibrary:// protocol URL
  const customProtocolUrl = `filmlibrary://open?path=${encodedPath}&token=${encodedToken}`;

  console.log(`[VLC Launcher] Triggering direct protocol: ${customProtocolUrl}`);

  // 1. Trigger direct protocol launch
  try {
    window.location.href = customProtocolUrl;
  } catch (e) {
    console.warn("Direct protocol trigger warning:", e);
  }

  if (addToast) {
    addToast(`Opening "${title || 'Media'}" automatically in VLC...`, "success");
  }

  return true;
};
