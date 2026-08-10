// Storage service for Renamer python scripts and presets
import { db, isFirebaseConfigured } from "./firebase";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

const RENAMER_STORAGE_KEY = "filmlibrary_renamer_codes_v1";

export const BUILTIN_RENAMER_PRESETS = [
  {
    id: "preset_movie_standard",
    name: "Movie Title & Year Standardizer",
    description: "Cleans cluttered movie filenames (e.g. Inception.2010.1080p.Bluray.x264.mkv) into clean 'Title (Year).ext' format.",
    category: "movie",
    badge: "Movie Standardizer",
    isBuiltin: true,
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

VIDEO_EXTS = {'.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'}

def clean_movie_name(filename):
    name, ext = os.path.splitext(filename)
    if ext.lower() not in VIDEO_EXTS:
        return None
    
    # Extract 4-digit year (19xx or 20xx)
    year_match = re.search(r'\\b(19\\d{2}|20\\d{2})\\b', name)
    if not year_match:
        return None
    
    year = year_match.group(1)
    # Extract title before the year string
    raw_title = name[:year_match.start()]
    clean_title = re.sub(r'[._\\-\\+\\[\\]\\(\\)]', ' ', raw_title).strip()
    clean_title = ' '.join(word.capitalize() for word in clean_title.split())
    
    if not clean_title:
        return None
        
    return f"{clean_title} ({year}){ext.lower()}"

def run_renamer():
    if not os.path.exists(TARGET_DIR):
        print(f"[ERROR] Directory not found: {TARGET_DIR}")
        return

    print(f"Scanning movies in: {TARGET_DIR}")
    renamed_count = 0

    for root, dirs, files in os.walk(TARGET_DIR):
        for file in files:
            new_name = clean_movie_name(file)
            if new_name and new_name != file:
                old_path = os.path.join(root, file)
                new_path = os.path.join(root, new_name)
                print(f"[RENAME] '{file}' -> '{new_name}'")
                if not DRY_RUN:
                    os.rename(old_path, new_path)
                renamed_count += 1

    print(f"Finished! Total files renamed: {renamed_count}")

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
    isBuiltin: true,
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
            
            # Try to grab show name from before the match if not explicitly set
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
    description: "Two-stage renamer pipeline: Part 1 normalizes root folders and removes invalid characters; Part 2 renames media files inside.",
    category: "multi_part",
    badge: "2-Part Pipeline",
    isBuiltin: true,
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
                new_filename = f"{folder_name} - Part {index:02d}{ext}"
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
    description: "Two-stage pipeline: Part 1 identifies video files, Part 2 finds matching subtitle files (.srt/.ass) and renames them to match the video exactly.",
    category: "subtitle",
    badge: "Subtitle Sync",
    isBuiltin: true,
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

# Part 2: Matches External Subtitle (.srt) to Video Filenames Exactly
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
            # Find closest video match using sequence matcher
            matches = difflib.get_close_matches(sub_base, [os.path.splitext(v)[0] for v in videos], n=1, cutoff=0.3)
            if matches:
                matched_vid_base = matches[0]
                new_sub_name = f"{matched_vid_base}{sub_ext.lower()}"
                if new_sub_name != sub:
                    print(f"[SUBTITLE MATCH] '{sub}' -> '{new_sub_name}'")
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
    let customItems = [];
    if (local) {
      customItems = JSON.parse(local);
    }
    
    // Combine builtins with custom items
    return [...BUILTIN_RENAMER_PRESETS, ...customItems];
  } catch (err) {
    console.error("Error reading renamer codes:", err);
    return BUILTIN_RENAMER_PRESETS;
  }
}

export async function saveRenamerCode(renamerObj) {
  try {
    const local = localStorage.getItem(RENAMER_STORAGE_KEY);
    let customItems = local ? JSON.parse(local) : [];

    const existingIndex = customItems.findIndex(i => i.id === renamerObj.id);
    if (existingIndex >= 0) {
      customItems[existingIndex] = {
        ...renamerObj,
        updated_at: new Date().toISOString()
      };
    } else {
      const newItem = {
        ...renamerObj,
        id: renamerObj.id || `renamer_custom_${Date.now()}`,
        isBuiltin: false,
        created_at: new Date().toISOString()
      };
      customItems.unshift(newItem);
    }

    localStorage.setItem(RENAMER_STORAGE_KEY, JSON.stringify(customItems));
    
    // Optional Firestore Sync
    if (isFirebaseConfigured()) {
      try {
        const itemToSave = customItems.find(i => i.id === renamerObj.id) || customItems[0];
        await setDoc(doc(db, "renamer_codes", itemToSave.id), itemToSave);
      } catch (e) {
        console.warn("Firestore renamer save warning:", e);
      }
    }

    return customItems;
  } catch (err) {
    console.error("Failed to save renamer code:", err);
    throw err;
  }
}

export async function deleteRenamerCode(renamerId) {
  try {
    const local = localStorage.getItem(RENAMER_STORAGE_KEY);
    let customItems = local ? JSON.parse(local) : [];
    customItems = customItems.filter(item => item.id !== renamerId);

    localStorage.setItem(RENAMER_STORAGE_KEY, JSON.stringify(customItems));

    if (isFirebaseConfigured()) {
      try {
        await deleteDoc(doc(db, "renamer_codes", renamerId));
      } catch (e) {
        console.warn("Firestore renamer delete warning:", e);
      }
    }

    return customItems;
  } catch (err) {
    console.error("Failed to delete renamer code:", err);
    throw err;
  }
}
