import React, { useState, useEffect } from "react";
import { 
  Film, Tv, Search, Save, ArrowLeft, HardDrive, Plus, Trash2, Sparkles, CheckCircle2, Wand2 
} from "lucide-react";
import { TmdbSearchInput } from "../components/TmdbSearchInput";
import { getTmdbDetails, searchTmdb } from "../services/tmdb";
import { saveMediaEntry } from "../services/storage";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

// Allowed video file extensions — ignore subtitles (.srt, .vtt, .ass) & text files
const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".m4v", ".webm", ".flv", ".ts"];
const SUB_EXTENSIONS = [".srt", ".ass", ".vtt", ".sub", ".txt", ".nfo"];

export const isVideoFilePath = (path) => {
  if (!path) return true; // Accept folders or custom inputs
  const extIndex = path.lastIndexOf(".");
  if (extIndex === -1) return true; // Folder path
  const ext = path.substring(extIndex).toLowerCase();
  if (SUB_EXTENSIONS.includes(ext)) return false; // Reject subtitles
  return true;
};

export const extractCleanTitleFromPath = (fullPath) => {
  if (!fullPath) return "";
  const normalized = fullPath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) return "";
  
  let name = parts[parts.length - 1];

  // Strip known extensions
  [...VIDEO_EXTENSIONS, ...SUB_EXTENSIONS].forEach((ext) => {
    if (name.toLowerCase().endsWith(ext)) {
      name = name.substring(0, name.length - ext.length);
    }
  });

  // Clean tags like [1080p], (2010), dots, and underscores
  name = name.replace(/\[.*?\]|\(.*?\)/g, " ");
  name = name.replace(/[._-]/g, " ");
  return name.trim();
};

export const AddEditMedia = ({ editItem, onSaveSuccess, onCancel }) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

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

  // Series Specific
  const [seasonCount, setSeasonCount] = useState(editItem?.seasons?.length || 1);
  const [episodesPerSeason, setEpisodesPerSeason] = useState(
    editItem?.seasons?.[0]?.episode_count || 10
  );
  const [isOngoing, setIsOngoing] = useState(editItem?.is_ongoing || false);

  // Local Path mapping for current user
  const initialUserPaths = editItem?.user_paths?.find((up) => up.uid === currentUser?.uid)?.paths || {};
  const [defaultPath, setDefaultPath] = useState(initialUserPaths.default || "");
  const [episodePaths, setEpisodePaths] = useState(initialUserPaths || {});

  // Handle TMDB selection
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

  // Auto-extract title & search TMDB when file path is pasted/typed
  const handleDefaultPathChange = async (newPath) => {
    setDefaultPath(newPath);

    // Validate video format
    if (!isVideoFilePath(newPath)) {
      addToast("Note: Path ends with subtitle extension. Non-video files will be ignored during playback.", "warning");
    }

    const extracted = extractCleanTitleFromPath(newPath);
    if (extracted && (!title || title === "Untitled")) {
      setTitle(extracted);
      // Auto search TMDB for extracted title
      try {
        const searchResults = await searchTmdb(extracted);
        if (searchResults && searchResults.length > 0) {
          handleTmdbSelect(searchResults[0]);
        }
      } catch (e) {
        console.warn("Auto TMDB lookup error:", e);
      }
    }
  };

  const handleEpisodePathChange = (code, value) => {
    setEpisodePaths((prev) => ({
      ...prev,
      [code]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Auto extract title if missing
    let finalTitle = title.trim();
    if (!finalTitle) {
      finalTitle = extractCleanTitleFromPath(defaultPath) || "Untitled Media";
    }

    const parsedGenres = genresStr
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);

    const parsedCast = castStr
      .split("\n")
      .map((line) => {
        const parts = line.split(" as ");
        return {
          name: parts[0]?.trim() || "",
          character: parts[1]?.trim() || ""
        };
      })
      .filter((c) => c.name);

    // Build user paths map
    let pathsObj = {};
    if (type === "movie") {
      pathsObj = { default: defaultPath };
    } else {
      pathsObj = { default: defaultPath, ...episodePaths };
    }

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
      overview: overview || `Local collection file: ${defaultPath}`,
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

  return (
    <div style={styles.container} className="animate-fade">
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onCancel}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1 style={styles.title}>{editItem ? "Edit Media Entry" : "Add New Film or TV Series"}</h1>
      </div>

      <form onSubmit={handleSubmit} style={styles.formGrid}>
        {/* Left Form Block — TMDB Search & Metadata */}
        <div style={styles.leftCol} className="glass-panel">
          <h3 style={styles.sectionTitle}>
            <Sparkles size={18} color="var(--accent-red)" /> TMDB Auto-Fetch Metadata
          </h3>

          {/* Media Type Toggle */}
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

          {/* TMDB Search Component */}
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
                placeholder="Auto-extracted from path or search TMDB..."
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
            <label style={styles.label}>Paste Local File or Folder Path ({currentUser?.displayName})</label>
            <input
              type="text"
              value={defaultPath}
              onChange={(e) => handleDefaultPathChange(e.target.value)}
              placeholder="e.g. C:\Downloads\Marvel Films\Avengers.mp4"
              style={styles.input}
            />
            <span style={styles.helpText}>
              Pasting a file path automatically extracts the title, filters out subtitle files, and auto-fetches TMDB metadata!
            </span>
          </div>

          {/* Episode Specific Mapping for TV Series */}
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

          {/* Poster Preview Frame */}
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
    </div>
  );
};

const styles = {
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
