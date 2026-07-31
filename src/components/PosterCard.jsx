import React, { useState } from "react";
import { Star, Play, CheckCircle2, Bookmark, Monitor, Tv, Film } from "lucide-react";
import { launchInVlc } from "../services/vlcLauncher";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export const PosterCard = ({ item, onClick, viewMode = "grid" }) => {
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  const [hovered, setHovered] = useState(false);

  // Check current user progress
  const userProgress = (item.user_progress || {})[currentUser?.uid || ""] || {};
  const isWatched = userProgress.status === "watched";
  const isWatchlist = userProgress.status === "watchlist";

  // Check paths for current user
  const userPathObj = (item.user_paths || []).find((up) => up.uid === currentUser?.uid);
  const defaultPath = userPathObj?.paths?.default || (userPathObj?.paths ? Object.values(userPathObj.paths)[0] : "");

  const handleQuickPlay = (e) => {
    e.stopPropagation();
    if (defaultPath) {
      launchInVlc(defaultPath, item.title, addToast);
    } else {
      // Fallback: search any user path available
      const anyUserPath = (item.user_paths || [])[0];
      const anyPath = anyUserPath?.paths?.default || (anyUserPath?.paths ? Object.values(anyUserPath.paths)[0] : "");
      if (anyPath) {
        launchInVlc(anyPath, item.title, addToast);
      } else {
        addToast(`No local file path configured for "${item.title}". Click for details.`, "warning");
      }
    }
  };

  if (viewMode === "list") {
    return (
      <div
        style={styles.listItem}
        onClick={onClick}
        className="animate-fade"
      >
        <img
          src={item.poster_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60"}
          alt={item.title}
          style={styles.listPoster}
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
            <Play size={14} fill="#ffffff" />
            Play
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={styles.card}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="animate-fade"
    >
      {/* Poster Image */}
      <div style={styles.posterWrapper}>
        <img
          src={item.poster_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60"}
          alt={item.title}
          style={styles.posterImg}
        />

        {/* Top Badges */}
        <div style={styles.topBadges}>
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
              {item.overview ? `${item.overview.substring(0, 100)}...` : "Click to view media details."}
            </p>

            <button style={styles.playBtn} onClick={handleQuickPlay}>
              <Play size={16} fill="#ffffff" />
              Play in VLC
            </button>
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
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    transition: "var(--transition)"
  },
  posterWrapper: {
    position: "relative",
    width: "100%",
    paddingTop: "150%", // 2:3 aspect ratio
    backgroundColor: "#000000",
    overflow: "hidden"
  },
  posterImg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.4s ease"
  },
  topBadges: {
    position: "absolute",
    top: "10px",
    left: "10px",
    right: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2
  },
  statusPill: {
    position: "absolute",
    bottom: "10px",
    right: "10px",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: "6px",
    borderRadius: "50%",
    zIndex: 2,
    backdropFilter: "blur(4px)"
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(13, 13, 13, 0.92)",
    zIndex: 3,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    padding: "16px",
    transition: "opacity 0.25s ease",
    backdropFilter: "blur(6px)"
  },
  overlayContent: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  overlayHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between"
  },
  overlayTitle: {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "#ffffff"
  },
  overlayYear: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)"
  },
  genreTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px"
  },
  genrePill: {
    fontSize: "0.7rem",
    padding: "2px 8px",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: "4px",
    color: "var(--text-secondary)"
  },
  overviewSnippet: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    lineHeight: "1.4",
    margin: "4px 0"
  },
  playBtn: {
    width: "100%",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "4px",
    fontWeight: 700,
    fontSize: "0.88rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
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
  // List view styles
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
    gap: "12px"
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
  }
};
