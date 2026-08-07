import React, { useState, useEffect } from "react";
import { Play, Edit3, Trash2, X, Check, Tv, Film, Sparkles, Clock } from "lucide-react";
import { 
  getContinueWatchingList, 
  removeContinueWatchingItem, 
  updateContinueWatchingProgress 
} from "../services/continueWatching";
import { launchInVlc, resolveMediaPaths } from "../services/vlcLauncher";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export const ContinueWatchingRow = ({ libraryItems = [], onSelectMedia, setActivePage }) => {
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  const [list, setList] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editSeason, setEditSeason] = useState(1);
  const [editEpisode, setEditEpisode] = useState(1);

  const uid = currentUser?.uid || "demo_user_id";

  const loadList = () => {
    setList(getContinueWatchingList());
  };

  useEffect(() => {
    loadList();
    window.addEventListener("filmlibrary_continue_watching_updated", loadList);
    return () => {
      window.removeEventListener("filmlibrary_continue_watching_updated", loadList);
    };
  }, []);

  const handlePlayItem = (cwItem) => {
    const matchedMedia = libraryItems.find((m) => m.id === cwItem.mediaId || m.tmdb_id === cwItem.mediaId);
    
    let path = "";
    let subPath = "";

    if (matchedMedia) {
      const isSeries = matchedMedia.type?.toLowerCase() === "series" || matchedMedia.type?.toLowerCase() === "tv";
      const s = cwItem.season || 1;
      const e = cwItem.episode || 1;
      const resolved = resolveMediaPaths(matchedMedia, uid, isSeries ? s : 1, isSeries ? e : 1);
      path = resolved.path;
      subPath = resolved.subPath;
    }

    if (path) {
      const label = cwItem.epCode ? `${cwItem.title} (${cwItem.epCode})` : cwItem.title;
      launchInVlc(path, label, addToast, subPath, matchedMedia?.type);
    } else if (matchedMedia) {
      onSelectMedia(matchedMedia);
    } else {
      addToast(`Please configure local file path for "${cwItem.title}"`, "warning");
    }
  };

  const handleOpenEditModal = (cwItem, e) => {
    e.stopPropagation();
    setEditingItem(cwItem);
    setEditSeason(cwItem.season || 1);
    setEditEpisode(cwItem.episode || 1);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    updateContinueWatchingProgress(editingItem.mediaId, editSeason, editEpisode);
    addToast(`Updated progress for "${editingItem.title}" to S${editSeason}E${editEpisode}`, "success");
    setEditingItem(null);
  };

  const handleRemove = (mediaId, title) => {
    removeContinueWatchingItem(mediaId);
    addToast(`Removed "${title}" from Continue Watching`, "info");
    setEditingItem(null);
  };

  return (
    <div style={styles.container} className="animate-fade">
      <div style={styles.header}>
        <div style={styles.headerTitleGroup}>
          <div style={styles.iconCircle}>
            <Play size={18} color="#ffffff" fill="#ffffff" />
          </div>
          <div>
            <h2 style={styles.title}>Continue Watching</h2>
            <span style={styles.subtitle}>Netflix-style User Watch Progress</span>
          </div>
        </div>
        <span style={styles.countBadge}>{list.length} item(s) in progress</span>
      </div>

      {list.length === 0 ? (
        <div style={styles.emptyContainer} className="glass-panel">
          <div style={styles.emptyContent}>
            <Clock size={36} color="var(--accent-red)" />
            <div style={styles.emptyTextGroup}>
              <h4 style={styles.emptyTitle}>No Media in Progress Yet</h4>
              <p style={styles.emptyDesc}>
                Whenever you click <strong>Play</strong> on any movie or TV series episode, your active watch position (e.g. <strong>S2E4</strong>) will automatically show up here so you can continue where you left off!
              </p>
            </div>
            {setActivePage && (
              <button style={styles.browseBtn} onClick={() => setActivePage("library")}>
                <Film size={16} /> Explore Library to Play
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.grid}>
          {list.map((cw) => {
            const matchedMedia = libraryItems.find((m) => m.id === cw.mediaId || m.tmdb_id === cw.mediaId);
            return (
              <div
                key={cw.mediaId}
                style={styles.card}
                onClick={() => matchedMedia ? onSelectMedia(matchedMedia) : null}
              >
                <div style={styles.posterContainer}>
                  <img
                    src={cw.backdropUrl || cw.posterUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60"}
                    alt={cw.title}
                    style={styles.backdropImg}
                    loading="lazy"
                  />
                  
                  {/* Netflix-style Play Overlay Button */}
                  <div style={styles.playOverlay}>
                    <button
                      type="button"
                      style={styles.overlayPlayBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayItem(cw);
                      }}
                      title="Play Now in VLC"
                    >
                      <Play size={22} fill="#ffffff" color="#ffffff" style={{ marginLeft: "3px" }} />
                    </button>
                  </div>

                  {/* Edit Button Badge */}
                  <button
                    type="button"
                    style={styles.editBadgeBtn}
                    onClick={(e) => handleOpenEditModal(cw, e)}
                    title="Edit Watch Progress"
                  >
                    <Edit3 size={14} color="#ffffff" />
                  </button>

                  {/* Season & Episode Badge */}
                  {cw.epCode && (
                    <div style={styles.epBadge}>
                      {cw.epCode}
                    </div>
                  )}

                  {/* Bottom Red Progress Bar */}
                  <div style={styles.progressTrack}>
                    <div style={{ ...styles.progressBar, width: `${cw.progressPct || 50}%` }} />
                  </div>
                </div>

                <div style={styles.cardInfo}>
                  <h3 style={styles.cardTitle}>{cw.title}</h3>
                  <span style={styles.cardSub}>
                    {cw.epCode ? `Season ${cw.season} • Episode ${cw.episode}` : "Movie in progress"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Continue Watching Modal */}
      {editingItem && (
        <div style={styles.modalOverlay} onClick={() => setEditingItem(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()} className="glass-modal animate-pop">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Edit Watch Progress</h3>
              <button type="button" style={styles.closeBtn} onClick={() => setEditingItem(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalMovieRow}>
                <img
                  src={editingItem.posterUrl || editingItem.backdropUrl}
                  alt={editingItem.title}
                  style={styles.modalPoster}
                />
                <div>
                  <h4 style={styles.modalMovieTitle}>{editingItem.title}</h4>
                  <span style={styles.modalMovieType}>
                    {editingItem.type === "series" || editingItem.type === "tv" ? "TV Series" : "Movie"}
                  </span>
                </div>
              </div>

              {(editingItem.type === "series" || editingItem.type === "tv") && (
                <div style={styles.editFormGrid}>
                  <div style={styles.field}>
                    <label style={styles.label}>Season Number</label>
                    <input
                      type="number"
                      min="1"
                      value={editSeason}
                      onChange={(e) => setEditSeason(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Episode Number</label>
                    <input
                      type="number"
                      min="1"
                      value={editEpisode}
                      onChange={(e) => setEditEpisode(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>
              )}

              <div style={styles.modalActions}>
                <button type="button" style={styles.saveBtn} onClick={handleSaveEdit}>
                  <Check size={16} /> Save Progress
                </button>
                <button
                  type="button"
                  style={styles.removeBtn}
                  onClick={() => handleRemove(editingItem.mediaId, editingItem.title)}
                >
                  <Trash2 size={16} /> Remove from List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    margin: "12px 0 28px 0",
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerTitleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  iconCircle: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "var(--accent-red)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(229, 9, 20, 0.4)"
  },
  title: {
    fontSize: "1.35rem",
    fontWeight: 800,
    color: "#ffffff"
  },
  subtitle: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)"
  },
  countBadge: {
    fontSize: "0.82rem",
    color: "var(--text-muted)",
    backgroundColor: "var(--bg-elevated)",
    padding: "4px 12px",
    borderRadius: "20px",
    border: "1px solid var(--border-subtle)"
  },
  emptyContainer: {
    padding: "24px",
    borderRadius: "14px",
    border: "1px dashed rgba(229, 9, 20, 0.4)",
    backgroundColor: "rgba(28, 28, 28, 0.6)"
  },
  emptyContent: {
    display: "flex",
    alignItems: "center",
    gap: "20px"
  },
  emptyTextGroup: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  emptyTitle: {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "#ffffff"
  },
  emptyDesc: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    lineHeight: 1.4
  },
  browseBtn: {
    padding: "10px 18px",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "0.85rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    whiteSpace: "nowrap"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "18px"
  },
  card: {
    backgroundColor: "var(--bg-elevated)",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid var(--border-subtle)",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  posterContainer: {
    position: "relative",
    aspectRatio: "16/9",
    backgroundColor: "#000000",
    overflow: "hidden"
  },
  backdropImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    opacity: 0.85
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.9,
    transition: "opacity 0.2s ease"
  },
  overlayPlayBtn: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "var(--accent-red)",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(229, 9, 20, 0.6)",
    transition: "transform 0.2s ease"
  },
  editBadgeBtn: {
    position: "absolute",
    top: "8px",
    right: "8px",
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 2
  },
  epBadge: {
    position: "absolute",
    bottom: "10px",
    left: "10px",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    fontSize: "0.75rem",
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: "4px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.6)"
  },
  progressTrack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "4px",
    backgroundColor: "rgba(255, 255, 255, 0.2)"
  },
  progressBar: {
    height: "100%",
    backgroundColor: "var(--accent-red)"
  },
  cardInfo: {
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  cardTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#ffffff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  cardSub: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    backdropFilter: "blur(8px)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },
  modalContent: {
    maxWidth: "440px",
    width: "100%",
    borderRadius: "16px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
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
    cursor: "pointer"
  },
  modalBody: {
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },
  modalMovieRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px"
  },
  modalPoster: {
    width: "56px",
    height: "80px",
    borderRadius: "6px",
    objectFit: "cover"
  },
  modalMovieTitle: {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "#ffffff"
  },
  modalMovieType: {
    fontSize: "0.8rem",
    color: "var(--text-muted)"
  },
  editFormGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px"
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  label: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "var(--text-secondary)"
  },
  input: {
    padding: "10px 14px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "0.95rem",
    outline: "none"
  },
  modalActions: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  saveBtn: {
    width: "100%",
    padding: "12px",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  },
  removeBtn: {
    width: "100%",
    padding: "10px",
    backgroundColor: "rgba(229, 9, 20, 0.12)",
    border: "1px solid var(--accent-red)",
    color: "var(--accent-red)",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  }
};
