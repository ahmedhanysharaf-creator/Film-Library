/**
 * VLC Media Player Launcher Service
 * Direct Automatic opening of existing local .m3u playlist files from your hard drive
 */

export const getSecurityToken = () => {
  return localStorage.getItem("filmlibrary_security_token") || "FILM_LIBRARY_SECRET";
};

export const setSecurityToken = (token) => {
  localStorage.setItem("filmlibrary_security_token", token);
};

export const getLocalPlaylistFolderPath = () => {
  return localStorage.getItem("filmlibrary_local_playlist_folder") || "C:\\Users\\Ahmed\\Downloads\\Film_Library_Playlists";
};

export const setLocalPlaylistFolderPath = (folderPath) => {
  if (folderPath) {
    localStorage.setItem("filmlibrary_local_playlist_folder", cleanLocalPath(folderPath));
  } else {
    localStorage.removeItem("filmlibrary_local_playlist_folder");
  }
};

const SUBTITLE_EXTENSIONS = [".srt", ".ass", ".vtt", ".sub"];
const isSubtitleFile = (p) => p && typeof p === "string" && SUBTITLE_EXTENSIONS.some((ext) => p.toLowerCase().endsWith(ext));

/**
 * Normalizes and decodes raw paths, removing file:///, %20, %27, etc.
 * Converts to a clean, native Windows file path (e.g. C:\Users\Ahmed\Movies\Film.mp4)
 */
export const cleanLocalPath = (rawPath) => {
  if (!rawPath) return "";
  let path = String(rawPath).trim();

  // Strip file:/// or file:// prefix
  path = path.replace(/^file:\/\/\/?/gi, "");

  // Iteratively decode URI components (%20 -> space, %27 -> ', etc.)
  try {
    let prev = "";
    while (path.includes("%") && path !== prev) {
      prev = path;
      path = decodeURIComponent(path);
    }
  } catch (e) {}

  // Convert forward slashes to Windows backslashes
  return path.replace(/\//g, "\\");
};

/**
 * Safely Base64 encodes UTF-8 path strings to prevent URL parsing errors
 */
export const encodePathB64 = (str) => {
  if (!str) return "";
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    return "";
  }
};

/**
 * Downloads a 1-click Windows Registry (.reg) installer script
 * Registers filmlibrary:// protocol on Windows to open local media files in VLC automatically with subtitles!
 */
export const downloadWindowsRegistryFix = () => {
  const regContent = `Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary]
@="URL:Film Library Protocol"
"URL Protocol"=""

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell]

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell\\open]

[HKEY_CURRENT_USER\\Software\\Classes\\filmlibrary\\shell\\open\\command]
@="powershell -windowstyle hidden -command \\"$u='%1'; $pMatch=[regex]::Match($u, '[?&]path=([^&]+)'); $sMatch=[regex]::Match($u, '[?&]sub=([^&]+)'); $pEnc=if ($pMatch.Success) { $pMatch.Groups[1].Value } else { '' }; $sEnc=if ($sMatch.Success) { $sMatch.Groups[1].Value } else { '' }; $filePath=if ($pEnc) { [System.Uri]::UnescapeDataString($pEnc) } else { '' }; $subPath=if ($sEnc) { [System.Uri]::UnescapeDataString($sEnc) } else { '' }; if (-not $filePath) { $fMatch=[regex]::Match($u, '[?&]f=([^&]+)'); if ($fMatch.Success) { $fRaw=[System.Uri]::UnescapeDataString($fMatch.Groups[1].Value); try { $filePath=[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($fRaw)) } catch {} } }; if (-not $subPath) { $sMatch=[regex]::Match($u, '[?&]s=([^&]+)'); if ($sMatch.Success) { $sRaw=[System.Uri]::UnescapeDataString($sMatch.Groups[1].Value); try { $subPath=[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($sRaw)) } catch {} } }; if ($filePath) { $filePath=[System.Uri]::UnescapeDataString($filePath); $filePath=$filePath -replace '^file:///?', '' -replace '%5[cC]', '\\\\' -replace '%20', ' ' -replace '/', '\\\\' }; if ($subPath) { $subPath=[System.Uri]::UnescapeDataString($subPath); $subPath=$subPath -replace '^file:///?', '' -replace '%5[cC]', '\\\\' -replace '%20', ' ' -replace '/', '\\\\' }; $targetFile=$filePath; if ($targetFile -and -not (Test-Path -LiteralPath $targetFile)) { $cands=@(\\"$env:USERPROFILE\\\\Downloads\\\\$targetFile\\", \\"$env:USERPROFILE\\\\Movies\\\\$targetFile\\", \\"$env:USERPROFILE\\\\Videos\\\\$targetFile\\", \\"$env:USERPROFILE\\\\Desktop\\\\$targetFile\\", \\"C:\\\\$targetFile\\", \\"D:\\\\$targetFile\\", \\"E:\\\\$targetFile\\"); foreach ($c in $cands) { if (Test-Path -LiteralPath $c) { $targetFile=$c; break } } }; if ($targetFile -and (Test-Path -LiteralPath $targetFile)) { $vlc=if (Test-Path 'C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe') { 'C:\\\\Program Files\\\\VideoLAN\\\\VLC\\\\vlc.exe' } elseif (Test-Path 'C:\\\\Program Files (x86)\\\\VideoLAN\\\\VLC\\\\vlc.exe') { 'C:\\\\Program Files (x86)\\\\VideoLAN\\\\VLC\\\\vlc.exe' } else { 'vlc' }; $vlcArgs='\\\\\\"' + $targetFile + '\\\\\\\"'; if ($subPath -and (Test-Path -LiteralPath $subPath)) { $vlcArgs += ' --sub-file=\\\\\\\"' + $subPath + '\\\\\\\"' } else { $dir=[System.IO.Path]::GetDirectoryName($targetFile); $name=[System.IO.Path]::GetFileNameWithoutExtension($targetFile); $autoSubs=@(\\"$dir\\\\$name.srt\\", \\"$dir\\\\$name.ass\\", \\"$dir\\\\$name.vtt\\", \\"$dir\\\\$name.sub\\", \\"$dir\\\\$name.en.srt\\", \\"$dir\\\\$name.ar.srt\\", \\"$dir\\\\Subs\\\\$name.srt\\", \\"$dir\\\\Subtitles\\\\$name.srt\\"); foreach ($autoSub in $autoSubs) { if (Test-Path -LiteralPath $autoSub) { $vlcArgs += ' --sub-file=\\\\\\\"' + $autoSub + '\\\\\\\"'; break } } }; try { Start-Process $vlc -ArgumentList $vlcArgs } catch { Start-Process $targetFile } } else { Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Media file not found at local path:\`n' + $filePath + '\`n\`nPlease update local file path in Film Library.', 'Film Library - File Not Found') }\\""
`;

  const blob = new Blob([regContent], { type: "application/x-msregedit" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Register_1Click_VLC_Player.reg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const copyPathToClipboard = (path, addToast) => {
  if (!path) return;
  const cleanPath = cleanLocalPath(path);

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
  
  const cleanPath = cleanLocalPath(path);
  const cleanSub = cleanLocalPath(subPath);
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
 * Master Direct Automatic VLC Launcher (Opens media directly in VLC with subtitles!)
 */
export const launchInVlc = (path, title, addToast, subPath = "", itemType = "movie") => {
  if (!path) {
    if (addToast) addToast("No local file path configured for this item.", "warning");
    return false;
  }

  const cleanPath = cleanLocalPath(path);
  const cleanSub = cleanLocalPath(subPath);
  const cleanTitle = (title || "Media").replace(/[^a-zA-Z0-9_\-\s]/g, "");

  // 1. Copy clean path to clipboard as background convenience
  copyPathToClipboard(cleanPath);

  // 2. Build protocol URI with standard URL-encoded path and sub parameters
  let protocolUri = `filmlibrary://play?path=${encodeURIComponent(cleanPath)}`;
  if (cleanSub) {
    protocolUri += `&sub=${encodeURIComponent(cleanSub)}`;
  }

  // Also include base64 fallbacks f and s
  const fB64 = encodePathB64(cleanPath);
  const sB64 = cleanSub ? encodePathB64(cleanSub) : "";
  if (fB64) protocolUri += `&f=${encodeURIComponent(fB64)}`;
  if (sB64) protocolUri += `&s=${encodeURIComponent(sB64)}`;

  // Also include fallback m3u path
  const baseFolder = getLocalPlaylistFolderPath();
  const subFolder = itemType === "series" || itemType === "tv" ? "Series" : "Movies";
  const m3uFilePath = `${baseFolder}\\${subFolder}\\${cleanTitle.replace(/\s+/g, "_")}.m3u`;
  protocolUri += `&m3u=${encodeURIComponent(encodePathB64(m3uFilePath))}`;

  // 3. Trigger filmlibrary:// protocol to launch VLC directly with video file
  window.location.href = protocolUri;

  if (addToast) {
    addToast(`Launching "${cleanTitle}" in VLC...`, "success");
  }

  return true;
};

/**
 * Universal media path resolver for Movies and Series Episodes across all schema structures
 */
export const resolveMediaPaths = (item, currentUserUid = "", season = 1, episode = 1) => {
  if (!item) return { path: "", subPath: "" };

  // 1. Resolve active user paths object
  const userPathObj =
    (item.user_paths || []).find((up) => currentUserUid && up.uid === currentUserUid) ||
    (item.user_paths || [])[0] ||
    {};

  const pathsMap = userPathObj.paths || item.paths || {};
  const episodesMap = item.episodes || {};
  const globalSub = userPathObj.subPath || item.subPath || item.subtitle_path || pathsMap.subtitle || pathsMap.sub || "";

  const isSeries = item.type?.toLowerCase() === "series" || item.type?.toLowerCase() === "tv";

  if (!isSeries) {
    // Movie path lookup
    const moviePath =
      pathsMap.default ||
      pathsMap.movie ||
      pathsMap.video ||
      item.localPath ||
      item.path ||
      item.local_path ||
      item.default_path ||
      (typeof pathsMap === "object" ? Object.values(pathsMap).find((v) => typeof v === "string" && !isSubtitleFile(v)) : "") ||
      "";

    const subPath =
      pathsMap.subtitle ||
      pathsMap.sub ||
      userPathObj.subPath ||
      item.subPath ||
      item.subtitle_path ||
      globalSub;

    return { path: cleanLocalPath(moviePath), subPath: cleanLocalPath(subPath) };
  }

  // TV Series Episode path lookup
  const sNum = Number(season) || 1;
  const eNum = Number(episode) || 1;
  const sPadded = String(sNum).padStart(2, "0");
  const ePadded = String(eNum).padStart(2, "0");

  const candidateKeys = [
    `S${sNum}E${eNum}`,
    `S${sPadded}E${ePadded}`,
    `S${sNum}E${ePadded}`,
    `S${sPadded}E${eNum}`,
    `${sNum}x${eNum}`,
    `${sPadded}x${ePadded}`,
    `${sNum}x${ePadded}`,
    `E${eNum}`,
    `E${ePadded}`,
    `Episode ${eNum}`,
    `Ep ${eNum}`,
    `${eNum}`,
    `${ePadded}`
  ];

  let resolvedPath = "";
  let resolvedSub = "";

  // Check direct key matches in pathsMap and episodesMap
  for (const k of candidateKeys) {
    const keyLower = k.toLowerCase();

    // Check pathsMap
    const pVal = pathsMap[k] || pathsMap[keyLower];
    if (pVal && typeof pVal === "string" && !isSubtitleFile(pVal)) {
      resolvedPath = pVal;
      resolvedSub = pathsMap[`${k}_sub`] || pathsMap[`${keyLower}_sub`] || globalSub;
      break;
    }

    // Check episodesMap
    const epVal = episodesMap[k] || episodesMap[keyLower];
    if (epVal) {
      if (typeof epVal === "string" && !isSubtitleFile(epVal)) {
        resolvedPath = epVal;
        resolvedSub = globalSub;
        break;
      } else if (typeof epVal === "object" && (epVal.path || epVal.localPath)) {
        resolvedPath = epVal.path || epVal.localPath;
        resolvedSub = epVal.subPath || epVal.subtitle_path || globalSub;
        break;
      }
    }
  }

  // Fallback: Pattern matching in pathsMap or episodesMap string values
  if (!resolvedPath) {
    const epPattern = new RegExp(`S0?${sNum}.*E0?${eNum}|S0?${sNum}E0?${eNum}|${sNum}x0?${eNum}`, "i");

    for (const [k, v] of Object.entries({ ...pathsMap, ...episodesMap })) {
      const valStr = typeof v === "string" ? v : v?.path || v?.localPath || "";
      if (valStr && epPattern.test(valStr) && !isSubtitleFile(valStr)) {
        resolvedPath = valStr;
        resolvedSub = (typeof v === "object" ? v.subPath : "") || globalSub;
        break;
      }
    }
  }

  // Fallback if no episode-specific path found: check if pathsMap has any string value or default path
  if (!resolvedPath) {
    resolvedPath =
      pathsMap.default ||
      item.default_path ||
      item.localPath ||
      item.path ||
      item.local_path ||
      (typeof pathsMap === "object" ? Object.values(pathsMap).find((v) => typeof v === "string" && !isSubtitleFile(v)) : "") ||
      "";
    resolvedSub = globalSub;
  }

  return { path: cleanLocalPath(resolvedPath), subPath: cleanLocalPath(resolvedSub) };
};

/**
 * Resolves local file paths and subtitles for movies and series episodes across all schema structures
 */
export const getItemPathsAndSubtitles = (item, currentUserUid = "") => {
  const result = [];
  if (!item) return result;

  const isSeries = item.type?.toLowerCase() === "series" || item.type?.toLowerCase() === "tv";

  if (!isSeries) {
    const { path, subPath } = resolveMediaPaths(item, currentUserUid);
    if (path) {
      result.push({ title: item.title || "Movie", path, subPath });
    }
  } else {
    // Return all episodes available
    const userPathObj =
      (item.user_paths || []).find((up) => currentUserUid && up.uid === currentUserUid) ||
      (item.user_paths || [])[0] ||
      {};
    const pathsMap = userPathObj.paths || item.paths || {};
    const episodesMap = item.episodes || {};

    const allEpKeys = new Set([
      ...Object.keys(pathsMap),
      ...Object.keys(episodesMap)
    ]);

    allEpKeys.forEach((epKey) => {
      if (epKey === "subtitle" || epKey.endsWith("_sub") || epKey === "sub") return;

      const pathVal =
        pathsMap[epKey] ||
        (typeof episodesMap[epKey] === "string"
          ? episodesMap[epKey]
          : episodesMap[epKey]?.path || episodesMap[epKey]?.localPath);

      if (pathVal && typeof pathVal === "string" && !isSubtitleFile(pathVal)) {
        const subVal =
          (typeof episodesMap[epKey] === "object" ? episodesMap[epKey]?.subPath : "") ||
          pathsMap[`${epKey}_sub`] ||
          userPathObj.subPath ||
          item.subPath ||
          item.subtitle_path ||
          "";

        const epTitle = epKey === "default" ? (item.title || "Series") : `${item.title || "Series"} - ${epKey}`;

        result.push({
          title: epTitle,
          path: cleanLocalPath(pathVal),
          subPath: cleanLocalPath(subVal)
        });
      }
    });

    if (result.length === 0) {
      const { path, subPath } = resolveMediaPaths(item, currentUserUid);
      if (path) {
        result.push({ title: item.title || "Series", path, subPath });
      }
    }
  }

  return result;
};

/**
 * Generates and downloads a Master .m3u playlist containing ALL movies & TV series episodes in the library
 */
export const exportMasterM3uPlaylist = (mediaItems, addToast, currentUserUid = "") => {
  if (!mediaItems || mediaItems.length === 0) {
    if (addToast) addToast("No items found in your library to export.", "warning");
    return;
  }

  let m3uContent = `#EXTM3U\n`;
  let itemCounter = 0;

  mediaItems.forEach((item) => {
    const entries = getItemPathsAndSubtitles(item, currentUserUid);
    entries.forEach((entry) => {
      const cleanPath = cleanLocalPath(entry.path);
      const cleanSub = cleanLocalPath(entry.subPath);
      const cleanTitle = (entry.title || "Media").replace(/[^a-zA-Z0-9_\-\s]/g, "");

      if (cleanSub) {
        m3uContent += `#EXTVLCOPT:sub-file=${cleanSub}\n`;
        m3uContent += `#EXTVLCOPT:sub-track=0\n`;
      }
      m3uContent += `#EXTINF:-1,${cleanTitle}\n${cleanPath}\n\n`;
      itemCounter++;
    });
  });

  if (itemCounter === 0) {
    if (addToast) addToast("No local media paths configured in library items.", "warning");
    return;
  }

  const blob = new Blob([m3uContent], { type: "audio/x-mpegurl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Film_Library_Master_Playlist.m3u";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (addToast) {
    addToast(`Exported Master VLC Playlist with ${itemCounter} media entries!`, "success");
  }
};

