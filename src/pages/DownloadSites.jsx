import React, { useState, useEffect, useMemo } from "react";
import { 
  Globe, Plus, Search, ExternalLink, Trash2, Edit3, Sparkles, Pin, Bookmark, 
  RotateCcw, X, Check, ArrowRight, ShieldCheck, Download, Film, Tv, Radio, Send, Copy
} from "lucide-react";
import { 
  getDownloadSites, 
  addDownloadSite, 
  updateDownloadSite, 
  deleteDownloadSite, 
  resetDefaultDownloadSites, 
  getSiteSearchLink, 
  CATEGORIES 
} from "../services/downloadSites";
import { useToast } from "../context/ToastContext";

const COLOR_PRESETS = [
  { name: "Netflix Red", value: "#e50914" },
  { name: "Emerald Green", value: "#46d369" },
  { name: "Royal Blue", value: "#3b82f6" },
  { name: "Cyber Gold", value: "#f59e0b" },
  { name: "Neon Purple", value: "#8b5cf6" },
  { name: "Cyan Teal", value: "#06b6d4" },
  { name: "Hot Pink", value: "#ec4899" }
];

export const DownloadSites = () => {
  const { addToast } = useToast();
  const [sites, setSites] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [movieSearchQuery, setMovieSearchQuery] = useState("");
  const [siteFilterQuery, setSiteFilterQuery] = useState("");

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    searchUrl: "",
    category: "Torrents",
    quality: "1080p / 4K",
    description: "",
    color: "#e50914",
    isPinned: false
  });

  const loadSites = () => {
    const loaded = getDownloadSites();
    setSites(loaded);
  };

  useEffect(() => {
    loadSites();
  }, []);

  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      // Category Filter
      if (selectedCategory !== "All" && site.category !== selectedCategory) {
        return false;
      }
      // Text Filter (search site names or descriptions)
      if (siteFilterQuery.trim()) {
        const q = siteFilterQuery.toLowerCase();
        const matchesName = site.name?.toLowerCase().includes(q);
        const matchesDesc = site.description?.toLowerCase().includes(q);
        const matchesCat = site.category?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }
      return true;
    });
  }, [sites, selectedCategory, siteFilterQuery]);

  const handleOpenAddModal = () => {
    setEditingSiteId(null);
    setFormData({
      name: "",
      url: "",
      searchUrl: "",
      category: "Torrents",
      quality: "1080p / 4K",
      description: "",
      color: "#e50914",
      isPinned: false
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (site) => {
    setEditingSiteId(site.id);
    setFormData({
      name: site.name || "",
      url: site.url || "",
      searchUrl: site.searchUrl || "",
      category: site.category || "Torrents",
      quality: site.quality || "General",
      description: site.description || "",
      color: site.color || "#e50914",
      isPinned: Boolean(site.isPinned)
    });
    setModalOpen(true);
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) {
      addToast("Please provide both a Website Name and URL.", "error");
      return;
    }

    // Ensure URL has http protocol
    let formattedUrl = formData.url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    if (editingSiteId) {
      const updated = updateDownloadSite(editingSiteId, {
        ...formData,
        url: formattedUrl
      });
      setSites(updated);
      addToast(`Updated "${formData.name}" successfully!`, "success");
    } else {
      const updated = addDownloadSite({
        ...formData,
        url: formattedUrl
      });
      setSites(updated);
      addToast(`Added "${formData.name}" to your download sites!`, "success");
    }

    setModalOpen(false);
  };

  const handleDelete = (site) => {
    if (window.confirm(`Are you sure you want to remove "${site.name}" from your download sources?`)) {
      const updated = deleteDownloadSite(site.id);
      setSites(updated);
      addToast(`Removed "${site.name}".`, "info");
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset all download sites to the default verified list?")) {
      const defs = resetDefaultDownloadSites();
      setSites(defs);
      addToast("Reset to default download sources.", "info");
    }
  };

  const handleTogglePin = (site) => {
    const updated = updateDownloadSite(site.id, { isPinned: !site.isPinned });
    setSites(updated);
  };

  const handleVisitSite = (site) => {
    const destination = movieSearchQuery.trim()
      ? getSiteSearchLink(site, movieSearchQuery)
      : site.url;
    window.open(destination, "_blank", "noopener,noreferrer");
  };

  const handleSearchOnAllPinned = () => {
    if (!movieSearchQuery.trim()) {
      addToast("Type a movie or series title first to search across sites!", "info");
      return;
    }
    const pinned = sites.filter((s) => s.isPinned);
    const targetSites = pinned.length > 0 ? pinned : sites.slice(0, 3);

    targetSites.forEach((site) => {
      const searchLink = getSiteSearchLink(site, movieSearchQuery);
      window.open(searchLink, "_blank", "noopener,noreferrer");
    });
    addToast(`Launched search for "${movieSearchQuery}" on ${targetSites.length} websites!`, "success");
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Torrents": return <Radio size={14} color="#e50914" />;
      case "Direct Download": return <Download size={14} color="#8b5cf6" />;
      case "Streaming": return <Film size={14} color="#f59e0b" />;
      case "Telegram": return <Send size={14} color="#06b6d4" />;
      case "Subtitles": return <Tv size={14} color="#3b82f6" />;
      default: return <Globe size={14} color="var(--text-secondary)" />;
    }
  };

  return (
    <div style={styles.container} className="animate-fade">
      {/* Top Banner Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIconBadge}>
            <Globe size={26} color="#ffffff" />
          </div>
          <div>
            <h1 style={styles.title}>Movie & Series Download Sources</h1>
            <p style={styles.subtitle}>
              Your central vault of websites, trackers, and portals to search and download media
            </p>
          </div>
        </div>

        <div style={styles.headerRight}>
          <button style={styles.resetBtn} onClick={handleReset} title="Reset default sources">
            <RotateCcw size={15} /> Reset Defaults
          </button>
          <button style={styles.addBtn} onClick={handleOpenAddModal}>
            <Plus size={18} /> Add New Website
          </button>
        </div>
      </div>

      {/* 🚀 Multi-Site Realtime Movie Search Bar */}
      <div style={styles.multiSearchCard} className="glass-panel">
        <div style={styles.multiSearchHeader}>
          <div style={styles.multiSearchTitleGroup}>
            <Sparkles size={18} color="var(--accent-red)" />
            <span style={styles.multiSearchTitle}>Instant Multi-Site Search</span>
          </div>
          <span style={styles.multiSearchHint}>
            Type any movie/series title to search directly across your favorite download sources
          </span>
        </div>

        <div style={styles.searchRow}>
          <div style={styles.inputWrapper}>
            <Search size={18} color="var(--text-muted)" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="e.g. Deadpool & Wolverine, Inception, Breaking Bad, Oppenheimer..."
              value={movieSearchQuery}
              onChange={(e) => setMovieSearchQuery(e.target.value)}
              style={styles.movieSearchInput}
            />
            {movieSearchQuery && (
              <button style={styles.clearBtn} onClick={() => setMovieSearchQuery("")}>
                <X size={16} />
              </button>
            )}
          </div>

          <button
            style={styles.searchAllBtn}
            onClick={handleSearchOnAllPinned}
            title="Open searches on all pinned sites at once"
          >
            <ExternalLink size={16} />
            Search All Top Sites
          </button>
        </div>

        {/* Quick Launch Buttons when user types a query */}
        {movieSearchQuery.trim() && (
          <div style={styles.quickSearchPills} className="animate-pop">
            <span style={styles.quickSearchLabel}>Search "{movieSearchQuery}" on:</span>
            {sites.slice(0, 8).map((site) => (
              <button
                key={site.id}
                style={{
                  ...styles.quickSearchPillBtn,
                  borderColor: `${site.color}66`
                }}
                onClick={() => handleVisitSite(site)}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: site.color }} />
                {site.name} ↗
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Toolbar: Category Filters & Search Filter */}
      <div style={styles.toolbarRow}>
        {/* Category Pills */}
        <div style={styles.categoryPills}>
          {CATEGORIES.map((cat) => {
            const count = cat === "All" ? sites.length : sites.filter((s) => s.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                style={{
                  ...styles.catPill,
                  ...(isSelected ? styles.catPillActive : {})
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Filter sites input */}
        <div style={styles.siteFilterWrapper}>
          <Search size={15} color="var(--text-muted)" style={styles.filterIcon} />
          <input
            type="text"
            placeholder="Filter sources..."
            value={siteFilterQuery}
            onChange={(e) => setSiteFilterQuery(e.target.value)}
            style={styles.siteFilterInput}
          />
        </div>
      </div>

      {/* Sites Grid */}
      {filteredSites.length === 0 ? (
        <div style={styles.emptyState}>
          <Globe size={48} color="var(--text-muted)" />
          <h3>No download websites found</h3>
          <p>Try clearing your category or search filter, or click "+ Add New Website" to create one.</p>
          <button style={styles.addBtn} onClick={handleOpenAddModal}>
            <Plus size={16} /> Add Your First Link
          </button>
        </div>
      ) : (
        <div style={styles.sitesGrid}>
          {filteredSites.map((site) => (
            <div
              key={site.id}
              style={{
                ...styles.siteCard,
                borderTop: `3px solid ${site.color || "var(--accent-red)"}`
              }}
              className="glass-panel animate-pop site-hover-card"
            >
              {/* Card Header */}
              <div style={styles.cardHeader}>
                <div style={styles.cardFaviconGroup}>
                  <div
                    style={{
                      ...styles.cardIconBox,
                      backgroundColor: `${site.color || "var(--accent-red)"}22`,
                      borderColor: `${site.color || "var(--accent-red)"}55`
                    }}
                  >
                    <Globe size={20} color={site.color || "var(--accent-red)"} />
                  </div>
                  <div>
                    <h3 style={styles.siteName}>{site.name}</h3>
                    <span style={styles.siteCategoryTag}>
                      {getCategoryIcon(site.category)}
                      {site.category}
                    </span>
                  </div>
                </div>

                <div style={styles.cardHeaderActions}>
                  <button
                    style={{
                      ...styles.iconActionBtn,
                      color: site.isPinned ? "#f59e0b" : "var(--text-muted)"
                    }}
                    onClick={() => handleTogglePin(site)}
                    title={site.isPinned ? "Unpin from top searches" : "Pin for 1-click search"}
                  >
                    <Pin size={15} fill={site.isPinned ? "#f59e0b" : "none"} />
                  </button>

                  <button
                    style={styles.iconActionBtn}
                    onClick={() => handleOpenEditModal(site)}
                    title="Edit site details"
                  >
                    <Edit3 size={15} />
                  </button>

                  <button
                    style={{ ...styles.iconActionBtn, color: "var(--accent-red)" }}
                    onClick={() => handleDelete(site)}
                    title="Delete site"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Quality & Meta Badges */}
              <div style={styles.cardBadges}>
                <span style={styles.qualityBadge}>
                  <ShieldCheck size={12} color="var(--accent-green)" />
                  {site.quality || "Verified Source"}
                </span>

                <span style={styles.urlDisplayBadge} title={site.url}>
                  {site.url.replace(/^https?:\/\//i, "")}
                </span>
              </div>

              {/* Description / Notes */}
              <p style={styles.siteDescription}>
                {site.description || "Custom download source for movies, series, and subtitles."}
              </p>

              {/* Card Action Buttons */}
              <div style={styles.cardActions}>
                <button
                  style={{
                    ...styles.visitBtn,
                    backgroundColor: site.color || "var(--accent-red)"
                  }}
                  onClick={() => handleVisitSite(site)}
                >
                  <ExternalLink size={15} />
                  {movieSearchQuery.trim() ? `Search "${movieSearchQuery.slice(0, 15)}..."` : "Open Website"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Website Modal */}
      {modalOpen && (
        <div style={styles.modalBackdrop} onClick={() => setModalOpen(false)} className="animate-pop">
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()} className="glass-modal">
            <div style={styles.modalHeader}>
              <div style={styles.modalTitleGroup}>
                <Globe size={22} color="var(--accent-red)" />
                <h3 style={styles.modalTitle}>
                  {editingSiteId ? "Edit Download Website" : "Add Download Website"}
                </h3>
              </div>
              <button style={styles.closeBtn} onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} style={styles.modalForm}>
              {/* Site Name & Category */}
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Website Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. YTS, 1337x, Torrenting, Flixbaba..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={styles.modalInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={styles.modalSelect}
                  >
                    {CATEGORIES.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Website Main URL */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Website URL *</label>
                <input
                  type="text"
                  placeholder="https://yts.mx or https://torrenting.com"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  required
                  style={styles.modalInput}
                />
              </div>

              {/* Direct Search Query URL Template */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  Search URL Template <span style={styles.optionalTag}>(Optional for 1-Click Search)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://yts.mx/browse-movies/{query} (use {query} where movie name goes)"
                  value={formData.searchUrl}
                  onChange={(e) => setFormData({ ...formData, searchUrl: e.target.value })}
                  style={styles.modalInput}
                />
                <span style={styles.inputHelp}>
                  If provided, Film Library will plug the movie name into <code>{"{query}"}</code> for instant searches.
                </span>
              </div>

              {/* Quality Tag & Theme Color */}
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Quality / Badge</label>
                  <input
                    type="text"
                    placeholder="e.g. 1080p / 4K, x265, VIP, Fast DDL..."
                    value={formData.quality}
                    onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
                    style={styles.modalInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Theme Accent Color</label>
                  <div style={styles.colorPills}>
                    {COLOR_PRESETS.map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        style={{
                          ...styles.colorCircle,
                          backgroundColor: col.value,
                          border: formData.color === col.value ? "2px solid #ffffff" : "2px solid transparent",
                          transform: formData.color === col.value ? "scale(1.15)" : "scale(1)"
                        }}
                        onClick={() => setFormData({ ...formData, color: col.value })}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Description / Notes */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Description & Notes</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Best for 4K torrents with small file sizes. Login required."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={styles.modalTextarea}
                />
              </div>

              {/* Pin as top favorite */}
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  style={styles.checkbox}
                />
                <span>Pin this site to Quick Search bar</span>
              </label>

              {/* Modal Actions */}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.modalCancelBtn}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.modalSaveBtn}>
                  <Check size={16} />
                  {editingSiteId ? "Save Changes" : "Add Website Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "1400px",
    width: "100%",
    margin: "0 auto",
    padding: "32px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "24px"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "16px"
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px"
  },
  headerIconBadge: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    backgroundColor: "var(--accent-red)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 24px rgba(229, 9, 20, 0.5)",
    flexShrink: 0
  },
  title: {
    fontSize: "1.7rem",
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "0.5px"
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginTop: "2px"
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  resetBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 16px",
    backgroundColor: "#1c1c1f",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s"
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "11px 20px",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(229, 9, 20, 0.4)",
    transition: "all 0.2s"
  },
  multiSearchCard: {
    backgroundColor: "#111114",
    border: "1px solid rgba(229, 9, 20, 0.3)",
    borderRadius: "16px",
    padding: "22px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 12px 36px rgba(0, 0, 0, 0.7), 0 0 24px rgba(229, 9, 20, 0.1)"
  },
  multiSearchHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "8px"
  },
  multiSearchTitleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  multiSearchTitle: {
    fontSize: "1.05rem",
    fontWeight: 800,
    color: "#ffffff"
  },
  multiSearchHint: {
    fontSize: "0.82rem",
    color: "var(--text-secondary)"
  },
  searchRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap"
  },
  inputWrapper: {
    flex: 1,
    minWidth: "280px",
    position: "relative",
    display: "flex",
    alignItems: "center"
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    pointerEvents: "none"
  },
  movieSearchInput: {
    width: "100%",
    padding: "12px 42px 12px 44px",
    backgroundColor: "#0a0a0c",
    border: "1px solid var(--border-subtle)",
    borderRadius: "10px",
    color: "#ffffff",
    fontSize: "0.95rem",
    outline: "none"
  },
  clearBtn: {
    position: "absolute",
    right: "12px",
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center"
  },
  searchAllBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(229, 9, 20, 0.4)",
    whiteSpace: "nowrap"
  },
  quickSearchPills: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    paddingTop: "6px"
  },
  quickSearchLabel: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "var(--text-secondary)"
  },
  quickSearchPillBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    backgroundColor: "#18181c",
    border: "1px solid #33333d",
    borderRadius: "20px",
    color: "#ffffff",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s"
  },
  toolbarRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "14px"
  },
  categoryPills: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap"
  },
  catPill: {
    padding: "8px 14px",
    backgroundColor: "#141416",
    border: "1px solid var(--border-subtle)",
    borderRadius: "20px",
    color: "var(--text-secondary)",
    fontSize: "0.82rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s"
  },
  catPillActive: {
    backgroundColor: "var(--accent-red)",
    borderColor: "var(--accent-red)",
    color: "#ffffff",
    boxShadow: "0 2px 10px rgba(229, 9, 20, 0.4)"
  },
  siteFilterWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    minWidth: "220px"
  },
  filterIcon: {
    position: "absolute",
    left: "12px",
    pointerEvents: "none"
  },
  siteFilterInput: {
    width: "100%",
    padding: "8px 14px 8px 36px",
    backgroundColor: "#141416",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "0.85rem",
    outline: "none"
  },
  sitesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "18px"
  },
  siteCard: {
    backgroundColor: "#111114",
    border: "1px solid #222228",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    position: "relative",
    transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s"
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "10px"
  },
  cardFaviconGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  cardIconBox: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid",
    flexShrink: 0
  },
  siteName: {
    fontSize: "1.1rem",
    fontWeight: 800,
    color: "#ffffff"
  },
  siteCategoryTag: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginTop: "2px"
  },
  cardHeaderActions: {
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  iconActionBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.15s, background 0.15s"
  },
  cardBadges: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap"
  },
  qualityBadge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 8px",
    backgroundColor: "rgba(70, 211, 105, 0.12)",
    color: "var(--accent-green)",
    border: "1px solid rgba(70, 211, 105, 0.25)",
    borderRadius: "6px",
    fontSize: "0.72rem",
    fontWeight: 700
  },
  urlDisplayBadge: {
    fontSize: "0.74rem",
    color: "var(--text-muted)",
    fontFamily: "monospace",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "180px",
    whiteSpace: "nowrap"
  },
  siteDescription: {
    fontSize: "0.84rem",
    color: "var(--text-secondary)",
    lineHeight: "1.45",
    flex: 1
  },
  cardActions: {
    display: "flex",
    gap: "8px",
    marginTop: "4px"
  },
  visitBtn: {
    flex: 1,
    padding: "10px 14px",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
    transition: "opacity 0.15s, transform 0.15s"
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "60px 20px",
    backgroundColor: "#111114",
    borderRadius: "16px",
    border: "1px solid var(--border-subtle)",
    textAlign: "center",
    color: "var(--text-secondary)"
  },
  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    backdropFilter: "blur(8px)",
    zIndex: 400,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },
  modalContent: {
    width: "100%",
    maxWidth: "540px",
    maxHeight: "92vh",
    overflowY: "auto",
    backgroundColor: "#141416",
    border: "1px solid var(--border-subtle)",
    borderRadius: "16px",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    boxShadow: "0 24px 60px rgba(0,0,0,0.95)"
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  modalTitleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  modalTitle: {
    fontSize: "1.2rem",
    fontWeight: 800,
    color: "#ffffff"
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "4px"
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  formRow: {
    display: "flex",
    gap: "12px"
  },
  formGroup: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  formLabel: {
    fontSize: "0.84rem",
    fontWeight: 600,
    color: "#ffffff"
  },
  optionalTag: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    fontWeight: 400
  },
  modalInput: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#0b0b0d",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "0.88rem",
    outline: "none"
  },
  modalSelect: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#0b0b0d",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "0.88rem",
    outline: "none"
  },
  modalTextarea: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#0b0b0d",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "0.88rem",
    outline: "none",
    resize: "vertical"
  },
  inputHelp: {
    fontSize: "0.74rem",
    color: "var(--text-muted)"
  },
  colorPills: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    paddingTop: "6px"
  },
  colorCircle: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    cursor: "pointer",
    transition: "transform 0.15s"
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    cursor: "pointer"
  },
  checkbox: {
    cursor: "pointer",
    width: "16px",
    height: "16px",
    accentColor: "var(--accent-red)"
  },
  modalActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    paddingTop: "10px",
    borderTop: "1px solid var(--border-subtle)"
  },
  modalCancelBtn: {
    padding: "10px 16px",
    backgroundColor: "transparent",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer"
  },
  modalSaveBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 18px",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(229, 9, 20, 0.4)"
  }
};
