import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Search, Grid, List, Filter, ArrowUpDown, Check, X, Film, Tv, Star, CheckCircle2, Bookmark, User, Globe, History, Edit3, Trash2, Calendar, HardDrive 
} from "lucide-react";
import { fetchLibraryItems, deleteMediaEntry } from "../services/storage";
import { PosterCard } from "../components/PosterCard";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const Library = ({ onSelectItem, onEditItem }) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scope & Sub-view state
  const [libraryScope, setLibraryScope] = useState("all"); // "all" | "my"
  const [showHistoryView, setShowHistoryView] = useState(false); // Sub-view under "my" scope

  // Active hover/selection state for card dimming effect
  const [activeHoverId, setActiveHoverId] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [sortBy, setSortBy] = useState("added"); // "added" | "title" | "rating" | "year"
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "movie" | "series"
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [genreLogic, setGenreLogic] = useState("OR");
  const [watchFilter, setWatchFilter] = useState("all");

  const loadItems = useCallback(async () => {
    setLoading(true);
    const data = await fetchLibraryItems();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleDeleteItem = async (itemId) => {
    try {
      await deleteMediaEntry(itemId);
      addToast("Media entry deleted from library.", "info");
      loadItems();
    } catch (err) {
      addToast(`Failed to delete entry: ${err.message}`, "error");
    }
  };

  // Collect all unique genres across library items
  const allAvailableGenres = useMemo(() => {
    const genreSet = new Set();
    items.forEach((item) => {
      (item.genres || []).forEach((g) => genreSet.add(g));
    });
    return Array.from(genreSet).sort();
  }, [items]);

  const toggleGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  // Upload History items added or linked to currentUser
  const myUploadHistoryItems = useMemo(() => {
    return items
      .filter((i) => (i.user_paths || []).some((up) => up.uid === currentUser?.uid))
      .sort((a, b) => new Date(b.added_at || 0) - new Date(a.added_at || 0));
  }, [items, currentUser]);

  // Filter & Sort Computation
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 0. Scope Filter: "all" vs "my"
      if (libraryScope === "my") {
        const belongsToUser = (item.user_paths || []).some((up) => up.uid === currentUser?.uid);
        if (!belongsToUser) return false;
      }

      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesDirector = item.director?.toLowerCase().includes(q);
        const matchesCast = (item.cast || []).some((c) => c.name?.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDirector && !matchesCast) return false;
      }

      // 2. Type Filter
      if (typeFilter !== "all" && item.type !== typeFilter) return false;

      // 3. Watch Status Filter
      const userProgress = (item.user_progress || {})[currentUser?.uid || ""] || {};
      if (watchFilter === "watched" && userProgress.status !== "watched") return false;
      if (watchFilter === "watchlist" && userProgress.status !== "watchlist") return false;
      if (watchFilter === "unwatched" && userProgress.status === "watched") return false;

      // 4. Genre Filter
      if (selectedGenres.length > 0) {
        const itemGenres = item.genres || [];
        if (genreLogic === "AND") {
          const matchesAll = selectedGenres.every((g) => itemGenres.includes(g));
          if (!matchesAll) return false;
        } else {
          const matchesAny = selectedGenres.some((g) => itemGenres.includes(g));
          if (!matchesAny) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "rating") return (b.imdb_rating || 0) - (a.imdb_rating || 0);
      if (sortBy === "year") return (b.year || 0) - (a.year || 0);
      return new Date(b.added_at || 0) - new Date(a.added_at || 0);
    });
  }, [items, libraryScope, searchQuery, typeFilter, watchFilter, selectedGenres, genreLogic, sortBy, currentUser]);

  return (
    <div style={styles.container} className="animate-fade">
      {/* Top Header & Toolbar */}
      <div style={styles.topBar}>
        <div style={styles.titleSection}>
          <div style={styles.titleWithScope}>
            <h1 style={styles.pageTitle}>The Library</h1>

            {/* Scope Filter Tabs: All Shared Library vs My Library */}
            <div style={styles.scopeTabs}>
              <button
                style={{ ...styles.scopeBtn, ...(libraryScope === "all" ? styles.scopeActiveAll : {}) }}
                onClick={() => {
                  setLibraryScope("all");
                  setShowHistoryView(false);
                }}
              >
                <Globe size={15} /> All Shared Library ({items.length})
              </button>
              <button
                style={{ ...styles.scopeBtn, ...(libraryScope === "my" ? styles.scopeActiveMy : {}) }}
                onClick={() => setLibraryScope("my")}
              >
                <User size={15} color="var(--accent-green)" /> My Library ({myUploadHistoryItems.length})
              </button>
            </div>

            {/* My History & Uploads Activity Button (Visible inside My Library) */}
            {libraryScope === "my" && (
              <button
                style={{
                  ...styles.historyViewBtn,
                  ...(showHistoryView ? styles.historyViewBtnActive : {})
                }}
                onClick={() => setShowHistoryView(!showHistoryView)}
              >
                <History size={16} />
                {showHistoryView ? "Switch to Grid View" : `My Upload History (${myUploadHistoryItems.length})`}
              </button>
            )}
          </div>

          <span style={styles.itemCount}>Showing {filteredItems.length} of {items.length} items</span>
        </div>

        {!showHistoryView && (
          <div style={styles.controlsRow}>
            {/* Real-time Search Input */}
            <div style={styles.searchBox}>
              <Search size={18} color="var(--text-muted)" style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by title, director, cast..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              {searchQuery && (
                <button style={styles.clearSearchBtn} onClick={() => setSearchQuery("")}>
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Type Filter Tabs */}
            <div style={styles.segmentedGroup}>
              <button
                style={{ ...styles.segmentBtn, ...(typeFilter === "all" ? styles.segmentActive : {}) }}
                onClick={() => setTypeFilter("all")}
              >
                All
              </button>
              <button
                style={{ ...styles.segmentBtn, ...(typeFilter === "movie" ? styles.segmentActive : {}) }}
                onClick={() => setTypeFilter("movie")}
              >
                <Film size={14} /> Movies
              </button>
              <button
                style={{ ...styles.segmentBtn, ...(typeFilter === "series" ? styles.segmentActive : {}) }}
                onClick={() => setTypeFilter("series")}
              >
                <Tv size={14} /> Series
              </button>
            </div>

            {/* Sort Selector */}
            <div style={styles.selectWrapper}>
              <ArrowUpDown size={16} color="var(--text-muted)" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={styles.select}
              >
                <option value="added">Newest Added</option>
                <option value="title">Alphabetical A-Z</option>
                <option value="rating">Highest IMDB Rating</option>
                <option value="year">Release Year</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div style={styles.viewToggle}>
              <button
                style={{ ...styles.toggleBtn, ...(viewMode === "grid" ? styles.toggleActive : {}) }}
                onClick={() => setViewMode("grid")}
                title="Poster Grid View"
              >
                <Grid size={18} />
              </button>
              <button
                style={{ ...styles.toggleBtn, ...(viewMode === "list" ? styles.toggleActive : {}) }}
                onClick={() => setViewMode("list")}
                title="Compact List View"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MY UPLOAD HISTORY TIMELINE VIEW */}
      {showHistoryView ? (
        <div style={styles.historyCard} className="glass-panel animate-fade">
          <div style={styles.historyHeader}>
            <History size={24} color="var(--accent-green)" />
            <div>
              <h3 style={styles.historyTitle}>My Personal Upload History & Activity Log</h3>
              <p style={styles.historySub}>
                Below is a full chronological record of movies and series you have added or configured paths for. Click **Edit** or **Delete** to manage your media!
              </p>
            </div>
          </div>

          {myUploadHistoryItems.length === 0 ? (
            <div style={styles.emptyState}>
              <Film size={44} color="var(--text-muted)" />
              <p>You haven't uploaded or added any movies to your history yet.</p>
            </div>
          ) : (
            <div style={styles.historyTableWrapper}>
              <table style={styles.historyTable}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Media</th>
                    <th style={styles.th}>Title & Year</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>IMDb</th>
                    <th style={styles.th}>Local File Location</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myUploadHistoryItems.map((item) => {
                    const myPathObj = (item.user_paths || []).find((up) => up.uid === currentUser?.uid);
                    const myPath = myPathObj?.paths?.default || Object.values(myPathObj?.paths || {})[0] || "Configured";

                    return (
                      <tr key={item.id} style={styles.tableRow}>
                        <td style={styles.td}>
                          <img
                            src={item.poster_url}
                            alt={item.title}
                            style={styles.historyPoster}
                            loading="lazy"
                            decoding="async"
                          />
                        </td>
                        <td style={styles.td}>
                          <div style={styles.historyTitleText}>{item.title}</div>
                          <div style={styles.historyYearText}>({item.year})</div>
                        </td>
                        <td style={styles.td}>
                          <span className={`badge ${item.type === "series" ? "badge-green" : "badge-red"}`}>
                            {item.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>⭐ {item.imdb_rating}</span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.historyPathText} title={myPath}>
                            📁 {myPath}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.historyActionGroup}>
                            <button
                              style={styles.historyEditBtn}
                              onClick={() => onEditItem(item)}
                            >
                              <Edit3 size={14} /> Edit Entry
                            </button>
                            <button
                              style={styles.historyDeleteBtn}
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Watch Status & Genre Filter Bar */}
          <div style={styles.filterBar}>
            <div style={styles.statusFilterRow}>
              <span style={styles.filterLabel}>Status:</span>
              {["all", "watched", "watchlist", "unwatched"].map((st) => (
                <button
                  key={st}
                  style={{
                    ...styles.statusFilterBtn,
                    ...(watchFilter === st ? styles.statusFilterActive : {})
                  }}
                  onClick={() => setWatchFilter(st)}
                >
                  {st === "watched" && <CheckCircle2 size={12} color="var(--accent-green)" />}
                  {st === "watchlist" && <Bookmark size={12} color="var(--accent-gold)" />}
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </button>
              ))}
            </div>

            <div style={styles.dividerVertical} />

            <div style={styles.genreSection}>
              <div style={styles.genreHeader}>
                <span style={styles.filterLabel}>Genres:</span>

                <div style={styles.logicToggle}>
                  <span style={styles.logicLabel}>Logic:</span>
                  <button
                    style={{ ...styles.logicBtn, ...(genreLogic === "OR" ? styles.logicActive : {}) }}
                    onClick={() => setGenreLogic("OR")}
                  >
                    OR (Any)
                  </button>
                  <button
                    style={{ ...styles.logicBtn, ...(genreLogic === "AND" ? styles.logicActive : {}) }}
                    onClick={() => setGenreLogic("AND")}
                  >
                    AND (Strict)
                  </button>
                </div>

                {selectedGenres.length > 0 && (
                  <button style={styles.clearGenresBtn} onClick={() => setSelectedGenres([])}>
                    Clear Filter ({selectedGenres.length})
                  </button>
                )}
              </div>

              <div style={styles.genrePillScroll}>
                {allAvailableGenres.map((g) => {
                  const isSelected = selectedGenres.includes(g);
                  return (
                    <button
                      key={g}
                      style={{
                        ...styles.genrePill,
                        ...(isSelected ? styles.genrePillActive : {})
                      }}
                      onClick={() => toggleGenre(g)}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grid or List Display with Card Focus Highlighting Effect */}
          {loading ? (
            <div style={styles.loadingState}>Loading Film Library...</div>
          ) : filteredItems.length === 0 ? (
            <div style={styles.emptyState}>
              <Film size={48} color="var(--text-muted)" />
              <h3>No media items match your search / filter criteria.</h3>
              <p>
                {libraryScope === "my"
                  ? "You haven't added any movies to your personal library yet."
                  : "Try clearing genre filters or changing the search query."}
              </p>
            </div>
          ) : (
            <div style={viewMode === "grid" ? styles.grid : styles.listStack}>
              {filteredItems.map((item) => {
                const isHovered = activeHoverId === item.id;
                const hasAnyHover = activeHoverId !== null;
                const isDimmed = hasAnyHover && !isHovered;

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setActiveHoverId(item.id)}
                    onMouseLeave={() => setActiveHoverId(null)}
                  >
                    <PosterCard
                      item={item}
                      onClick={() => onSelectItem(item)}
                      onEdit={onEditItem}
                      onDelete={handleDeleteItem}
                      isSelected={isHovered}
                      isDimmed={isDimmed}
                      viewMode={viewMode}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "1400px",
    width: "100%",
    margin: "0 auto",
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    gap: "24px"
  },
  topBar: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  titleSection: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "16px"
  },
  titleWithScope: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap"
  },
  pageTitle: {
    fontSize: "2rem",
    fontWeight: 800,
    color: "#ffffff"
  },
  scopeTabs: {
    display: "flex",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "10px",
    padding: "4px"
  },
  scopeBtn: {
    padding: "8px 16px",
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: "0.88rem",
    fontWeight: 700,
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "var(--transition)"
  },
  scopeActiveAll: {
    backgroundColor: "var(--bg-elevated)",
    color: "#ffffff"
  },
  scopeActiveMy: {
    backgroundColor: "var(--bg-elevated)",
    color: "var(--accent-green)",
    boxShadow: "0 2px 8px rgba(70,211,105,0.2)"
  },
  historyViewBtn: {
    padding: "8px 16px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--accent-green)",
    color: "var(--accent-green)",
    fontSize: "0.88rem",
    fontWeight: 700,
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 14px rgba(70,211,105,0.2)"
  },
  historyViewBtnActive: {
    backgroundColor: "var(--accent-green)",
    color: "#000000"
  },
  itemCount: {
    color: "var(--text-muted)",
    fontSize: "0.9rem",
    fontWeight: 500
  },
  controlsRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap"
  },
  searchBox: {
    flex: 1,
    minWidth: "260px",
    position: "relative",
    display: "flex",
    alignItems: "center"
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    pointerEvents: "none"
  },
  clearSearchBtn: {
    position: "absolute",
    right: "12px",
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer"
  },
  searchInput: {
    width: "100%",
    padding: "10px 36px 10px 42px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "0.95rem",
    outline: "none"
  },
  segmentedGroup: {
    display: "flex",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    padding: "4px"
  },
  segmentBtn: {
    padding: "6px 14px",
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    fontWeight: 600,
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  segmentActive: {
    backgroundColor: "var(--bg-elevated)",
    color: "#ffffff"
  },
  selectWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    padding: "0 12px"
  },
  select: {
    backgroundColor: "transparent",
    border: "none",
    color: "#ffffff",
    fontSize: "0.88rem",
    padding: "10px 0",
    outline: "none",
    cursor: "pointer",
    fontWeight: 600
  },
  viewToggle: {
    display: "flex",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    padding: "4px"
  },
  toggleBtn: {
    padding: "6px 10px",
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    borderRadius: "6px",
    cursor: "pointer"
  },
  toggleActive: {
    backgroundColor: "var(--bg-elevated)",
    color: "var(--accent-red)"
  },
  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "12px",
    padding: "16px 20px",
    flexWrap: "wrap"
  },
  statusFilterRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  filterLabel: {
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  statusFilterBtn: {
    padding: "6px 12px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "20px",
    color: "var(--text-secondary)",
    fontSize: "0.82rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  statusFilterActive: {
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    borderColor: "var(--accent-red)"
  },
  dividerVertical: {
    width: "1px",
    height: "24px",
    backgroundColor: "var(--border-subtle)"
  },
  genreSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  genreHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  logicToggle: {
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  logicLabel: {
    fontSize: "0.78rem",
    color: "var(--text-muted)"
  },
  logicBtn: {
    padding: "2px 8px",
    fontSize: "0.75rem",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "4px",
    color: "var(--text-secondary)",
    cursor: "pointer"
  },
  logicActive: {
    backgroundColor: "var(--accent-green)",
    color: "#000000",
    fontWeight: 700,
    borderColor: "var(--accent-green)"
  },
  clearGenresBtn: {
    background: "none",
    border: "none",
    color: "var(--accent-red)",
    fontSize: "0.78rem",
    cursor: "pointer",
    fontWeight: 600
  },
  genrePillScroll: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    paddingBottom: "4px"
  },
  genrePill: {
    padding: "4px 12px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "20px",
    color: "var(--text-secondary)",
    fontSize: "0.8rem",
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  genrePillActive: {
    backgroundColor: "rgba(229, 9, 20, 0.2)",
    color: "var(--accent-red)",
    borderColor: "var(--accent-red)",
    fontWeight: 700
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "24px"
  },
  listStack: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  loadingState: {
    textAlign: "center",
    padding: "60px",
    color: "var(--text-muted)",
    fontSize: "1.1rem"
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px",
    gap: "16px",
    color: "var(--text-muted)",
    textAlign: "center"
  },
  historyCard: {
    padding: "32px",
    borderRadius: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "24px"
  },
  historyHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px"
  },
  historyTitle: {
    fontSize: "1.3rem",
    fontWeight: 800,
    color: "#ffffff",
    marginBottom: "4px"
  },
  historySub: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    lineHeight: "1.5"
  },
  historyTableWrapper: {
    overflowX: "auto"
  },
  historyTable: {
    width: "100%",
    borderCollapse: "collapse"
  },
  tableHeaderRow: {
    borderBottom: "2px solid var(--border-subtle)"
  },
  th: {
    padding: "12px 14px",
    textAlign: "left",
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase"
  },
  tableRow: {
    borderBottom: "1px solid var(--border-subtle)",
    transition: "background-color 0.2s ease"
  },
  td: {
    padding: "14px",
    verticalAlign: "middle"
  },
  historyPoster: {
    width: "48px",
    height: "70px",
    objectFit: "cover",
    borderRadius: "6px"
  },
  historyTitleText: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#ffffff"
  },
  historyYearText: {
    fontSize: "0.82rem",
    color: "var(--text-muted)"
  },
  historyPathText: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    fontFamily: "monospace",
    maxWidth: "280px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  historyActionGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  historyEditBtn: {
    padding: "6px 12px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    color: "#ffffff",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.8rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  historyDeleteBtn: {
    padding: "6px 12px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    color: "var(--accent-red)",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.8rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  }
};
