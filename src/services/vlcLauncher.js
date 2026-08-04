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
  const b64 = "cGFyYW0oW3N0cmluZ10kdXJsKQoKaWYgKCR1cmwgLW1hdGNoICdwYXRoPSguKj8pKD86JnwkKScpIHsKICAgICRwID0gW1N5c3RlbS5VcmldOjpVbmVzY2FwZURhdGFTdHJpbmcoJG1hdGNoZXNbMV0pLlJlcGxhY2UoJy8nLCAnXCcpCiAgICAKICAgICR2ID0gJ0M6XFByb2dyYW0gRmlsZXNcVmlkZW9MQU5cVkxDXHZsYy5leGUnCiAgICBpZiAoLW5vdCAoVGVzdC1QYXRoICR2KSkgeyAkdiA9ICdDOlxQcm9ncmFtIEZpbGVzICh4ODYpXFZpZGVvTEFOXFZMQ1x2bGMuZXhlJyB9CiAgICBpZiAoLW5vdCAoVGVzdC1QYXRoICR2KSkgeyAkdiA9ICd2bGMuZXhlJyB9CiAgICAKICAgICRzdWJQYXRoID0gIiIKICAgIGlmICgkdXJsIC1tYXRjaCAnc3ViPSguKj8pKD86JnwkKScpIHsKICAgICAgICAkc3ViUGF0aCA9IFtTeXN0ZW0uVXJpXTo6VW5lc2NhcGVEYXRhU3RyaW5nKCRtYXRjaGVzWzFdKS5SZXBsYWNlKCcvJywgJ1wnKQogICAgfQogICAgCiAgICBpZiAoLW5vdCAkc3ViUGF0aCAtb3IgLW5vdCAoVGVzdC1QYXRoICRzdWJQYXRoKSkgewogICAgICAgIGlmIChUZXN0LVBhdGggJHApIHsKICAgICAgICAgICAgJHZpZGVvRGlyID0gW1N5c3RlbS5JTy5QYXRoXTo6R2V0RGlyZWN0b3J5TmFtZSgkcCkKICAgICAgICAgICAgJHZpZGVvQmFzZU5hbWUgPSBbU3lzdGVtLklPLlBhdGhdOjpHZXRGaWxlTmFtZVdpdGhvdXRFeHRlbnNpb24oJHApCiAgICAgICAgICAgIAogICAgICAgICAgICAkY2FuZGlkYXRlcyA9IEAoCiAgICAgICAgICAgICAgICAiJHZpZGVvRGlyXCR2aWRlb0Jhc2VOYW1lLmFzcyIsCiAgICAgICAgICAgICAgICAiJHZpZGVvRGlyXCR2aWRlb0Jhc2VOYW1lLnNydCIsCiAgICAgICAgICAgICAgICAiJHZpZGVvRGlyXCR2aWRlb0Jhc2VOYW1lLmFyLnNydCIsCiAgICAgICAgICAgICAgICAiJHZpZGVvRGlyXCR2aWRlb0Jhc2VOYW1lLmVuLnNydCIKICAgICAgICAgICAgKQogICAgICAgICAgICAKICAgICAgICAgICAgZm9yZWFjaCAoJGNhbmQgaW4gJGNhbmRpZGF0ZXMpIHsKICAgICAgICAgICAgICAgIGlmIChUZXN0LVBhdGggJGNhbmQpIHsKICAgICAgICAgICAgICAgICAgICAkc3ViUGF0aCA9ICRjYW5kCiAgICAgICAgICAgICAgICAgICAgYnJlYWsKICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgfQogICAgICAgIH0KICAgIH0KICAgIAogICAgaWYgKCRzdWJQYXRoIC1hbmQgKFRlc3QtUGF0aCAkc3ViUGF0aCkpIHsKICAgICAgICAjIENvbnZlcnQgU1JUIHRvIEFTUyBpZiBuZWVkZWQgZm9yIDEwMCUgVkxDIHJlbmRlcmluZyByZWxpYWJpbGl0eQogICAgICAgIGlmICgkc3ViUGF0aC5Ub0xvd2VyKCkuRW5kc1dpdGgoIi5zcnQiKSkgewogICAgICAgICAgICAkYXNzQ2FuZGlkYXRlID0gJHN1YlBhdGguU3Vic3RyaW5nKDAsICRzdWJQYXRoLkxlbmd0aCAtIDQpICsgIi5hc3MiCiAgICAgICAgICAgIHRyeSB7CiAgICAgICAgICAgICAgICAkc3J0VGV4dCA9IFtTeXN0ZW0uSU8uRmlsZV06OlJlYWRBbGxUZXh0KCRzdWJQYXRoKQogICAgICAgICAgICAgICAgJHNydFRleHQgPSAkc3J0VGV4dCAtcmVwbGFjZSAiW1x1MjAyQS1cdTIwMkVcdTIwMEVcdTIwMEZcdTIwNjYtXHUyMDY5XSIsICIiCiAgICAgICAgICAgICAgICAkc3J0VGV4dCA9ICRzcnRUZXh0IC1yZXBsYWNlICIoP2kpPGZvbnRbXj5dKj4iLCAiIgogICAgICAgICAgICAgICAgJHNydFRleHQgPSAkc3J0VGV4dCAtcmVwbGFjZSAiKD9pKTwvZm9udD4iLCAiIgogICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAkYXNzSGVhZGVyID0gQCIKW1NjcmlwdCBJbmZvXQpUaXRsZTogU3VidGl0bGVzClNjcmlwdFR5cGU6IHY0LjAwKwpXcmFwU3R5bGU6IDAKU2NhbGVkQm9yZGVyQW5kU2hhZG93OiB5ZXMKCltWNCsgU3R5bGVzXQpGb3JtYXQ6IE5hbWUsIEZvbnRuYW1lLCBGb250c2l6ZSwgUHJpbWFyeUNvbG91ciwgU2Vjb25kYXJ5Q29sb3VyLCBPdXRsaW5lQ29sb3VyLCBCYWNrQ29sb3VyLCBCb2xkLCBJdGFsaWMsIFVuZGVybGluZSwgU3RyaWtlT3V0LCBTY2FsZVgsIFNjYWxlWSwgU3BhY2luZywgQW5nbGUsIEJvcmRlclN0eWxlLCBPdXRsaW5lLCBTaGFkb3csIEFsaWdubWVudCwgTWFyZ2luTCwgTWFyZ2luUiwgTWFyZ2luViwgRW5jb2RpbmcKU3R5bGU6IERlZmF1bHQsU2Vnb2UgVUksMjQsJkgwMEZGRkZGRiwmSDAwMDAwMDAwLCZIMDAwMDAwMDAsJkg8MDAwMDAwMCwtMSwwLDAsMCwxMDAsMTAwLDAsMCwxLDIsMiwyLDEwLDEwLDIwLDEKCltFdmVudHNdCkZvcm1hdDogTGF5ZXIsIFN0YXJ0LCBFbmQsIFN0eWxlLCBOYW1lLCBNYXJnaW5MLCBNYXJnaW5SLCBNYXJnaW5WLCBFZmZlY3QsIFRleHQKIkAKICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAkYXNzTGluZXMgPSBbU3lzdGVtLkNvbGxlY3Rpb25zLkdlbmVyaWMuTGlzdFtzdHJpbmddXTo6bmV3KCkKICAgICAgICAgICAgICAgICRhc3NMaW5lcy5BZGQoJGFzc0hlYWRlcikKICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgJGJsb2NrcyA9ICRzcnRUZXh0IC1zcGxpdCAiKFxyP1xuKXsyLH0iCiAgICAgICAgICAgICAgICBmb3JlYWNoICgkYmxvY2sgaW4gJGJsb2NrcykgewogICAgICAgICAgICAgICAgICAgICRsaW5lcyA9ICRibG9jay5UcmltKCkgLXNwbGl0ICJccj9cbiIKICAgICAgICAgICAgICAgICAgICBpZiAoJGxpbmVzLkxlbmd0aCAtZ2UgMykgewogICAgICAgICAgICAgICAgICAgICAgICAkdGltZUxpbmUgPSAkbGluZXNbMV0KICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCR0aW1lTGluZSAtbWF0Y2ggIihcZHsyfTpcZHsyfTpcZHsyfSxcZHszfSlccyotLT5ccyooXGR7Mn06XGR7Mn06XGR7Mn0sXGR7M30pIikgewogICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXJ0ID0gJG1hdGNoZXNbMV0uUmVwbGFjZSgiLCIsICIuIikuU3Vic3RyaW5nKDEsIDEwKQogICAgICAgICAgICAgICAgICAgICAgICAgICAgJGVuZCA9ICRtYXRjaGVzWzJdLlJlcGxhY2UoIiwiLCAiLiIpLlN1YnN0cmluZygxLCAxMCkKICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0ZXh0TGluZXMgPSAkbGluZXNbMi4uKCRsaW5lcy5MZW5ndGggLSAxKV0gLWpvaW4gIlxOIgogICAgICAgICAgICAgICAgICAgICAgICAgICAgJGFzc0xpbmVzLkFkZCgiRGlhbG9ndWU6IDAsJHN0YXJ0LCRlbmQsRGVmYXVsdCwsMCwwLDAsLCR0ZXh0TGluZXMiKQogICAgICAgICAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgJHV0ZjhOb0JvbSA9IE5ldy1PYmplY3QgU3lzdGVtLlRleHQuVVRGOEVuY29kaW5nKCRmYWxzZSkKICAgICAgICAgICAgICAgIFtTeXN0ZW0uSU8uRmlsZV06OldyaXRlQWxsTGluZXMoJGFzc0NhbmRpZGF0ZSwgJGFzc0xpbmVzLCAkdXRmOE5vQm9tKQogICAgICAgICAgICAgICAgJHN1YlBhdGggPSAkYXNzQ2FuZGlkYXRlCiAgICAgICAgICAgIH0gY2F0Y2gge30KICAgICAgICB9CiAgICAgICAgCiAgICAgICAgJGFyZzEgPSAnIicgKyAkcCArICciJwogICAgICAgICRhcmcyID0gJyItLXN1Yi1maWxlPScgKyAkc3ViUGF0aCArICciJwogICAgICAgIAogICAgICAgIFN0YXJ0LVByb2Nlc3MgLUZpbGVQYXRoICR2IC1Bcmd1bWVudExpc3QgQCgkYXJnMSwgJGFyZzIpCiAgICB9IGVsc2UgewogICAgICAgIFN0YXJ0LVByb2Nlc3MgLUZpbGVQYXRoICR2IC1Bcmd1bWVudExpc3QgQCgnIicgKyAkcCArICciJykKICAgIH0KfQ==";

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
