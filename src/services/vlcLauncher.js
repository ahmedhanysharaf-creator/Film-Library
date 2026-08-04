/**
 * VLC Media Player Launcher Service
 * Triggers direct 1-click automatic VLC opening with video path & subtitle (.srt/.ass) support!
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
 * Generate and trigger instant .m3u playlist download with subtitle track embed
 */
export const downloadVlcM3uPlaylist = (path, title, subPath) => {
  if (!path) return;
  const cleanTitle = (title || "Movie").replace(/[^a-zA-Z0-9_\-\s]/g, "");
  const normalizedPath = path.replace(/\//g, "\\");
  let m3uContent = `#EXTM3U\n`;
  if (subPath) {
    const normalizedSub = subPath.replace(/\//g, "\\");
    m3uContent += `#EXTVLCOPT:sub-file=${normalizedSub}\n`;
    m3uContent += `#EXTVLCOPT:sub-track=0\n`;
  }
  m3uContent += `#EXTINF:-1,${cleanTitle}\n${normalizedPath}\n`;

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
 * Automatically passes subtitle path (--sub-file=...) to VLC if configured!
 */
export const downloadWindowsRegistryFix = () => {
  const cmdContent = `@echo off
echo Installing 1-Click VLC Protocol Launcher...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$dir=\\"$env:LOCALAPPDATA\\\\FilmLibrary\\"; if(-not(Test-Path $dir)){ New-Item -ItemType Directory -Path $dir -Force }; $psScript=@'
param([string]$url)
if ($url -match 'path=(.*?)(?:&|$)') {
    $p = [System.Uri]::UnescapeDataString($matches[1]).Replace('/', '\\\\')
    $v = 'C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe'
    if (-not(Test-Path $v)) { $v = 'C:\\\\Program Files (x86)\\\\VideoLAN\\\\VLC\\\\vlc.exe' }
    if (-not(Test-Path $v)) { $v = 'vlc.exe' }
    $argList = @(\\"\`\\"\$p\`\\"\\")
    if ($url -match 'sub=(.*?)(?:&|$)') {
        $s = [System.Uri]::UnescapeDataString($matches[1]).Replace('/', '\\\\')
        $argList += \\"--sub-file=\`\\"\$s\`\\"\\"
    }
    Start-Process -FilePath $v -ArgumentList $argList
}
'@; Set-Content -Path \\"$dir\\\\vlc-launcher.ps1\\" -Value $psScript -Force; $batContent='@echo off' + [Environment]::NewLine + 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \\"' + $dir + '\\\\vlc-launcher.ps1\\" \\"%%~1\\"'; Set-Content -Path \\"$dir\\\\vlc-launcher.bat\\" -Value $batContent -Force; reg add \\"HKCU\\\\Software\\\\Classes\\\\filmlibrary\\" /ve /t REG_SZ /d \\"URL:Film Library Protocol\\" /f >nul; reg add \\"HKCU\\\\Software\\\\Classes\\\\filmlibrary\\" /v \\"URL Protocol\\" /t REG_SZ /d \\"\\" /f >nul; reg add \\"HKCU\\\\Software\\\\Classes\\\\filmlibrary\\\\shell\\\\open\\\\command\\" /ve /t REG_SZ /d \\"\\\\\\"\\" + $dir + \\"\\\\vlc-launcher.bat\\\\\\" \\\\\\"%%1\\\\\\"\\" /f >nul"

echo Done! 1-Click VLC Protocol setup complete.
timeout /t 2 >nul
`;

  const blob = new Blob([cmdContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Fix-1Click-VLC.cmd";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Master 1-Click VLC Direct Launcher with Subtitle Support
 */
export const launchInVlc = (path, title, addToast, subPath = "") => {
  if (!path) {
    if (addToast) addToast("No local file path configured for this item.", "warning");
    return false;
  }

  const token = getSecurityToken();
  const encodedPath = encodeURIComponent(path);
  const encodedToken = encodeURIComponent(token);
  const encodedSub = subPath ? encodeURIComponent(subPath) : "";
  
  // Custom filmlibrary:// protocol URL with sub parameter
  let customProtocolUrl = `filmlibrary://open?path=${encodedPath}&token=${encodedToken}`;
  if (encodedSub) {
    customProtocolUrl += `&sub=${encodedSub}`;
  }

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
    const subMsg = subPath ? " with subtitle attached!" : "...";
    addToast(`Opening "${title || 'Media'}" in VLC Player${subMsg}`, "success");
  }

  return true;
};
