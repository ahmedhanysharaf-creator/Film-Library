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

export const COMMON_FORMAT_PRESETS = [
  {
    id: "standard_mxx",
    label: "Mxx Standard (Default)",
    template: "{m_prefix} - ({year}) - {clean_title}{part_str}{res_str}{ext}",
    movieExample: "M01 - (2024) - Gladiator II - 2160p.mkv",
    subExample: "M01 - (2024) - Gladiator II - 2160p.srt",
    desc: "Complete standard format with sequential index counter, (Year) in parentheses, clean title, and quality."
  },
  {
    id: "plex_standard",
    label: "Plex / Jellyfin Standard",
    template: "{clean_title} ({year}){res_str}{ext}",
    movieExample: "Gladiator II (2024) - 2160p.mkv",
    subExample: "Gladiator II (2024) - 2160p.srt",
    desc: "Industry standard for Plex, Emby, and Jellyfin media libraries and metadata agents."
  },
  {
    id: "clean_simple",
    label: "Clean Minimal",
    template: "{clean_title} ({year}){ext}",
    movieExample: "Gladiator II (2024).mkv",
    subExample: "Gladiator II (2024).srt",
    desc: "Clean and minimalist format without resolution or prefix tags."
  },
  {
    id: "year_first",
    label: "Year First",
    template: "({year}) {clean_title}{res_str}{ext}",
    movieExample: "(2024) Gladiator II - 2160p.mkv",
    subExample: "(2024) Gladiator II - 2160p.srt",
    desc: "Sorts movies chronologically by release year in Windows Explorer."
  },
  {
    id: "mxx_no_res",
    label: "Mxx Index + Year Only",
    template: "{m_prefix} - ({year}) - {clean_title}{ext}",
    movieExample: "M01 - (2024) - Gladiator II.mkv",
    subExample: "M01 - (2024) - Gladiator II.srt",
    desc: "Sequential collection ordering without resolution tags."
  }
];

/**
 * Breaks down a format template into color-coded visual anatomy chips for UI display.
 */
export function getFormatTokensBlueprint(templateStr = "") {
  if (!templateStr || typeof templateStr !== "string") {
    templateStr = "{m_prefix} - ({year}) - {clean_title}{part_str}{res_str}{ext}";
  }

  const tokenDefs = [
    { key: "m_prefix", label: "Movie Index", example: "M01", color: "#e50914", bg: "rgba(229, 9, 20, 0.15)", border: "rgba(229, 9, 20, 0.35)", desc: "Sequential counter assigned to each film (M01, M02, M03...)" },
    { key: "year", label: "Release Year", example: "(2024)", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.35)", desc: "4-digit release year extracted from filename" },
    { key: "clean_title", label: "Clean Movie Title", example: "Gladiator II", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.35)", desc: "Title-cased movie name with roman numerals & noise stripped" },
    { key: "part_str", label: "Part / CD (Optional)", example: " - Part 1", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.35)", desc: "Only added if multi-part (CD1 / Part 2) is found" },
    { key: "res_str", label: "Resolution (Optional)", example: " - 2160p", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)", border: "rgba(139, 92, 246, 0.35)", desc: "Video resolution (2160p, 1080p, 720p, 4k)" },
    { key: "ext", label: "File Extension", example: ".mkv / .srt", color: "#ec4899", bg: "rgba(236, 72, 153, 0.15)", border: "rgba(236, 72, 153, 0.35)", desc: "Video (.mkv, .mp4) or subtitle (.srt, .ass) extension" },
    { key: "matched_vid_base", label: "Synced Video Name", example: "M01 - (2024) - Gladiator II - 2160p", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)", border: "rgba(6, 182, 212, 0.35)", desc: "Base filename of the matched movie video for 1:1 subtitle sync" }
  ];

  const presentTokens = [];
  tokenDefs.forEach(def => {
    const reg = new RegExp(`\\{${def.key}[^}]*\\}`, "i");
    if (reg.test(templateStr)) {
      presentTokens.push(def);
    }
  });

  return {
    rawTemplate: templateStr,
    tokens: presentTokens,
    allTokens: tokenDefs
  };
}

/**
 * Replaces or injects a new format template in Python source code cleanly.
 */
export function updatePythonCodeFormat(pythonCode = "", newTemplate = "") {
  if (!pythonCode || !newTemplate) return pythonCode;

  // 1. Check if FORMAT_TEMPLATE or MOVIE_FORMAT constant exists
  if (/(?:MOVIE_FORMAT|FORMAT_TEMPLATE|NAMING_FORMAT|OUTPUT_FORMAT|FORMAT)\s*=\s*(?:f)?["'][^"'\r\n]+["']/i.test(pythonCode)) {
    return pythonCode.replace(
      /((?:MOVIE_FORMAT|FORMAT_TEMPLATE|NAMING_FORMAT|OUTPUT_FORMAT|FORMAT)\s*=\s*(?:f)?["'])([^"'\r\n]+)(["'])/i,
      `$1${newTemplate}$3`
    );
  }

  // 2. Replace return f"..." or new_name = f"..." inside parse_movie_format or main function
  const returnRegex = /(return\s+f["'])([^"'\r\n]+)(["'])/i;
  if (returnRegex.test(pythonCode)) {
    return pythonCode.replace(returnRegex, `$1${newTemplate}$3`);
  }

  // 3. Fallback: inject FORMAT_TEMPLATE constant near top
  return `# Output Format Configuration\nFORMAT_TEMPLATE = "${newTemplate}"\n\n` + pythonCode;
}

/**
 * Auto-detects the category ('movie', 'series', 'subtitle') by inspecting Python code syntax and semantics.
 */
export function autoDetectCategoryFromCode(pythonCode = "") {
  if (!pythonCode || typeof pythonCode !== "string") return "movie";

  const code = pythonCode.toLowerCase();

  // 1. Subtitle synchronizer indicator
  const subScore =
    (code.includes("difflib") ? 3 : 0) +
    (code.includes("match_subtitles") ? 4 : 0) +
    (code.includes("sub_exts") || code.includes(".srt") || code.includes(".ass") ? 2 : 0) +
    (code.includes("matched_vid_base") ? 4 : 0);

  // 2. TV Series indicator
  const seriesScore =
    (code.includes("parse_episode_info") ? 5 : 0) +
    (code.includes("show_name") || code.includes("series_name") ? 3 : 0) +
    (code.includes("season") && code.includes("episode") ? 4 : 0) +
    (/s\d{1,2}e\d{1,2}/.test(code) || /\d{1,2}x\d{1,2}/.test(code) ? 4 : 0) +
    (code.includes("tv_renamer") || code.includes("series_renamer") ? 5 : 0);

  // 3. Movie indicator
  const movieScore =
    (code.includes("parse_movie_format") ? 5 : 0) +
    (code.includes("m_prefix") || code.includes("m_match") || /\bm\d{1,3}\b/.test(code) ? 4 : 0) +
    (code.includes("movie_renamer") || code.includes("movie_year") || code.includes("moviename") ? 4 : 0) +
    (code.includes("year_match") || code.includes("clean_title") ? 2 : 0);

  if (subScore > seriesScore && subScore > movieScore && subScore >= 3) {
    return "subtitle";
  }
  if (seriesScore > movieScore && seriesScore >= 3) {
    return "series";
  }
  if (movieScore >= 3) {
    return "movie";
  }

  // Fallback keyword checks
  if (code.includes("episode") || code.includes("season")) return "series";
  if (code.includes("subtitle") || code.includes(".srt")) return "subtitle";
  return "movie";
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

  // 2. Check for explicit FORMAT_TEMPLATE, MOVIE_FORMAT, SUBTITLE_FORMAT, SERIES_FORMAT constants
  const constantMatch = pythonCode.match(/(?:MOVIE_FORMAT|FORMAT_TEMPLATE|NAMING_FORMAT|OUTPUT_FORMAT|SUBTITLE_FORMAT|SERIES_FORMAT)\s*=\s*(?:f)?["']([^"'\r\n]+)["']/i);
  if (constantMatch && constantMatch[1] && !/[\\/]/.test(constantMatch[1])) {
    return {
      type: "constant",
      template: constantMatch[1],
      staticShowName,
      rawCode: pythonCode
    };
  }

  // 3. Inspect Docstring / Header Comments for Canonical Format Specification
  // e.g. "canonical format: Mxx - (Year) - Moviename[ - Part][ - Resolution].ext"
  const docstringMatch = pythonCode.match(/(?:canonical\s+format|format|renames\s+to|output\s+format)\s*:\s*[\r\n\s]*([^\r\n"']+)/i);
  if (docstringMatch && docstringMatch[1]) {
    const rawDocFormat = docstringMatch[1].trim();
    if (/Mxx|\(Year\)|Moviename|S\d+E\d+|Season|Episode/i.test(rawDocFormat)) {
      let normalizedDoc = rawDocFormat;
      normalizedDoc = normalizedDoc.replace(/Mxx/gi, '{m_prefix}');
      normalizedDoc = normalizedDoc.replace(/\(Year\)/gi, '({year})');
      normalizedDoc = normalizedDoc.replace(/Moviename/gi, '{clean_title}');
      normalizedDoc = normalizedDoc.replace(/\[\s*-\s*Part\s*\]/gi, '{part_str}');
      normalizedDoc = normalizedDoc.replace(/\[\s*-\s*Resolution\s*\]/gi, '{res_str}');
      normalizedDoc = normalizedDoc.replace(/\.ext/gi, '{ext}');
      normalizedDoc = normalizedDoc.replace(/Show/gi, '{show}');
      normalizedDoc = normalizedDoc.replace(/S(\d+)E(\d+)/gi, 'S{season:02d}E{episode:02d}');

      if (normalizedDoc.includes('{clean_title}') || normalizedDoc.includes('{m_prefix}')) {
        return {
          type: "docstring_canonical",
          template: normalizedDoc,
          staticShowName,
          rawCode: pythonCode
        };
      }
    }
  }

  // 4. Scan os.rename(src, dst), shutil.move(src, dst), pathlib.Path.rename() statements
  const renameCallMatches = pythonCode.match(/(?:os\.rename|shutil\.move|path\.rename|rename)\s*\([^,]+,\s*([^)]+)\)/gi);
  if (renameCallMatches) {
    for (const call of renameCallMatches) {
      const fMatch = call.match(/f["']([^"'\r\n]+)["']/i);
      if (fMatch && fMatch[1]) {
        let tmpl = fMatch[1];
        if (tmpl.includes(",") || /[\\/]/.test(tmpl)) {
          const parts = tmpl.split(/[,\\/]/);
          tmpl = parts[parts.length - 1].trim();
        }
        if (tmpl && !/^\[RENAME\]|^\[MATCH\]/i.test(tmpl)) {
          return {
            type: "os_rename_fstring",
            template: tmpl,
            staticShowName,
            rawCode: pythonCode
          };
        }
      }
    }
  }

  // 5. Find ALL f-strings across the script (including method calls like ext.lower() or season:02d)
  const allFStringRegex = /(?:return|\b(?:new_name|new_filename|new_file|renamed|renamed_name|formatted_name|target_name|new_sub_name|out_name|dest_name|final_name|formatted|output_name|name|dest|filename|target|out_file)\s*=)\s*f["']([^"'\r\n]+)["']/gi;

  const validTemplates = [];
  let match;
  while ((match = allFStringRegex.exec(pythonCode)) !== null) {
    let rawTemplate = match[1];

    if (/[\\/]/.test(rawTemplate)) {
      const parts = rawTemplate.split(/[\\/]/);
      rawTemplate = parts[parts.length - 1];
    }

    if (/^\{(?:root|TARGET_DIR|target_path|dir|folder_path|output_dir)\}$/i.test(rawTemplate)) {
      continue;
    }

    if (/^\[RENAME\]|^\[MATCH\]|^\[FOLDER|^\[ERROR\]|^\[INFO\]/i.test(rawTemplate)) {
      continue;
    }

    if (rawTemplate && rawTemplate.length > 2) {
      validTemplates.push(rawTemplate);
    }
  }

  if (validTemplates.length > 0) {
    const scored = validTemplates.map(tmpl => {
      let score = 0;

      const hasIndex = /\{m_prefix|\{mIndex|\{m_tag|\{m_code|\{index|\{idx|\{num/i.test(tmpl);
      const hasYear = /\{year|\{movie_year|\{release_year|\{yr/i.test(tmpl);
      const hasTitle = /\{clean_title|\{title|\{movie|\{film|\{name|\{matched_vid_base|\{show/i.test(tmpl);
      const hasSeasonEp = /\{season|\{episode|\{ep_title|\{episode_title/i.test(tmpl);
      const isBaseFragment = /\{base\b|\{base_name\b/i.test(tmpl) && !hasYear && !hasIndex;

      if (hasIndex) score += 10;
      if (hasYear) score += 10;
      if (hasTitle) score += 10;
      if (hasSeasonEp) score += 10;
      if (/\{res|\{quality|\{codec|\{audio|\{part|\{ext/i.test(tmpl)) score += 3;

      // Penalize intermediate base fragments (e.g. f"{base} - {resolution}")
      if (isBaseFragment) score -= 15;

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

  // 6. Check string concatenations (e.g. m_prefix + " - (" + year + ") - " + title + ext)
  const concatMatch = pythonCode.match(/(?:new_name|new_filename|formatted|return)\s*=\s*([^\r\n]+(?:\+|\.format|%)[^\r\n]+)/i);
  if (concatMatch && concatMatch[1]) {
    const expr = concatMatch[1];
    if (/m_prefix|year|clean_title|season|episode/i.test(expr)) {
      let reconstructed = "";
      if (/m_prefix|m_match/i.test(expr)) reconstructed += "{m_prefix} - ";
      if (/year/i.test(expr)) reconstructed += "({year}) - ";
      if (/clean_title|title|show/i.test(expr)) reconstructed += "{clean_title}";
      if (/season/i.test(expr)) reconstructed += " - S{season:02d}E{episode:02d}";
      if (/part/i.test(expr)) reconstructed += "{part_str}";
      if (/res/i.test(expr)) reconstructed += "{res_str}";
      reconstructed += "{ext}";

      return {
        type: "concatenation",
        template: reconstructed,
        staticShowName,
        rawCode: pythonCode
      };
    }
  }

  // 7. Find standard return "..." or '...' format templates (.format or %)
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

  // 8. Check for % formatting strings e.g. "%s - (%s) - %s"
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

  // Episode Title extraction (e.g. Loki.S01E01.Glorious.Purpose.1080p.mkv -> Glorious Purpose)
  let episodeTitle = "";
  if (sEMatch) {
    const afterSE = baseName.substring(sEMatch.index + sEMatch[0].length);
    const cleanedAfter = cleanRawTitle(afterSE);
    if (cleanedAfter && cleanedAfter.length > 2 && !/^\d+p$/i.test(cleanedAfter)) {
      episodeTitle = toTitleCase(cleanedAfter);
    }
  }
  if (!episodeTitle) episodeTitle = "Episode Title";

  // Audio Codec / Spec (AAC, DDP5.1, Atmos, etc.)
  const audioMatch = baseName.match(/\b(aac|ddp5\.1|dd5\.1|dd\+|ac3|dts-hd|dts|truehd|atmos|flac|mp3|5\.1|7\.1)\b/i);
  const audioTag = audioMatch ? audioMatch[1].toUpperCase() : "AAC";

  // Video Codec (x264, x265, HEVC, H264, H265, AV1)
  const codecMatch = baseName.match(/\b(x264|x265|h264|h265|hevc|av1|avc|10bit)\b/i);
  const codecTag = codecMatch ? codecMatch[1].toLowerCase() : "x264";

  // Release Group / Scene Tag (YTS, RARBG, PSA, QxR, Tigole, EVO, etc.)
  const groupMatch = baseName.match(/(?:-|\b)(yify|yts|rarbg|psa|galaxyrg|evo|etrg|sparks|ntg|flux|playweb|qxr|tigole)\b/i);
  const groupTag = groupMatch ? groupMatch[1].toUpperCase() : "RELEASE";

  // Subtitle Language (Arabic, English, eng, ar)
  const langMatch = baseName.match(/\b(arabic|english|eng|ara|ita|fre|ger|spa|rus|hin|kor|jpn|subs?)\b/i);
  const langTag = langMatch ? toTitleCase(langMatch[1]) : "Arabic";

  // Edition / Source (BluRay, WEB-DL, WEBRip, HDTV, REMUX, EXTENDED)
  const sourceMatch = baseName.match(/\b(bluray|blu-ray|brrip|bdrip|web-dl|webrip|web|hdtv|dvdrip|remux|extended|repack|unrated)\b/i);
  const sourceTag = sourceMatch ? sourceMatch[1].toUpperCase() : "BluRay";

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
    result = result.replace(/\{(?:m_prefix|mIndex|m_num|m_tag|index|idx|num|number)[^}]*\}/gi, mIndex);

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

    // Episode Title tokens
    result = result.replace(/\{(?:ep_title|episode_title|ep_name|episode_name|title_str)[^}]*\}/gi, episodeTitle);

    // Audio & Codec & Group tokens
    result = result.replace(/\{(?:audio|audio_codec|audio_spec|audio_tag)[^}]*\}/gi, audioTag);
    result = result.replace(/\{(?:codec|video_codec|codec_tag)[^}]*\}/gi, codecTag);
    result = result.replace(/\{(?:group|release_group|scene_group|group_tag|tag)[^}]*\}/gi, groupTag);
    result = result.replace(/\{(?:lang|language|sub_lang)[^}]*\}/gi, langTag);
    result = result.replace(/\{(?:source|edition|quality_tag)[^}]*\}/gi, sourceTag);

    // Resolution tokens
    if (result.includes('{res_str}') || result.includes('{res_part}') || result.includes('{res_tag}')) {
      result = result.replace(/\{(?:res_str|res_part|res_tag)[^}]*\}/gi, resTag);
    } else {
      result = result.replace(/\{(?:res|resolution|quality)[^}]*\}/gi, resRaw);
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

    // UNIVERSAL CUSTOM VARIABLE DYNAMIC CATCH-ALL:
    // Any remaining {custom_var} is intelligently replaced instead of broken!
    result = result.replace(/\{([a-zA-Z0-9_().:]+)\}/g, (match, varName) => {
      const v = varName.toLowerCase();
      if (v.includes("title") || v.includes("name") || v.includes("movie") || v.includes("show")) return titleFormatted;
      if (v.includes("year") || v.includes("date")) return year;
      if (v.includes("season") || v.includes("s")) return `S${String(seasonNum).padStart(2, '0')}`;
      if (v.includes("ep") || v.includes("e")) return `E${String(episodeNum).padStart(2, '0')}`;
      if (v.includes("res") || v.includes("quality")) return resRaw;
      if (v.includes("ext")) return ext;
      if (v.includes("idx") || v.includes("index") || v.includes("num") || v.includes("prefix")) return mIndex;
      return "Sample";
    });

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

  // 5. Determine Overall Category with Precision & Pure Code Auto-Detection
  const autoCategory = autoDetectCategoryFromCode(combinedCode);

  let category = categoryHint && categoryHint !== "all" && categoryHint !== "generic"
    ? categoryHint
    : (isMultiPart ? "multi_part" : autoCategory);

  let categoryName = "Movie Collection Renamer";
  let badge = "Movie Standardizer";

  if (category === "multi_part") {
    categoryName = `Multi-Part Pipeline (${parts.length} Parts)`;
    badge = `${parts.length}-Step Pipeline`;
  } else if (category === "series") {
    categoryName = "TV Series Episode Renamer";
    badge = "TV Series Parser";
  } else if (category === "subtitle") {
    categoryName = "Subtitle & Video Synchronizer";
    badge = "Subtitle Sync";
  } else {
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

  const examples = rawSampleInputs.map((input, idx) => ({
    before: input,
    after: simulatePythonRename(input, combinedCode, parsedTemplate?.staticShowName, category, idx + 1)
  }));

  const extractedTemplateStr = parsedTemplate?.template
    ? parsedTemplate.template
    : category === "series"
      ? "{show} - S{season:02d}E{episode:02d}{ext}"
      : category === "subtitle"
        ? "{matched_vid_base}{sub_ext}"
        : "{m_prefix} - ({year}) - {clean_title}{part_str}{res_str}{ext}";

  const templateDisplay = extractedTemplateStr ? ` [Format: ${extractedTemplateStr}]` : "";
  const summary = `Detected format: ${categoryName}${templateDisplay}. ` +
    (isMultiPart ? `Contains ${parts.length} sequential Python scripts. ` : `Single Python script. `) +
    (hasDryRun ? `Supports safe Dry-Run previewing.` : `Direct filesystem renaming.`);

  return {
    category,
    autoCategory,
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
    extractedTemplateStr,
    summary
  };
}
