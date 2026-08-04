/**
 * VLC Media Player Launcher Service
 * Triggers direct 1-click automatic VLC opening with Audio Unmute & 100% Volume!
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
 * Launches VLC with explicit --no-volume-mute --volume=256 --audio-language=en,eng,ar flags for guaranteed sound!
 */
export const downloadWindowsRegistryFix = () => {
  const regContent = `Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary]
@="URL:Film Library Protocol"
"URL Protocol"=""

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell]

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell\\open]

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell\\open\\command]
@="powershell.exe -NoProfile -WindowStyle Hidden -Command \\"$url='%1'; if($url -match 'path=(.*?)(?:&|$)'){ $p=[System.Uri]::UnescapeDataString($matches[1]); $flags=@('--no-volume-mute', '--volume=256', '--audio-language=en,eng,ar', '--aout=directsound'); if(Test-Path 'C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe'){ & 'C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe' @flags $p } elseif(Test-Path 'C:\\\\Program Files (x86)\\\\VideoLAN\\\\VLC\\\\vlc.exe'){ & 'C:\\\\Program Files (x86)\\\\VideoLAN\\\\VLC\\\\vlc.exe' @flags $p } else { & 'vlc.exe' @flags $p } }\\""
`;

  const blob = new Blob([regContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Register-1Click-VLC-AudioFix.reg";
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

  // 1. Copy file path to clipboard
  copyPathToClipboard(path);

  // 2. Trigger anchor element user gesture click (Chrome requirement)
  try {
    const a = document.createElement("a");
    a.href = customProtocolUrl;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 500);
  } catch (e) {}

  // 3. Fallback location trigger
  try {
    window.location.href = customProtocolUrl;
  } catch (e) {
    console.warn("Direct protocol trigger warning:", e);
  }

  if (addToast) {
    addToast(`Opening "${title || 'Media'}" in VLC Player...`, "success");
  }

  return true;
};
