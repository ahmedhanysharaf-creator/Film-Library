import React, { useState, useRef } from "react";
import { X, Settings, Key, Database, Save, User } from "lucide-react";
import { getTmdbApiKey, setTmdbApiKey } from "../services/tmdb";
import { useToast } from "../context/ToastContext";

export const SettingsModal = ({ onClose, onOpenProfile }) => {
  const { addToast } = useToast();
  const backdropMouseDownRef = useRef(false);

  const [tmdbKey, setTmdbKeyState] = useState(getTmdbApiKey());
  const [firebaseConfigStr, setFirebaseConfigStr] = useState(
    localStorage.getItem("filmlibrary_firebase_config") || ""
  );

  const handleSave = (e) => {
    e.preventDefault();

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
        style={styles.modal} 
        onMouseDown={(e) => e.stopPropagation()} 
        onTouchStart={(e) => e.stopPropagation()} 
        onClick={(e) => e.stopPropagation()} 
        className="glass-modal"
      >
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <Settings size={22} color="var(--accent-red)" />
            <h3 style={styles.title}>Application Settings</h3>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {onOpenProfile && (
          <div style={styles.profileShortcutBox}>
            <div>
              <div style={styles.profileShortcutTitle}>Account Profile & Avatar</div>
              <div style={styles.profileShortcutSub}>Change your display name or pick a cool cinema avatar</div>
            </div>
            <button
              type="button"
              style={styles.editProfileBtn}
              onClick={onOpenProfile}
            >
              <User size={15} /> Edit Profile
            </button>
          </div>
        )}

        <form onSubmit={handleSave} style={styles.form}>
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
  profileShortcutBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "14px",
    padding: "14px 16px",
    backgroundColor: "rgba(229, 9, 20, 0.08)",
    border: "1px solid rgba(229, 9, 20, 0.25)",
    borderRadius: "10px"
  },
  profileShortcutTitle: {
    fontSize: "0.92rem",
    fontWeight: 700,
    color: "#ffffff"
  },
  profileShortcutSub: {
    fontSize: "0.78rem",
    color: "var(--text-secondary)",
    marginTop: "2px"
  },
  editProfileBtn: {
    padding: "8px 14px",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "0.82rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    whiteSpace: "nowrap",
    boxShadow: "0 2px 10px rgba(229, 9, 20, 0.3)"
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
