// Storage service for Renamer python scripts and presets
import { db, isFirebaseConfigured } from "./firebase";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

const RENAMER_STORAGE_KEY = "filmlibrary_renamer_codes_v3";

export const DEFAULT_RENAMER_PRESETS = [
  {
    id: "preset_movie_standard",
    name: "Movie Collection Renamer [Mxx - (Year) - Moviename]",
    description: "Formats movies into exact format: Mxx - (Year) - Moviename[ - Part][ - Resolution].ext (e.g. M01 - (2010) - Inception - 1080p.mkv).",
    category: "movie",
    badge: "Movie Standardizer",
    created_at: new Date().toISOString(),
    parts: [
      {
        id: "part_1",
        name: "1_movie_renamer.py",
        code: `import os
import re
import sys

# Target directory path containing movie files
TARGET_DIR = r"{TARGET_DIR}"
DRY_RUN = False  # Set to True to preview without renaming files

VIDEO_EXTS = {'.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.srt', '.ass', '.vtt'}

# ==============================================================================
# 🎯 OUTPUT FORMAT CONFIGURATION (Easily change your format string here)
# Available tokens:
#   {m_prefix}    -> Movie Index counter (e.g. M01, M02, M03...)
#   {year}        -> 4-digit Release Year (e.g. 2010, 2024)
#   {clean_title} -> Movie Title in Clean Title Case (e.g. Inception, Gladiator II)
#   {part_str}    -> Optional Part tag (e.g. " - Part 1" or "")
#   {res_str}     -> Optional Resolution tag (e.g. " - 1080p", " - 2160p" or "")
#   {ext}         -> Original file extension (.mkv, .mp4, .srt, .ass)
#
# Examples:
#   Default Standard : "{m_prefix} - ({year}) - {clean_title}{part_str}{res_str}{ext}"
#   Plex / Jellyfin  : "{clean_title} ({year}){res_str}{ext}"
#   Clean Simple     : "{clean_title} ({year}){ext}"
#   Year First       : "({year}) {clean_title}{res_str}{ext}"
# ==============================================================================
MOVIE_FORMAT = "{m_prefix} - ({year}) - {clean_title}{part_str}{res_str}{ext}"

def parse_movie_format(filename, index=1):
    name, ext = os.path.splitext(filename)
    if ext.lower() not in VIDEO_EXTS:
        return None

    # 1. Detect or Assign Mxx prefix
    m_match = re.search(r'\\bM(\\d{1,3})\\b', name, re.IGNORECASE)
    m_prefix = f"M{int(m_match.group(1)):02d}" if m_match else f"M{index:02d}"

    # 2. Extract 4-digit Year (19xx or 20xx)
    year_match = re.search(r'\\b(19\\d{2}|20\\d{2})\\b', name)
    if not year_match:
        return None
    year = year_match.group(1)

    # 3. Extract Resolution if present (1080p, 2160p, 720p, 4k)
    res_match = re.search(r'\\b(2160p|1080p|720p|480p|4k)\\b', name, re.IGNORECASE)
    res_str = f" - {res_match.group(1).lower()}" if res_match else ""

    # 4. Extract Part tag if present (Part 1, Part 02, CD1)
    part_match = re.search(r'\\b(part\\s*\\d+|cd\\s*\\d+)\\b', name, re.IGNORECASE)
    part_str = f" - {part_match.group(1).replace(' ', ' ').title()}" if part_match else ""

    # 5. Clean Title before Year
    raw_title = name[:year_match.start()]
    raw_title = re.sub(r'\\bM\\d{1,3}\\b', '', raw_title, flags=re.IGNORECASE)
    clean_title = re.sub(r'[._\\-\\+\\[\\]\\(\\)]', ' ', raw_title).strip()
    clean_title = ' '.join(word.capitalize() for word in clean_title.split())

    if not clean_title:
        clean_title = "Movie"

    # Return formatted name using MOVIE_FORMAT template
    try:
        return MOVIE_FORMAT.format(
            m_prefix=m_prefix,
            year=year,
            clean_title=clean_title,
            part_str=part_str,
            res_str=res_str,
            ext=ext.lower()
        )
    except Exception:
        return f"{m_prefix} - ({year}) - {clean_title}{part_str}{res_str}{ext.lower()}"

def run_renamer():
    if not os.path.exists(TARGET_DIR):
        print(f"[ERROR] Directory not found: {TARGET_DIR}")
        return

    print(f"Scanning movie library in: {TARGET_DIR}")
    renamed_count = 0

    for root, dirs, files in os.walk(TARGET_DIR):
        valid_files = [f for f in sorted(files) if os.path.splitext(f)[1].lower() in VIDEO_EXTS]
        for idx, file in enumerate(valid_files, start=1):
            new_name = parse_movie_format(file, index=idx)
            if new_name and new_name != file:
                old_path = os.path.join(root, file)
                new_path = os.path.join(root, new_name)
                print(f"[RENAME] '{file}' ==> '{new_name}'")
                if not DRY_RUN:
                    os.rename(old_path, new_path)
                renamed_count += 1

    print(f"Finished! Total files formatted: {renamed_count}")

if __name__ == "__main__":
    run_renamer()
`
      }
    ]
  },
  {
    id: "preset_series_season_episode",
    name: "TV Series Season & Episode Parser",
    description: "Detects S01E01, 1x01, or Season 1 Episode 1 patterns in TV show filenames and formats them neatly as 'Show Title - S01E01.ext'.",
    category: "series",
    badge: "TV Series Parser",
    created_at: new Date().toISOString(),
    parts: [
      {
        id: "part_1",
        name: "1_series_renamer.py",
        code: `import os
import re
import sys

# Target directory path containing TV show episodes
TARGET_DIR = r"{TARGET_DIR}"
SHOW_NAME = "{SHOW_NAME}"  # Optional show name override
DRY_RUN = False

VIDEO_EXTS = {'.mkv', '.mp4', '.avi', '.mov', '.ts'}

# Regex patterns for S01E01, 1x01, Season 1 Episode 1
PATTERNS = [
    re.compile(r'[sS](\\d{1,2})[eE](\\d{1,2})'),
    re.compile(r'(\\d{1,2})x(\\d{1,2})'),
    re.compile(r'[sS]eason\\s*(\\d{1,2})\\s*[eE]pisode\\s*(\\d{1,2})', re.IGNORECASE)
]

def parse_episode_info(filename):
    name, ext = os.path.splitext(filename)
    if ext.lower() not in VIDEO_EXTS:
        return None
    
    for pattern in PATTERNS:
        match = pattern.search(name)
        if match:
            season = int(match.group(1))
            episode = int(match.group(2))
            
            detected_show = SHOW_NAME
            if not detected_show:
                raw_prefix = name[:match.start()]
                clean_prefix = re.sub(r'[._\\-]', ' ', raw_prefix).strip()
                detected_show = ' '.join(word.capitalize() for word in clean_prefix.split())
            
            show = detected_show or "TV Show"
            return f"{show} - S{season:02d}E{episode:02d}{ext.lower()}"
    return None

def process_series_directory():
    if not os.path.exists(TARGET_DIR):
        print(f"[ERROR] Directory does not exist: {TARGET_DIR}")
        return

    print(f"Processing series in: {TARGET_DIR}")
    count = 0

    for root, dirs, files in os.walk(TARGET_DIR):
        for f in files:
            new_filename = parse_episode_info(f)
            if new_filename and new_filename != f:
                src = os.path.join(root, f)
                dst = os.path.join(root, new_filename)
                print(f"[MATCH] '{f}' ===> '{new_filename}'")
                if not DRY_RUN:
                    os.rename(src, dst)
                count += 1

    print(f"Series rename complete! Total processed: {count}")

if __name__ == "__main__":
    process_series_directory()
`
      }
    ]
  },
  {
    id: "preset_multipart_pipeline",
    name: "Multi-Part Pipeline: Folder Cleaner & Media Mapper",
    description: "Two-stage renamer pipeline: Part 1 normalizes root folders; Part 2 renames media files inside into Mxx format.",
    category: "multi_part",
    badge: "2-Part Pipeline",
    created_at: new Date().toISOString(),
    parts: [
      {
        id: "part_1",
        name: "1_folder_normalizer.py",
        code: `import os
import re
import sys

# Part 1: Normalizes folder names in the target directory
TARGET_DIR = r"{TARGET_DIR}"

def clean_folder_name(folder_name):
    clean = re.sub(r'[._\\-\\+]', ' ', folder_name)
    clean = re.sub(r'\\s+', ' ', clean).strip()
    return clean.title()

def normalize_directories():
    print("=== PART 1: Normalizing Folder Names ===")
    if not os.path.exists(TARGET_DIR):
        print(f"Path not found: {TARGET_DIR}")
        return
        
    for item in os.listdir(TARGET_DIR):
        full_path = os.path.join(TARGET_DIR, item)
        if os.path.isdir(full_path):
            new_name = clean_folder_name(item)
            if new_name != item:
                new_path = os.path.join(TARGET_DIR, new_name)
                print(f"[FOLDER RENAME] '{item}' -> '{new_name}'")
                os.rename(full_path, new_path)

if __name__ == "__main__":
    normalize_directories()
`
      },
      {
        id: "part_2",
        name: "2_batch_media_mapper.py",
        code: `import os
import re
import sys

# Part 2: Renames media files inside normalized folders
TARGET_DIR = r"{TARGET_DIR}"
MEDIA_EXTS = {'.mkv', '.mp4', '.avi', '.srt'}

def batch_rename_files():
    print("=== PART 2: Batch Media File Mapper ===")
    if not os.path.exists(TARGET_DIR):
        print(f"Path not found: {TARGET_DIR}")
        return

    renamed = 0
    for root, dirs, files in os.walk(TARGET_DIR):
        folder_name = os.path.basename(root)
        for index, file in enumerate(sorted(files), start=1):
            ext = os.path.splitext(file)[1].lower()
            if ext in MEDIA_EXTS:
                new_filename = f"M{index:02d} - (2024) - {folder_name} - Part {index:02d}{ext}"
                old_file = os.path.join(root, file)
                new_file = os.path.join(root, new_filename)
                if file != new_filename:
                    print(f"[FILE RENAME] '{file}' -> '{new_filename}'")
                    os.rename(old_file, new_file)
                    renamed += 1
                    
    print(f"Part 2 complete. {renamed} media files formatted.")

if __name__ == "__main__":
    batch_rename_files()
`
      }
    ]
  },
  {
    id: "preset_subtitle_sync_renamer",
    name: "Subtitle & Video Synchronizer Pipeline",
    description: "Two-stage pipeline: Part 1 identifies video files, Part 2 matches external subtitle files (.srt/.ass) to exact Mxx - (Year) - Moviename structure.",
    category: "subtitle",
    badge: "Subtitle Sync",
    created_at: new Date().toISOString(),
    parts: [
      {
        id: "part_1",
        name: "1_video_cleaner.py",
        code: `import os
import re

# Part 1: Standardizes Video File Names
TARGET_DIR = r"{TARGET_DIR}"
VIDEO_EXTS = {'.mkv', '.mp4', '.avi'}

def clean_video_files():
    print("=== PART 1: Video File Standardizer ===")
    for root, dirs, files in os.walk(TARGET_DIR):
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in VIDEO_EXTS:
                clean_name = re.sub(r'[\\[\\]\\(\\)]', '', f)
                if clean_name != f:
                    print(f"[VIDEO] '{f}' -> '{clean_name}'")
                    os.rename(os.path.join(root, f), os.path.join(root, clean_name))

if __name__ == "__main__":
    clean_video_files()
`
      },
      {
        id: "part_2",
        name: "2_subtitle_matcher.py",
        code: `import os
import difflib

# ==============================================================================
# 🎯 SUBTITLE OUTPUT FORMAT CONFIGURATION
# Matches external subtitle files (.srt/.ass) 100% to the corresponding video file base.
# Result: Media players (VLC, Plex, TV) auto-detect and display subtitles seamlessly.
# Available tokens:
#   {matched_vid_base} -> Full formatted video name without extension
#   {sub_ext}          -> Subtitle extension (.srt, .ass, .vtt)
# Example:
#   Video File:    M01 - (2024) - Gladiator II - 2160p.mkv
#   Subtitle File: M01 - (2024) - Gladiator II - 2160p.srt
# ==============================================================================
SUBTITLE_FORMAT = "{matched_vid_base}{sub_ext}"

# Target directory containing videos and subtitles
TARGET_DIR = r"{TARGET_DIR}"
VIDEO_EXTS = {'.mkv', '.mp4', '.avi'}
SUB_EXTS = {'.srt', '.ass', '.vtt'}

def match_subtitles():
    print("=== PART 2: Subtitle File Matcher ===")
    for root, dirs, files in os.walk(TARGET_DIR):
        videos = [f for f in files if os.path.splitext(f)[1].lower() in VIDEO_EXTS]
        subs = [f for f in files if os.path.splitext(f)[1].lower() in SUB_EXTS]

        for sub in subs:
            sub_base, sub_ext = os.path.splitext(sub)
            matches = difflib.get_close_matches(sub_base, [os.path.splitext(v)[0] for v in videos], n=1, cutoff=0.3)
            if matches:
                matched_vid_base = matches[0]
                new_sub_name = SUBTITLE_FORMAT.format(matched_vid_base=matched_vid_base, sub_ext=sub_ext.lower())
                if new_sub_name != sub:
                    print(f"[SUBTITLE MATCH] '{sub}' ==> '{new_sub_name}'")
                    os.rename(os.path.join(root, sub), os.path.join(root, new_sub_name))

if __name__ == "__main__":
    match_subtitles()
`
      }
    ]
  }
];

export async function getRenamerCodes() {
  try {
    const local = localStorage.getItem(RENAMER_STORAGE_KEY);
    if (!local) {
      localStorage.setItem(RENAMER_STORAGE_KEY, JSON.stringify(DEFAULT_RENAMER_PRESETS));
      return DEFAULT_RENAMER_PRESETS;
    }
    return JSON.parse(local);
  } catch (err) {
    console.error("Error reading renamer codes:", err);
    return DEFAULT_RENAMER_PRESETS;
  }
}

export async function saveRenamerCode(renamerObj) {
  try {
    const currentList = await getRenamerCodes();
    const existingIndex = currentList.findIndex(i => i.id === renamerObj.id);

    let updatedList;
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = {
        ...renamerObj,
        updated_at: new Date().toISOString()
      };
    } else {
      const newItem = {
        ...renamerObj,
        id: renamerObj.id || `renamer_custom_${Date.now()}`,
        created_at: new Date().toISOString()
      };
      updatedList = [newItem, ...currentList];
    }

    localStorage.setItem(RENAMER_STORAGE_KEY, JSON.stringify(updatedList));

    if (isFirebaseConfigured()) {
      try {
        const itemToSave = updatedList.find(i => i.id === renamerObj.id) || updatedList[0];
        await setDoc(doc(db, "renamer_codes", itemToSave.id), itemToSave);
      } catch (e) {
        console.warn("Firestore renamer save warning:", e);
      }
    }

    return updatedList;
  } catch (err) {
    console.error("Failed to save renamer code:", err);
    throw err;
  }
}

export async function deleteRenamerCode(renamerId) {
  try {
    const currentList = await getRenamerCodes();
    const updatedList = currentList.filter(item => item.id !== renamerId);

    localStorage.setItem(RENAMER_STORAGE_KEY, JSON.stringify(updatedList));

    if (isFirebaseConfigured()) {
      try {
        await deleteDoc(doc(db, "renamer_codes", renamerId));
      } catch (e) {
        console.warn("Firestore renamer delete warning:", e);
      }
    }

    return updatedList;
  } catch (err) {
    console.error("Failed to delete renamer code:", err);
    throw err;
  }
}

export async function resetRenamerPresetsToDefault() {
  try {
    localStorage.setItem(RENAMER_STORAGE_KEY, JSON.stringify(DEFAULT_RENAMER_PRESETS));
    return DEFAULT_RENAMER_PRESETS;
  } catch (err) {
    console.error("Failed to reset renamer presets:", err);
    throw err;
  }
}
