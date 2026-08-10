// Code Format Detector for Python Renamer Scripts

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
    detectedPatterns.push({ label: "Season / Episode Formatter (S01E01)", icon: "tv" });
  }
  if (/19\d{2}|20\d{2}|year|\(19\d{2}\)/i.test(combinedCode)) {
    detectedPatterns.push({ label: "4-Digit Year Extractor (Year)", icon: "film" });
  }
  if (/srt|ass|vtt|subtitle|sub_file/i.test(combinedCode)) {
    detectedPatterns.push({ label: "Subtitle Matcher (.srt/.ass)", icon: "file-text" });
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
    categoryName = "Subtitle & Video Matcher";
    badge = "Subtitle Sync";
  } else if (/S\d+E\d+|season|episode|\d+x\d+|SHOW_NAME/i.test(combinedCode)) {
    category = "series";
    categoryName = "TV Series Renamer";
    badge = "TV Series Parser";
  } else if (/19\d{2}|20\d{2}|clean_movie_name|movie/i.test(combinedCode)) {
    category = "movie";
    categoryName = "Movie Renamer";
    badge = "Movie Standardizer";
  }

  // Generate detailed summary string
  const summary = `Detected format: ${categoryName}. ` +
    (isMultiPart ? `Contains ${parts.length} sequential Python scripts. ` : `Single Python script. `) +
    (modules.length > 0 ? `Dependencies: ${modules.join(', ')}. ` : ``) +
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
    summary
  };
}
