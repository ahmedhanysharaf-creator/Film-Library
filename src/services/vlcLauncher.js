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
  // Upgraded PowerShell launcher script supporting brackets [1080p] & direct vlc.exe detection
  const b64 = "cGFyYW0oW3N0cmluZ10kdXJsKQp0cnkgewogICAgaWYgKCR1cmwgLW1hdGNoICdwYXRoPSguKj8pKD86JnwtKScpIHsKICAgICAgICAkcjA9W1N5c3RlbS5VcmldOjpVTkVzY2FwZURhdGFTdHJpbmcoJG1hdGNoZXNbMV0pLlJlcGxhY2UoJy8nLCAnXCcpCiAgICAgICAgJHN1YjA9IiIKICAgICAgICBpZiAoJHVybCAtbWF0Y2ggJ3N1Yj0oLipgKSg/OiZ8JCknKSB7ICRzdWIwPVtTeXN0ZW0uVXJpXTo6VU5Fc2NhcGVEYXRhU3RyaW5nKCRtYXRjaGVzWzFdKS5SZXBsYWNlKCcvJywgJ1wnKSB9CiAgICAgICAgJHZsY1BhdGhzID0gQCgiJHtFbnY6UHJvZ3JhbUZpbGVzfVxWaWRlb0xBTlxWTENcdmxjLmV4ZSIsICIke0VudjpQcm9ncmFtRmlsZXMoeDg2KX1cVmlkZW9MQU5cVkxDXHZsYy5leGUiLCAiQzpcUHJvZ3JhbSBGaWxlc1xWaWRlb0xBTlxWTENcdmxjLmV4ZSIsICJDOlxQcm9ncmFtIEZpbGVzICh4ODYpXFZpZGVvTEFOXFZMQ1x2bGMuZXhlIikKICAgICAgICAkdmxjRXhlID0gJHZsY1BhdGhzIHwgV2hlcmUtT2JqZWN0IHsgVGVzdC1QYXRoIC1MaXRlcmFsUGF0aCAkXyB9IHwgU2VsZWN0LU9iamVjdCAtRmlyc3QgMQogICAgICAgIGlmIChUZXN0LVBhdGggLUxpdGVyYWxQYXRoICRyMCkgewogICAgICAgICAgICBpZiAoJHZsY0V4ZSkgewogICAgICAgICAgICAgICAgaWYgKCRzdWIwIC1hbmQgKFRlc3QtUGF0aCAtTGl0ZXJhbFBhdGggJHN1YjApKSB7CiAgICAgICAgICAgICAgICAgICAgU3RhcnQtUHJvY2VzcyAtRmlsZVBhdGggJHZsY0V4ZSAtQXJndW1lbnRMaXN0ICJgIiRyMGAiIiwgIi0tc3ViLWZpbGU9YCIkc3ViMGAiIgogICAgICAgICAgICAgICAgfSBlbHNlIHsKICAgICAgICAgICAgICAgICAgICBTdGFydC1Qcm9jZXNzIC1GaWxlUGF0aCAkdmxjRXhlIC1Bcmd1bWVudExpc3QgImAiJHIwYCIiCiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgIH0gZWxzZSB7CiAgICAgICAgICAgICAgICBTdGFydC1Qcm9jZXNzIC1GaWxlUGF0aCAkcjAKICAgICAgICAgICAgfQogICAgICAgIH0KICAgIH0KfSBjYXRjaCB7fQ==";

  const vbsContent = `Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appData = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
dirPath = appData & "\\FilmLibrary"

If Not fso.FolderExists(dirPath) Then
    fso.CreateFolder(dirPath)
End If

psPath = dirPath & "\\vlc-launcher.ps1"
batPath = dirPath & "\\vlc-launcher.bat"

b64 = "${b64}"

Set xmlDoc = CreateObject("MSXML2.DOMDocument.3.0")
Set node = xmlDoc.CreateElement("base64")
node.dataType = "bin.base64"
node.text = b64

Set stream = CreateObject("ADODB.Stream")
stream.Type = 1
stream.Open
stream.Write node.nodeTypedValue
stream.SaveToFile psPath, 2
stream.Close

Set batFile = fso.CreateTextFile(batPath, True)
batFile.WriteLine "@echo off"
batFile.WriteLine "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & psPath & """ ""%~1"""
batFile.Close

WshShell.RegWrite "HKCU\\Software\\Classes\\filmlibrary\\", "URL:Film Library Protocol", "REG_SZ"
WshShell.RegWrite "HKCU\\Software\\Classes\\filmlibrary\\URL Protocol", "", "REG_SZ"
WshShell.RegWrite "HKCU\\Software\\Classes\\filmlibrary\\shell\\open\\command\\", """" & batPath & """ ""%1""", "REG_SZ"

WScript.Echo "1-Click VLC Setup Complete! You can now click Play in VLC on the website."
`;

  const blob = new Blob([vbsContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Fix-1Click-VLC.vbs";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Master 1-Click VLC Direct Launcher with Subtitle Support & Instant .m3u Playlist Fallback
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
  
  let customProtocolUrl = `filmlibrary://open?path=${encodedPath}&token=${encodedToken}`;
  if (encodedSub) {
    customProtocolUrl += `&sub=${encodedSub}`;
  }

  console.log(`[VLC Launcher] Triggering direct protocol: ${customProtocolUrl}`);

  // 1. Copy file path to clipboard
  copyPathToClipboard(path);

  // 2. Trigger custom protocol anchor element click
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

  // 3. Auto-download .m3u playlist file as instant 1-click fallback
  downloadVlcM3uPlaylist(path, title, subPath);

  if (addToast) {
    const subMsg = subPath ? " with subtitle attached!" : "...";
    addToast(`Opening "${title || 'Media'}" (VLC playlist .m3u downloaded as fallback!)${subMsg}`, "success");
  }

  return true;
};
