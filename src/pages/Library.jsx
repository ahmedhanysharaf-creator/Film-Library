import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Search, Grid, List, Filter, ArrowUpDown, Check, X, Film, Tv, Star, CheckCircle2, Bookmark, User, Globe, History, Edit3, Trash2, Calendar, HardDrive, CheckSquare, Square, Layers, CheckCheck, FolderArchive 
} from "lucide-react";
import { fetchLibraryItems, deleteMediaEntry, deleteMediaEntriesBatch, updateWatchProgress } from "../services/storage";
import { exportMasterM3uPlaylist } from "../services/vlcLauncher";
import { exportPlaylistsAsZip } from "../services/folderSync";
import { PosterCard } from "../components/PosterCard";
import { ContinueWatchingRow } from "../components/ContinueWatchingRow";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const Library = ({ onSelectItem, onEditItem, onPlayMedia }) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scope & Sub-view state
  const [libraryScope, setLibraryScope] = useState("all"); // "all" | "my"
  const [showHistoryView, setShowHistoryView] = useState(false); // Sub-view under "my" scope

  // Multi-select & Batch Actions state
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [isMultiSelectActive, setIsMultiSelectActive] = useState(false);

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

  // Multi-Select Helpers
  const isAllSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedItemIds.has(item.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds(new Set());
    } else {
      const allIds = new Set(filteredItems.map((item) => item.id));
      setSelectedItemIds(allIds);
      setIsMultiSelectActive(true);
    }
  };

  const handleToggleSelectItem = (id) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedItemIds(next);
    if (next.size > 0) setIsMultiSelectActive(true);
  };

  const handleMassDelete = async () => {
    const idsToDelete = Array.from(selectedItemIds);
    if (idsToDelete.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete all ${idsToDelete.length} selected media entry(ies) from the library?`)) {
      return;
    }

    try {
      addToast(`Deleting ${idsToDelete.length} items from library...`, "info");
      await deleteMediaEntriesBatch(idsToDelete);
      addToast(`Successfully deleted ${idsToDelete.length} item(s)!`, "success");
      setSelectedItemIds(new Set());
      setIsMultiSelectActive(false);
      loadItems();
    } catch (err) {
      addToast(`Failed mass delete: ${err.message}`, "error");
    }
  };

  const handleMassWatchStatus = async (newStatus) => {
    const idsToUpdate = Array.from(selectedItemIds);
    if (idsToUpdate.length === 0) return;

    try {
      addToast(`Updating watch status to "${newStatus}" for ${idsToUpdate.length} item(s)...`, "info");
      for (const id of idsToUpdate) {
        await updateWatchProgress(id, currentUser.uid, newStatus, []);
      }
      addToast(`Updated ${idsToUpdate.length} item(s) to ${newStatus}!`, "success");
      loadItems();
    } catch (err) {
      addToast(`Failed mass update: ${err.message}`, "error");
    }
  };

  const handleMassEdit = () => {
    const selectedList = filteredItems.filter((i) => selectedItemIds.has(i.id));
    if (selectedList.length === 1) {
      onEditItem(selectedList[0]);
    } else if (selectedList.length > 1) {
      addToast("Editing first selected item in form...", "info");
      onEditItem(selectedList[0]);
    }
  };

  return (
    <div style={styles.container} className="animate-fade">
      {/* Netflix-style Continue Watching Section */}
      <ContinueWatchingRow libraryItems={items} onSelectMedia={onSelectItem} />

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

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={styles.itemCount}>Showing {filteredItems.length} of {items.length} items</span>
            <button
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                border: "1px solid #3b82f6",
                color: "#3b82f6",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onClick={() => exportMasterM3uPlaylist(items, addToast, currentUser?.uid)}
              title="Download a single Master Playlist file containing all movies & TV episodes for VLC"
            >
              <List size={14} /> Export Master Playlist (.m3u)
            </button>

            <button
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                border: "1px solid #10b981",
                color: "#10b981",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onClick={() => exportPlaylistsAsZip(items, addToast)}
              title="Download a ZIP archive containing Movies/ and Series/ folders with individual .m3u files"
            >
              <FolderArchive size={14} /> Download Playlists Folder (.ZIP)
            </button>
          </div>
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

            {/* Watch Status Filter Tabs */}
            <div style={styles.segmentedGroup}>
              <button
                style={{ ...styles.segmentBtn, ...(watchFilter === "all" ? styles.segmentActive : {}) }}
                onClick={() => setWatchFilter("all")}
              >
                All Status
              </button>
              <button
                style={{ ...styles.segmentBtn, ...(watchFilter === "watchlist" ? styles.segmentActiveGold : {}) }}
                onClick={() => setWatchFilter("watchlist")}
              >
                <Bookmark size={14} fill={watchFilter === "watchlist" ? "#f5c518" : "none"} color={watchFilter === "watchlist" ? "#f5c518" : "currentColor"} /> Watchlist
              </button>
              <button
                style={{ ...styles.segmentBtn, ...(watchFilter === "watched" ? styles.segmentActiveGreen : {}) }}
                onClick={() => setWatchFilter("watched")}
              >
                <CheckCircle2 size={14} color={watchFilter === "watched" ? "var(--accent-green)" : "currentColor"} /> Watched
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
                <option value="title">Title (A-Z)</option>
                <option value="rating">Highest Rating</option>
                <option value="year">Release Year</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div style={styles.viewToggleGroup}>
              <button
                style={{ ...styles.viewBtn, ...(viewMode === "grid" ? styles.viewBtnActive : {}) }}
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <Grid size={16} />
              </button>
              <button
                style={{ ...styles.viewBtn, ...(viewMode === "list" ? styles.viewBtnActive : {}) }}
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <List size={16} />
              </button>
            </div>

            {/* Toggle Multi-Select Mode */}
            <button
              style={{
                ...styles.multiSelectToggleBtn,
                ...(isMultiSelectActive ? styles.multiSelectToggleBtnActive : {})
              }}
              onClick={() => setIsMultiSelectActive(!isMultiSelectActive)}
            >
              <CheckCheck size={16} />
              {isMultiSelectActive ? "Exit Select Mode" : "Select Mode"}
            </button>
          </div>
        )}
      </div>

      {/* Mass Actions Toolbar (Visible when Select Mode active or items selected) */}
      {!showHistoryView && (isMultiSelectActive || selectedItemIds.size > 0) && (
        <div style={styles.massActionsBar} className="animate-pop">
          <div style={styles.massSelectGroup}>
            <button style={styles.selectAllBtn} onClick={handleToggleSelectAll}>
              {isAllSelected ? <CheckSquare size={18} color="var(--accent-green)" /> : <Square size={18} />}
              {isAllSelected ? "Deselect All" : `Select All (${filteredItems.length})`}
            </button>
            <span style={styles.selectedCountText}>
              <strong>{selectedItemIds.size}</strong> item(s) selected
            </span>
          </div>

          <div style={styles.massBtnGroup}>
            <button
              style={styles.massWatchedBtn}
              onClick={() => handleMassWatchStatus("watched")}
              disabled={selectedItemIds.size === 0}
            >
              <CheckCircle2 size={15} /> Mark Watched ({selectedItemIds.size})
            </button>

            <button
              style={styles.massWatchlistBtn}
              onClick={() => handleMassWatchStatus("watchlist")}
              disabled={selectedItemIds.size === 0}
            >
              <Bookmark size={15} /> Add Watchlist ({selectedItemIds.size})
            </button>

            {selectedItemIds.size > 0 && (
              <button style={styles.massEditBtn} onClick={handleMassEdit}>
                <Edit3 size={15} /> Edit Selected ({selectedItemIds.size})
              </button>
            )}

            <button
              style={styles.massDeleteBtn}
              onClick={handleMassDelete}
              disabled={selectedItemIds.size === 0}
            >
              <Trash2 size={15} /> Mass Delete ({selectedItemIds.size})
            </button>

            <button
              style={styles.clearSelectionBtn}
              onClick={() => {
                setSelectedItemIds(new Set());
                setIsMultiSelectActive(false);
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* My Upload History Sub-View */}
      {showHistoryView && libraryScope === "my" ? (
        <div style={styles.historyContainer} className="glass-panel">
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

          {/* Grid or List Display with Card Focus Highlighting & Multi-Select Checkboxes */}
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
                const isItemChecked = selectedItemIds.has(item.id);
                const isDimmed = selectedItemIds.size > 0 && !isItemChecked;

                return (
                  <PosterCard
                    key={item.id}
                    item={item}
                    onClick={() => {
                      if (isMultiSelectActive || selectedItemIds.size > 0) {
                        handleToggleSelectItem(item.id);
                      } else {
                        onSelectItem(item);
                      }
                    }}
                    onEdit={onEditItem}
                    onDelete={handleDeleteItem}
                    isSelected={isItemChecked}
                    isDimmed={isDimmed}
                    viewMode={viewMode}
                    onToggleSelect={isMultiSelectActive || selectedItemIds.size > 0 ? handleToggleSelectItem : null}
                  />
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
    fontSize: "2.2rem",
    fontWeight: 800,
    color: "#ffffff"
  },
  scopeTabs: {
    display: "flex",
    backgroundColor: "var(--bg-elevated)",
    padding: "4px",
    borderRadius: "8px",
    border: "1px solid var(--border-subtle)"
  },
  scopeBtn: {
    padding: "8px 14px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "var(--transition)"
  },
  scopeActiveAll: {
    backgroundColor: "var(--bg-surface)",
    color: "#ffffff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)"
  },
  scopeActiveMy: {
    backgroundColor: "rgba(70,211,105,0.2)",
    color: "var(--accent-green)",
    boxShadow: "0 2px 8px rgba(70,211,105,0.3)"
  },
  historyViewBtn: {
    padding: "8px 14px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--accent-green)",
    color: "var(--accent-green)",
    borderRadius: "6px",
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  historyViewBtnActive: {
    backgroundColor: "var(--accent-green)",
    color: "#000000"
  },
  itemCount: {
    color: "var(--text-muted)",
    fontSize: "0.9rem"
  },
  controlsRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap"
  },
  searchBox: {
    position: "relative",
    flex: 1,
    minWidth: "260px"
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)"
  },
  searchInput: {
    width: "100%",
    padding: "10px 38px 10px 42px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "0.9rem",
    outline: "none"
  },
  clearSearchBtn: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer"
  },
  segmentedGroup: {
    display: "flex",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    padding: "3px"
  },
  segmentBtn: {
    padding: "8px 14px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  segmentActive: {
    backgroundColor: "var(--accent-red)",
    color: "#ffffff"
  },
  segmentActiveGold: {
    backgroundColor: "rgba(245, 197, 24, 0.25)",
    color: "var(--accent-gold)",
    border: "1px solid var(--accent-gold)"
  },
  segmentActiveGreen: {
    backgroundColor: "rgba(70, 211, 105, 0.25)",
    color: "var(--accent-green)",
    border: "1px solid var(--accent-green)"
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
    padding: "10px 4px",
    fontSize: "0.85rem",
    outline: "none",
    cursor: "pointer"
  },
  viewToggleGroup: {
    display: "flex",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    padding: "3px"
  },
  viewBtn: {
    padding: "8px 12px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    cursor: "pointer"
  },
  viewBtnActive: {
    backgroundColor: "var(--bg-elevated)",
    color: "#ffffff"
  },
  multiSelectToggleBtn: {
    padding: "10px 14px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  multiSelectToggleBtnActive: {
    backgroundColor: "rgba(70,211,105,0.2)",
    borderColor: "var(--accent-green)",
    color: "var(--accent-green)"
  },
  massActionsBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    backgroundColor: "rgba(22, 23, 29, 0.95)",
    border: "1px solid var(--accent-green)",
    borderRadius: "12px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.8)",
    flexWrap: "wrap",
    gap: "12px"
  },
  massSelectGroup: {
    display: "flex",
    alignItems: "center",
    gap: "16px"
  },
  selectAllBtn: {
    backgroundColor: "var(--bg-elevated)",
    color: "#ffffff",
    border: "1px solid var(--border-subtle)",
    padding: "8px 14px",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.88rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  selectedCountText: {
    fontSize: "0.9rem",
    color: "var(--text-primary)"
  },
  massBtnGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap"
  },
  massWatchedBtn: {
    backgroundColor: "rgba(70,211,105,0.2)",
    color: "var(--accent-green)",
    border: "1px solid var(--accent-green)",
    padding: "8px 14px",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.85rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  massWatchlistBtn: {
    backgroundColor: "rgba(245,197,24,0.2)",
    color: "var(--accent-gold)",
    border: "1px solid var(--accent-gold)",
    padding: "8px 14px",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.85rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  massEditBtn: {
    backgroundColor: "var(--bg-elevated)",
    color: "#ffffff",
    border: "1px solid var(--border-subtle)",
    padding: "8px 14px",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  massDeleteBtn: {
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    fontWeight: 800,
    fontSize: "0.85rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    boxShadow: "0 4px 14px rgba(229,9,20,0.4)"
  },
  clearSelectionBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "4px"
  },
  filterBar: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    backgroundColor: "var(--bg-surface)",
    padding: "16px 20px",
    borderRadius: "12px",
    border: "1px solid var(--border-subtle)"
  },
  statusFilterRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap"
  },
  filterLabel: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase"
  },
  statusFilterBtn: {
    padding: "6px 12px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "20px",
    color: "var(--text-secondary)",
    fontSize: "0.8rem",
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
    height: "1px",
    backgroundColor: "var(--border-subtle)",
    width: "100%"
  },
  genreSection: {
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
    padding: "4px 8px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "4px",
    color: "var(--text-secondary)",
    fontSize: "0.75rem",
    cursor: "pointer"
  },
  logicActive: {
    backgroundColor: "var(--accent-green)",
    color: "#000000",
    fontWeight: 700
  },
  clearGenresBtn: {
    fontSize: "0.78rem",
    color: "var(--accent-red)",
    background: "none",
    border: "none",
    cursor: "pointer"
  },
  genrePillScroll: {
    display: "flex",
    gap: "6px",
    overflowX: "auto",
    paddingBottom: "4px"
  },
  genrePill: {
    padding: "4px 10px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "14px",
    color: "var(--text-secondary)",
    fontSize: "0.78rem",
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  genrePillActive: {
    backgroundColor: "rgba(170,59,255,0.2)",
    color: "var(--accent-purple)",
    borderColor: "var(--accent-purple)",
    fontWeight: 700
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "24px"
  },
  listStack: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    gap: "12px",
    color: "var(--text-muted)"
  },
  loadingState: {
    textAlign: "center",
    padding: "60px",
    color: "var(--text-muted)"
  },
  historyContainer: {
    padding: "24px",
    borderRadius: "14px"
  },
  historyHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "20px"
  },
  historyTitle: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "#ffffff"
  },
  historySub: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginTop: "2px"
  },
  historyTableWrapper: {
    overflowX: "auto"
  },
  historyTable: {
    width: "100%",
    borderCollapse: "collapse"
  },
  tableHeaderRow: {
    borderBottom: "1px solid var(--border-subtle)",
    textAlign: "left"
  },
  th: {
    padding: "12px 14px",
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--text-muted)"
  },
  tableRow: {
    borderBottom: "1px solid var(--border-subtle)"
  },
  td: {
    padding: "12px 14px",
    fontSize: "0.9rem"
  },
  historyPoster: {
    width: "42px",
    height: "60px",
    borderRadius: "4px",
    objectFit: "cover"
  },
  historyTitleText: {
    fontWeight: 700,
    color: "#ffffff"
  },
  historyYearText: {
    fontSize: "0.8rem",
    color: "var(--text-muted)"
  },
  historyPathText: {
    fontFamily: "monospace",
    fontSize: "0.78rem",
    color: "var(--text-secondary)",
    maxWidth: "320px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  historyActionGroup: {
    display: "flex",
    gap: "8px"
  },
  historyEditBtn: {
    padding: "6px 12px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "4px",
    color: "#ffffff",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  historyDeleteBtn: {
    padding: "6px 12px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "4px",
    color: "var(--accent-red)",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  }
};
