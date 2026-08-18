import React, { useState, useEffect } from "react";
import { X, Film, Tv, Save, RotateCcw, Sparkles, CheckCircle2, AlertCircle, List, Clipboard, HelpCircle } from "lucide-react";
import {
  getMarvelChecklist,
  saveMarvelChecklist,
  formatListToText,
  parseListText,
  DEFAULT_MARVEL_FILMS,
  DEFAULT_MARVEL_SERIES
} from "../services/marvelChecklist";
import { useToast } from "../context/ToastContext";

export const MarvelListModal = ({ onClose, onSaved }) => {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("films"); // "films" | "series"
  const [filmsText, setFilmsText] = useState("");
  const [seriesText, setSeriesText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { films, series } = getMarvelChecklist();
    setFilmsText(formatListToText(films));
    setSeriesText(formatListToText(series));
  }, []);

  const filmsCount = parseListText(filmsText).length;
  const seriesCount = parseListText(seriesText).length;

  const handleSave = (e) => {
    e?.preventDefault();
    setSaving(true);

    const saved = saveMarvelChecklist(filmsText, seriesText);
    setSaving(false);

    addToast(`Saved ${saved.films.length} Marvel Films & ${saved.series.length} Marvel Series!`, "success");
    if (onSaved) onSaved(saved);
    onClose();
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset Marvel list to the official standard MCU & Multiverse releases?")) {
      setFilmsText(formatListToText(DEFAULT_MARVEL_FILMS));
      setSeriesText(formatListToText(DEFAULT_MARVEL_SERIES));
      addToast("Reset Marvel lists to standard MCU releases.", "info");
    }
  };

  const handlePasteClipboard = async (target) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (target === "films") {
          setFilmsText(text);
          addToast("Pasted Marvel Films list from clipboard!", "success");
        } else {
          setSeriesText(text);
          addToast("Pasted Marvel Series list from clipboard!", "success");
        }
      }
    } catch (err) {
      addToast("Could not access clipboard. Please paste manually into the box.", "info");
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose} className="animate-pop">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} className="glass-modal">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <div style={styles.marvelBadge}>MARVEL</div>
            <div>
              <h3 style={styles.title}>Manage Marvel List</h3>
              <p style={styles.subtitle}>Paste your custom Marvel Films and Marvel Series lists</p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector: Marvel Films vs Marvel Series */}
        <div style={styles.tabsContainer}>
          <button
            type="button"
            style={{
              ...styles.tabBtn,
              ...(activeTab === "films" ? styles.tabActive : styles.tabInactive)
            }}
            onClick={() => setActiveTab("films")}
          >
            <Film size={16} />
            Marvel Films ({filmsCount})
          </button>

          <button
            type="button"
            style={{
              ...styles.tabBtn,
              ...(activeTab === "series" ? styles.tabActive : styles.tabInactive)
            }}
            onClick={() => setActiveTab("series")}
          >
            <Tv size={16} />
            Marvel Series ({seriesCount})
          </button>
        </div>

        {/* Tab 1: Marvel Films Section */}
        {activeTab === "films" && (
          <div style={styles.editorSection}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionLabel}>
                <Film size={16} color="var(--accent-red)" />
                <strong>Marvel Films</strong> ({filmsCount} movies in checklist)
              </div>
              <button
                type="button"
                style={styles.clipboardBtn}
                onClick={() => handlePasteClipboard("films")}
                title="Paste from clipboard"
              >
                <Clipboard size={14} /> Paste from Clipboard
              </button>
            </div>

            <p style={styles.hintText}>
              Paste all your essential Marvel movies below (one movie title per line). You can include release years or subtitle formats like <em>Iron Man (2008)</em> or <em>Avengers: Endgame</em>.
            </p>

            <textarea
              value={filmsText}
              onChange={(e) => setFilmsText(e.target.value)}
              placeholder="Iron Man&#10;The Incredible Hulk&#10;Thor&#10;Captain America: The First Avenger&#10;The Avengers&#10;..."
              style={styles.textarea}
              rows={12}
            />
          </div>
        )}

        {/* Tab 2: Marvel Series Section */}
        {activeTab === "series" && (
          <div style={styles.editorSection}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionLabel}>
                <Tv size={16} color="#3b82f6" />
                <strong>Marvel Series</strong> ({seriesCount} series in checklist)
              </div>
              <button
                type="button"
                style={styles.clipboardBtn}
                onClick={() => handlePasteClipboard("series")}
                title="Paste from clipboard"
              >
                <Clipboard size={14} /> Paste from Clipboard
              </button>
            </div>

            <p style={styles.hintText}>
              Paste all your Marvel TV shows and Disney+ series below (one show title per line). E.g. <em>WandaVision</em>, <em>Loki</em>, <em>Daredevil</em>.
            </p>

            <textarea
              value={seriesText}
              onChange={(e) => setSeriesText(e.target.value)}
              placeholder="WandaVision&#10;Loki&#10;The Falcon and the Winter Soldier&#10;Moon Knight&#10;Daredevil&#10;..."
              style={styles.textarea}
              rows={12}
            />
          </div>
        )}

        {/* Action Footer */}
        <div style={styles.footer}>
          <button
            type="button"
            style={styles.resetBtn}
            onClick={handleResetDefaults}
            title="Reset to standard MCU list"
          >
            <RotateCcw size={15} /> Reset Defaults
          </button>

          <div style={styles.rightActions}>
            <button type="button" style={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              style={styles.saveBtn}
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Marvel Checklist"}
            </button>
          </div>
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
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    backdropFilter: "blur(8px)",
    zIndex: 350,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },
  modal: {
    width: "100%",
    maxWidth: "640px",
    maxHeight: "92vh",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    backgroundColor: "#141414",
    border: "1px solid var(--border-subtle)",
    borderRadius: "16px",
    padding: "28px",
    boxShadow: "0 24px 60px rgba(0,0,0,0.95)"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  marvelBadge: {
    padding: "4px 10px",
    backgroundColor: "#e50914",
    color: "#ffffff",
    fontWeight: 900,
    fontSize: "0.88rem",
    letterSpacing: "1px",
    borderRadius: "4px",
    boxShadow: "0 2px 10px rgba(229, 9, 20, 0.5)"
  },
  title: {
    fontSize: "1.2rem",
    fontWeight: 800,
    color: "#ffffff"
  },
  subtitle: {
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    marginTop: "2px"
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "4px"
  },
  tabsContainer: {
    display: "flex",
    backgroundColor: "#0d0d0d",
    borderRadius: "10px",
    padding: "4px",
    gap: "6px",
    border: "1px solid var(--border-subtle)"
  },
  tabBtn: {
    flex: 1,
    padding: "10px 14px",
    fontSize: "0.88rem",
    fontWeight: 600,
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    border: "1px solid transparent",
    transition: "all 0.2s"
  },
  tabActive: {
    backgroundColor: "#e50914",
    color: "#ffffff",
    fontWeight: 700,
    boxShadow: "0 4px 14px rgba(229, 9, 20, 0.4)"
  },
  tabInactive: {
    backgroundColor: "transparent",
    color: "var(--text-secondary)"
  },
  editorSection: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    flex: 1
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionLabel: {
    fontSize: "0.92rem",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  clipboardBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    backgroundColor: "#0d0d0d",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    fontSize: "0.78rem",
    fontWeight: 600,
    cursor: "pointer"
  },
  hintText: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    lineHeight: "1.4"
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    backgroundColor: "#0d0d0d",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "0.88rem",
    fontFamily: "monospace",
    lineHeight: "1.6",
    outline: "none",
    resize: "vertical",
    minHeight: "220px",
    maxHeight: "360px"
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: "6px",
    borderTop: "1px solid var(--border-subtle)"
  },
  resetBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 14px",
    backgroundColor: "transparent",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "var(--text-muted)",
    fontSize: "0.82rem",
    fontWeight: 600,
    cursor: "pointer"
  },
  rightActions: {
    display: "flex",
    gap: "10px"
  },
  cancelBtn: {
    padding: "10px 16px",
    backgroundColor: "transparent",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "var(--text-secondary)",
    fontSize: "0.88rem",
    fontWeight: 600,
    cursor: "pointer"
  },
  saveBtn: {
    padding: "10px 18px",
    backgroundColor: "#e50914",
    border: "none",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "0.88rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 14px rgba(229, 9, 20, 0.4)"
  }
};
