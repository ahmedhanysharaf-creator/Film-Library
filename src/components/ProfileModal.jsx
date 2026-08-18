import React, { useState } from "react";
import { X, User, Sparkles, Check, Image, RefreshCw, Save, Film, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

// Predefined cinematic & superhero avatar presets
const AVATAR_PRESETS = [
  {
    category: "Superhero & Cinema",
    avatars: [
      { id: "ironman", name: "Iron Hero", url: "https://api.dicebear.com/7.x/bottts/svg?seed=IronMan&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf" },
      { id: "spiderman", name: "Web Crawler", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=SpiderHero&backgroundColor=b6e3f4,ffd5dc" },
      { id: "batman", name: "Dark Knight", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Batman&backgroundColor=1c1c1c,2a2a2a" },
      { id: "deadpool", name: "Mercenary", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Deadpool&backgroundColor=e50914,b6e3f4" },
      { id: "vader", name: "Sith Lord", url: "https://api.dicebear.com/7.x/bottts/svg?seed=DarthVader&backgroundColor=0d0d0d" },
      { id: "wolverine", name: "Mutant", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Wolverine" },
      { id: "director", name: "Film Director", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Director&facialHairProbability=100" },
      { id: "cinema_star", name: "Movie Star", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=MovieStar&accessoriesProbability=100" }
    ]
  },
  {
    category: "3D Bots & Cyber",
    avatars: [
      { id: "cyber_red", name: "Cyber Red", url: "https://api.dicebear.com/7.x/bottts/svg?seed=NetflixRed&colors=red" },
      { id: "neon_blue", name: "Neon Blue", url: "https://api.dicebear.com/7.x/bottts/svg?seed=NeonBlue" },
      { id: "gold_bot", name: "Gold Mecha", url: "https://api.dicebear.com/7.x/bottts/svg?seed=GoldBot" },
      { id: "matrix", name: "Matrix Unit", url: "https://api.dicebear.com/7.x/bottts/svg?seed=MatrixCinema" },
      { id: "quantum", name: "Quantum Bot", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Quantum" },
      { id: "guardian", name: "Guardian", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Guardian" }
    ]
  },
  {
    category: "Avataaars & Personas",
    avatars: [
      { id: "cool_guy", name: "Spectator", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=AhmedHany" },
      { id: "vip_guest", name: "VIP Cinephile", url: "https://api.dicebear.com/7.x/personas/svg?seed=VIPGuest" },
      { id: "critic", name: "Film Critic", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Critic" },
      { id: "retro", name: "Retro Viewer", url: "https://api.dicebear.com/7.x/micah/svg?seed=RetroViewer" },
      { id: "cinephile_pro", name: "Pro Cinephile", url: "https://api.dicebear.com/7.x/notionists/svg?seed=ProCinephile" },
      { id: "popcorn_fan", name: "Popcorn Fan", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=CinemaPopcorn" }
    ]
  }
];

export const ProfileModal = ({ onClose }) => {
  const { currentUser, updateUserProfile } = useAuth();
  const { addToast } = useToast();

  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [selectedAvatar, setSelectedAvatar] = useState(
    currentUser?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.email || 'User'}`
  );
  const [customSeed, setCustomSeed] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [activeTab, setActiveTab] = useState("presets"); // "presets" | "seed" | "url"
  const [saving, setSaving] = useState(false);

  const handleGenerateSeed = (e) => {
    e.preventDefault();
    if (!customSeed.trim()) {
      addToast("Please enter a keyword to generate an avatar.", "info");
      return;
    }
    const generated = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(customSeed.trim())}`;
    setSelectedAvatar(generated);
    addToast(`Generated avatar from seed "${customSeed.trim()}"!`, "success");
  };

  const handleApplyCustomUrl = (e) => {
    e.preventDefault();
    if (!customUrl.trim() || !customUrl.startsWith("http")) {
      addToast("Please enter a valid image URL starting with http:// or https://", "error");
      return;
    }
    setSelectedAvatar(customUrl.trim());
    addToast("Custom avatar URL applied!", "success");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      addToast("Please enter a valid display name.", "error");
      return;
    }

    setSaving(true);
    const success = await updateUserProfile(displayName.trim(), selectedAvatar);
    setSaving(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose} className="animate-pop">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} className="glass-modal">
        {/* Modal Header */}
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <div style={styles.iconBadge}>
              <User size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={styles.title}>Edit Profile & Avatar</h3>
              <p style={styles.subtitle}>Customize your cinema identity and avatar</p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Live Profile Card Preview */}
        <div style={styles.previewCard}>
          <div style={styles.avatarWrapper}>
            <img
              src={selectedAvatar}
              alt="Avatar Preview"
              style={styles.previewAvatar}
              onError={(e) => {
                e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.email || 'User'}`;
              }}
            />
            <div style={styles.previewBadge}>
              <Sparkles size={12} color="#ffffff" />
            </div>
          </div>
          <div style={styles.previewInfo}>
            <div style={styles.previewName}>{displayName || "Your Name"}</div>
            <div style={styles.previewEmail}>{currentUser?.email}</div>
            <span style={styles.previewTag}>Authorized Member</span>
          </div>
        </div>

        <form onSubmit={handleSave} style={styles.form}>
          {/* Display Name Input */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <User size={15} color="var(--accent-red)" /> Your Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Ahmed Hany, Dad, Tony Stark..."
              required
              style={styles.input}
            />
          </div>

          {/* Avatar Selection Mode Tabs */}
          <div style={styles.avatarTabsContainer}>
            <label style={styles.label}>
              <Image size={15} color="var(--accent-red)" /> Choose Your Avatar
            </label>
            <div style={styles.subTabs}>
              <button
                type="button"
                style={{
                  ...styles.subTabBtn,
                  ...(activeTab === "presets" ? styles.subTabActive : styles.subTabInactive)
                }}
                onClick={() => setActiveTab("presets")}
              >
                🎬 Preset Gallery
              </button>
              <button
                type="button"
                style={{
                  ...styles.subTabBtn,
                  ...(activeTab === "seed" ? styles.subTabActive : styles.subTabInactive)
                }}
                onClick={() => setActiveTab("seed")}
              >
                ✨ AI Generator
              </button>
              <button
                type="button"
                style={{
                  ...styles.subTabBtn,
                  ...(activeTab === "url" ? styles.subTabActive : styles.subTabInactive)
                }}
                onClick={() => setActiveTab("url")}
              >
                🔗 Custom URL
              </button>
            </div>
          </div>

          {/* Tab 1: Preset Gallery */}
          {activeTab === "presets" && (
            <div style={styles.galleryContainer}>
              {AVATAR_PRESETS.map((group) => (
                <div key={group.category} style={styles.presetGroup}>
                  <div style={styles.groupTitle}>{group.category}</div>
                  <div style={styles.avatarGrid}>
                    {group.avatars.map((av) => {
                      const isSelected = selectedAvatar === av.url;
                      return (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => setSelectedAvatar(av.url)}
                          style={{
                            ...styles.avatarCard,
                            ...(isSelected ? styles.avatarCardSelected : {})
                          }}
                          title={av.name}
                        >
                          <img src={av.url} alt={av.name} style={styles.gridAvatarImg} />
                          <span style={styles.avatarNameLabel}>{av.name}</span>
                          {isSelected && (
                            <div style={styles.checkBadge}>
                              <Check size={11} color="#ffffff" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Custom Seed Generator */}
          {activeTab === "seed" && (
            <div style={styles.tabContentBox}>
              <p style={styles.helpText}>
                Type any movie name, superhero, or nickname to generate a custom 3D avatar!
              </p>
              <div style={styles.inputActionRow}>
                <input
                  type="text"
                  value={customSeed}
                  onChange={(e) => setCustomSeed(e.target.value)}
                  placeholder="e.g. Inception, Marvel, Batman, Dad..."
                  style={styles.input}
                />
                <button
                  type="button"
                  onClick={handleGenerateSeed}
                  style={styles.actionBtn}
                >
                  <RefreshCw size={15} /> Generate
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Custom URL Input */}
          {activeTab === "url" && (
            <div style={styles.tabContentBox}>
              <p style={styles.helpText}>
                Paste any direct image URL (from Discord, Google, Imgur, etc.)
              </p>
              <div style={styles.inputActionRow}>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/my-photo.jpg"
                  style={styles.input}
                />
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  style={styles.actionBtn}
                >
                  <Check size={15} /> Apply
                </button>
              </div>
            </div>
          )}

          {/* Save Button */}
          <button type="submit" style={styles.saveBtn} disabled={saving}>
            <Save size={18} />
            {saving ? "Saving Changes..." : "Save Profile & Avatar"}
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
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    backdropFilter: "blur(8px)",
    zIndex: 300,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },
  modal: {
    width: "100%",
    maxWidth: "540px",
    maxHeight: "90vh",
    overflowY: "auto",
    borderRadius: "16px",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    backgroundColor: "#141414",
    border: "1px solid var(--border-subtle)",
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.95)"
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
  iconBadge: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "var(--accent-red)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 14px rgba(229, 9, 20, 0.4)"
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
  previewCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    backgroundColor: "#0d0d0d",
    border: "1px solid var(--border-subtle)",
    borderRadius: "12px",
    boxShadow: "inset 0 2px 6px rgba(0,0,0,0.5)"
  },
  avatarWrapper: {
    position: "relative",
    width: "68px",
    height: "68px",
    borderRadius: "50%",
    padding: "3px",
    backgroundColor: "var(--accent-red)",
    boxShadow: "0 0 20px rgba(229, 9, 20, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  previewAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    objectFit: "cover",
    backgroundColor: "#1c1c1c"
  },
  previewBadge: {
    position: "absolute",
    bottom: "-2px",
    right: "-2px",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    backgroundColor: "var(--accent-red)",
    border: "2px solid #141414",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  previewInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "3px"
  },
  previewName: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#ffffff"
  },
  previewEmail: {
    fontSize: "0.82rem",
    color: "var(--text-muted)"
  },
  previewTag: {
    display: "inline-block",
    marginTop: "4px",
    padding: "2px 8px",
    backgroundColor: "rgba(70, 211, 105, 0.15)",
    color: "var(--accent-green)",
    border: "1px solid rgba(70, 211, 105, 0.3)",
    borderRadius: "20px",
    fontSize: "0.72rem",
    fontWeight: 600,
    width: "fit-content"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },
  fieldGroup: {
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
    width: "100%",
    padding: "12px 14px",
    backgroundColor: "#0d0d0d",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "0.92rem",
    outline: "none",
    transition: "border 0.2s"
  },
  avatarTabsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  subTabs: {
    display: "flex",
    backgroundColor: "#0d0d0d",
    borderRadius: "8px",
    padding: "4px",
    gap: "4px",
    border: "1px solid var(--border-subtle)"
  },
  subTabBtn: {
    flex: 1,
    padding: "8px 10px",
    fontSize: "0.82rem",
    fontWeight: 600,
    borderRadius: "6px",
    cursor: "pointer",
    border: "none",
    transition: "all 0.2s"
  },
  subTabActive: {
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    boxShadow: "0 2px 8px rgba(229, 9, 20, 0.4)"
  },
  subTabInactive: {
    backgroundColor: "transparent",
    color: "var(--text-secondary)"
  },
  galleryContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    maxHeight: "220px",
    overflowY: "auto",
    paddingRight: "4px"
  },
  presetGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  groupTitle: {
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  avatarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
    gap: "8px"
  },
  avatarCard: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    padding: "8px 4px",
    backgroundColor: "#0d0d0d",
    border: "1px solid var(--border-subtle)",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  avatarCardSelected: {
    border: "2px solid var(--accent-red)",
    backgroundColor: "rgba(229, 9, 20, 0.12)",
    boxShadow: "0 0 12px rgba(229, 9, 20, 0.4)"
  },
  gridAvatarImg: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    objectFit: "cover"
  },
  avatarNameLabel: {
    fontSize: "0.72rem",
    color: "#ffffff",
    textAlign: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "70px"
  },
  checkBadge: {
    position: "absolute",
    top: "4px",
    right: "4px",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    backgroundColor: "var(--accent-red)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  tabContentBox: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "14px",
    backgroundColor: "#0d0d0d",
    borderRadius: "10px",
    border: "1px solid var(--border-subtle)"
  },
  helpText: {
    fontSize: "0.82rem",
    color: "var(--text-secondary)"
  },
  inputActionRow: {
    display: "flex",
    gap: "8px"
  },
  actionBtn: {
    padding: "10px 16px",
    backgroundColor: "var(--bg-elevated)",
    color: "#ffffff",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    whiteSpace: "nowrap"
  },
  saveBtn: {
    width: "100%",
    padding: "13px",
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
    gap: "8px",
    boxShadow: "0 6px 20px rgba(229, 9, 20, 0.4)",
    marginTop: "6px",
    transition: "background 0.2s"
  }
};
