// Code Format Detector & Intelligent Python AST / Regex Simulator for Renamer

/**
 * Parses Python script code to extract formatting templates, variables, and casing rules.
 * Supports f-strings, format(), %, concatenations, and regex replacements.
 */
export function extractPythonNamingTemplate(pythonCode = "") {
  if (!pythonCode || typeof pythonCode !== "string") {
    return null;
  }

  // 1. Check for SHOW_NAME or SERIES_NAME variable definition
  let staticShowName = "";
  const showNameMatch = pythonCode.match(/(?:SHOW_NAME|SERIES_NAME|TITLE_OVERRIDE)\s*=\s*["']([^"']+)["']/i);
  if (showNameMatch && showNameMatch[1] && !showNameMatch[1].startsWith("{")) {
    staticShowName = showNameMatch[1].trim();
  }

  // 2. Find return f"..." or f'...' expressions or new_name = f"..."
  const fStringMatches = pythonCode.match(/(?:return|\bnew_name\s*=|\bnew_path\s*=|\brenamed\s*=)\s*f["']([^"'\r\n]+)["']/gi);
  if (fStringMatches && fStringMatches.length > 0) {
    // Pick the last return f-string in the formatting function (usually the final return)
    const lastMatch = fStringMatches[fStringMatches.length - 1];
    const quoteMatch = lastMatch.match(/f["']([^"'\r\n]+)["']/i);
    if (quoteMatch && quoteMatch[1]) {
      return {
        type: "fstring",
        template: quoteMatch[1],
        staticShowName,
        rawCode: pythonCode
      };
    }
  }

  // 3. Find standard return "..." or '...' format templates (.format or %)
  const formatMatches = pythonCode.match(/(?:return|\bnew_name\s*=)\s*["']([^"'\r\n]+)["']\s*\.(?:format|replace)/gi);
  if (formatMatches && formatMatches.length > 0) {
    const lastMatch = formatMatches[formatMatches.length - 1];
    const quoteMatch = lastMatch.match(/["']([^"'\r\n]+)["']/i);
    if (quoteMatch && quoteMatch[1]) {
      return {
        type: "format_method",
        template: quoteMatch[1],
        staticShowName,
        rawCode: pythonCode
      };
    }
  }

  // 4. Check for % formatting strings e.g. "%s - (%s) - %s"
  const percentMatches = pythonCode.match(/(?:return|\bnew_name\s*=)\s*["']([^"'\r\n]+)["']\s*%/gi);
  if (percentMatches && percentMatches.length > 0) {
    const lastMatch = percentMatches[percentMatches.length - 1];
    const quoteMatch = lastMatch.match(/["']([^"'\r\n]+)["']/i);
    if (quoteMatch && quoteMatch[1]) {
      return {
        type: "percent",
        template: quoteMatch[1],
        staticShowName,
        rawCode: pythonCode
      };
    }
  }

  return {
    type: "inferred",
    template: "",
    staticShowName,
    rawCode: pythonCode
  };
}

/**
 * Simulates Python string formatting on a given filename using the parsed Python code logic.
 */
export function simulatePythonRename(rawName = "", codeInput = "", showNameOverride = "", defaultCategory = "movie") {
  if (!rawName || !rawName.trim()) return "";

  const dotIdx = rawName.lastIndexOf(".");
  const ext = dotIdx > 0 ? rawName.substring(dotIdx).toLowerCase() : ".mkv";
  const baseName = dotIdx > 0 ? rawName.substring(0, dotIdx) : rawName;

  // Normalize code input (can be string or array of parts)
  let codeStr = "";
  if (Array.isArray(codeInput)) {
    codeStr = codeInput.map(p => (p && p.code) ? p.code : "").join("\n");
  } else if (typeof codeInput === "string") {
    codeStr = codeInput;
  }

  const parsedTemplate = extractPythonNamingTemplate(codeStr);
  const staticShow = showNameOverride || parsedTemplate?.staticShowName || "";

  // ── 1. Token Extraction from Input Filename ────────────────────────────────

  // Year (19xx or 20xx)
  const yearMatch = baseName.match(/(?:\(|\b)(19\d{2}|20\d{2})(?:\)|\b)/);
  const year = yearMatch ? yearMatch[1] : "2024";

  // Season & Episode extraction
  const sEPattern = /[sS](\d{1,2})[eE](\d{1,2})|(\d{1,2})x(\d{1,2})|[sS]eason\s*(\d{1,2})\s*[eE]pisode\s*(\d{1,2})|[sS](\d{1,2})/;
  const sEMatch = baseName.match(sEPattern);
  let seasonNum = 1;
  let episodeNum = 1;
  let hasSeason = false;

  if (sEMatch) {
    hasSeason = true;
    seasonNum = parseInt(sEMatch[1] || sEMatch[3] || sEMatch[5] || sEMatch[7] || "1", 10);
    episodeNum = parseInt(sEMatch[2] || sEMatch[4] || sEMatch[6] || "1", 10);
  }

  // Resolution (2160p, 1080p, 720p, 480p, 4k)
  const resMatch = baseName.match(/\b(2160p|1080p|720p|480p|4k|uhd|fhd|hd)\b/i);
  const resRaw = resMatch ? resMatch[1].toLowerCase() : "1080p";

  // Part / CD
  const partMatch = baseName.match(/\b(part\s*\d+|cd\s*\d+)\b/i);
  const partRaw = partMatch ? partMatch[1].replace(/\s+/, ' ').toUpperCase() : "";

  // Mxx prefix
  const mMatch = baseName.match(/\bM(\d{1,3})\b/i) || baseName.match(/^(\d{1,2})\b/);
  const mIndex = mMatch ? `M${String(mMatch[1]).padStart(2, '0')}` : "M01";

  // Clean Title
  let rawTitle = baseName;
  const cutoffIndices = [];
  if (yearMatch && yearMatch.index > 0) cutoffIndices.push(yearMatch.index);
  if (sEMatch && sEMatch.index > 0) cutoffIndices.push(sEMatch.index);

  if (cutoffIndices.length > 0) {
    rawTitle = baseName.substring(0, Math.min(...cutoffIndices));
  }
  rawTitle = rawTitle.replace(/\bM\d{1,3}\b/gi, '').replace(/^\d{1,2}\s*/, '');
  rawTitle = rawTitle.replace(/[sS]\d{1,2}[eE]\d{1,2}|[sS]\d{1,2}|\d{1,2}x\d{1,2}/gi, '');
  let cleanTitle = rawTitle.replace(/[._\-+\[\]()]/g, ' ').trim();
  if (!cleanTitle) cleanTitle = staticShow || (hasSeason ? "Series" : "Movie");

  // Check title casing in python code: lower(), upper(), capitalize(), or title()
  let titleFormatted = cleanTitle;
  if (codeStr.includes('.lower()')) {
    titleFormatted = cleanTitle.toLowerCase();
  } else if (codeStr.includes('.upper()')) {
    titleFormatted = cleanTitle.toUpperCase();
  } else {
    // Default to neat Title Case
    titleFormatted = cleanTitle.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  const showNameFinal = staticShow ? (codeStr.includes('.lower()') ? staticShow.toLowerCase() : staticShow) : titleFormatted;

  // ── 2. Apply Custom F-String Template if Found ──────────────────────────────
  if (parsedTemplate && parsedTemplate.template) {
    let result = parsedTemplate.template;

    // Replace f-string interpolation tokens:
    // {m_prefix}, {mIndex}, {index}
    result = result.replace(/\{m_prefix[^}]*\}/gi, mIndex);
    result = result.replace(/\{mIndex[^}]*\}/gi, mIndex);
    result = result.replace(/\{index:[^}]*\}/gi, mIndex);

    // {year}
    result = result.replace(/\{year[^}]*\}/gi, year);

    // {show}, {detected_show}, {SHOW_NAME}, {clean_title}, {title}, {movie}, {name}
    result = result.replace(/\{(?:show|detected_show|SHOW_NAME|show_name)[^}]*\}/gi, showNameFinal);
    result = result.replace(/\{(?:clean_title|title|movie|clean_prefix|raw_title|name)[^}]*\}/gi, titleFormatted);

    // Season tokens: {season:02d}, {season}, {s}, {int(season):02d}
    result = result.replace(/\{(?:season|s):02d\}/gi, String(seasonNum).padStart(2, '0'));
    result = result.replace(/\{int\(season\):02d\}/gi, String(seasonNum).padStart(2, '0'));
    result = result.replace(/\{(?:season|s)\}/gi, String(seasonNum));

    // Episode tokens: {episode:02d}, {episode}, {ep}, {int(episode):02d}
    result = result.replace(/\{(?:episode|ep):02d\}/gi, String(episodeNum).padStart(2, '0'));
    result = result.replace(/\{int\(episode\):02d\}/gi, String(episodeNum).padStart(2, '0'));
    result = result.replace(/\{(?:episode|ep)\}/gi, String(episodeNum));

    // Resolution tokens: {res}, {resolution}, {res_str}, {res_part}
    if (result.includes('{res_str}') || result.includes('{res_part}')) {
      result = result.replace(/\{res_str[^}]*\}/gi, resMatch ? ` - ${resRaw}` : "");
      result = result.replace(/\{res_part[^}]*\}/gi, resMatch ? ` - ${resRaw}` : "");
    } else {
      result = result.replace(/\{(?:res|resolution)[^}]*\}/gi, resRaw);
    }

    // Part tokens: {part_str}, {part_tag}, {part}
    if (result.includes('{part_str}') || result.includes('{part_tag}')) {
      result = result.replace(/\{part_str[^}]*\}/gi, partMatch ? ` - ${partRaw}` : "");
      result = result.replace(/\{part_tag[^}]*\}/gi, partMatch ? ` - ${partRaw}` : "");
    } else {
      result = result.replace(/\{part[^}]*\}/gi, partRaw);
    }

    // Extension token: {ext}, {ext.lower()}
    result = result.replace(/\{ext[^}]*\}/gi, ext);

    // Clean up any unreplaced template variables cleanly
    result = result.replace(/\{[a-zA-Z0-9_().:]+\}/g, '');

    // Ensure extension exists
    if (!result.toLowerCase().endsWith(ext)) {
      result += ext;
    }

    return result;
  }

  // ── 3. Fallback Smart Inference based on Code Category ─────────────────────
  const isSeries = defaultCategory === "series" || /S\d+E\d+|season|episode|\d+x\d+/i.test(codeStr) || hasSeason;
  const isSubtitle = defaultCategory === "subtitle" || /srt|ass|vtt|subtitle/i.test(codeStr);

  if (isSeries) {
    return `${showNameFinal} - S${String(seasonNum).padStart(2, '0')}E${String(episodeNum).padStart(2, '0')}${ext}`;
  }

  if (isSubtitle) {
    const subExt = ext.replace(/\.(mkv|mp4|avi)$/i, '.srt');
    const resTag = resMatch ? ` - ${resRaw}` : "";
    return `${mIndex} - (${year}) - ${titleFormatted}${resTag}${subExt}`;
  }

  // Default standard movie collection format
  const resTag = resMatch ? ` - ${resRaw}` : "";
  const partTag = partMatch ? ` - ${partRaw}` : "";
  return `${mIndex} - (${year}) - ${titleFormatted}${partTag}${resTag}${ext}`;
}

/**
 * Universal filename transformer used by both live preview cards and sandbox inputs.
 */
export function transformFilenamePreview(rawName = "", categoryOrParts = "movie", showNameOverride = "") {
  if (!rawName || !rawName.trim()) return "";

  if (Array.isArray(categoryOrParts) || (typeof categoryOrParts === "string" && (categoryOrParts.includes("import") || categoryOrParts.includes("def ") || categoryOrParts.includes("return")))) {
    return simulatePythonRename(rawName, categoryOrParts, showNameOverride);
  }

  const category = typeof categoryOrParts === "string" ? categoryOrParts : "movie";
  return simulatePythonRename(rawName, "", showNameOverride, category);
}

/**
 * Inspects python code parts and returns metadata, variable list, modules, and dynamic sample examples.
 */
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
  const parsedTemplate = extractPythonNamingTemplate(combinedCode);

  // 1. Detect Python Modules Imported
  const moduleMatches = combinedCode.match(/^(?:from\s+([a-zA-Z0-9_]+)|import\s+([a-zA-Z0-9_]+))/gm) || [];
  const modules = Array.from(new Set(moduleMatches.map(m => {
    const p = m.replace(/^(from|import)\s+/, '').trim().split(/\s+/);
    return p[0];
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
  if (/M\d+|Mxx|Year|Moviename/i.test(combinedCode) || /M\d+\s*-\s*\(\d{4}\)/i.test(combinedCode)) {
    detectedPatterns.push({ label: "Mxx - (Year) - Moviename Format", icon: "film" });
  }
  if (/S\d+E\d+|season|episode|\d+x\d+|s\d+/i.test(combinedCode)) {
    detectedPatterns.push({ label: "Season & Episode Parser (S01E01 / S1)", icon: "tv" });
  }
  if (/19\d{2}|20\d{2}|year|\(19\d{2}\)/i.test(combinedCode)) {
    detectedPatterns.push({ label: "4-Digit Year Extractor (19xx / 20xx)", icon: "film" });
  }
  if (/srt|ass|vtt|subtitle|sub_file/i.test(combinedCode)) {
    detectedPatterns.push({ label: "Subtitle Synchronizer (.srt / .ass)", icon: "file-text" });
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
  } else if (/S\d+E\d+|season|episode|\d+x\d+|SHOW_NAME|s\d+/i.test(combinedCode)) {
    category = "series";
    categoryName = "TV Series Episode Renamer";
    badge = "TV Series Parser";
  } else if (/19\d{2}|20\d{2}|clean_movie_name|movie|M\d+/i.test(combinedCode)) {
    category = "movie";
    categoryName = "Movie Collection Renamer [Mxx - (Year) - Moviename]";
    badge = "Movie Standardizer";
  }

  // 6. Generate Dynamic BEFORE -> AFTER Format Examples using Simulated Execution
  let rawSampleInputs = [];
  if (category === "series") {
    rawSampleInputs = [
      "loki.s01.2022.1080p.mkv",
      "Breaking.Bad.S01E01.720p.HDTV.mkv",
      "Game.of.Thrones.1x01.Winter.Is.Coming.1080p.mkv"
    ];
  } else if (category === "subtitle") {
    rawSampleInputs = [
      "Inception.2010.1080p.BluRay.Arabic.srt",
      "Gladiator.II.2024.2160p.Arabic.ass"
    ];
  } else {
    rawSampleInputs = [
      "Inception.2010.1080p.BluRay.x264.mkv",
      "Gladiator.II.2024.2160p.WEB-DL.mkv",
      "The.Dark.Knight.2008.720p.BrRip.mp4"
    ];
  }

  const examples = rawSampleInputs.map(input => ({
    before: input,
    after: simulatePythonRename(input, combinedCode, parsedTemplate?.staticShowName, category)
  }));

  const templateDisplay = parsedTemplate?.template ? ` [Format: ${parsedTemplate.template}]` : "";
  const summary = `Detected format: ${categoryName}${templateDisplay}. ` +
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
    parsedTemplate,
    summary
  };
}
