import React, { useState, useRef, useEffect } from "react";
import { 
  X, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, 
  SkipBack, SkipForward, Subtitles, Settings, Film, Tv, Download, Copy, ExternalLink, HardDrive, FolderOpen, Loader2, Sparkles, FolderSync
} from "lucide-react";
import { copyPathToClipboard, downloadVlcM3uPlaylist, resolveMediaPaths } from "../services/vlcLauncher";
import { connectLocalPlaylistFolder, getStoredDirectoryHandle, findMediaFileInDirectoryHandle } from "../services/folderSync";
import { saveContinueWatchingItem, getNextEpisodeToPlay } from "../services/continueWatching";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const VideoPlayerModal = ({ 
  item, 
  initialSeason = 1, 
  initialEpisode = 1, 
  onClose,
  onEpisodeChange 
}) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const uid = currentUser?.uid || "demo_user_id";

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const backdropMouseDownRef = useRef(false);
  const subFileInputRef = useRef(null);

  const isSeries = item?.type?.toLowerCase() === "series" || item?.type?.toLowerCase() === "tv";

  const [currentSeason, setCurrentSeason] = useState(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);

  // Resolved path state
  const [mediaPath, setMediaPath] = useState("");
  const [subPath, setSubPath] = useState("");
  const [activeVideoSrc, setActiveVideoSrc] = useState("");
  const [activeSubSrc, setActiveSubSrc] = useState("");
  const [folderHandle, setFolderHandle] = useState(null);
  const [isSearchingFolder, setIsSearchingFolder] = useState(false);

  // Video State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);

  // Load stored directory handle from IndexedDB
  useEffect(() => {
    getStoredDirectoryHandle().then((handle) => {
      if (handle) setFolderHandle(handle);
    });
  }, []);

  const attemptAutoPlayFromFolder = async (handle, targetPath) => {
    if (!handle || !targetPath) return false;
    setIsSearchingFolder(true);
    try {
      const opts = { mode: "read" };
      if ((await handle.queryPermission(opts)) !== "granted") {
        if ((await handle.requestPermission(opts)) !== "granted") {
          setIsSearchingFolder(false);
          return false;
        }
      }

      const file = await findMediaFileInDirectoryHandle(handle, targetPath);
      if (file) {
        const blobUrl = URL.createObjectURL(file);
        setActiveVideoSrc(blobUrl);
        setVideoError(false);
        setIsSearchingFolder(false);
        addToast(`Auto-playing "${file.name}" from connected media folder!`, "success");
        return true;
      }
    } catch (e) {}
    setIsSearchingFolder(false);
    return false;
  };

  // Connect Local Media Folder (Select Once)
  const handleConnectFolder = async () => {
    const handle = await connectLocalPlaylistFolder(addToast);
    if (handle) {
      setFolderHandle(handle);
      await attemptAutoPlayFromFolder(handle, mediaPath);
    }
  };

  // Resolve media paths whenever episode / item changes
  useEffect(() => {
    if (!item) return;

    const resolved = resolveMediaPaths(item, uid, currentSeason, currentEpisode);
    setMediaPath(resolved.path || "");
    setSubPath(resolved.subPath || "");

    // Check if path is a direct HTTP/HTTPS URL or Blob URL
    if (resolved.path && (resolved.path.startsWith("http://") || resolved.path.startsWith("https://") || resolved.path.startsWith("blob:"))) {
      setActiveVideoSrc(resolved.path);
      setVideoError(false);
    } else {
      setActiveVideoSrc("");
      setVideoError(true);

      // Attempt automatic playback if folder handle is stored
      getStoredDirectoryHandle().then((handle) => {
        if (handle) {
          attemptAutoPlayFromFolder(handle, resolved.path || item.title);
        }
      });
    }

    if (resolved.subPath && (resolved.subPath.startsWith("http://") || resolved.subPath.startsWith("https://") || resolved.subPath.startsWith("blob:"))) {
      setActiveSubSrc(resolved.subPath);
    } else {
      setActiveSubSrc("");
    }

    // Save to Continue Watching
    saveContinueWatchingItem({
      mediaId: item.id || item.tmdb_id,
      title: item.title,
      type: item.type,
      poster_url: item.poster_url,
      backdrop_url: item.backdrop_url,
      season: isSeries ? currentSeason : 1,
      episode: isSeries ? currentEpisode : 1,
      progressPct: 10
    });

  }, [item, currentSeason, currentEpisode]);

  // Video Event Handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current || !activeVideoSrc) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRef.current.muted = nextMute;
  };

  const handleSpeedChange = (speed) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const skipTime = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  // Custom Local File Select Handler (Upload file from device storage on phone/laptop)
  const handleSelectLocalFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileBlobUrl = URL.createObjectURL(file);
    setActiveVideoSrc(fileBlobUrl);
    setVideoError(false);
    addToast(`Loaded local file: "${file.name}"`, "success");

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }, 300);
  };

  // Custom Subtitle File Select Handler
  const handleSelectSubtitleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const subBlobUrl = URL.createObjectURL(file);
    setActiveSubSrc(subBlobUrl);
    setSubtitlesEnabled(true);
    addToast(`Loaded subtitle: "${file.name}"`, "success");
  };

  // Switch Episodes (Previous / Next)
  const handleNextEpisode = () => {
    const totalEpsInSeason = (item?.seasons || []).find((s) => s.season_number === currentSeason)?.episode_count || 10;
    if (currentEpisode < totalEpsInSeason) {
      setCurrentEpisode(currentEpisode + 1);
      if (onEpisodeChange) onEpisodeChange(currentSeason, currentEpisode + 1);
    } else if (currentSeason < (item?.seasons?.length || 1)) {
      setCurrentSeason(currentSeason + 1);
      setCurrentEpisode(1);
      if (onEpisodeChange) onEpisodeChange(currentSeason + 1, 1);
    } else {
      addToast("Reached the end of the series!", "info");
    }
  };

  const handlePrevEpisode = () => {
    if (currentEpisode > 1) {
      setCurrentEpisode(currentEpisode - 1);
      if (onEpisodeChange) onEpisodeChange(currentSeason, currentEpisode - 1);
    } else if (currentSeason > 1) {
      const prevSeasonEps = (item?.seasons || []).find((s) => s.season_number === currentSeason - 1)?.episode_count || 10;
      setCurrentSeason(currentSeason - 1);
      setCurrentEpisode(prevSeasonEps);
      if (onEpisodeChange) onEpisodeChange(currentSeason - 1, prevSeasonEps);
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const epTitle = isSeries 
    ? `${item?.title} (S${String(currentSeason).padStart(2, "0")}E${String(currentEpisode).padStart(2, "0")})` 
    : item?.title;

  return (
    <div 
      style={styles.backdrop} 
      onMouseDown={(e) => {
        backdropMouseDownRef.current = (e.target === e.currentTarget);
      }}
      onTouchStart={(e) => {
        backdropMouseDownRef.current = (e.target === e.currentTarget);
      }}
      onClick={(e) => {
        if (backdropMouseDownRef.current && e.target === e.currentTarget) {
          onClose();
        }
        backdropMouseDownRef.current = false;
      }} 
      className="animate-pop"
    >
      <div 
        ref={containerRef}
        style={styles.modal} 
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()} 
        className="glass-modal"
        onMouseMove={() => setShowControls(true)}
      >
        {/* Top Floating Bar */}
        <div style={styles.topHeader}>
          <div style={styles.headerTitleGroup}>
            <span style={styles.mediaTag}>
              {isSeries ? <Tv size={14} /> : <Film size={14} />}
              {isSeries ? `S${currentSeason}E${currentEpisode}` : "Movie"}
            </span>
            <h2 style={styles.headerTitle}>{epTitle}</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose} title="Close Player">
            <X size={22} />
          </button>
        </div>

        {/* Video Screen Container */}
        <div style={styles.videoContainer}>
          {activeVideoSrc && !videoError ? (
            <video
              ref={videoRef}
              src={activeVideoSrc}
              style={styles.videoElement}
              onTimeUpdate={handleTimeUpdate}
              onEnded={isSeries ? handleNextEpisode : () => setIsPlaying(false)}
              onClick={togglePlay}
              playsInline
              controls={false}
            >
              {activeSubSrc && subtitlesEnabled && (
                <track kind="subtitles" src={activeSubSrc} srclang="en" label="Subtitles" default />
              )}
            </video>
          ) : (
            /* Fallback / Local File Selection Card for Cross-Platform Web */
            <div style={styles.fallbackCard}>
              <div style={styles.fallbackContent}>
                <div style={styles.fallbackIconBox}>
                  <Film size={48} color="var(--accent-red)" />
                </div>
                
                <h3 style={styles.fallbackTitle}>
                  {item?.title} {isSeries ? `(S${currentSeason}E${currentEpisode})` : ""}
                </h3>

                <p style={styles.fallbackSubtitle}>
                  {mediaPath 
                    ? `Local path: "${mediaPath}"` 
                    : "No direct HTTP stream URL detected for this media entry."}
                </p>

                <p style={styles.fallbackDesc}>
                  Select your video file from your phone or laptop drive to play in-browser, or choose an option below:
                </p>

                {/* File Pickers */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleSelectLocalFile} 
                  accept="video/*,.mkv,.mp4,.avi,.webm,.mov" 
                  style={{ display: "none" }} 
                />
                <input 
                  type="file" 
                  ref={subFileInputRef} 
                  onChange={handleSelectSubtitleFile} 
                  accept=".srt,.vtt,.ass,.sub" 
                  style={{ display: "none" }} 
                />

                <div style={styles.actionBtnGrid}>
                  <button 
                    style={{ ...styles.primaryActionBtn, backgroundColor: "#8b5cf6" }} 
                    onClick={handleConnectFolder}
                  >
                    <FolderSync size={18} /> {folderHandle ? "Grant Folder Permission (Auto-Play All)" : "Connect Media Folder (Select ONCE for Auto-Play)"}
                  </button>

                  <button 
                    style={styles.secondaryActionBtn} 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FolderOpen size={18} /> Select Video File from Device
                  </button>

                  <button 
                    style={styles.secondaryActionBtn} 
                    onClick={() => subFileInputRef.current?.click()}
                  >
                    <Subtitles size={18} /> Load Subtitle File (.srt / .vtt)
                  </button>

                  {mediaPath && (
                    <button 
                      style={styles.secondaryActionBtn} 
                      onClick={() => copyPathToClipboard(mediaPath, addToast)}
                    >
                      <Copy size={16} /> Copy File Path
                    </button>
                  )}

                  {mediaPath && (
                    <button 
                      style={styles.secondaryActionBtn} 
                      onClick={() => {
                        downloadVlcM3uPlaylist(mediaPath, epTitle, subPath);
                        addToast("Downloaded VLC Playlist (.m3u)!", "success");
                      }}
                    >
                      <Download size={16} /> Get `.m3u` Playlist
                    </button>
                  )}

                  {item?.trailer_url && (
                    <a 
                      href={item.trailer_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={styles.externalLinkBtn}
                    >
                      <ExternalLink size={16} /> Watch Official Trailer
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Player Controls (Bottom Bar) */}
          {activeVideoSrc && (
            <div style={{ ...styles.controlsBar, opacity: showControls ? 1 : 0 }}>
              {/* Progress Seek Bar */}
              <div style={styles.seekRow}>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  style={styles.seekBar}
                />
              </div>

              {/* Buttons & Time Row */}
              <div style={styles.controlsRow}>
                <div style={styles.controlsLeft}>
                  {/* Prev Ep Button */}
                  {isSeries && (
                    <button style={styles.iconBtn} onClick={handlePrevEpisode} title="Previous Episode">
                      <SkipBack size={18} />
                    </button>
                  )}

                  {/* Skip -10s */}
                  <button style={styles.iconBtn} onClick={() => skipTime(-10)} title="Rewind 10s">
                    <RotateCcw size={18} />
                  </button>

                  {/* Main Play / Pause */}
                  <button style={styles.mainPlayToggleBtn} onClick={togglePlay}>
                    {isPlaying ? <Pause size={20} fill="#ffffff" /> : <Play size={20} fill="#ffffff" style={{ marginLeft: "2px" }} />}
                  </button>

                  {/* Skip +10s */}
                  <button style={styles.iconBtn} onClick={() => skipTime(10)} title="Forward 10s">
                    <SkipForward size={18} />
                  </button>

                  {/* Next Ep Button */}
                  {isSeries && (
                    <button style={styles.iconBtn} onClick={handleNextEpisode} title="Next Episode">
                      <SkipForward size={18} color="var(--accent-green)" />
                    </button>
                  )}

                  {/* Volume Group */}
                  <div style={styles.volumeGroup}>
                    <button style={styles.iconBtn} onClick={toggleMute}>
                      {isMuted || volume === 0 ? <VolumeX size={18} color="var(--accent-red)" /> : <Volume2 size={18} />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      style={styles.volumeSlider}
                    />
                  </div>

                  {/* Time Display */}
                  <span style={styles.timeDisplay}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div style={styles.controlsRight}>
                  {/* Speed Selector */}
                  <select 
                    value={playbackRate} 
                    onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                    style={styles.speedSelect}
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1.0x (Normal)</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2.0x</option>
                  </select>

                  {/* Subtitle Toggle */}
                  <button 
                    style={{ ...styles.iconBtn, color: subtitlesEnabled ? "var(--accent-green)" : "var(--text-muted)" }} 
                    onClick={() => subFileInputRef.current?.click()}
                    title="Load Subtitles"
                  >
                    <Subtitles size={18} />
                  </button>

                  {/* Fullscreen */}
                  <button style={styles.iconBtn} onClick={toggleFullscreen} title="Fullscreen">
                    <Maximize size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
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
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    backdropFilter: "blur(12px)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px"
  },
  modal: {
    width: "100%",
    maxWidth: "1100px",
    height: "85vh",
    backgroundColor: "#0d0d0d",
    borderRadius: "16px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)"
  },
  topHeader: {
    height: "56px",
    padding: "0 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(18, 18, 18, 0.9)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    zIndex: 10
  },
  headerTitleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  mediaTag: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "20px",
    backgroundColor: "rgba(229, 9, 20, 0.2)",
    color: "var(--accent-red)",
    fontSize: "12px",
    fontWeight: 600
  },
  headerTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease"
  },
  videoContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#000000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  videoElement: {
    width: "100%",
    height: "100%",
    objectFit: "contain"
  },
  fallbackCard: {
    padding: "32px 24px",
    maxWidth: "600px",
    width: "100%",
    textAlign: "center"
  },
  fallbackContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px"
  },
  fallbackIconBox: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    backgroundColor: "rgba(229, 9, 20, 0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  fallbackTitle: {
    fontSize: "22px",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0
  },
  fallbackSubtitle: {
    fontSize: "13px",
    color: "var(--text-muted)",
    margin: 0,
    wordBreak: "break-all"
  },
  fallbackDesc: {
    fontSize: "14px",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: "1.5"
  },
  actionBtnGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "100%",
    marginTop: "12px"
  },
  primaryActionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "14px 20px",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s"
  },
  secondaryActionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 18px",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: "var(--text-primary)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer"
  },
  externalLinkBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 18px",
    backgroundColor: "transparent",
    color: "var(--accent-green)",
    border: "1px solid var(--accent-green)",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 500,
    textDecoration: "none"
  },
  controlsBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    transition: "opacity 0.3s ease"
  },
  seekRow: {
    width: "100%"
  },
  seekBar: {
    width: "100%",
    accentColor: "var(--accent-red)",
    cursor: "pointer"
  },
  controlsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  controlsLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px"
  },
  controlsRight: {
    display: "flex",
    alignItems: "center",
    gap: "14px"
  },
  mainPlayToggleBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "var(--accent-red)",
    border: "none",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer"
  },
  iconBtn: {
    background: "none",
    border: "none",
    color: "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px"
  },
  volumeGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  volumeSlider: {
    width: "70px",
    accentColor: "#ffffff",
    cursor: "pointer"
  },
  timeDisplay: {
    fontSize: "13px",
    color: "#cccccc",
    fontFamily: "monospace",
    marginLeft: "8px"
  },
  speedSelect: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#ffffff",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "12px",
    cursor: "pointer"
  }
};
