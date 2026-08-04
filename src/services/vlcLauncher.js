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
  const vbsContent = `Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appData = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
dirPath = appData & "\\FilmLibrary"

If Not fso.FolderExists(dirPath) Then
    fso.CreateFolder(dirPath)
End If

psPath = dirPath & "\\vlc-launcher.ps1"
batPath = dirPath & "\\vlc-launcher.bat"

Set psFile = fso.CreateTextFile(psPath, True)
psFile.WriteLine "param([string]$url)"
psFile.WriteLine ""
psFile.WriteLine "if ($url -match 'path=(.*?)(?:&|$)') {"
psFile.WriteLine "    $p = [System.Uri]::UnescapeDataString($matches[1]).Replace('/', '\\')"
psFile.WriteLine "    $v = 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe'"
psFile.WriteLine "    if (-not (Test-Path $v)) { $v = 'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe' }"
psFile.WriteLine "    if (-not (Test-Path $v)) { $v = 'vlc.exe' }"
psFile.WriteLine "    $arg1 = '""' + $p + '""'"
psFile.WriteLine "    $argList = @(""--no-embedded-sub"", ""--osd"", $arg1)"
psFile.WriteLine "    $subPath = """""
psFile.WriteLine "    if ($url -match 'sub=(.*?)(?:&|$)') {"
psFile.WriteLine "        $subPath = [System.Uri]::UnescapeDataString($matches[1]).Replace('/', '\\')"
psFile.WriteLine "    }"
psFile.WriteLine "    if (-not $subPath -or -not (Test-Path $subPath)) {"
psFile.WriteLine "        if (Test-Path $p) {"
psFile.WriteLine "            $videoDir = [System.IO.Path]::GetDirectoryName($p)"
psFile.WriteLine "            $videoBaseName = [System.IO.Path]::GetFileNameWithoutExtension($p)"
psFile.WriteLine "            $candidates = @("
psFile.WriteLine "                ""$videoDir\\$videoBaseName.srt"","
psFile.WriteLine "                ""$videoDir\\$videoBaseName.ar.srt"","
psFile.WriteLine "                ""$videoDir\\$videoBaseName.en.srt"","
psFile.WriteLine "                ""$videoDir\\$videoBaseName.ass"""
psFile.WriteLine "            )"
psFile.WriteLine "            foreach ($cand in $candidates) {"
psFile.WriteLine "                if (Test-Path $cand) {"
psFile.WriteLine "                    $subPath = $cand"
psFile.WriteLine "                    break"
psFile.WriteLine "                }"
psFile.WriteLine "            }"
psFile.WriteLine "        }"
psFile.WriteLine "    }"
psFile.WriteLine "    if ($subPath -and (Test-Path $subPath)) {"
psFile.WriteLine "        if ($subPath.ToLower().EndsWith("".srt"")) {"
psFile.WriteLine "            $assCandidate = $subPath.Substring(0, $subPath.Length - 4) + "".ass"""
psFile.WriteLine "            try {"
psFile.WriteLine "                $srtText = [System.IO.File]::ReadAllText($subPath)"
psFile.WriteLine "                $srtText = $srtText -replace ""[\u202A-\u202E\u200E\u200F\u2066-\u2069]"", """""
psFile.WriteLine "                $assHeader = ""[Script Info]\`r\`nTitle: Subtitles\`r\`nScriptType: v4.00+\`r\`nWrapStyle: 0\`r\`nScaledBorderAndShadow: yes\`r\`n\`r\`n[V4+ Styles]\`r\`nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\`r\`nStyle: Default,Segoe UI,24,&H00FFFFFF,&H00000000,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,2,2,10,10,20,1\`r\`n\`r\`n[Events]\`r\`nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\`r\`n"""
psFile.WriteLine "                $assLines = [System.Collections.Generic.List[string]]::new()"
psFile.WriteLine "                $assLines.Add($assHeader)"
psFile.WriteLine "                $blocks = $srtText -split ""(\r?\n){2,}"""
psFile.WriteLine "                foreach ($block in $blocks) {"
psFile.WriteLine "                    $lines = $block.Trim() -split ""\r?\n"""
psFile.WriteLine "                    if ($lines.Length -ge 3) {"
psFile.WriteLine "                        $timeLine = $lines[1]"
psFile.WriteLine "                        if ($timeLine -match ""(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})"") {"
psFile.WriteLine "                            $start = $matches[1].Replace("","" , ""."").Substring(1, 10)"
psFile.WriteLine "                            $end = $matches[2].Replace("","" , ""."").Substring(1, 10)"
psFile.WriteLine "                            $textLines = $lines[2..($lines.Length - 1)] -join ""\N"""
psFile.WriteLine "                            $assLines.Add(""Dialogue: 0,$start,$end,Default,,0,0,0,,$textLines"")"
psFile.WriteLine "                        }"
psFile.WriteLine "                    }"
psFile.WriteLine "                }"
psFile.WriteLine "                [System.IO.File]::WriteAllLines($assCandidate, $assLines, [System.Text.Encoding]::UTF8)"
psFile.WriteLine "                $subPath = $assCandidate"
psFile.WriteLine "            } catch {}"
psFile.WriteLine "        }"
psFile.WriteLine "        $arg2 = '""--sub-file=' + $subPath + '""'"
psFile.WriteLine "        $argList += $arg2"
psFile.WriteLine "    }"
psFile.WriteLine "    Start-Process -FilePath $v -ArgumentList $argList"
psFile.WriteLine "}"
psFile.Close

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
