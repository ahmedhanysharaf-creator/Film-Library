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
  const b64 = "cGFyYW0oW3N0cmluZ10kdXJsKQoKaWYgKCR1cmwgLW1hdGNoICdwYXRoPSguKj8pKD86JnwkKScpIHsKICAgICRwID0gW1N5c3RlbS5VcmldOjpVbmVzY2FwZURhdGFTdHJpbmcoJG1hdGNoZXNbMV0pLlJlcGxhY2UoJy8nLCAnXFxcJykKICAgIAogICAgJHYgPSAnQzpcXFByb2dyYW0gRmlsZXNcXFZpZGVvTEFOXFxcVkxDXFxsdmxjLmV4ZScKICAgIGlmICgtbm90IChUZXN0LVBhdGggJHYpKSB7ICR2ID0gJ0M6XFxcUHJvZ3JhbSBGaWxlcyAoeDg2KVxcXFZpZGVvTEFOXFxcVkxDXFxsdmxjLmV4ZScgfQogICAgaWYgKC1ub3QgKFRlc3QtUGF0aCAkdikpIHsgJHYgPSAndmxjLmV4ZScgfQogICAgCiAgICAkc3ViUGF0aCA9ICIiCiAgICBpZiAoJHVybCAtbWF0Y2ggJ3N1Yj0oLipTKD86JnwkKScpIHsKICAgICAgICAkc3ViUGF0aCA9IFtTeXN0ZW0uVXJpXTo6VW5lc2NhcGVEYXRhU3RyaW5nKCRtYXRjaGVzWzFdKS5SZXBsYWNlKCcvJywgJ1xcXCcpCiAgICB9CiAgICAKICAgIGlmICgtbm90ICRzdWJQYXRoIC1vciAtbm90IChUZXN0LVBhdGggJHN1YlBhdGgpKSB7CiAgICAgICAgaWYgKFRlc3QtUGF0aCAkcCkgewogICAgICAgICAgICAkdmlkZW9EaXIgPSBbU3lzdGVtLklPLlBhdGhdOjpHZXREaXJlY3RvcnlOYW1lKCRwKQogICAgICAgICAgICAkdmlkZW9CYXNlTmFtZSA9IFtTeXN0ZW0uSU8uUGF0aF06OkdldEZpbGVOYW1lV2l0aG91dEV4dGVuc2lvbigkcCkKICAgICAgICAgICAgCiAgICAgICAgICAgICRjYW5kaWRhdGVzID0gQCgKICAgICAgICAgICAgICAgICIkdmlkZW9EaXJcXFwkdmlkZW9CYXNlTmFtZS5zcnQiLAogICAgICAgICAgICAgICAgIiR2aWRlb0RpclxcXCR2aWRlb0Jhc2VOYW1lLmFyLnNydCIsCiAgICAgICAgICAgICAgICAiJHZpZGVvRGlyXFxcJHZpZGVvQmFzZU5hbWUuZW4uc3J0IiwKICAgICAgICAgICAgICAgICIkdmlkZW9EaXJcXFwkdmlkZW9CYXNlTmFtZS5hc3MiCiAgICAgICAgICAgICkKICAgICAgICAgICAgCiAgICAgICAgICAgIGZvcmVhY2ggKCRjYW5kIGluICRjYW5kaWRhdGVzKSB7CiAgICAgICAgICAgICAgICBpZiAoVGVzdC1QYXRoICRjYW5kKSB7CiAgICAgICAgICAgICAgICAgICAgJHN1YlBhdGggPSAkY2FuZAogICAgICAgICAgICAgICAgICAgIGJyZWFrCiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgIH0KICAgICAgICB9CiAgICB9CiAgICAKICAgICMgR2VuZXJhdGUgdGVtcG9yYXJ5IC5tM3U4IHBsYXlsaXN0IHdpdGggaGFyZGNvZGVkIFZMQyBzdWJ0aXRsZSBvcHRpb24gKFRyYWNrIDIpCiAgICRtM3VQYXRoID0gIiRlbnY6VEVNUFxcXGZpbG1saWJyYXJ5X3BsYXkubTN1OCIKICAgIAogICAgaWYgKCRzdWJQYXRoIC1hbmQgKFRlc3QtUGF0aCAkc3ViUGF0aCkpIHsKICAgICAgICAjIENsZWFuIEJpRGkgY29udHJvbCBjaGFyYWN0ZXJzIGlmIFNSVAogICAgICAgIGlmICgkc3ViUGF0aC5Ub0xvd2VyKCkuRW5kc1dpdGgoIi5zcnQiKSkgewogICAgICAgICAgICB0cnkgewogICAgICAgICAgICAgICAgJHN1YkNvbnRlbnQgPSBbU3lzdGVtLklPLkZpbGVdOjpSZWFkQWxsVGV4dCgkc3ViUGF0aCkKICAgICAgICAgICAgICAgIGlmICgkc3ViQ29udGVudCAtbWF0Y2ggIltcXFx1MjAyQS1cXFx1MjAyRVxcXHUyMDBFXFxcdTIwMEZcXFx1MjA2Ni1cXFx1MjA2OV0iKSB7CiAgICAgICAgICAgICAgICAgICAgJGNsZWFuU3ViQ29udGVudCA9ICRzdWJDb250ZW50IC1yZXBsYWNlICJbXFxcdTIwMkEtXFxcdTIwMkVcXFx1MjAwRVxcXHUyMDBGXFxcdTIwNjYtXFxcdTIwNjldIiwgIiIKICAgICAgICAgICAgICAgICAgICBbU3lzdGVtLklPLkZpbGVdOjpXcml0ZUFsbFRleHQoJHN1YlBhdGgsICRjbGVhblN1YkNvbnRlbnQsIFtTeXN0ZW0uVGV4dC5FbmNvZGluZ106OlVURjgpCiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgIH0gY2F0Y2gge30KICAgICAgICB9CiAgICAgICAgCiAgICAgICAgJG0zdUxpbmVzID0gQCgKICAgICAgICAgICAgIiNFWFRNM1UiLAogICAgICAgICAgICAiI0VYVFZMQ09QVDpzdWItZmlsZT0kc3ViUGF0aCIsCiAgICAgICAgICAgICIjRVhUVkxDT1BUOmlucHV0LXNsYXZlPSRzdWJQYXRoIiwKICAgICAgICAgICAgIiNFWFRWTENPUFQ6c3ViLXRyYWNrPTEiLAogICAgICAgICAgICAiI0VYVFZMQ09QVDpzdWItdHJhY2staWQ9MiIsCiAgICAgICAgICAgICRwCiAgICAgICAgKQogICAgICAgIFtTeXN0ZW0uSU8uRmlsZV06OldyaXRlQWxsTGluZXMoJG0zdVBhdGgsICRtM3VMaW5lcywgW1N5c3RlbS5UZXh0LkVuY29kaW5nXTo6VVRGOCkKICAgICAgICAKICAgICAgICBTdGFydC1Qcm9jZXNzIC1GaWxlUGF0aCAkdiAtQXJndW1lbnRMaXN0IEAoIiIiJG0zdVBhdGgiIiIsICIiIi0tc3ViLWZpbGU9JHN1YlBhdGgiIiIsICItLXN1Yi10cmFjaz0xIiwgIi0tc3ViLXRyYWNrLWlkPTIiKQogICAgfSBlbHNlIHsKICAgICAgICBTdGFydC1Qcm9jZXNzIC1GaWxlUGF0aCAkdiAtQXJndW1lbnRMaXN0IEAoIiIiJHBPIiIpCiAgICB9Cn0K";

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
