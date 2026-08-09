import React, { useState, useRef } from "react";
import { 
  Film, Tv, Save, ArrowLeft, HardDrive, Sparkles, FolderPlus, Loader2, CheckCircle2, AlertCircle, CheckSquare, Square, RefreshCw, FolderSearch, Edit3, Search
} from "lucide-react";
import { TmdbSearchInput } from "../components/TmdbSearchInput";
import { getTmdbDetails, searchTmdb } from "../services/tmdb";
import { saveMediaEntry, saveMediaEntriesBatch } from "../services/storage";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".m4v", ".webm", ".flv", ".ts"];
const SUB_EXTENSIONS = [".srt", ".ass", ".vtt", ".sub", ".txt", ".nfo"];

export const isVideoFilePath = (path) => {
  if (!path) return false;
  const extIndex = path.lastIndexOf(".");
  if (extIndex === -1) return false;
  const ext = path.substring(extIndex).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
};

export const extractTitleAndYearFromPath = (fullPath) => {
  if (!fullPath) return { cleanTitle: "", year: null };

  const normalized = fullPath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) return { cleanTitle: "", year: null };
  
  let rawName = parts[parts.length - 1];

  [...VIDEO_EXTENSIONS, ...SUB_EXTENSIONS].forEach((ext) => {
    if (rawName.toLowerCase().endsWith(ext)) {
      rawName = rawName.substring(0, rawName.length - ext.length);
    }
  });

  let extractedYear = null;
  const yearMatch = rawName.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    extractedYear = parseInt(yearMatch[1], 10);
  }

  let clean = rawName;

  // 1. Remove bracketed years e.g. (2021), [2021], or standalone year 2021
  clean = clean.replace(/[\[\(]?\b(19\d\d|20\d\d)\b[\]\)]?/g, " ");

  // 2. Remove prefix tags like P05, P01, P-05, P_05, M01, E01, S01E01, numeric index "01 - ", "1 - "
  clean = clean.replace(/^(?:\[?\s*P[-_]?\d+\s*\]?|\[?\s*M[-_]?\d+\s*\]?|\[?\s*E[-_]?\d+\s*\]?|\[?\s*S\d+E\d+\s*\]?|\d{1,3}\s*[-_.]\s*)/i, "");

  // 3. Remove inline or trailing season patterns e.g. "- S01", "- Season 1", "S01", "Season 01"
  clean = clean.replace(/(?:[.\s_–-]+(?:Season|Saisons?|Stafell|Temporada|Seizoen|S)[\.\s_\-]*\d{1,2}\b.*$)/i, "");

  // 4. Remove leading bracket tags e.g. [1080p], [HEVC], [NF]
  clean = clean.replace(/^\[[^\]]+\]\s*/g, "").replace(/\s*\[[^\]]+\]$/g, "");

  // 5. Remove quality & release tags
  const tags = [
    "1080p", "720p", "4k", "2160p", "bluray", "web-dl", "webrip", "hdrip", "dvdrip",
    "x264", "x265", "hevc", "aac", "dts", "repack", "remux", "hdr", "dual audio",
    "p01", "p02", "p03", "p04", "p05", "p06", "p07", "p08", "p09", "p10"
  ];
  tags.forEach((tag) => {
    const reg = new RegExp(`\\b${tag}\\b`, "gi");
    clean = clean.replace(reg, "");
  });

  clean = clean.replace(/^[-\s._–]+/, "");
  clean = clean.replace(/[-\s._–]+$/, "");
  clean = clean.replace(/[._]/g, " ");
  clean = clean.replace(/\s+-\s+/g, " ");
  clean = clean.replace(/\s+/g, " ").trim();

  return {
    cleanTitle: clean || rawName.trim(),
    year: extractedYear
  };
};

export const extractCleanTitleFromPath = (fullPath) => {
  return extractTitleAndYearFromPath(fullPath).cleanTitle;
};

export const isSeasonFolderName = (folderName) => {
  if (!folderName) return false;
  const clean = folderName.trim();
  if (/^(?:Season|Saisons?|Stafell|Temporada|Seizoen|S)[\.\s_\-]*\d{1,2}(?:[\.\s_\-]*[\(\[][^\)\]]+[\)\]])?$/i.test(clean)) {
    return true;
  }
  if (/^(?:Specials|Extras|Bonus)(?:[\.\s_\-]*[\(\[][^\)\]]+[\)\]])?$/i.test(clean)) {
    return true;
  }
  // Check if string becomes empty when stripping year, season, and prefix tags
  const { cleanTitle } = extractTitleAndYearFromPath(clean);
  return !cleanTitle;
};

export const extractSeasonNumberFromFolder = (folderName) => {
  if (!folderName) return 1;
  if (/^(?:Specials|Extras|Bonus)$/i.test(folderName.trim())) return 0;
  const match = folderName.match(/(?:Season|Saisons?|Stafell|Temporada|Seizoen|S)[\.\s_\-]*(\d{1,2})\b/i) || folderName.match(/\b\d{1,2}\b/);
  if (match) return parseInt(match[1] || match[0], 10);
  return 1;
};

export const isGenericLibraryFolderName = (folderName) => {
  if (!folderName) return true;
  const lower = folderName.trim().toLowerCase();
  if (/^[a-z]:$/i.test(lower) || /^[a-z]:\\?$/i.test(lower)) return true;
  const generics = [
    "downloads", "download", "movies", "movie", "series", "tv series", "tv shows",
    "tv", "shows", "video", "videos", "films", "film", "media", "desktop",
    "documents", "content", "completed", "torrents", "torrent", "uncategorized",
    "new folder", "my videos", "my movies"
  ];
  return generics.includes(lower);
};

export const parseTvShowFileName = (fullPathOrFileName, rootFolderPath = "") => {
  if (!fullPathOrFileName) return { isTv: false, seriesTitle: "", season: 1, episode: null, year: null };

  const normalized = fullPathOrFileName.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const fileName = parts.length > 0 ? parts[parts.length - 1] : normalized;
  const folderParts = parts.slice(0, -1);

  let baseName = fileName;
  const extIdx = baseName.lastIndexOf(".");
  if (extIdx !== -1) {
    baseName = baseName.substring(0, extIdx);
  }

  let text = baseName.replace(/^\[[^\]]+\]\s*/g, "").replace(/\s*\[[^\]]+\]$/g, "");

  let isTv = false;
  let seasonFromFile = null;
  let episodeFromFile = null;
  let seriesTitleRawFromFile = "";

  // 1. Regex S01E01 / S1E1 / S01 E01 / S01.E01 / S01_E01 / S01-E01 / S01Ep01
  const reg1 = /^(?:(.+?)[.\s_–-]+)?S(\d{1,2})[.\s_–-]*(?:Episode|Ep|E)?[.\s_–-]*(\d{1,3})/i;
  let match = text.match(reg1);

  if (match) {
    isTv = true;
    seriesTitleRawFromFile = match[1] || "";
    seasonFromFile = parseInt(match[2], 10);
    episodeFromFile = parseInt(match[3], 10);
  } else {
    // 2. Regex 3x01 / 03x01
    const reg2 = /^(?:(.+?)[.\s_–-]+)?(\d{1,2})x(\d{1,3})/i;
    match = text.match(reg2);
    if (match) {
      isTv = true;
      seriesTitleRawFromFile = match[1] || "";
      seasonFromFile = parseInt(match[2], 10);
      episodeFromFile = parseInt(match[3], 10);
    } else {
      // 3. Regex Season 3 Episode 1 / Season 03 Ep 01
      const reg3 = /^(?:(.+?)[.\s_–-]+)?Season[.\s_–-]*(\d{1,2})[.\s_–-]*(?:Episode|Ep|E)?[.\s_–-]*(\d{1,3})/i;
      match = text.match(reg3);
      if (match) {
        isTv = true;
        seriesTitleRawFromFile = match[1] || "";
        seasonFromFile = parseInt(match[2], 10);
        episodeFromFile = parseInt(match[3], 10);
      } else {
        // 4. Regex Episode 01 / Ep 01 / E01
        const reg4 = /^(?:(.+?)[.\s_–-]+)?(?:Episode|Ep|E)[.\s_–-]*(\d{1,3})/i;
        match = text.match(reg4);
        if (match) {
          isTv = true;
          seriesTitleRawFromFile = match[1] || "";
          seasonFromFile = 1;
          episodeFromFile = parseInt(match[3], 10);
        } else {
          // 5. Regex 301 or 101 (Season 3 Ep 01, Season 1 Ep 01)
          const reg5 = /^(.+?)[.\s_–-]+(\d{1})(\d{2})\b/i;
          match = text.match(reg5);
          if (match) {
            isTv = true;
            seriesTitleRawFromFile = match[1] || "";
            seasonFromFile = parseInt(match[2], 10);
            episodeFromFile = parseInt(match[3], 10);
          } else {
            // 6. Loose episode number e.g. "01.mp4" inside subfolder
            const reg6 = /^(?:Ep|Episode|E)?[\.\s_\-]*(\d{1,3})$/i;
            match = text.match(reg6);
            if (match && parts.length >= 2) {
              isTv = true;
              seriesTitleRawFromFile = "";
              seasonFromFile = 1;
              episodeFromFile = parseInt(match[1], 10);
            }
          }
        }
      }
    }
  }

  // 2. Folder hierarchy analysis
  let seasonFromFolder = null;
  let seriesTitleFromFolder = "";
  let yearFromFolder = null;

  for (let i = folderParts.length - 1; i >= 0; i--) {
    const folder = folderParts[i];
    
    if (isGenericLibraryFolderName(folder)) {
      continue;
    }

    // Check if folder itself contains a season pattern (e.g. "Season 1", "S01", "P05 - (2021) - Hawkeye - S01")
    const seasonPatternMatch = folder.match(/(?:[.\s_–-]+|^)(?:Season|Saisons?|Stafell|Temporada|Seizoen|S)[\.\s_\-]*(\d{1,2})\b/i);
    if (seasonPatternMatch) {
      isTv = true;
      if (seasonFromFolder === null) {
        seasonFromFolder = parseInt(seasonPatternMatch[1], 10);
      }
    }

    if (isSeasonFolderName(folder)) {
      continue;
    }

    // Normal or compound folder name (e.g. "Breaking Bad" or "P05 - (2021) - Hawkeye - S01")
    const { cleanTitle, year: fYear } = extractTitleAndYearFromPath(folder);
    if (fYear && !yearFromFolder) yearFromFolder = fYear;

    if (cleanTitle && !isGenericLibraryFolderName(cleanTitle) && !isSeasonFolderName(cleanTitle)) {
      isTv = true;
      seriesTitleFromFolder = cleanTitle;
      break;
    }
  }

  // 3. Fallback to rootFolderPath if seriesTitleFromFolder is still empty
  let seriesTitleFromRoot = "";
  let yearFromRoot = null;
  if (rootFolderPath) {
    const cleanRoot = rootFolderPath.replace(/\\/g, "/").split("/").filter(Boolean).pop() || "";
    if (cleanRoot && !isSeasonFolderName(cleanRoot) && !isGenericLibraryFolderName(cleanRoot)) {
      const { cleanTitle, year: rYear } = extractTitleAndYearFromPath(cleanRoot);
      if (cleanTitle) seriesTitleFromRoot = cleanTitle;
      if (rYear) yearFromRoot = rYear;
    }
  }

  // 4. Resolve Series Title
  let cleanTitleFromFile = "";
  let yearFromFile = null;
  if (seriesTitleRawFromFile) {
    const parsedFile = extractTitleAndYearFromPath(seriesTitleRawFromFile);
    cleanTitleFromFile = parsedFile.cleanTitle;
    yearFromFile = parsedFile.year;
    if (isGenericLibraryFolderName(cleanTitleFromFile)) cleanTitleFromFile = "";
  }

  // Precedence for series title:
  // 1) Folder title (e.g. "Hawkeye" from P05 - (2021) - Hawkeye - S01)
  // 2) Title from filename if valid (e.g. "Hawkeye" from Hawkeye.S01E01.mp4)
  // 3) Root folder title
  // 4) Clean title from filename
  let finalSeriesTitle = seriesTitleFromFolder || cleanTitleFromFile || seriesTitleFromRoot;

  if (!finalSeriesTitle) {
    const { cleanTitle } = extractTitleAndYearFromPath(fileName);
    finalSeriesTitle = cleanTitle || baseName;
  }

  const finalSeason = seasonFromFolder !== null ? seasonFromFolder : (seasonFromFile !== null ? seasonFromFile : 1);
  const finalEpisode = episodeFromFile !== null ? episodeFromFile : null;

  let finalYear = yearFromFolder || yearFromFile || yearFromRoot;
  if (!finalYear) {
    const yearMatch = (seriesTitleRawFromFile || finalSeriesTitle || fullPathOrFileName).match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) {
      finalYear = parseInt(yearMatch[1], 10);
    }
  }

  return {
    isTv,
    seriesTitle: finalSeriesTitle,
    season: finalSeason,
    episode: finalEpisode,
    year: finalYear
  };
};

export const parseSeasonAndEpisode = (fileNameOrPath) => {
  const parsed = parseTvShowFileName(fileNameOrPath);
  return { isTv: parsed.isTv, season: parsed.season, episode: parsed.episode };
};

export const extractSeriesTitleFromPath = (fullPath) => {
  const parsed = parseTvShowFileName(fullPath);
  return { cleanSeriesTitle: parsed.seriesTitle, year: parsed.year, isFolderSeries: parsed.isTv };
};

export const findBestMatchingSubtitle = (videoPath, fileList = []) => {
  if (!videoPath) return "";

  const normalizedVideoPath = videoPath.replace(/\\/g, "/");
  const lastSlashIdx = normalizedVideoPath.lastIndexOf("/");
  const dirPath = lastSlashIdx !== -1 ? videoPath.substring(0, lastSlashIdx + 1).replace(/\//g, "\\") : "";
  const videoFileName = lastSlashIdx !== -1 ? normalizedVideoPath.substring(lastSlashIdx + 1) : normalizedVideoPath;

  const videoExtIdx = videoFileName.lastIndexOf(".");
  const videoBaseName = videoExtIdx !== -1 ? videoFileName.substring(0, videoExtIdx) : videoFileName;

  const cleanName = (name) => {
    return name
      .toLowerCase()
      .replace(/[._\-]/g, " ")
      .replace(/\b(19\d\d|20\d\d)\b/gi, "")
      .replace(/\b(ar|ara|arabic|en|eng|english|1080p|720p|4k|2160p|bluray|web-dl|webrip|hdrip|dvdrip|x264|x265|hevc|aac|dts|repack|remux|hdr|dual audio)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const videoClean = cleanName(videoBaseName);

  if (fileList && fileList.length > 0) {
    const subCandidates = fileList.filter((f) => {
      const name = typeof f === "string" ? f : f.name;
      const lower = name.toLowerCase();
      return SUB_EXTENSIONS.some((ext) => lower.endsWith(ext));
    });

    let bestMatch = null;
    let highestScore = 0;

    for (const subFile of subCandidates) {
      const subName = typeof subFile === "string" ? subFile : subFile.name;
      const subExtIdx = subName.lastIndexOf(".");
      const subBaseName = subExtIdx !== -1 ? subName.substring(0, subExtIdx) : subName;

      const subBaseClean = subBaseName.toLowerCase();
      const vidBaseClean = videoBaseName.toLowerCase();

      // Direct prefix / exact / suffix match (e.g. Blade.srt, Blade.ar.srt, Blade.en.srt, Blade_Arabic.srt)
      if (subBaseClean === vidBaseClean ||
          subBaseClean.startsWith(vidBaseClean) ||
          vidBaseClean.startsWith(subBaseClean)) {
        return dirPath ? `${dirPath}${subName}` : subName;
      }

      const subClean = cleanName(subBaseName);
      if (subClean === videoClean && videoClean.length > 1) {
        return dirPath ? `${dirPath}${subName}` : subName;
      }

      if (subClean.includes(videoClean) || videoClean.includes(subClean)) {
        const score = Math.min(subClean.length, videoClean.length) / Math.max(subClean.length, videoClean.length);
        if (score > highestScore && score >= 0.5) {
          highestScore = score;
          bestMatch = subName;
        }
      }
    }

    if (bestMatch) {
      return dirPath ? `${dirPath}${bestMatch}` : bestMatch;
    }
  }

  // Default auto-predicted subtitle path (.srt)
  if (dirPath && videoBaseName) {
    return `${dirPath}${videoBaseName}.srt`;
  }

  return "";
};

export const AddEditMedia = ({ editItem, onSaveSuccess, onCancel }) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const folderInputRef = useRef(null);

  // Batch Scanner 3-Step State: "input" -> "scanning" -> "confirm"
  const [batchStep, setBatchStep] = useState("input");
  const [folderPath, setFolderPath] = useState("");
  const [fileListText, setFileListText] = useState("");
  const [scanProgress, setScanProgress] = useState("");
  const [scannedResults, setScannedResults] = useState([]);
  const [savingBatch, setSavingBatch] = useState(false);
  const [saveProgressData, setSaveProgressData] = useState({ current: 0, total: 0, title: "", percentage: 0 });
  const [editingResultIndex, setEditingResultIndex] = useState(null);

  const handleSelectFolderFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const videoFiles = files.filter((f) => {
      const extIndex = f.name.lastIndexOf(".");
      if (extIndex === -1) return false;
      const ext = f.name.substring(extIndex).toLowerCase();
      return VIDEO_EXTENSIONS.includes(ext);
    });

    if (videoFiles.length === 0) {
      addToast("No video files (.mp4, .mkv, .avi) found in the selected folder.", "warning");
      return;
    }

    const firstRelativePath = videoFiles[0].webkitRelativePath || "";
    const pathParts = firstRelativePath.split("/");
    const detectedFolderName = pathParts.length > 1 ? pathParts[0] : "";

    if (!folderPath && detectedFolderName) {
      setFolderPath(detectedFolderName);
    }

    // Preserve relative subfolder structure (e.g., "Inception (2010)\Inception.mp4")
    const fileNamesList = videoFiles.map((f) => {
      if (f.webkitRelativePath) {
        const parts = f.webkitRelativePath.split("/");
        if (parts.length > 1) {
          return parts.slice(1).join("\\");
        }
      }
      return f.name;
    }).join("\n");

    setFileListText(fileNamesList);
    const subCount = files.filter((f) => SUB_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))).length;
    const subMsg = subCount > 0 ? ` & ${subCount} subtitle track(s) (.srt)!` : "!";
    addToast(`Discovered ${videoFiles.length} video file(s)${subMsg}`, "success");
  };

  // Step 1 -> Step 2: Smart Batch Scanning (Groups TV Series subfolders into 1 Card!)
  const handleStartBatchScan = async (e) => {
    e.preventDefault();

    const lines = fileListText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const videoItems = lines.filter((line) => isVideoFilePath(line));

    if (videoItems.length === 0) {
      addToast("Please click 'Select Local PC Folder' or paste video file names (.mp4, .mkv). Folders must contain video files.", "error");
      return;
    }

    setBatchStep("scanning");

    const baseFolder = folderPath.trim().replace(/\\$/g, "");
    
    // Group files into TV Series vs Standalone Movies
    const seriesGroups = {};
    const movieItems = [];

    for (let i = 0; i < videoItems.length; i++) {
      const rawItem = videoItems[i];
      const fullItemPath = rawItem.includes(":") || rawItem.startsWith("\\") || rawItem.startsWith("/")
        ? rawItem
        : (baseFolder ? `${baseFolder}\\${rawItem.replace(/\//g, "\\")}` : rawItem.replace(/\//g, "\\"));

      const tvInfo = parseTvShowFileName(rawItem, baseFolder);

      if (tvInfo.isTv && tvInfo.seriesTitle) {
        const seriesTitle = tvInfo.seriesTitle;
        const groupKey = seriesTitle.toLowerCase();

        if (!seriesGroups[groupKey]) {
          seriesGroups[groupKey] = {
            seriesTitle: seriesTitle,
            year: tvInfo.year,
            episodes: []
          };
        } else if (!seriesGroups[groupKey].year && tvInfo.year) {
          seriesGroups[groupKey].year = tvInfo.year;
        }

        const seasonNum = tvInfo.season || 1;
        const epNum = tvInfo.episode || (seriesGroups[groupKey].episodes.length + 1);

        seriesGroups[groupKey].episodes.push({
          rawItem,
          fullItemPath,
          season: seasonNum,
          episode: epNum
        });
      } else {
        const { cleanTitle, year } = extractTitleAndYearFromPath(rawItem);
        movieItems.push({
          rawItem,
          fullItemPath,
          cleanTitle: cleanTitle || rawItem,
          year
        });
      }
    }

    const results = [];

    // Process TV Series Groups (Fetches TMDB ONCE for the whole series!)
    const seriesKeys = Object.keys(seriesGroups);
    for (let i = 0; i < seriesKeys.length; i++) {
      const group = seriesGroups[seriesKeys[i]];
      setScanProgress(`Scanning TV Series (${i + 1}/${seriesKeys.length}): Fetching metadata for "${group.seriesTitle}"...`);

      try {
        // Sort episodes by season then episode
        group.episodes.sort((a, b) => a.season - b.season || a.episode - b.episode);

        // Ensure unique episode codes within season
        const usedCodes = new Set();
        group.episodes.forEach((ep) => {
          let currentEp = ep.episode;
          while (usedCodes.has(`S${ep.season}E${currentEp}`)) {
            currentEp++;
          }
          ep.episode = currentEp;
          usedCodes.add(`S${ep.season}E${currentEp}`);
        });

        const searchResults = await searchTmdb(group.seriesTitle, group.year, "series");
        const topMatch = (group.year && searchResults?.find((r) => r.year === group.year)) || searchResults?.[0];

        let details = null;
        if (topMatch) {
          details = await getTmdbDetails(topMatch.tmdb_id, "series");
        }

        // Map all episode paths (S1E1, S1E2...) into new_paths
        const episodePathsMap = {};
        let maxSeason = 1;
        const seasonEpCounts = {};

        group.episodes.forEach((ep) => {
          const epCode = `S${ep.season}E${ep.episode}`;
          const subPath = findBestMatchingSubtitle(ep.fullItemPath);
          episodePathsMap[epCode] = ep.fullItemPath;
          if (subPath) {
            episodePathsMap[`${epCode}_sub`] = subPath;
          }

          if (ep.season > maxSeason) maxSeason = ep.season;
          seasonEpCounts[ep.season] = Math.max(seasonEpCounts[ep.season] || 0, ep.episode);
        });

        const firstEpPath = group.episodes[0].fullItemPath;
        const firstEpSub = findBestMatchingSubtitle(firstEpPath);
        episodePathsMap["default"] = firstEpPath;
        episodePathsMap["subtitle"] = firstEpSub;

        const seasonsArr = Array.from({ length: maxSeason }).map((_, idx) => ({
          season_number: idx + 1,
          episode_count: seasonEpCounts[idx + 1] || 10
        }));

        if (details) {
          results.push({
            selected: true,
            filePath: firstEpPath,
            rawFileName: `${group.seriesTitle} (${group.episodes.length} episode files detected)`,
            episodesCount: group.episodes.length,
            mediaData: {
              ...details,
              type: "series",
              seasons: seasonsArr,
              total_episodes: group.episodes.length,
              subtitle_path: firstEpSub,
              new_paths: episodePathsMap
            }
          });
        } else {
          results.push({
            selected: true,
            filePath: firstEpPath,
            rawFileName: `${group.seriesTitle} (${group.episodes.length} episode files detected)`,
            episodesCount: group.episodes.length,
            mediaData: {
              tmdb_id: Date.now() + Math.floor(Math.random() * 10000),
              type: "series",
              title: group.seriesTitle,
              year: group.year || new Date().getFullYear(),
              poster_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
              backdrop_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&auto=format&fit=crop&q=80",
              genres: ["TV Series"],
              imdb_rating: 8.5,
              overview: `Local TV Series folder with ${group.episodes.length} episode files.`,
              seasons: seasonsArr,
              total_episodes: group.episodes.length,
              subtitle_path: firstEpSub,
              new_paths: episodePathsMap
            }
          });
        }
      } catch (err) {
        console.error(`Error scanning series ${group.seriesTitle}:`, err);
      }
    }

    // Process Standalone Movies
    for (let i = 0; i < movieItems.length; i++) {
      const item = movieItems[i];
      setScanProgress(`Scanning Movies (${i + 1}/${movieItems.length}): Fetching metadata for "${item.cleanTitle}"...`);

      try {
        const searchResults = await searchTmdb(item.cleanTitle, item.year, "movie");
        const topMatch = (item.year && searchResults?.find((r) => r.year === item.year)) || searchResults?.[0];

        const matchedSubPath = findBestMatchingSubtitle(item.fullItemPath);

        if (topMatch) {
          const details = await getTmdbDetails(topMatch.tmdb_id, "movie");
          results.push({
            selected: true,
            filePath: item.fullItemPath,
            rawFileName: item.rawItem,
            mediaData: {
              ...details,
              type: "movie",
              subtitle_path: matchedSubPath,
              new_paths: { default: item.fullItemPath, subtitle: matchedSubPath }
            }
          });
        } else {
          results.push({
            selected: true,
            filePath: item.fullItemPath,
            rawFileName: item.rawItem,
            mediaData: {
              tmdb_id: Date.now() + Math.floor(Math.random() * 10000),
              type: "movie",
              title: item.cleanTitle,
              year: item.year || new Date().getFullYear(),
              poster_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
              backdrop_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&auto=format&fit=crop&q=80",
              genres: ["Cinema"],
              imdb_rating: 8.0,
              overview: `Local video file: ${item.fullItemPath}`,
              subtitle_path: matchedSubPath,
              new_paths: { default: item.fullItemPath, subtitle: matchedSubPath }
            }
          });
        }
      } catch (err) {
        console.error(`Error scanning movie ${item.cleanTitle}:`, err);
      }
    }

    setScannedResults(results);
    setBatchStep("confirm");
  };

  const toggleItemSelection = (index) => {
    setScannedResults((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleUpdateItemTmdbMatch = async (index, newSelectedMedia) => {
    try {
      addToast(`Updating metadata for "${newSelectedMedia.title}"...`, "info");
      const details = await getTmdbDetails(newSelectedMedia.tmdb_id, newSelectedMedia.type);
      
      setScannedResults((prev) =>
        prev.map((item, idx) => {
          if (idx === index) {
            return {
              ...item,
              mediaData: {
                ...details,
                new_paths: { default: item.filePath }
              }
            };
          }
          return item;
        })
      );
      setEditingResultIndex(null);
      addToast(`Updated match for item #${index + 1}!`, "success");
    } catch (err) {
      addToast(`Failed to update match: ${err.message}`, "error");
    }
  };

  // Fast Batch Save & Automatic Direct Navigation to The Library
  const handleConfirmBatchSave = async () => {
    const selectedItems = scannedResults.filter((r) => r.selected);
    if (selectedItems.length === 0) {
      addToast("Please select at least one movie/series to save.", "warning");
      return;
    }

    setSavingBatch(true);
    const mediaDataList = selectedItems.map((item) => item.mediaData);

    try {
      const totalSaved = await saveMediaEntriesBatch(
        mediaDataList,
        currentUser,
        (current, total, title, percentage) => {
          setSaveProgressData({ current, total, title, percentage });
        }
      );

      // Brief flash at 100% completion so user sees "Done!" banner
      setSaveProgressData({
        current: selectedItems.length,
        total: selectedItems.length,
        title: "All Items Processed Successfully!",
        percentage: 100
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      setSavingBatch(false);
      addToast(`Successfully added all ${totalSaved} items to your shared library!`, "success");
      onSaveSuccess();
    } catch (err) {
      console.error("Batch save error:", err);
      addToast(`Error saving batch: ${err.message}`, "error");
      setSavingBatch(false);
    }
  };

  const getModeTabStyle = (tabMode) => {
    const isActive = mode === tabMode;
    return {
      flex: 1,
      padding: "12px 18px",
      backgroundColor: isActive ? "var(--accent-red)" : "#1c1c1c",
      color: isActive ? "#ffffff" : "#a3a3a3",
      border: isActive ? "1px solid var(--accent-red)" : "1px solid #2a2a2a",
      boxShadow: isActive ? "0 4px 14px rgba(229, 9, 20, 0.4)" : "none",
      fontWeight: isActive ? 800 : 600,
      fontSize: "0.95rem",
      borderRadius: "8px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      outline: "none"
    };
  };

  return (
    <div style={styles.container} className="animate-fade">
      {/* Live Batch Saving Overlay Modal */}
      {savingBatch && (
        <div style={styles.savingOverlay}>
          <div style={styles.savingBox} className="glass-modal">
            {saveProgressData.percentage === 100 ? (
              <CheckCircle2 size={58} color="var(--accent-green)" className="animate-pop" />
            ) : (
              <Loader2 size={54} color="var(--accent-green)" className="animate-spin" />
            )}

            <h2 style={styles.savingHeader}>
              {saveProgressData.percentage === 100 ? "Done! Added to Library" : "Saving Items to Shared Library"}
            </h2>

            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: `${saveProgressData.percentage}%` }} />
            </div>

            <div style={styles.savingPctText}>{saveProgressData.percentage}% Complete</div>

            <div style={styles.savingDetailText}>
              {saveProgressData.percentage === 100 ? (
                <div style={{ color: "var(--accent-green)", fontWeight: 700 }}>
                  All items added! Redirecting you to The Library...
                </div>
              ) : (
                <>
                  Saving item <strong>#{saveProgressData.current}</strong> of <strong>{saveProgressData.total}</strong>:
                  <div style={styles.savingMovieTitle}>"{saveProgressData.title}"</div>
                  <span style={styles.savingRemainingText}>
                    ({saveProgressData.total - saveProgressData.current} items remaining)
                  </span>
                </>
              )}
            </div>

            {saveProgressData.percentage === 100 && (
              <button
                type="button"
                style={styles.doneRedirectBtn}
                onClick={() => {
                  setSavingBatch(false);
                  onSaveSuccess();
                }}
              >
                <CheckCircle2 size={16} /> Go to The Library Now
              </button>
            )}
          </div>
        </div>
      )}

      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onCancel}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1 style={styles.title}>{editItem ? "Edit Media Entry" : "Add New Films or TV Series"}</h1>
      </div>

      {/* BATCH FOLDER SCANNER 3-STEP WIZARD UI */}
      <div style={styles.batchCard} className="glass-panel">
        {batchStep === "input" && (
          <form onSubmit={handleStartBatchScan} style={styles.batchInnerForm}>
            <div style={styles.batchHeader}>
              <FolderPlus size={32} color="var(--accent-green)" />
              <div>
                <h3 style={styles.batchTitle}>Step 1: Select Local Folder or Paste Video Files</h3>
                <p style={styles.batchSub}>
                  Click **Select Local PC Folder** below. Chrome will read every video file (.mp4, .mkv) in your folder, ignore subtitle files (.srt), fetch full metadata, and present a review checklist before adding anything!
                </p>
              </div>
            </div>

            {/* Native Folder Selector Button */}
            <div style={styles.folderPickerSection}>
              <input
                type="file"
                ref={folderInputRef}
                onChange={handleSelectFolderFiles}
                style={{ display: "none" }}
                webkitdirectory="true"
                directory="true"
                multiple
              />
              <button
                type="button"
                style={styles.folderPickBtn}
                onClick={() => folderInputRef.current && folderInputRef.current.click()}
              >
                <FolderSearch size={24} /> Step 1: Click Here to Select Your Local PC Movie Folder
              </button>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Base Folder Path on PC</label>
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="C:\Users\Ahmed\Downloads\English\Marvel Films"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Video Files to Scan (One video file per line)</label>
              <textarea
                rows={6}
                value={fileListText}
                onChange={(e) => setFileListText(e.target.value)}
                placeholder="M02 - (1998) - Blade.mp4&#10;M03 - (2000) - X-Men.mp4&#10;M04 - (2002) - Blade II.mp4&#10;(Click the green button above to auto-detect all video files in your folder!)"
                style={styles.textarea}
                required
              />
              <span style={styles.helpText}>
                Scene prefixes like 'M02 - ' are automatically stripped, and years like '1998' are matched with TMDB automatically!
              </span>
            </div>

            <button type="submit" style={styles.batchSubmitBtn}>
              <Sparkles size={18} /> 🔍 Step 2: Scan Movies & Extract TMDB Details
            </button>
          </form>
        )}

        {batchStep === "scanning" && (
          <div style={styles.loadingState}>
            <Loader2 size={42} color="var(--accent-green)" className="animate-spin" />
            <h3 style={styles.loadingTitle}>Scanning Folder Movies & Extracting TMDB Metadata...</h3>
            <p style={styles.loadingSub}>{scanProgress}</p>
          </div>
        )}

        {batchStep === "confirm" && (
          <div style={styles.confirmState}>
            <div style={styles.confirmHeader}>
              <CheckCircle2 size={28} color="var(--accent-green)" />
              <div>
                <h3 style={styles.batchTitle}>Step 3: Verify TMDB Information & Confirm</h3>
                <p style={styles.batchSub}>
                  We scanned {scannedResults.length} movie(s). Verify the information below! If any TMDB match is wrong, click **Change TMDB Match** to fix it before saving!
                </p>
              </div>
            </div>

            {/* Scanned Results Checklist & TMDB Match Adjuster Grid */}
            <div style={styles.resultsGrid}>
              {scannedResults.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.resultCard,
                    ...(item.selected ? styles.resultCardSelected : {})
                  }}
                >
                  <div style={styles.checkboxArea} onClick={() => toggleItemSelection(idx)}>
                    {item.selected ? (
                      <CheckSquare size={24} color="var(--accent-green)" />
                    ) : (
                      <Square size={24} color="var(--text-muted)" />
                    )}
                  </div>

                  <img
                    src={item.mediaData.poster_url}
                    alt={item.mediaData.title}
                    style={styles.resultPoster}
                    onClick={() => toggleItemSelection(idx)}
                  />

                  <div style={styles.resultInfo}>
                    <div style={styles.resultTitleRow}>
                      <span style={styles.resultTitle}>{item.mediaData.title}</span>
                      <span style={styles.resultYear}>({item.mediaData.year})</span>
                    </div>
                    <div style={styles.resultMeta}>
                      <span style={styles.resultBadge}>{item.mediaData.type.toUpperCase()}</span>
                      <span style={styles.resultRating}>⭐ {item.mediaData.imdb_rating}</span>
                      <span style={styles.resultGenres}>
                        {(item.mediaData.genres || []).slice(0, 2).join(", ")}
                      </span>
                    </div>
                    <div style={styles.resultPath} title={item.filePath}>
                      📁 {item.rawFileName || item.filePath}
                    </div>

                    {/* Interactive Change TMDB Match button */}
                    {editingResultIndex === idx ? (
                      <div style={styles.editTmdbBox} onClick={(e) => e.stopPropagation()}>
                        <label style={styles.label}>Search Correct TMDB Entry:</label>
                        <TmdbSearchInput
                          onSelectMedia={(selected) => handleUpdateItemTmdbMatch(idx, selected)}
                          initialQuery={item.mediaData.title}
                        />
                        <button
                          type="button"
                          style={styles.cancelEditBtn}
                          onClick={() => setEditingResultIndex(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        style={styles.fixMatchBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingResultIndex(idx);
                        }}
                      >
                        <Edit3 size={13} /> Change TMDB Match
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Confirm Actions */}
            <div style={styles.confirmActionRow}>
              <button
                type="button"
                style={styles.reScanBtn}
                onClick={() => setBatchStep("input")}
                disabled={savingBatch}
              >
                <RefreshCw size={16} /> Back to Scan Input
              </button>

              <button
                type="button"
                style={styles.doneBtn}
                onClick={handleConfirmBatchSave}
                disabled={savingBatch}
              >
                {savingBatch ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                {savingBatch
                  ? "Saving Entries..."
                  : `Done — Add Verified (${scannedResults.filter((r) => r.selected).length}) Items to Library`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  savingOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    zIndex: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px"
  },
  savingBox: {
    width: "100%",
    maxWidth: "520px",
    padding: "40px 32px",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "16px"
  },
  savingHeader: {
    fontSize: "1.4rem",
    fontWeight: 800,
    color: "#ffffff"
  },
  progressTrack: {
    width: "100%",
    height: "14px",
    backgroundColor: "var(--bg-elevated)",
    borderRadius: "10px",
    overflow: "hidden",
    border: "1px solid var(--border-subtle)",
    marginTop: "8px"
  },
  progressBar: {
    height: "100%",
    backgroundColor: "var(--accent-green)",
    borderRadius: "10px",
    transition: "width 0.2s ease",
    boxShadow: "0 0 12px rgba(70,211,105,0.6)"
  },
  savingPctText: {
    fontSize: "1.3rem",
    fontWeight: 900,
    color: "var(--accent-green)"
  },
  savingDetailText: {
    fontSize: "0.92rem",
    color: "var(--text-secondary)",
    lineHeight: "1.5"
  },
  savingMovieTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#ffffff",
    margin: "4px 0"
  },
  savingRemainingText: {
    fontSize: "0.82rem",
    color: "var(--text-muted)",
    display: "block"
  },
  doneRedirectBtn: {
    marginTop: "12px",
    padding: "12px 24px",
    backgroundColor: "var(--accent-green)",
    color: "#000000",
    border: "none",
    borderRadius: "8px",
    fontWeight: 800,
    fontSize: "0.95rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 14px rgba(70,211,105,0.4)"
  },
  container: {
    maxWidth: "1300px",
    margin: "0 auto",
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    gap: "24px"
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "20px"
  },
  backBtn: {
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    color: "#ffffff",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 600
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 800,
    color: "#ffffff"
  },
  modeTabs: {
    display: "flex",
    gap: "12px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    padding: "6px",
    borderRadius: "10px"
  },
  modeTabBtn: {
    flex: 1,
    padding: "12px",
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    fontWeight: 700,
    fontSize: "0.95rem",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "var(--transition)"
  },
  modeTabActive: {
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    boxShadow: "0 4px 14px rgba(229, 9, 20, 0.4)",
    fontWeight: 800
  },
  batchCard: {
    borderRadius: "14px",
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    gap: "24px"
  },
  batchInnerForm: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  batchHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px"
  },
  batchTitle: {
    fontSize: "1.3rem",
    fontWeight: 800,
    color: "#ffffff",
    marginBottom: "4px"
  },
  batchSub: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    lineHeight: "1.5"
  },
  folderPickerSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  folderPickBtn: {
    width: "100%",
    padding: "20px",
    backgroundColor: "var(--bg-elevated)",
    color: "var(--accent-green)",
    border: "2px dashed var(--accent-green)",
    borderRadius: "12px",
    fontWeight: 800,
    fontSize: "1.1rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "14px",
    boxShadow: "0 4px 16px rgba(70,211,105,0.15)",
    transition: "var(--transition)"
  },
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    gap: "16px",
    textAlign: "center"
  },
  loadingTitle: {
    fontSize: "1.3rem",
    fontWeight: 800,
    color: "#ffffff"
  },
  loadingSub: {
    fontSize: "0.95rem",
    color: "var(--accent-green)",
    fontWeight: 600
  },
  confirmState: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  confirmHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px"
  },
  resultsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "18px",
    maxHeight: "480px",
    overflowY: "auto",
    paddingRight: "6px"
  },
  resultCard: {
    display: "flex",
    gap: "14px",
    padding: "14px",
    backgroundColor: "var(--bg-elevated)",
    border: "2px solid var(--border-subtle)",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "var(--transition)",
    position: "relative"
  },
  resultCardSelected: {
    borderColor: "var(--accent-green)",
    backgroundColor: "rgba(70, 211, 105, 0.1)"
  },
  checkboxArea: {
    display: "flex",
    alignItems: "flex-start",
    paddingTop: "4px"
  },
  resultPoster: {
    width: "68px",
    height: "100px",
    objectFit: "cover",
    borderRadius: "6px"
  },
  resultInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
    overflow: "hidden"
  },
  resultTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  resultTitle: {
    fontSize: "0.98rem",
    fontWeight: 700,
    color: "#ffffff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  resultYear: {
    fontSize: "0.8rem",
    color: "var(--text-muted)"
  },
  resultMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.78rem"
  },
  resultBadge: {
    padding: "2px 6px",
    backgroundColor: "var(--bg-surface)",
    color: "#ffffff",
    borderRadius: "4px",
    fontWeight: 700,
    fontSize: "0.7rem"
  },
  resultRating: {
    color: "var(--accent-gold)",
    fontWeight: 700
  },
  resultGenres: {
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  resultPath: {
    fontSize: "0.72rem",
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginTop: "2px"
  },
  fixMatchBtn: {
    marginTop: "6px",
    padding: "4px 8px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    color: "var(--accent-green)",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    alignSelf: "flex-start"
  },
  editTmdbBox: {
    marginTop: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    backgroundColor: "var(--bg-surface)",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid var(--accent-green)"
  },
  cancelEditBtn: {
    alignSelf: "flex-end",
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    fontSize: "0.75rem",
    cursor: "pointer"
  },
  confirmActionRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    paddingTop: "12px",
    borderTop: "1px solid var(--border-subtle)"
  },
  reScanBtn: {
    padding: "12px 20px",
    backgroundColor: "var(--bg-elevated)",
    color: "#ffffff",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  doneBtn: {
    flex: 1,
    padding: "14px 28px",
    backgroundColor: "var(--accent-green)",
    color: "#000000",
    border: "none",
    borderRadius: "8px",
    fontWeight: 800,
    fontSize: "1.05rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    boxShadow: "0 6px 20px rgba(70,211,105,0.4)"
  },
  batchSubmitBtn: {
    padding: "16px 28px",
    backgroundColor: "var(--accent-green)",
    color: "#000000",
    border: "none",
    borderRadius: "8px",
    fontWeight: 800,
    fontSize: "1.05rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    boxShadow: "0 6px 20px rgba(70,211,105,0.4)"
  },
  folderNotice: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    backgroundColor: "rgba(70,211,105,0.12)",
    border: "1px solid var(--accent-green)",
    borderRadius: "8px",
    color: "#ffffff"
  },
  switchModeBtn: {
    padding: "6px 12px",
    backgroundColor: "var(--accent-green)",
    color: "#000000",
    border: "none",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.8rem",
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "28px"
  },
  leftCol: {
    borderRadius: "14px",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },
  rightCol: {
    borderRadius: "14px",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    borderBottom: "1px solid var(--border-subtle)",
    paddingBottom: "12px"
  },
  typeToggle: {
    display: "flex",
    gap: "10px"
  },
  typeBtn: {
    flex: 1,
    padding: "10px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "var(--text-secondary)",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  },
  typeActiveRed: {
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    borderColor: "var(--accent-red)"
  },
  typeActiveGreen: {
    backgroundColor: "var(--accent-green)",
    color: "#000000",
    borderColor: "var(--accent-green)"
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    width: "100%"
  },
  row: {
    display: "flex",
    gap: "14px"
  },
  label: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "0.9rem",
    outline: "none"
  },
  textarea: {
    width: "100%",
    padding: "10px 14px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "0.9rem",
    outline: "none",
    fontFamily: "inherit"
  },
  helpText: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    lineHeight: "1.3"
  },
  subBrowseBtn: {
    padding: "8px 14px",
    backgroundColor: "var(--accent-green)",
    color: "#000000",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.82rem",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    whiteSpace: "nowrap"
  },
  episodeMapperSection: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  subSectionTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#ffffff"
  },
  epMapperGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "240px",
    overflowY: "auto",
    paddingRight: "4px"
  },
  epFieldRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  epBadge: {
    padding: "4px 8px",
    backgroundColor: "rgba(70,211,105,0.2)",
    color: "var(--accent-green)",
    fontWeight: 700,
    fontSize: "0.78rem",
    borderRadius: "4px",
    minWidth: "54px",
    textAlign: "center"
  },
  epInput: {
    flex: 1,
    padding: "8px 12px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "0.85rem",
    outline: "none"
  },
  previewBox: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "center",
    padding: "16px",
    backgroundColor: "var(--bg-elevated)",
    borderRadius: "8px"
  },
  previewImg: {
    width: "120px",
    borderRadius: "8px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.6)"
  },
  submitSection: {
    marginTop: "auto"
  },
  submitBtn: {
    width: "100%",
    padding: "14px 24px",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    boxShadow: "0 6px 20px rgba(229,9,20,0.4)"
  }
};
