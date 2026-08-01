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
    extractedYear = parseInt(yearMatch[1]);
  }

  let clean = rawName.replace(/[\[\(]?\b(19\d\d|20\d\d)\b[\]\)]?/g, " ");
  clean = clean.replace(/^(?:M\d+|E\d+|S\d+E\d+|\d+)\b\s*[-_.]*\s*/i, "");

  const tags = [
    "1080p", "720p", "4k", "2160p", "bluray", "web-dl", "webrip", "hdrip", "dvdrip",
    "x264", "x265", "hevc", "aac", "dts", "repack", "remux", "hdr", "dual audio"
  ];
  tags.forEach((tag) => {
    const reg = new RegExp(`\\b${tag}\\b`, "gi");
    clean = clean.replace(reg, "");
  });

  clean = clean.replace(/^[-\s._]+/, "");
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

export const AddEditMedia = ({ editItem, onSaveSuccess, onCancel }) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [mode, setMode] = useState("single");
  const folderInputRef = useRef(null);

  // Single Entry Form State
  const [type, setType] = useState(editItem?.type || "movie");
  const [tmdbId, setTmdbId] = useState(editItem?.tmdb_id || "");
  const [title, setTitle] = useState(editItem?.title || "");
  const [year, setYear] = useState(editItem?.year || new Date().getFullYear());
  const [posterUrl, setPosterUrl] = useState(editItem?.poster_url || "");
  const [backdropUrl, setBackdropUrl] = useState(editItem?.backdrop_url || "");
  const [trailerUrl, setTrailerUrl] = useState(editItem?.trailer_url || "");
  const [genresStr, setGenresStr] = useState((editItem?.genres || []).join(", "));
  const [imdbRating, setImdbRating] = useState(editItem?.imdb_rating || "");
  const [overview, setOverview] = useState(editItem?.overview || "");
  const [releaseDate, setReleaseDate] = useState(editItem?.release_date || "");
  const [runtime, setRuntime] = useState(editItem?.runtime || "");
  const [director, setDirector] = useState(editItem?.director || "");
  const [creator, setCreator] = useState(editItem?.creator || "");
  const [studio, setStudio] = useState(editItem?.studio || "");
  const [castStr, setCastStr] = useState(
    (editItem?.cast || []).map((c) => `${c.name} as ${c.character}`).join("\n")
  );

  const [seasonCount, setSeasonCount] = useState(editItem?.seasons?.length || 1);
  const [episodesPerSeason, setEpisodesPerSeason] = useState(editItem?.seasons?.[0]?.episode_count || 10);
  const [isOngoing, setIsOngoing] = useState(editItem?.is_ongoing || false);

  const initialUserPaths = editItem?.user_paths?.find((up) => up.uid === currentUser?.uid)?.paths || {};
  const [defaultPath, setDefaultPath] = useState(initialUserPaths.default || "");
  const [episodePaths, setEpisodePaths] = useState(initialUserPaths || {});

  // Batch Scanner 3-Step State: "input" -> "scanning" -> "confirm"
  const [batchStep, setBatchStep] = useState("input");
  const [folderPath, setFolderPath] = useState("");
  const [fileListText, setFileListText] = useState("");
  const [scanProgress, setScanProgress] = useState("");
  const [scannedResults, setScannedResults] = useState([]);
  const [savingBatch, setSavingBatch] = useState(false);
  const [saveProgressData, setSaveProgressData] = useState({ current: 0, total: 0, title: "", percentage: 0 });
  const [editingResultIndex, setEditingResultIndex] = useState(null);

  const handleTmdbSelect = async (selected) => {
    try {
      addToast(`Fetching metadata from TMDB for "${selected.title}"...`, "info");
      const details = await getTmdbDetails(selected.tmdb_id, selected.type);
      
      setTmdbId(details.tmdb_id);
      setType(details.type);
      setTitle(details.title);
      setYear(details.year);
      setPosterUrl(details.poster_url);
      setBackdropUrl(details.backdrop_url);
      setTrailerUrl(details.trailer_url);
      setGenresStr(details.genres.join(", "));
      setImdbRating(details.imdb_rating);
      setOverview(details.overview);
      setReleaseDate(details.release_date);
      setStudio(details.studio);
      
      if (details.type === "movie") {
        setRuntime(details.runtime);
        setDirector(details.director);
      } else {
        setCreator(details.creator);
        setSeasonCount(details.seasons?.length || 1);
        setEpisodesPerSeason(details.seasons?.[0]?.episode_count || 10);
        setIsOngoing(details.is_ongoing);
      }

      setCastStr((details.cast || []).map((c) => `${c.name} as ${c.character}`).join("\n"));
      addToast(`Metadata auto-populated!`, "success");
    } catch (err) {
      addToast(`Error fetching TMDB details: ${err.message}`, "error");
    }
  };

  const handleDefaultPathChange = async (newPath) => {
    setDefaultPath(newPath);

    const isVideoFile = VIDEO_EXTENSIONS.some((ext) => newPath.toLowerCase().endsWith(ext));
    if (isVideoFile) {
      const { cleanTitle, year: parsedYear } = extractTitleAndYearFromPath(newPath);
      if (cleanTitle && (!title || title === "Untitled")) {
        setTitle(cleanTitle);
        if (parsedYear) setYear(parsedYear);
        try {
          const searchResults = await searchTmdb(cleanTitle, parsedYear);
          if (searchResults && searchResults.length > 0) {
            const exactMatch = searchResults.find((r) => r.year === parsedYear) || searchResults[0];
            handleTmdbSelect(exactMatch);
          }
        } catch (e) {}
      }
    }
  };

  const handleSelectFolderFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const videoFiles = files.filter((f) => {
      const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
      return VIDEO_EXTENSIONS.includes(ext);
    });

    if (videoFiles.length === 0) {
      addToast("No video files (.mp4, .mkv, .avi) found in the selected folder.", "warning");
      return;
    }

    const firstRelativePath = videoFiles[0].webkitRelativePath || "";
    const detectedFolderName = firstRelativePath.split("/")[0] || "Marvel Films";
    
    if (!folderPath) {
      setFolderPath(`C:\\Users\\Ahmed\\Downloads\\English\\${detectedFolderName}`);
    }

    const fileNamesList = videoFiles.map((f) => f.name).join("\n");
    setFileListText(fileNamesList);
    addToast(`Discovered ${videoFiles.length} video file(s) in folder! Subtitles were filtered out.`, "success");
  };

  const handleEpisodePathChange = (code, value) => {
    setEpisodePaths((prev) => ({ ...prev, [code]: value }));
  };

  const handleSubmitSingle = async (e) => {
    e.preventDefault();

    let finalTitle = title.trim();
    if (!finalTitle) {
      finalTitle = extractCleanTitleFromPath(defaultPath) || "Untitled Media";
    }

    const parsedGenres = genresStr.split(",").map((g) => g.trim()).filter(Boolean);
    const parsedCast = castStr
      .split("\n")
      .map((line) => {
        const parts = line.split(" as ");
        return { name: parts[0]?.trim() || "", character: parts[1]?.trim() || "" };
      })
      .filter((c) => c.name);

    let pathsObj = type === "movie" ? { default: defaultPath } : { default: defaultPath, ...episodePaths };

    const seasonsArr = Array.from({ length: parseInt(seasonCount) || 1 }).map((_, idx) => ({
      season_number: idx + 1,
      episode_count: parseInt(episodesPerSeason) || 10
    }));

    const mediaData = {
      tmdb_id: tmdbId ? parseInt(tmdbId) : Date.now(),
      type,
      title: finalTitle,
      year: parseInt(year) || new Date().getFullYear(),
      poster_url: posterUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
      backdrop_url: backdropUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&auto=format&fit=crop&q=80",
      trailer_url: trailerUrl,
      genres: parsedGenres.length > 0 ? parsedGenres : ["Cinema"],
      imdb_rating: parseFloat(imdbRating) || 8.0,
      overview: overview || `Local file: ${defaultPath}`,
      release_date: releaseDate,
      runtime: parseInt(runtime) || 0,
      director,
      creator,
      studio,
      cast: parsedCast,
      seasons: seasonsArr,
      total_episodes: seasonsArr.reduce((acc, s) => acc + s.episode_count, 0),
      is_ongoing: isOngoing,
      new_paths: pathsObj
    };

    try {
      await saveMediaEntry(mediaData, currentUser);
      addToast(`"${finalTitle}" saved to library!`, "success");
      onSaveSuccess();
    } catch (err) {
      addToast(`Failed to save entry: ${err.message}`, "error");
    }
  };

  // Step 1 -> Step 2: Start Batch Scanning
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
    const results = [];

    for (let i = 0; i < videoItems.length; i++) {
      const rawItem = videoItems[i];

      const fullItemPath = rawItem.includes(":") || rawItem.startsWith("\\")
        ? rawItem
        : `${baseFolder}\\${rawItem}`;

      const { cleanTitle, year: extractedYear } = extractTitleAndYearFromPath(rawItem);
      if (!cleanTitle) continue;

      const progressLabel = extractedYear ? `"${cleanTitle}" (${extractedYear})` : `"${cleanTitle}"`;
      setScanProgress(`Scanning (${i + 1}/${videoItems.length}): Fetching metadata for ${progressLabel}...`);

      try {
        const searchResults = await searchTmdb(cleanTitle, extractedYear);

        if (searchResults && searchResults.length > 0) {
          const topMatch = (extractedYear && searchResults.find((r) => r.year === extractedYear)) || searchResults[0];
          const details = await getTmdbDetails(topMatch.tmdb_id, topMatch.type);
          
          results.push({
            selected: true,
            filePath: fullItemPath,
            rawFileName: rawItem,
            mediaData: {
              ...details,
              new_paths: { default: fullItemPath }
            }
          });
        } else {
          results.push({
            selected: true,
            filePath: fullItemPath,
            rawFileName: rawItem,
            mediaData: {
              tmdb_id: Date.now() + Math.floor(Math.random() * 10000),
              type: "movie",
              title: cleanTitle,
              year: extractedYear || new Date().getFullYear(),
              poster_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
              backdrop_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&auto=format&fit=crop&q=80",
              genres: ["Cinema"],
              imdb_rating: 8.0,
              overview: `Local video file: ${fullItemPath}`,
              new_paths: { default: fullItemPath }
            }
          });
        }
      } catch (err) {
        console.error(`Error scanning ${cleanTitle}:`, err);
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

  // Instant Batch Save & Immediate Navigation to Home
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

      setSavingBatch(false);
      addToast(`Successfully added all ${totalSaved} items to your shared library!`, "success");
      onSaveSuccess();
    } catch (err) {
      console.error("Batch save error:", err);
      addToast(`Error saving batch: ${err.message}`, "error");
      setSavingBatch(false);
    }
  };

  return (
    <div style={styles.container} className="animate-fade">
      {/* Live Batch Saving Overlay Modal */}
      {savingBatch && (
        <div style={styles.savingOverlay}>
          <div style={styles.savingBox} className="glass-modal">
            <Loader2 size={54} color="var(--accent-green)" className="animate-spin" />
            <h2 style={styles.savingHeader}>Saving Items to Shared Library</h2>

            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: `${saveProgressData.percentage}%` }} />
            </div>

            <div style={styles.savingPctText}>{saveProgressData.percentage}% Complete</div>

            <div style={styles.savingDetailText}>
              Saving item <strong>#{saveProgressData.current}</strong> of <strong>{saveProgressData.total}</strong>:
              <div style={styles.savingMovieTitle}>"{saveProgressData.title}"</div>
              <span style={styles.savingRemainingText}>
                ({saveProgressData.total - saveProgressData.current} items remaining)
              </span>
            </div>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onCancel}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1 style={styles.title}>{editItem ? "Edit Media Entry" : "Add New Films or TV Series"}</h1>
      </div>

      {/* Mode Selector Tabs */}
      <div style={styles.modeTabs}>
        <button
          type="button"
          style={{ ...styles.modeTabBtn, ...(mode === "single" ? styles.modeTabActive : {}) }}
          onClick={() => {
            setMode("single");
            setBatchStep("input");
          }}
        >
          <Film size={18} /> Single Entry Mode
        </button>

        <button
          type="button"
          style={{ ...styles.modeTabBtn, ...(mode === "batch" ? styles.modeTabActive : {}) }}
          onClick={() => setMode("batch")}
        >
          <FolderPlus size={18} color="var(--accent-green)" /> 📁 Batch Folder Scanner & Preview
        </button>
      </div>

      {mode === "batch" ? (
        /* BATCH FOLDER SCANNER 3-STEP WIZARD UI */
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
      ) : (
        /* SINGLE ENTRY FORM UI */
        <form onSubmit={handleSubmitSingle} style={styles.formGrid}>
          {/* Left Form Block — TMDB Search & Metadata */}
          <div style={styles.leftCol} className="glass-panel">
            <h3 style={styles.sectionTitle}>
              <Sparkles size={18} color="var(--accent-red)" /> TMDB Auto-Fetch Metadata
            </h3>

            <div style={styles.typeToggle}>
              <button
                type="button"
                style={{ ...styles.typeBtn, ...(type === "movie" ? styles.typeActiveRed : {}) }}
                onClick={() => setType("movie")}
              >
                <Film size={16} /> Movie
              </button>
              <button
                type="button"
                style={{ ...styles.typeBtn, ...(type === "series" ? styles.typeActiveGreen : {}) }}
                onClick={() => setType("series")}
              >
                <Tv size={16} /> TV Series
              </button>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Live TMDB Search</label>
              <TmdbSearchInput onSelectMedia={handleTmdbSelect} initialQuery={title} />
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Movie or TV Series Title..."
                  style={styles.input}
                />
              </div>
              <div style={{ ...styles.field, maxWidth: "120px" }}>
                <label style={styles.label}>Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Poster Image URL</label>
                <input
                  type="url"
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  placeholder="https://image.tmdb.org/t/p/w500/..."
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Backdrop Image URL</label>
                <input
                  type="url"
                  value={backdropUrl}
                  onChange={(e) => setBackdropUrl(e.target.value)}
                  placeholder="https://image.tmdb.org/t/p/original/..."
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>YouTube Trailer URL</label>
                <input
                  type="url"
                  value={trailerUrl}
                  onChange={(e) => setTrailerUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  style={styles.input}
                />
              </div>
              <div style={{ ...styles.field, maxWidth: "140px" }}>
                <label style={styles.label}>IMDb Rating</label>
                <input
                  type="number"
                  step="0.1"
                  value={imdbRating}
                  onChange={(e) => setImdbRating(e.target.value)}
                  placeholder="8.8"
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Genres (comma-separated)</label>
              <input
                type="text"
                value={genresStr}
                onChange={(e) => setGenresStr(e.target.value)}
                placeholder="Action, Sci-Fi, Adventure"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Overview</label>
              <textarea
                rows={3}
                value={overview}
                onChange={(e) => setOverview(e.target.value)}
                style={styles.textarea}
              />
            </div>

            <div style={styles.row}>
              {type === "movie" ? (
                <>
                  <div style={styles.field}>
                    <label style={styles.label}>Director</label>
                    <input
                      type="text"
                      value={director}
                      onChange={(e) => setDirector(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Runtime (mins)</label>
                    <input
                      type="number"
                      value={runtime}
                      onChange={(e) => setRuntime(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={styles.field}>
                    <label style={styles.label}>Creator</label>
                    <input
                      type="text"
                      value={creator}
                      onChange={(e) => setCreator(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div style={{ ...styles.field, maxWidth: "120px" }}>
                    <label style={styles.label}>Seasons</label>
                    <input
                      type="number"
                      value={seasonCount}
                      onChange={(e) => setSeasonCount(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Top Cast (One per line: Name as Character)</label>
              <textarea
                rows={3}
                value={castStr}
                onChange={(e) => setCastStr(e.target.value)}
                placeholder="Leonardo DiCaprio as Cobb&#10;Joseph Gordon-Levitt as Arthur"
                style={styles.textarea}
              />
            </div>
          </div>

          {/* Right Form Block — Local PC File Path Configuration */}
          <div style={styles.rightCol} className="glass-panel">
            <h3 style={styles.sectionTitle}>
              <HardDrive size={18} color="var(--accent-green)" /> Local PC Media File Locations
            </h3>

            <div style={styles.field}>
              <label style={styles.label}>Paste Local File Path ({currentUser?.displayName})</label>
              <input
                type="text"
                value={defaultPath}
                onChange={(e) => handleDefaultPathChange(e.target.value)}
                placeholder="e.g. C:\Downloads\Marvel Films\Avengers.mp4"
                style={styles.input}
              />
              <span style={styles.helpText}>
                Pasting a single video file path (.mp4/.mkv) auto-fetches TMDB metadata.
              </span>
            </div>

            {defaultPath && !VIDEO_EXTENSIONS.some((ext) => defaultPath.toLowerCase().endsWith(ext)) && (
              <div style={styles.folderNotice}>
                <FolderPlus size={20} color="var(--accent-green)" />
                <div style={{ flex: 1 }}>
                  <strong>Folder Path Detected!</strong>
                  <p style={{ fontSize: "0.8rem", margin: "2px 0 0 0" }}>
                    This folder contains multiple movies. Switch to **Batch Folder Scanner** to scan and add all movies automatically!
                  </p>
                </div>
                <button
                  type="button"
                  style={styles.switchModeBtn}
                  onClick={() => {
                    setFolderPath(defaultPath);
                    setMode("batch");
                  }}
                >
                  Launch Scanner
                </button>
              </div>
            )}

            {type === "series" && (
              <div style={styles.episodeMapperSection}>
                <h4 style={styles.subSectionTitle}>Episode Multi-File Mapping</h4>
                <p style={styles.helpText}>Map individual episode codes to local video files (.mp4, .mkv):</p>

                <div style={styles.epMapperGrid}>
                  {Array.from({ length: Math.min(parseInt(seasonCount) || 1, 3) }).map((_, sIdx) => {
                    const sNum = sIdx + 1;
                    return Array.from({ length: 3 }).map((_, eIdx) => {
                      const eNum = eIdx + 1;
                      const code = `S${sNum}E${eNum}`;
                      return (
                        <div key={code} style={styles.epFieldRow}>
                          <span style={styles.epBadge}>{code}</span>
                          <input
                            type="text"
                            value={episodePaths[code] || ""}
                            onChange={(e) => handleEpisodePathChange(code, e.target.value)}
                            placeholder={`D:\\Series\\${title || 'Show'}\\${code}.mp4`}
                            style={styles.epInput}
                          />
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            )}

            {posterUrl && (
              <div style={styles.previewBox}>
                <span style={styles.label}>Poster Live Preview</span>
                <img src={posterUrl} alt="Preview" style={styles.previewImg} />
              </div>
            )}

            <div style={styles.submitSection}>
              <button type="submit" style={styles.submitBtn}>
                <Save size={18} /> Save Entry to Shared Library
              </button>
            </div>
          </div>
        </form>
      )}
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
    backgroundColor: "var(--bg-elevated)",
    color: "#ffffff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
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
