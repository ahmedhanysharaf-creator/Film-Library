import React, { useState, useEffect } from "react";
import { X, Settings, Key, ShieldCheck, Database, Save, Download, Tv, List, FolderSync, FolderArchive } from "lucide-react";
import { getSecurityToken, setSecurityToken, downloadWindowsRegistryFix, exportMasterM3uPlaylist } from "../services/vlcLauncher";
import { fetchLibraryItems } from "../services/storage";
import { connectLocalPlaylistFolder, syncAllPlaylistsToFolder, getStoredDirectoryHandle, clearStoredDirectoryHandle, exportPlaylistsAsZip } from "../services/folderSync";
import { getTmdbApiKey, setTmdbApiKey } from "../services/tmdb";
import { useToast } from "../context/ToastContext";

export const SettingsModal = ({ onClose }) => {
  const { addToast } = useToast();

  const [token, setTokenState] = useState(getSecurityToken());
  const [tmdbKey, setTmdbKeyState] = useState(getTmdbApiKey());
  const [firebaseConfigStr, setFirebaseConfigStr] = useState(
    localStorage.getItem("filmlibrary_firebase_config") || ""
  );
  const [syncHandle, setSyncHandle] = useState(null);
  const [companionStatus, setCompanionStatus] = useState("checking");

  useEffect(() => {
    getStoredDirectoryHandle().then((handle) => {
      if (handle) setSyncHandle(handle);
    });

    fetch("http://127.0.0.1:18899/status")
      .then((r) => r.json())
      .then(() => setCompanionStatus("connected"))
      .catch(() => setCompanionStatus("offline"));
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setSecurityToken(token.trim());

    if (tmdbKey.trim()) {
      setTmdbApiKey(tmdbKey.trim());
    } else {
      setTmdbApiKey(null);
    }

    if (firebaseConfigStr.trim()) {
      try {
        JSON.parse(firebaseConfigStr);
        localStorage.setItem("filmlibrary_firebase_config", firebaseConfigStr.trim());
      } catch (err) {
        addToast("Invalid JSON in Firebase config string.", "error");
        return;
      }
    } else {
      localStorage.removeItem("filmlibrary_firebase_config");
    }

    addToast("Settings saved successfully!", "success");
    onClose();
  };

  return (
    <div style={styles.backdrop} onClick={onClose} className="animate-pop">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} className="glass-modal">
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <Settings size={22} color="var(--accent-red)" />
            <h3 style={styles.title}>Companion & VLC Settings</h3>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} style={styles.form}>
          {/* Companion Background Service Connection Status */}
          <div style={{ ...styles.vlcSetupBox, backgroundColor: companionStatus === "connected" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)", borderColor: companionStatus === "connected" ? "#10b981" : "#f59e0b", padding: "16px" }}>
            <FolderSync size={28} color={companionStatus === "connected" ? "#10b981" : "#f59e0b"} />
            <div style={{ flex: 1 }}>
              <div style={{ ...styles.vlcSetupTitle, color: companionStatus === "connected" ? "#34d399" : "#fbbf24", fontSize: "1.05rem" }}>
                {companionStatus === "connected" ? "🟢 Windows Companion Server Active" : "🟡 Companion Server Offline"}
              </div>
              <p style={styles.vlcSetupSub}>
                {companionStatus === "connected"
                  ? "Real-time M3U playlist auto-sync is ACTIVE! Clicking Play opens VLC through your local .m3u playlist files."
                  : "To enable instant VLC launching and automatic local .m3u folder syncing, run python companion/app.py on your PC."}
              </p>
            </div>
            <button
              type="button"
              style={{ ...styles.downloadRegBtn, backgroundColor: "#10b981", color: "#ffffff", padding: "8px 14px" }}
              onClick={async () => {
                const items = await fetchLibraryItems();
                const payload = items.map((item) => ({
                  title: item.title,
                  type: item.type,
                  entries: (item.user_paths || []).map((up) => ({ path: up.paths?.default, title: item.title }))
                }));
                fetch("http://127.0.0.1:18899/sync", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ items: payload })
                })
                  .then((r) => r.json())
                  .then((d) => {
                    setCompanionStatus("connected");
                    addToast(`Synced ${d.entries_synced} items to Playlists folder!`, "success");
                  })
                  .catch(() => {
                    setCompanionStatus("offline");
                    addToast("Companion server is offline. Run python companion/app.py", "warning");
                  });
              }}
            >
              Sync M3U Playlists Now
            </button>
          </div>

          {/* Automatic Local Folder Auto-Play & Sync */}
          <div style={{ ...styles.vlcSetupBox, backgroundColor: "rgba(139, 92, 246, 0.15)", borderColor: "#8b5cf6", padding: "16px" }}>
            <FolderSync size={28} color="#8b5cf6" />
            <div style={{ flex: 1 }}>
              <div style={{ ...styles.vlcSetupTitle, color: "#a78bfa", fontSize: "1.05rem" }}>
                🎬 Local Media Folder {syncHandle ? `(Connected: "${syncHandle.name}")` : "(Not Connected)"}
              </div>
              <p style={styles.vlcSetupSub}>
                Connect your main PC media folder (e.g. <code>D:\Movies</code> or <code>Marvel Films</code>). Once connected, clicking **Play** on ANY movie or TV series episode will play the file **100% AUTOMATICALLY** with ZERO manual file picking!
              </p>
            </div>
            {syncHandle ? (
              <button
                type="button"
                style={{ ...styles.downloadRegBtn, backgroundColor: "rgba(239, 68, 68, 0.2)", color: "#ef4444", border: "1px solid #ef4444" }}
                onClick={async () => {
                  await clearStoredDirectoryHandle();
                  setSyncHandle(null);
                  addToast("Disconnected local media folder.", "info");
                }}
              >
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                style={{ ...styles.downloadRegBtn, backgroundColor: "#8b5cf6", color: "#ffffff", padding: "10px 18px", fontWeight: 700 }}
                onClick={async () => {
                  const handle = await connectLocalPlaylistFolder(addToast);
                  if (handle) {
                    setSyncHandle(handle);
                    const items = await fetchLibraryItems();
                    await syncAllPlaylistsToFolder(items, handle, addToast);
                  }
                }}
              >
                <FolderSync size={16} /> Connect Media Folder (Select ONCE)
              </button>
            )}
          </div>

          {/* Export Playlists Folder as ZIP Archive */}
          <div style={{ ...styles.vlcSetupBox, backgroundColor: "rgba(16, 185, 129, 0.1)", borderColor: "#10b981" }}>
            <FolderArchive size={24} color="#10b981" />
            <div style={{ flex: 1 }}>
              <div style={styles.vlcSetupTitle}>Download Playlists Folder (.ZIP)</div>
              <p style={styles.vlcSetupSub}>
                Download a `.zip` archive containing separate `.m3u` files organized in `Movies/` and `Series/` folders for transferring to other devices!
              </p>
            </div>
            <button
              type="button"
              style={{ ...styles.downloadRegBtn, backgroundColor: "#10b981", color: "#ffffff" }}
              onClick={async () => {
                const items = await fetchLibraryItems();
                await exportPlaylistsAsZip(items, addToast);
              }}
            >
              <Download size={14} /> Download ZIP
            </button>
          </div>
          {/* Export Master Library Playlist (.m3u) */}
          <div style={{ ...styles.vlcSetupBox, backgroundColor: "rgba(59, 130, 246, 0.1)", borderColor: "#3b82f6" }}>
            <List size={24} color="#3b82f6" />
            <div style={{ flex: 1 }}>
              <div style={styles.vlcSetupTitle}>Export Master VLC Playlist</div>
              <p style={styles.vlcSetupSub}>
                Export a single `.m3u` playlist containing all your movies & TV series episodes for instant access in VLC!
              </p>
            </div>
            <button
              type="button"
              style={{ ...styles.downloadRegBtn, backgroundColor: "#3b82f6", color: "#ffffff" }}
              onClick={async () => {
                const items = await fetchLibraryItems();
                exportMasterM3uPlaylist(items, addToast);
              }}
            >
              <Download size={14} /> Export Master `.m3u`
            </button>
          </div>
          {/* Windows VLC 1-Click Protocol Setup */}
          <div style={styles.vlcSetupBox}>
            <Tv size={24} color="var(--accent-green)" />
            <div style={{ flex: 1 }}>
              <div style={styles.vlcSetupTitle}>1-Click Windows VLC Protocol Setup</div>
              <p style={styles.vlcSetupSub}>
                Download this 1-click Registry file (`.reg`) and run it once on Windows to enable automatic direct VLC launching from Chrome!
              </p>
            </div>
            <button
              type="button"
              style={styles.downloadRegBtn}
              onClick={() => {
                downloadWindowsRegistryFix();
                addToast("Downloaded Registry Fix! Double-click file on PC to enable direct VLC opening.", "success");
              }}
            >
              <Download size={14} /> Download `.reg` Fix
            </button>
          </div>

          {/* Security Token Section */}
          <div style={styles.section}>
            <label style={styles.label}>
              <ShieldCheck size={16} color="var(--accent-green)" /> Companion Security Token
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setTokenState(e.target.value)}
              placeholder="e.g. FILM_LIBRARY_SECRET_2026"
              style={styles.input}
            />
            <span style={styles.helpText}>
              Validates `filmlibrary://` VLC protocol commands against your local companion launcher.
            </span>
          </div>

          {/* TMDB API Key */}
          <div style={styles.section}>
            <label style={styles.label}>
              <Key size={16} color="#f5c518" /> TMDB API Key (Optional Override)
            </label>
            <input
              type="text"
              value={tmdbKey}
              onChange={(e) => setTmdbKeyState(e.target.value)}
              placeholder="Enter custom TMDB v3 API Key..."
              style={styles.input}
            />
          </div>

          {/* Firebase Config JSON */}
          <div style={styles.section}>
            <label style={styles.label}>
              <Database size={16} color="#3b82f6" /> Firebase Config JSON (Optional Override)
            </label>
            <textarea
              rows={3}
              value={firebaseConfigStr}
              onChange={(e) => setFirebaseConfigStr(e.target.value)}
              placeholder='{"apiKey": "...", "projectId": "...", ...}'
              style={styles.textarea}
            />
          </div>

          <button type="submit" style={styles.saveBtn}>
            <Save size={18} /> Save Settings
          </button>
        </form>
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
    backgroundColor: "rgba(0,0,0,0.85)",
    zIndex: 250,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },
  modal: {
    width: "100%",
    maxWidth: "580px",
    borderRadius: "14px",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  title: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "#ffffff"
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },
  vlcSetupBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 16px",
    backgroundColor: "rgba(70,211,105,0.1)",
    border: "1px solid var(--accent-green)",
    borderRadius: "10px"
  },
  vlcSetupTitle: {
    fontSize: "0.92rem",
    fontWeight: 700,
    color: "#ffffff"
  },
  vlcSetupSub: {
    fontSize: "0.78rem",
    color: "var(--text-secondary)",
    marginTop: "2px"
  },
  downloadRegBtn: {
    padding: "8px 12px",
    backgroundColor: "var(--accent-green)",
    color: "#000000",
    border: "none",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.8rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    whiteSpace: "nowrap"
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  label: {
    fontSize: "0.88rem",
    fontWeight: 600,
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  input: {
    padding: "10px 14px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "0.9rem",
    outline: "none"
  },
  textarea: {
    padding: "10px 14px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "0.85rem",
    fontFamily: "monospace",
    outline: "none"
  },
  helpText: {
    fontSize: "0.78rem",
    color: "var(--text-muted)"
  },
  saveBtn: {
    padding: "12px",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  }
};
