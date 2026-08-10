// Code Format Detector & Visual Filename Transformation Preview for Renamer

export function transformFilenamePreview(rawName = "", category = "movie", showNameOverride = "") {
  if (!rawName.trim()) return "";
  const dotIdx = rawName.lastIndexOf(".");
  const ext = dotIdx > 0 ? rawName.substring(dotIdx).toLowerCase() : ".mkv";
  const baseName = dotIdx > 0 ? rawName.substring(0, dotIdx) : rawName;

  if (category === "movie") {
    const yearMatch = baseName.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) {
      const year = yearMatch[1];
      const rawTitle = baseName.substring(0, yearMatch.index);
      let cleanTitle = rawTitle.replace(/[._\-+\[\]()]/g, ' ').trim();
      cleanTitle = cleanTitle.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      return `${cleanTitle || 'Movie'} (${year})${ext}`;
    } else {
      let cleanTitle = baseName.replace(/[._\-+\[\]()]/g, ' ').trim();
      cleanTitle = cleanTitle.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      return `${cleanTitle}${ext}`;
    }
  }

  if (category === "series") {
    // S01E01, 1x01, Season 1 Episode 1
    const sEPattern = /[sS](\d{1,2})[eE](\d{1,2})|(\d{1,2})x(\d{1,2})|[sS]eason\s*(\d{1,2})\s*[eE]pisode\s*(\d{1,2})/;
    const match = baseName.match(sEPattern);
    if (match) {
      const season = parseInt(match[1] || match[3] || match[5] || "1", 10);
      const episode = parseInt(match[2] || match[4] || match[6] || "1", 10);
      
      let show = showNameOverride;
      if (!show) {
        const rawPrefix = baseName.substring(0, match.index);
        const cleanPrefix = rawPrefix.replace(/[._\-+\[\]()]/g, ' ').trim();
        show = cleanPrefix.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
      return `${show || 'TV Show'} - S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}${ext}`;
    } else {
      return `${showNameOverride || 'TV Show'} - S01E01${ext}`;
    }
  }

  if (category === "subtitle") {
    const isSub = ['.srt', '.ass', '.vtt', '.sub'].includes(ext);
    let cleanBase = baseName.replace(/[._\-+\[\]()]/g, ' ').trim();
    cleanBase = cleanBase.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    return isSub ? `${cleanBase}.srt` : `${cleanBase}${ext}`;
  }

  // Multi-part / Generic Folder & File Mapper
  let clean = baseName.replace(/[._\-+\[\]()]/g, ' ').trim();
  clean = clean.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return `${clean}${ext}`;
}

export function detectCodeFormat(parts = []) {
  if (!parts || parts.length === 0) {
    return {
      category: "generic",
      categoryName: "Generic Renamer",
      badge: "Python Code",
      isMultiPart: false,
      partsCount: 0,
      detectedVariables: [],
      detectedPatterns: [],
      detectedModules: [],
      hasDryRun: false,
      examples: [],
      summary: "No code submitted."
    };
  }

  const isMultiPart = parts.length > 1;
  const combinedCode = parts.map(p => p.code || "").join("\n");

  // 1. Detect Python Modules Imported
  const moduleMatches = combinedCode.match(/^(?:from\s+([a-zA-Z0-9_]+)|import\s+([a-zA-Z0-9_]+))/gm) || [];
  const modules = Array.from(new Set(moduleMatches.map(m => {
    const parts = m.replace(/^(from|import)\s+/, '').trim().split(/\s+/);
    return parts[0];
  })));

  // 2. Detect Path & Input Variables
  const varCandidates = [
    { key: "TARGET_DIR", label: "Target Directory Path", regex: /\b(TARGET_DIR|DIRECTORY|FOLDER_PATH|TARGET_PATH|path|dir)\b/i },
    { key: "SHOW_NAME", label: "Show Title Override", regex: /\b(SHOW_NAME|SERIES_NAME|TITLE_OVERRIDE)\b/i },
    { key: "DRY_RUN", label: "Dry Run Preview Flag", regex: /\b(DRY_RUN|PREVIEW_MODE|TEST_RUN)\b/i },
    { key: "VIDEO_EXTS", label: "Video Extensions Filter", regex: /\b(VIDEO_EXTS|EXTENSIONS|MEDIA_EXTS)\b/i }
  ];

  const detectedVariables = varCandidates.filter(v => v.regex.test(combinedCode));

  // 3. Detect Naming Patterns & Regexes
  const detectedPatterns = [];
  if (/S\d+E\d+|season|episode|\d+x\d+/i.test(combinedCode)) {
    detectedPatterns.push({ label: "Season & Episode Formatter (S01E01)", icon: "tv" });
  }
  if (/19\d{2}|20\d{2}|year|\(19\d{2}\)/i.test(combinedCode)) {
    detectedPatterns.push({ label: "4-Digit Year Extractor (19xx / 20xx)", icon: "film" });
  }
  if (/srt|ass|vtt|subtitle|sub_file/i.test(combinedCode)) {
    detectedPatterns.push({ label: "Subtitle Synchronizer (.srt / .ass)", icon: "file-text" });
  }
  if (/{title}|{year}|{season}|{episode}/i.test(combinedCode)) {
    detectedPatterns.push({ label: "Token Placeholders ({title}, {year})", icon: "code" });
  }
  if (/os\.walk|os\.listdir|pathlib/i.test(combinedCode)) {
    detectedPatterns.push({ label: "Recursive File System Walker", icon: "folder" });
  }

  // 4. Detect Dry-Run Support
  const hasDryRun = /\b(DRY_RUN|PREVIEW_MODE|TEST_RUN)\b/i.test(combinedCode);

  // 5. Determine Overall Category
  let category = "generic";
  let categoryName = "Generic File Renamer";
  let badge = "Python Script";

  if (isMultiPart) {
    category = "multi_part";
    categoryName = `Multi-Part Pipeline (${parts.length} Parts)`;
    badge = `${parts.length}-Step Pipeline`;
  } else if (/srt|ass|vtt|difflib|subtitle/i.test(combinedCode)) {
    category = "subtitle";
    categoryName = "Subtitle & Video Synchronizer";
    badge = "Subtitle Sync";
  } else if (/S\d+E\d+|season|episode|\d+x\d+|SHOW_NAME/i.test(combinedCode)) {
    category = "series";
    categoryName = "TV Series Episode Renamer";
    badge = "TV Series Parser";
  } else if (/19\d{2}|20\d{2}|clean_movie_name|movie/i.test(combinedCode)) {
    category = "movie";
    categoryName = "Movie Title & Year Renamer";
    badge = "Movie Standardizer";
  }

  // 6. Generate Concrete BEFORE -> AFTER Format Examples
  let examples = [];
  if (category === "movie") {
    examples = [
      { before: "Inception.2010.1080p.BluRay.x264.mkv", after: transformFilenamePreview("Inception.2010.1080p.BluRay.x264.mkv", "movie") },
      { before: "Gladiator.II.2024.2160p.WEB-DL.DDP5.1.mkv", after: transformFilenamePreview("Gladiator.II.2024.2160p.WEB-DL.DDP5.1.mkv", "movie") },
      { before: "The.Dark.Knight.2008.720p.BrRip.mp4", after: transformFilenamePreview("The.Dark.Knight.2008.720p.BrRip.mp4", "movie") }
    ];
  } else if (category === "series") {
    examples = [
      { before: "Breaking.Bad.S01E01.720p.HDTV.mkv", after: transformFilenamePreview("Breaking.Bad.S01E01.720p.HDTV.mkv", "series") },
      { before: "Game.of.Thrones.1x01.Winter.Is.Coming.mkv", after: transformFilenamePreview("Game.of.Thrones.1x01.Winter.Is.Coming.mkv", "series") },
      { before: "Stranger.Things.Season.4.Episode.9.mkv", after: transformFilenamePreview("Stranger.Things.Season.4.Episode.9.mkv", "series") }
    ];
  } else if (category === "subtitle") {
    examples = [
      { before: "Inception.2010.1080p.BluRay.Arabic.srt", after: "Inception (2010).srt" },
      { before: "Breaking.Bad.S01E01.sub.ass", after: "Breaking Bad - S01E01.ass" }
    ];
  } else {
    examples = [
      { before: "1.folder.name.unprocessed", after: "1 Folder Name Unprocessed" },
      { before: "01.media.file.part.mkv", after: "01 Media File Part.mkv" }
    ];
  }

  // Summary string
  const summary = `Detected format: ${categoryName}. ` +
    (isMultiPart ? `Contains ${parts.length} sequential Python scripts. ` : `Single Python script. `) +
    (hasDryRun ? `Supports safe Dry-Run previewing.` : `Direct filesystem renaming.`);

  return {
    category,
    categoryName,
    badge,
    isMultiPart,
    partsCount: parts.length,
    detectedVariables,
    detectedPatterns,
    detectedModules: modules,
    hasDryRun,
    examples,
    summary
  };
}
