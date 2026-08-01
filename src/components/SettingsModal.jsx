import React, { useState } from "react";
import { X, Settings, Key, ShieldCheck, Database, Save, Download, Tv } from "lucide-react";
import { getSecurityToken, setSecurityToken, downloadWindowsRegistryFix } from "../services/vlcLauncher";
import { getTmdbApiKey, setTmdbApiKey } from "../services/tmdb";
import { useToast } from "../context/ToastContext";

export const SettingsModal = ({ onClose }) => {
  const { addToast } = useToast();

  const [token, setTokenState] = useState(getSecurityToken());
  const [tmdbKey, setTmdbKeyState] = useState(getTmdbApiKey());
  const [firebaseConfigStr, setFirebaseConfigStr] = useState(
    localStorage.getItem("filmlibrary_firebase_config") || ""
  );

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
