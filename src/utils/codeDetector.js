// Code Format Detector & Intelligent Python AST / Regex Simulator for Renamer

/**
 * Cleanly strips release tags, audio/video specs, language tags, and scene groups from a title string.
 */
export function cleanRawTitle(rawTitle) {
  if (!rawTitle) return "";
  let clean = rawTitle;

  // Remove common Mxx or track prefix
  clean = clean.replace(/\bM\d{1,4}\b/gi, '').replace(/^\d{1,3}\s*[._-]\s*/, '');

  // Remove resolution / quality / codec tags
  clean = clean.replace(/\b(2160p|1080p|1080i|720p|576p|480p|4k|uhd|fhd|hd|sd)\b/gi, '');
  clean = clean.replace(/\b(bluray|blu-ray|brrip|bdrip|web-dl|webrip|web|hdtv|dvdrip|remux|telesync|hdcam)\b/gi, '');
  clean = clean.replace(/\b(x264|x265|h264|h265|hevc|avc|10bit|8bit|hdr10\+|hdr10|hdr|dv|dolby\s*vision)\b/gi, '');
  clean = clean.replace(/\b(aac|ddp5\.1|dd5\.1|dd\+|ac3|dts-hd|dts|truehd|atmos|mp3|flac|2\.0|5\.1|7\.1)\b/gi, '');
  clean = clean.replace(/\b(arabic|english|eng|ita|fre|ger|spa|rus|hin|kor|jpn|subs?|subbed|dubbed|multi|dual\s*audio)\b/gi, '');
  clean = clean.replace(/\b(proper|repack|unrated|extended|directors\s*cut|imax|remastered|criterion)\b/gi, '');
  clean = clean.replace(/\b(yify|yts|rarbg|psa|galaxyrg|evo|etrg|sparks|ntg|flux|playweb|qxr|tigole)\b/gi, '');

  // Replace dots, underscores, brackets with spaces
  clean = clean.replace(/[._\-+\[\](){}]/g, ' ').replace(/\s+/g, ' ').trim();

  return clean;
}

/**
 * Formats a string to Title Case while preserving Roman numerals and acronyms.
 */
export function toTitleCase(str) {
  if (!str) return "";
  const romanNumerals = new Set(["II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]);
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map(word => {
      const upper = word.toUpperCase();
      if (romanNumerals.has(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Parses Python script code to extract formatting templates, variables, and casing rules.
 * Focuses strictly on filename generation, ignoring paths and log statements.
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

  // 2. Find return f"..." or filename assignment f-strings
  // We explicitly exclude path variables (new_path, dst_path, target_path, os.path.join)
  const candidateRegex = /(?:return|\b(?:new_name|new_filename|new_file|renamed|renamed_name|formatted_name|target_name|new_sub_name|out_name|dest_name|final_name|formatted|output_name)\s*=)\s*f["']([^"'\r\n]+)["']/gi;

  const validTemplates = [];
  let match;
  while ((match = candidateRegex.exec(pythonCode)) !== null) {
    const rawTemplate = match[1];
    // Reject paths containing directory slashes or root/folder variables
    if (/[\\/]/.test(rawTemplate) || /\{(?:root|TARGET_DIR|target_path|dir|folder_path|output_dir)\}/i.test(rawTemplate)) {
      continue;
    }
    // Reject log messages or prints
    if (/^\[RENAME\]|^\[MATCH\]|^\[FOLDER/i.test(rawTemplate)) {
      continue;
    }
    validTemplates.push(rawTemplate);
  }

  // Pick the best template (prioritize templates with rich tokens like {year}, {m_prefix}, {season}, {title})
  if (validTemplates.length > 0) {
    const scored = validTemplates.map(tmpl => {
      let score = 0;
      if (/\{m_prefix|\{mIndex|\{m_tag|\{m_code|\{index/i.test(tmpl)) score += 4;
      if (/\{year|\{movie_year/i.test(tmpl)) score += 4;
      if (/\{clean_title|\{title|\{movie|\{film|\{name|\{matched_vid_base/i.test(tmpl)) score += 4;
      if (/\{season|\{episode|\{show/i.test(tmpl)) score += 4;
      if (/\{res|\{part|\{ext/i.test(tmpl)) score += 2;
      return { template: tmpl, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const bestMatch = scored[0].template;

    return {
      type: "fstring",
      template: bestMatch,
      staticShowName,
      rawCode: pythonCode
    };
  }

  // 3. Find standard return "..." or '...' format templates (.format or %)
  const formatMatches = pythonCode.match(/(?:return|\bnew_name\s*=|\bnew_filename\s*=)\s*["']([^"'\r\n]+)["']\s*\.(?:format)/gi);
  if (formatMatches && formatMatches.length > 0) {
    const lastMatch = formatMatches[formatMatches.length - 1];
    const quoteMatch = lastMatch.match(/["']([^"'\r\n]+)["']/i);
    if (quoteMatch && quoteMatch[1] && !/[\\/]/.test(quoteMatch[1])) {
      return {
        type: "format_method",
        template: quoteMatch[1],
        staticShowName,
        rawCode: pythonCode
      };
    }
  }

  // 4. Check for % formatting strings e.g. "%s - (%s) - %s"
  const percentMatches = pythonCode.match(/(?:return|\bnew_name\s*=|\bnew_filename\s*=)\s*["']([^"'\r\n]+)["']\s*%/gi);
  if (percentMatches && percentMatches.length > 0) {
    const lastMatch = percentMatches[percentMatches.length - 1];
    const quoteMatch = lastMatch.match(/["']([^"'\r\n]+)["']/i);
    if (quoteMatch && quoteMatch[1] && !/[\\/]/.test(quoteMatch[1])) {
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
export function simulatePythonRename(rawName = "", codeInput = "", showNameOverride = "", defaultCategory = "movie", fileIndex = 1) {
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
  const resTag = resMatch ? ` - ${resRaw}` : "";

  // Part / CD
  const partMatch = baseName.match(/\b(part\s*\d+|cd\s*\d+)\b/i);
  const partRaw = partMatch ? partMatch[1].replace(/\s+/, ' ').toUpperCase() : "";
  const partTag = partMatch ? ` - ${partRaw}` : "";

  // Mxx prefix
  const mMatch = baseName.match(/\bM(\d{1,3})\b/i) || baseName.match(/^(\d{1,2})\b/);
  const mIndex = mMatch ? `M${String(mMatch[1]).padStart(2, '0')}` : `M${String(fileIndex).padStart(2, '0')}`;

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

  // Check title casing in python code specifically on title variables
  let titleFormatted = cleanTitle;
  const ROMAN_NUMERALS = new Set(["ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv", "xv"]);
  if (/(\bclean_title|\btitle|\bname|\bmovie|\braw_title|\bshow)\.lower\(\)/i.test(codeStr)) {
    titleFormatted = cleanTitle.toLowerCase();
  } else if (/(\bclean_title|\btitle|\bname|\bmovie|\braw_title|\bshow)\.upper\(\)/i.test(codeStr)) {
    titleFormatted = cleanTitle.toUpperCase();
  } else {
    titleFormatted = cleanTitle.split(/\s+/).map(w => {
      if (ROMAN_NUMERALS.has(w.toLowerCase())) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');
  }

  const showNameFinal = staticShow
    ? (/(\bclean_title|\btitle|\bname|\bmovie|\braw_title|\bshow)\.lower\(\)/i.test(codeStr) ? staticShow.toLowerCase() : staticShow)
    : titleFormatted;

  const videoBaseFormatted = `${mIndex} - (${year}) - ${titleFormatted}${partTag}${resTag}`;

  // ── 2. Apply Custom F-String Template if Found ──────────────────────────────
  if (parsedTemplate && parsedTemplate.template && parsedTemplate.template.trim().length > 0) {
    let result = parsedTemplate.template;

    // Matched video base name (for subtitle matchers / pipelines)
    result = result.replace(/\{(?:matched_vid_base|matched_video|vid_base|video_base|matched_base|clean_video_name|target_base|base_name|target_name|video_name|dest_name)[^}]*\}/gi, videoBaseFormatted);

    // Mxx prefix tokens
    result = result.replace(/\{(?:m_prefix|mIndex|m_num|m_tag|index|idx)[^}]*\}/gi, mIndex);

    // Year tokens
    result = result.replace(/\{(?:year|release_year|movie_year|yr|clean_year)[^}]*\}/gi, year);

    // Season tokens
    result = result.replace(/\{(?:season|s):02d\}/gi, String(seasonNum).padStart(2, '0'));
    result = result.replace(/\{int\(season\):02d\}/gi, String(seasonNum).padStart(2, '0'));
    result = result.replace(/\{(?:season_str|s_str)\}/gi, `S${String(seasonNum).padStart(2, '0')}`);
    result = result.replace(/\{(?:season|s|season_num|s_num|season_number)\}/gi, String(seasonNum));

    // Episode tokens
    result = result.replace(/\{(?:episode|ep):02d\}/gi, String(episodeNum).padStart(2, '0'));
    result = result.replace(/\{int\(episode\):02d\}/gi, String(episodeNum).padStart(2, '0'));
    result = result.replace(/\{(?:episode_str|ep_str)\}/gi, `E${String(episodeNum).padStart(2, '0')}`);
    result = result.replace(/\{(?:episode|ep|episode_num|ep_num|episode_number)\}/gi, String(episodeNum));

    // Resolution tokens
    if (result.includes('{res_str}') || result.includes('{res_part}') || result.includes('{res_tag}')) {
      result = result.replace(/\{(?:res_str|res_part|res_tag)[^}]*\}/gi, resTag);
    } else {
      result = result.replace(/\{(?:res|resolution|quality|quality_tag)[^}]*\}/gi, resRaw);
    }

    // Part tokens
    if (result.includes('{part_str}') || result.includes('{part_tag}') || result.includes('{part_part}')) {
      result = result.replace(/\{(?:part_str|part_tag|part_part)[^}]*\}/gi, partTag);
    } else {
      result = result.replace(/\{(?:part|cd|part_num|part_index)[^}]*\}/gi, partRaw);
    }

    // Extension token
    result = result.replace(/\{(?:sub_ext|vid_ext|file_ext|target_ext|new_ext|extension|ext)[^}]*\}/gi, ext);

    // Specific Show & Title tokens
    result = result.replace(/\{(?:show|detected_show|SHOW_NAME|show_name|series_name|clean_show_name)[^}]*\}/gi, showNameFinal);
    result = result.replace(/\{(?:clean_title|title|movie|movie_name|clean_movie_name|clean_name|clean|clean_prefix|raw_title|main_title|new_title|name|folder_name|dir_name)[^}]*\}/gi, titleFormatted);

    // UNIVERSAL TITLE CATCH-ALL:
    // If result does not yet contain the title, replace the first remaining unrecognized {token} with titleFormatted!
    const currentTextWithoutExt = result.replace(ext, '');
    if (!currentTextWithoutExt.toLowerCase().includes(cleanTitle.toLowerCase()) && /\{[a-zA-Z0-9_().:]+\}/.test(result)) {
      result = result.replace(/\{[a-zA-Z0-9_().:]+\}/, titleFormatted);
    }

    // Clear any remaining unused placeholder tokens
    result = result.replace(/\{[a-zA-Z0-9_().:]+\}/g, '');

    // Cleanup Orphan Hyphens & Spacing (fixes `(2010) - - 1080p` -> `(2010) - Inception - 1080p`)
    result = result.replace(/\s*-\s*(?:-\s*)+/g, ' - ');
    result = result.replace(/\(\s*\)/g, '');
    result = result.replace(/\s{2,}/g, ' ');
    result = result.replace(/\s*-\s*(\.[a-zA-Z0-9]+)$/, '$1');
    result = result.replace(/^[\s-]+/, '').trim();

    // Ensure extension exists
    if (!result.toLowerCase().endsWith(ext)) {
      result += ext;
    }

    // Safeguard: If result ended up as JUST ".srt" or ".ass" or ".mkv" or whitespace, ensure valid name
    const bareName = result.replace(ext, '').trim();
    if (!bareName || bareName === "." || bareName === "-") {
      const isSeriesFallback = defaultCategory === "series" || hasSeason;
      return isSeriesFallback
        ? `${showNameFinal} - S${String(seasonNum).padStart(2, '0')}E${String(episodeNum).padStart(2, '0')}${ext}`
        : `${mIndex} - (${year}) - ${titleFormatted}${resTag}${ext}`;
    }

    return result;
  }

  // ── 3. Fallback Smart Inference based on Code Category ─────────────────────
  const isSeries = defaultCategory === "series" || /S\d+E\d+|season|episode|\d+x\d+|s\d+/i.test(codeStr) || hasSeason;
  const isSubtitle = defaultCategory === "subtitle";

  if (isSeries) {
    return `${showNameFinal} - S${String(seasonNum).padStart(2, '0')}E${String(episodeNum).padStart(2, '0')}${ext}`;
  }

  if (isSubtitle) {
    const subExt = ext.replace(/\.(mkv|mp4|avi)$/i, '.srt');
    return `${mIndex} - (${year}) - ${titleFormatted}${resTag}${subExt}`;
  }

  // Default standard movie collection format: Mxx - (Year) - Moviename[ - Part][ - Resolution].ext
  return `${mIndex} - (${year}) - ${titleFormatted}${partTag}${resTag}${ext}`;
}

/**
 * Universal filename transformer used by both live preview cards and sandbox inputs.
 */
export function transformFilenamePreview(rawName = "", categoryOrParts = "movie", showNameOverride = "") {
  if (!rawName || !rawName.trim()) return "";

  if (Array.isArray(categoryOrParts) || (typeof categoryOrParts === "string" && (categoryOrParts.includes("import") || categoryOrParts.includes("def ") || categoryOrParts.includes("return") || categoryOrParts.includes("f\"")))) {
    return simulatePythonRename(rawName, categoryOrParts, showNameOverride);
  }

  const category = typeof categoryOrParts === "string" ? categoryOrParts : "movie";
  return simulatePythonRename(rawName, "", showNameOverride, category);
}

/**
 * Inspects python code parts and returns metadata, variable list, modules, and dynamic sample examples.
 */
export function detectCodeFormat(parts = [], categoryHint = "", nameHint = "") {
  if (!parts || parts.length === 0) {
    return {
      category: categoryHint || "generic",
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
  if (/difflib|match_subtitles|matched_vid_base/i.test(combinedCode)) {
    detectedPatterns.push({ label: "Subtitle Synchronizer (.srt / .ass)", icon: "file-text" });
  }
  if (/os\.walk|os\.listdir|pathlib/i.test(combinedCode)) {
    detectedPatterns.push({ label: "Recursive File System Walker", icon: "folder" });
  }

  // 4. Detect Dry-Run Support
  const hasDryRun = /\b(DRY_RUN|PREVIEW_MODE|TEST_RUN)\b/i.test(combinedCode);

  // 5. Determine Overall Category with Precision
  let category = categoryHint || "movie";
  let categoryName = "Movie Collection Renamer";
  let badge = "Movie Standardizer";

  const isSubtitlePipeline = (/difflib|match_subtitles|get_close_matches/i.test(combinedCode) && !/parse_movie_format|clean_movie_name|movie_renamer/i.test(combinedCode)) || categoryHint === "subtitle";
  const isSeries = (/SHOW_NAME|parse_episode_info|episode|season|S\d+E\d+/i.test(combinedCode) && !/movie_renamer|parse_movie_format/i.test(combinedCode)) || categoryHint === "series";

  if (isMultiPart) {
    category = "multi_part";
    categoryName = `Multi-Part Pipeline (${parts.length} Parts)`;
    badge = `${parts.length}-Step Pipeline`;
  } else if (categoryHint === "movie" || (!isSubtitlePipeline && !isSeries)) {
    category = "movie";
    categoryName = "Movie Collection Renamer [Mxx - (Year) - Moviename]";
    badge = "Movie Standardizer";
  } else if (isSubtitlePipeline) {
    category = "subtitle";
    categoryName = "Subtitle & Video Synchronizer";
    badge = "Subtitle Sync";
  } else if (isSeries) {
    category = "series";
    categoryName = "TV Series Episode Renamer";
    badge = "TV Series Parser";
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

  const examples = rawSampleInputs.map((input, idx) => ({
    before: input,
    after: simulatePythonRename(input, combinedCode, parsedTemplate?.staticShowName, category, idx + 1)
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
