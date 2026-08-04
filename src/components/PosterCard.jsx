import React, { useState } from "react";
import { Star, Play, CheckCircle2, Bookmark, Monitor, Tv, Film, Edit3, Trash2, CheckSquare, Square } from "lucide-react";
import { launchInVlc } from "../services/vlcLauncher";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export const PosterCard = ({ 
  item, 
  onClick, 
  onEdit, 
  onDelete, 
  isSelected = false, 
  isDimmed = false, 
  viewMode = "grid",
  onToggleSelect = null
}) => {
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Check current user progress
  const userProgress = (item.user_progress || {})[currentUser?.uid || ""] || {};
  const isWatched = userProgress.status === "watched";
  const isWatchlist = userProgress.status === "watchlist";

  // Check paths for current user
  const userPathObj = (item.user_paths || []).find((up) => up.uid === currentUser?.uid);
  const defaultPath = userPathObj?.paths?.default || (userPathObj?.paths ? Object.values(userPathObj.paths)[0] : "");
  const subPath = item.subtitle_path || userPathObj?.paths?.subtitle || "";

  const handleQuickPlay = (e) => {
    e.stopPropagation();
    if (defaultPath) {
      launchInVlc(defaultPath, item.title, addToast, subPath);
    } else {
      const anyUserPath = (item.user_paths || [])[0];
      const anyPath = anyUserPath?.paths?.default || (anyUserPath?.paths ? Object.values(anyUserPath.paths)[0] : "");
      if (anyPath) {
        launchInVlc(anyPath, item.title, addToast, subPath);
      } else {
        addToast(`No local file path configured for "${item.title}". Click for details.`, "warning");
      }
    }
  };

  const handleQuickEdit = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(item);
  };

  const handleQuickDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(item.id);
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    if (onToggleSelect) onToggleSelect(item.id);
  };

  const cardStyle = {
    ...styles.card,
    ...(isSelected ? styles.cardSelected : {}),
    ...(isDimmed ? styles.cardDimmed : {})
  };

  if (viewMode === "list") {
    return (
      <div
        style={{
          ...styles.listItem,
          ...(isSelected ? styles.listSelected : {}),
          ...(isDimmed ? styles.cardDimmed : {})
        }}
        onClick={onClick}
        className="animate-fade"
      >
        {onToggleSelect && (
          <div onClick={handleCheckboxClick} style={styles.listCheckbox}>
            {isSelected ? (
              <CheckSquare size={20} color="var(--accent-green)" />
            ) : (
              <Square size={20} color="var(--text-muted)" />
            )}
          </div>
        )}

        <img
          src={item.poster_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60"}
          alt={item.title}
          style={styles.listPoster}
          loading="lazy"
          decoding="async"
        />
        <div style={styles.listDetails}>
          <div style={styles.listHeader}>
            <span style={styles.listTitle}>{item.title}</span>
            <span style={styles.listYear}>{item.year}</span>
            <span className={`badge ${item.type === "series" ? "badge-green" : "badge-red"}`}>
              {item.type === "series" ? "Series" : "Movie"}
            </span>
          </div>

          <div style={styles.listMeta}>
            {item.imdb_rating > 0 && (
              <span style={styles.ratingBox}>
                <Star size={14} color="#f5c518" fill="#f5c518" />
                {item.imdb_rating}
              </span>
            )}
            <span style={styles.genresText}>{(item.genres || []).join(", ")}</span>
          </div>
        </div>

        <div style={styles.listActions}>
          {isWatched && (
            <span className="badge badge-green">
              <CheckCircle2 size={12} /> Watched
            </span>
          )}
          <button style={styles.playBtnSmall} onClick={handleQuickPlay}>
            <Play size={14} fill="#ffffff" /> Play
          </button>
          {onEdit && (
            <button style={styles.listIconBtn} onClick={handleQuickEdit} title="Edit Item">
              <Edit3 size={14} />
            </button>
          )}
          {onDelete && (
            <button style={{ ...styles.listIconBtn, color: "var(--accent-red)" }} onClick={handleQuickDelete} title="Delete Item">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setConfirmDelete(false);
      }}
      className="animate-fade"
    >
      {/* Poster Image */}
      <div style={styles.posterWrapper}>
        <img
          src={item.poster_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60"}
          alt={item.title}
          style={styles.posterImg}
          loading="lazy"
          decoding="async"
        />

        {/* Multi-Select Checkbox Overlay */}
        {onToggleSelect && (
          <div style={styles.selectCheckboxOverlay} onClick={handleCheckboxClick} title={isSelected ? "Deselect item" : "Select item"}>
            {isSelected ? (
              <CheckSquare size={24} color="var(--accent-green)" fill="rgba(0,0,0,0.85)" />
            ) : (
              <Square size={24} color="rgba(255,255,255,0.8)" fill="rgba(0,0,0,0.4)" />
            )}
          </div>
        )}

        {/* Top Badges */}
        <div style={{ ...styles.topBadges, left: onToggleSelect ? "42px" : "10px" }}>
          <span className={`badge ${item.type === "series" ? "badge-green" : "badge-red"}`}>
            {item.type === "series" ? <Tv size={12} /> : <Film size={12} />}
            {item.type === "series" ? "Series" : "Movie"}
          </span>

          {item.imdb_rating > 0 && (
            <span className="badge badge-rating">
              <Star size={12} fill="#f5c518" />
              {item.imdb_rating}
            </span>
          )}
        </div>

        {/* Status Indicator Pill */}
        {isWatched && (
          <div style={styles.statusPill}>
            <CheckCircle2 size={14} color="#46d369" />
          </div>
        )}
        {isWatchlist && !isWatched && (
          <div style={styles.statusPill}>
            <Bookmark size={14} color="#f5c518" />
          </div>
        )}

        {/* Hover Dark Overlay */}
        <div style={{ ...styles.overlay, opacity: hovered ? 1 : 0 }}>
          <div style={styles.overlayContent}>
            <div style={styles.overlayHeader}>
              <h4 style={styles.overlayTitle}>{item.title}</h4>
              <span style={styles.overlayYear}>{item.year}</span>
            </div>

            <div style={styles.genreTags}>
              {(item.genres || []).slice(0, 3).map((g, idx) => (
                <span key={idx} style={styles.genrePill}>{g}</span>
              ))}
            </div>

            <p style={styles.overviewSnippet}>
              {item.overview ? `${item.overview.substring(0, 80)}...` : "Click to view media details."}
            </p>

            <button style={styles.playBtn} onClick={handleQuickPlay}>
              <Play size={16} fill="#ffffff" /> Play in VLC
            </button>

            {/* Quick Edit & Delete Controls */}
            <div style={styles.quickActionRow}>
              {onEdit && (
                <button style={styles.quickEditBtn} onClick={handleQuickEdit}>
                  <Edit3 size={13} /> Edit
                </button>
              )}
              {onDelete && (
                !confirmDelete ? (
                  <button style={styles.quickDeleteBtn} onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}>
                    <Trash2 size={13} /> Delete
                  </button>
                ) : (
                  <button style={styles.confirmDeleteBtnCard} onClick={handleQuickDelete}>
                    Confirm Delete?
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer Info */}
      <div style={styles.cardFooter}>
        <div style={styles.cardTitle}>{item.title}</div>
        <div style={styles.cardSub}>
          <span>{item.year}</span>
          <span>•</span>
          <span>{(item.user_paths || []).length} {item.user_paths?.length === 1 ? 'Owner' : 'Owners'}</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  card: {
    display: "flex",
    flexDirection: "column",
    cursor: "pointer",
    borderRadius: "10px",
    overflow: "hidden",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    transition: "transform 0.25s ease, opacity 0.25s ease, filter 0.25s ease, box-shadow 0.25s ease",
    willChange: "transform, opacity",
    transform: "translateZ(0)",
    position: "relative"
  },
  cardSelected: {
    border: "2px solid var(--accent-green)",
    boxShadow: "0 0 24px rgba(70, 211, 105, 0.7)",
    transform: "scale(1.03) translateZ(0)",
    zIndex: 10,
    opacity: 1,
    filter: "brightness(1.1)"
  },
  cardDimmed: {
    opacity: 0.35,
    filter: "brightness(0.4) grayscale(0.2)",
    transform: "scale(0.98)"
  },
  selectCheckboxOverlay: {
    position: "absolute",
    top: "8px",
    left: "8px",
    zIndex: 12,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2px",
    borderRadius: "4px"
  },
  posterWrapper: {
    position: "relative",
    width: "100%",
    paddingTop: "150%",
    backgroundColor: "#000000",
    overflow: "hidden"
  },
  posterImg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  topBadges: {
    position: "absolute",
    top: "10px",
    left: "10px",
    right: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
    transition: "left 0.2s ease"
  },
  statusPill: {
    position: "absolute",
    bottom: "10px",
    right: "10px",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: "6px",
    borderRadius: "50%",
    zIndex: 2
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(13, 13, 13, 0.94)",
    zIndex: 3,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    padding: "14px",
    transition: "opacity 0.2s ease"
  },
  overlayContent: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  overlayHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between"
  },
  overlayTitle: {
    fontSize: "0.98rem",
    fontWeight: 700,
    color: "#ffffff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  overlayYear: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)"
  },
  genreTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px"
  },
  genrePill: {
    fontSize: "0.68rem",
    padding: "2px 6px",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: "4px",
    color: "var(--text-secondary)"
  },
  overviewSnippet: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    lineHeight: "1.3",
    margin: "2px 0"
  },
  playBtn: {
    width: "100%",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "4px",
    fontWeight: 700,
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    cursor: "pointer"
  },
  quickActionRow: {
    display: "flex",
    gap: "6px",
    marginTop: "2px"
  },
  quickEditBtn: {
    flex: 1,
    padding: "6px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    color: "#ffffff",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px"
  },
  quickDeleteBtn: {
    flex: 1,
    padding: "6px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    color: "var(--accent-red)",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px"
  },
  confirmDeleteBtnCard: {
    flex: 1,
    padding: "6px",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 700,
    cursor: "pointer"
  },
  cardFooter: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  cardTitle: {
    fontWeight: 700,
    fontSize: "0.95rem",
    color: "#ffffff",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  cardSub: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    display: "flex",
    gap: "6px"
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    gap: "16px",
    cursor: "pointer",
    transition: "var(--transition)"
  },
  listSelected: {
    border: "2px solid var(--accent-green)",
    boxShadow: "0 0 16px rgba(70, 211, 105, 0.5)",
    backgroundColor: "rgba(70, 211, 105, 0.08)"
  },
  listCheckbox: {
    cursor: "pointer",
    display: "flex",
    alignItems: "center"
  },
  listPoster: {
    width: "48px",
    height: "72px",
    borderRadius: "4px",
    objectFit: "cover"
  },
  listDetails: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  listHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  listTitle: {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "#ffffff"
  },
  listYear: {
    color: "var(--text-muted)",
    fontSize: "0.9rem"
  },
  listMeta: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  ratingBox: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--accent-gold)",
    fontWeight: 700,
    fontSize: "0.85rem"
  },
  genresText: {
    color: "var(--text-secondary)",
    fontSize: "0.85rem"
  },
  listActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  playBtnSmall: {
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    padding: "6px 14px",
    borderRadius: "4px",
    fontWeight: 600,
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer"
  },
  listIconBtn: {
    padding: "6px 10px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    color: "#ffffff",
    borderRadius: "4px",
    cursor: "pointer"
  }
};
