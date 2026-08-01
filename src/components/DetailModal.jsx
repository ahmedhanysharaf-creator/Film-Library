import React, { useState } from "react";
import { 
  X, Play, Star, Clock, User, Film, Tv, CheckCircle2, Bookmark, 
  Trash2, Edit3, Copy, HardDrive, Video, ExternalLink, Download 
} from "lucide-react";
import { launchInVlc, copyPathToClipboard, downloadVlcM3uPlaylist, downloadWindowsRegistryFix } from "../services/vlcLauncher";
import { updateWatchProgress } from "../services/storage";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const DetailModal = ({ item, onClose, onEdit, onDelete }) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [activeSeason, setActiveSeason] = useState(1);
  const [showTrailer, setShowTrailer] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!item) return null;

  // Personal watch progress
  const userProgress = (item.user_progress || {})[currentUser?.uid || ""] || {
    status: "unwatched",
    watched_episodes: []
  };
  const watchedEpisodes = new Set(userProgress.watched_episodes || []);

  const handleStatusChange = async (newStatus) => {
    await updateWatchProgress(item.id, currentUser.uid, newStatus, Array.from(watchedEpisodes));
    addToast(`Updated status to ${newStatus}`, "success");
  };

  const toggleEpisodeWatched = async (epCode) => {
    const nextSet = new Set(watchedEpisodes);
    if (nextSet.has(epCode)) {
      nextSet.delete(epCode);
    } else {
      nextSet.add(epCode);
    }
    const nextList = Array.from(nextSet);
    const newStatus = nextList.length > 0 ? "watched" : "unwatched";
    await updateWatchProgress(item.id, currentUser.uid, newStatus, nextList);
  };

  // Find paths for active user or any available user
  const userPathObj = (item.user_paths || []).find((up) => up.uid === currentUser?.uid);
  const userPathsMap = userPathObj?.paths || {};
  const defaultMoviePath = userPathsMap.default || "";

  // YouTube Embed Url converter
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    let videoId = "";
    if (url.includes("v=")) {
      videoId = url.split("v=")[1].split("&")[0];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1].split("?")[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
  };

  return (
    <div style={styles.backdrop} onClick={onClose} className="animate-pop">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} className="glass-modal">
        {/* Header Backdrop Banner */}
        <div style={{
          ...styles.banner,
          backgroundImage: `linear-gradient(to bottom, rgba(13,13,13,0.3), rgba(13,13,13,1)), url(${item.backdrop_url || item.poster_url})`
        }}>
          <button style={styles.closeBtn} onClick={onClose} title="Close popup">
            <X size={20} />
          </button>

          {item.trailer_url && (
            <div style={styles.trailerGroup}>
              <button style={styles.trailerBtn} onClick={() => setShowTrailer(true)}>
                <Video size={18} color="#e50914" /> Watch Trailer
              </button>
              <a
                href={item.trailer_url}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.externalTrailerBtn}
                title="Open Trailer / Ad Link"
              >
                <ExternalLink size={16} /> Link
              </a>
            </div>
          )}
        </div>

        {/* Content Container */}
        <div style={styles.content}>
          <div style={styles.mainGrid}>
            {/* Poster Sidebar */}
            <div style={styles.posterCol}>
              <img
                src={item.poster_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60"}
                alt={item.title}
                style={styles.poster}
                loading="lazy"
                decoding="async"
              />

              {/* Watch Status Selector Buttons */}
              <div style={styles.statusGroup}>
                <button
                  style={{
                    ...styles.statusBtn,
                    ...(userProgress.status === "watched" ? styles.statusBtnActiveGreen : {})
                  }}
                  onClick={() => handleStatusChange("watched")}
                >
                  <CheckCircle2 size={16} /> Watched
                </button>

                <button
                  style={{
                    ...styles.statusBtn,
                    ...(userProgress.status === "watchlist" ? styles.statusBtnActiveGold : {})
                  }}
                  onClick={() => handleStatusChange("watchlist")}
                >
                  <Bookmark size={16} /> Watchlist
                </button>
              </div>

              {/* Action Buttons: Edit & Delete */}
              <div style={styles.adminActions}>
                <button style={styles.iconBtn} onClick={() => onEdit(item)}>
                  <Edit3 size={16} /> Edit Entry
                </button>

                {!confirmDelete ? (
                  <button style={{ ...styles.iconBtn, color: "var(--accent-red)" }} onClick={() => setConfirmDelete(true)}>
                    <Trash2 size={16} /> Delete
                  </button>
                ) : (
                  <button style={styles.confirmDeleteBtn} onClick={() => onDelete(item.id)}>
                    Confirm Delete?
                  </button>
                )}
              </div>
            </div>

            {/* Info Body */}
            <div style={styles.infoCol}>
              <div style={styles.headerInfo}>
                <div style={styles.titleRow}>
                  <h1 style={styles.title}>{item.title}</h1>
                  <span style={styles.year}>({item.year})</span>
                </div>

                <div style={styles.metaRow}>
                  <span className={`badge ${item.type === "series" ? "badge-green" : "badge-red"}`}>
                    {item.type === "series" ? "TV Series" : "Movie"}
                  </span>

                  {item.imdb_rating > 0 && (
                    <span className="badge badge-rating">
                      <Star size={12} fill="#f5c518" /> {item.imdb_rating} / 10
                    </span>
                  )}

                  {item.runtime > 0 && (
                    <span style={styles.metaPill}>
                      <Clock size={14} /> {item.runtime} mins
                    </span>
                  )}

                  {item.is_ongoing && (
                    <span className="badge badge-green">Ongoing</span>
                  )}
                </div>
              </div>

              {/* Genres */}
              <div style={styles.genresRow}>
                {(item.genres || []).map((g, idx) => (
                  <span key={idx} style={styles.genreBadge}>{g}</span>
                ))}
              </div>

              {/* Overview */}
              <p style={styles.overview}>{item.overview || "No overview snippet available for this media title."}</p>

              {/* Credits */}
              <div style={styles.creditsGrid}>
                {item.director && (
                  <div>
                    <span style={styles.creditLabel}>Director:</span>
                    <span style={styles.creditVal}>{item.director}</span>
                  </div>
                )}
                {item.creator && (
                  <div>
                    <span style={styles.creditLabel}>Creator:</span>
                    <span style={styles.creditVal}>{item.creator}</span>
                  </div>
                )}
                {item.studio && (
                  <div>
                    <span style={styles.creditLabel}>Studio:</span>
                    <span style={styles.creditVal}>{item.studio}</span>
                  </div>
                )}
              </div>

              {/* Cast */}
              {item.cast && item.cast.length > 0 && (
                <div style={styles.castSection}>
                  <span style={styles.sectionTitle}>Top Cast</span>
                  <div style={styles.castGrid}>
                    {item.cast.map((c, idx) => (
                      <div key={idx} style={styles.castCard}>
                        <div style={styles.castName}>{c.name}</div>
                        <div style={styles.castChar}>{c.character}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Movie One-Click VLC Play & File Download Options */}
              {item.type === "movie" && (
                <div style={styles.playSectionCol}>
                  <div style={styles.playSection}>
                    <button
                      style={styles.mainPlayBtn}
                      onClick={() => {
                        if (defaultMoviePath) {
                          launchInVlc(defaultMoviePath, item.title, addToast);
                        } else {
                          addToast("No local file path configured for your user.", "warning");
                        }
                      }}
                    >
                      <Play size={20} fill="#ffffff" /> Play Movie in VLC
                    </button>

                    {defaultMoviePath && (
                      <button
                        style={styles.m3uDownloadBtn}
                        onClick={() => {
                          downloadVlcM3uPlaylist(defaultMoviePath, item.title);
                          addToast("Downloaded VLC Playlist (.m3u)! Open file to play in VLC.", "success");
                        }}
                      >
                        <Download size={16} /> Get `.m3u` File
                      </button>
                    )}
                  </div>

                  <div style={styles.secondaryPlayRow}>
                    {defaultMoviePath && (
                      <button style={styles.copyBtn} onClick={() => copyPathToClipboard(defaultMoviePath, addToast)}>
                        <Copy size={14} /> Copy Local File Path
                      </button>
                    )}
                    <button
                      style={styles.regFixBtn}
                      onClick={() => {
                        downloadWindowsRegistryFix();
                        addToast("Downloaded Registry Fix! Double-click file to enable direct VLC opening.", "success");
                      }}
                    >
                      <Download size={14} /> Download `.reg` Windows VLC Fix
                    </button>
                  </div>
                </div>
              )}

              {/* TV Series Season & Episode Breakdown */}
              {item.type === "series" && (
                <div style={styles.seriesSection}>
                  <span style={styles.sectionTitle}>Seasons & Episodes</span>

                  {/* Season Tabs */}
                  <div style={styles.seasonTabs}>
                    {(item.seasons || [{ season_number: 1, episode_count: 10 }]).map((s) => (
                      <button
                        key={s.season_number}
                        style={{
                          ...styles.seasonTab,
                          ...(activeSeason === s.season_number ? styles.seasonTabActive : {})
                        }}
                        onClick={() => setActiveSeason(s.season_number)}
                      >
                        Season {s.season_number}
                      </button>
                    ))}
                  </div>

                  {/* Episode List */}
                  <div style={styles.episodeList}>
                    {Array.from({
                      length: (item.seasons || []).find((s) => s.season_number === activeSeason)?.episode_count || 10
                    }).map((_, idx) => {
                      const epNum = idx + 1;
                      const epCode = `S${activeSeason}E${epNum}`;
                      const isEpWatched = watchedEpisodes.has(epCode);
                      const epPath = userPathsMap[epCode] || "";

                      return (
                        <div key={epCode} style={styles.episodeRow}>
                          <div style={styles.epLeft}>
                            <input
                              type="checkbox"
                              checked={isEpWatched}
                              onChange={() => toggleEpisodeWatched(epCode)}
                              style={styles.checkbox}
                            />
                            <span style={styles.epCode}>{epCode}</span>
                            <span style={styles.epTitle}>Episode {epNum}</span>
                          </div>

                          <div style={styles.epRight}>
                            {epPath && (
                              <button
                                style={styles.epPlayBtn}
                                onClick={() => launchInVlc(epPath, `${item.title} ${epCode}`, addToast)}
                              >
                                <Play size={12} fill="#000000" /> Play S{activeSeason}E{epNum}
                              </button>
                            )}
                            <button
                              style={styles.epCopyBtn}
                              onClick={() => copyPathToClipboard(epPath || defaultMoviePath, addToast)}
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Consolidated Multi-User File Paths */}
              <div style={styles.userPathsSection}>
                <span style={styles.sectionTitle}>
                  <HardDrive size={16} /> User Local File Locations
                </span>
                <div style={styles.userPathsList}>
                  {(item.user_paths || []).map((up, idx) => (
                    <div key={idx} style={styles.userPathCard}>
                      <div style={styles.userPathHeader}>
                        <span style={styles.userPathName}>Available on {up.display_name}'s PC</span>
                        {up.uid === currentUser?.uid && <span className="badge badge-dark">Your PC</span>}
                      </div>
                      <div style={styles.userPathText}>
                        {up.paths?.default || Object.values(up.paths || {})[0] || "File path configured"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* YouTube Trailer Modal */}
        {showTrailer && getYouTubeEmbedUrl(item.trailer_url) && (
          <div style={styles.trailerOverlay} onClick={() => setShowTrailer(false)}>
            <div style={styles.trailerBox} onClick={(e) => e.stopPropagation()}>
              <button style={styles.closeTrailerBtn} onClick={() => setShowTrailer(false)}>
                <X size={24} />
              </button>
              <iframe
                src={getYouTubeEmbedUrl(item.trailer_url)}
                title={`${item.title} Trailer`}
                style={styles.trailerIframe}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },
  modal: {
    width: "100%",
    maxWidth: "960px",
    maxHeight: "90vh",
    backgroundColor: "var(--bg-surface)",
    borderRadius: "16px",
    overflowY: "auto",
    position: "relative",
    boxShadow: "0 24px 60px rgba(0,0,0,0.95)",
    border: "1px solid var(--border-subtle)"
  },
  banner: {
    height: "280px",
    backgroundSize: "cover",
    backgroundPosition: "center",
    position: "relative",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "20px"
  },
  closeBtn: {
    position: "absolute",
    top: "20px",
    right: "20px",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "rgba(0,0,0,0.75)",
    border: "1px solid var(--border-subtle)",
    color: "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10
  },
  trailerGroup: {
    position: "absolute",
    bottom: "20px",
    right: "20px",
    display: "flex",
    gap: "8px",
    zIndex: 10
  },
  trailerBtn: {
    backgroundColor: "rgba(0,0,0,0.85)",
    color: "#ffffff",
    border: "1px solid var(--border-subtle)",
    padding: "10px 18px",
    borderRadius: "20px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  externalTrailerBtn: {
    backgroundColor: "rgba(0,0,0,0.85)",
    color: "#ffffff",
    border: "1px solid var(--border-subtle)",
    padding: "10px 14px",
    borderRadius: "20px",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    textDecoration: "none"
  },
  content: {
    padding: "24px 32px 40px 32px",
    marginTop: "-60px"
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    gap: "32px"
  },
  posterCol: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  poster: {
    width: "100%",
    borderRadius: "12px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.8)",
    border: "1px solid var(--border-subtle)",
    objectFit: "cover"
  },
  statusGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  statusBtn: {
    width: "100%",
    padding: "10px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    fontWeight: 600,
    fontSize: "0.88rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "var(--transition)"
  },
  statusBtnActiveGreen: {
    backgroundColor: "rgba(70, 211, 105, 0.2)",
    color: "var(--accent-green)",
    borderColor: "var(--accent-green)"
  },
  statusBtnActiveGold: {
    backgroundColor: "rgba(245, 197, 24, 0.2)",
    color: "var(--accent-gold)",
    borderColor: "var(--accent-gold)"
  },
  adminActions: {
    display: "flex",
    gap: "8px"
  },
  iconBtn: {
    flex: 1,
    padding: "8px",
    backgroundColor: "var(--bg-hover)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "0.8rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    cursor: "pointer"
  },
  confirmDeleteBtn: {
    width: "100%",
    padding: "8px",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.8rem",
    cursor: "pointer"
  },
  infoCol: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  headerInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  titleRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "12px",
    flexWrap: "wrap"
  },
  title: {
    fontSize: "2rem",
    fontWeight: 800,
    color: "#ffffff"
  },
  year: {
    fontSize: "1.2rem",
    color: "var(--text-muted)"
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap"
  },
  metaPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.85rem",
    color: "var(--text-secondary)"
  },
  genresRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  },
  genreBadge: {
    padding: "4px 12px",
    backgroundColor: "var(--bg-elevated)",
    borderRadius: "20px",
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-subtle)"
  },
  overview: {
    fontSize: "0.95rem",
    lineHeight: "1.6",
    color: "var(--text-secondary)"
  },
  creditsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px",
    padding: "16px",
    backgroundColor: "var(--bg-elevated)",
    borderRadius: "8px"
  },
  creditLabel: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    display: "block"
  },
  creditVal: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#ffffff"
  },
  castSection: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  sectionTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  castGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
    gap: "10px"
  },
  castCard: {
    padding: "8px 10px",
    backgroundColor: "var(--bg-elevated)",
    borderRadius: "6px",
    border: "1px solid var(--border-subtle)"
  },
  castName: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#ffffff"
  },
  castChar: {
    fontSize: "0.75rem",
    color: "var(--text-muted)"
  },
  playSectionCol: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "8px"
  },
  playSection: {
    display: "flex",
    gap: "12px"
  },
  secondaryPlayRow: {
    display: "flex",
    gap: "12px"
  },
  mainPlayBtn: {
    flex: 1,
    padding: "14px 20px",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(229,9,20,0.4)"
  },
  m3uDownloadBtn: {
    padding: "14px 20px",
    backgroundColor: "var(--accent-green)",
    color: "#000000",
    border: "none",
    borderRadius: "8px",
    fontWeight: 800,
    fontSize: "0.9rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 14px rgba(70,211,105,0.4)"
  },
  copyBtn: {
    flex: 1,
    padding: "10px 14px",
    backgroundColor: "var(--bg-elevated)",
    color: "#ffffff",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.82rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px"
  },
  regFixBtn: {
    flex: 1,
    padding: "10px 14px",
    backgroundColor: "var(--bg-elevated)",
    color: "var(--accent-green)",
    border: "1px solid var(--accent-green)",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.82rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px"
  },
  seriesSection: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  seasonTabs: {
    display: "flex",
    gap: "8px",
    overflowX: "auto"
  },
  seasonTab: {
    padding: "8px 16px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer"
  },
  seasonTabActive: {
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    borderColor: "var(--accent-red)"
  },
  episodeList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    maxHeight: "260px",
    overflowY: "auto",
    paddingRight: "6px"
  },
  episodeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    backgroundColor: "var(--bg-elevated)",
    borderRadius: "6px",
    border: "1px solid var(--border-subtle)"
  },
  epLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  checkbox: {
    accentColor: "var(--accent-green)",
    width: "16px",
    height: "16px",
    cursor: "pointer"
  },
  epCode: {
    fontWeight: 700,
    fontSize: "0.85rem",
    color: "var(--accent-green)"
  },
  epTitle: {
    fontSize: "0.88rem",
    color: "#ffffff"
  },
  epRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  epPlayBtn: {
    backgroundColor: "var(--accent-green)",
    color: "#000000",
    border: "none",
    padding: "4px 10px",
    borderRadius: "4px",
    fontWeight: 700,
    fontSize: "0.78rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  epCopyBtn: {
    background: "none",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    padding: "4px 8px",
    borderRadius: "4px",
    cursor: "pointer"
  },
  userPathsSection: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "12px"
  },
  userPathsList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  userPathCard: {
    padding: "10px 14px",
    backgroundColor: "var(--bg-elevated)",
    borderRadius: "6px",
    border: "1px solid var(--border-subtle)"
  },
  userPathHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px"
  },
  userPathName: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#ffffff"
  },
  userPathText: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    fontFamily: "monospace",
    wordBreak: "break-all"
  },
  trailerOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.95)",
    zIndex: 300,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },
  trailerBox: {
    width: "100%",
    maxWidth: "900px",
    aspectRatio: "16/9",
    position: "relative"
  },
  closeTrailerBtn: {
    position: "absolute",
    top: "-40px",
    right: 0,
    background: "none",
    border: "none",
    color: "#ffffff",
    cursor: "pointer"
  },
  trailerIframe: {
    width: "100%",
    height: "100%",
    border: "none",
    borderRadius: "12px"
  }
};
