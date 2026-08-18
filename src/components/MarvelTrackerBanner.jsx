import React, { useState } from "react";
import { Film, Tv, Trophy, Edit3, CheckCircle2, XCircle, ChevronDown, ChevronUp, Plus, Search, Sparkles, Copy, Check } from "lucide-react";
import { useToast } from "../context/ToastContext";

export const MarvelTrackerBanner = ({ trackerData, onOpenEditList, onSelectItem, onAddNew }) => {
  const { addToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [checklistFilter, setChecklistFilter] = useState("all"); // "all" | "missing" | "owned"
  const [checklistTab, setChecklistTab] = useState("films"); // "films" | "series"
  const [copiedTitle, setCopiedTitle] = useState(null);

  if (!trackerData) return null;

  const { films, series, total } = trackerData;

  const currentItems = checklistTab === "films" ? films.items : series.items;
  const filteredChecklist = currentItems.filter((item) => {
    if (checklistFilter === "missing") return !item.isOwned;
    if (checklistFilter === "owned") return item.isOwned;
    return true;
  });

  const handleCopyTitle = (title) => {
    navigator.clipboard.writeText(title);
    setCopiedTitle(title);
    addToast(`Copied "${title}" to clipboard!`, "info");
    setTimeout(() => setCopiedTitle(null), 2000);
  };

  return (
    <div style={styles.container} className="glass-panel animate-fade">
      {/* Top Banner Header */}
      <div style={styles.bannerHeader}>
        <div style={styles.titleGroup}>
          <div style={styles.marvelLogo}>MARVEL</div>
          <div>
            <h2 style={styles.bannerTitle}>Collection Tracker & Completion Status</h2>
            <p style={styles.bannerSubtitle}>
              Live tracker comparing your library against your custom Marvel films & series list
            </p>
          </div>
        </div>

        <div style={styles.actionButtons}>
          <button
            style={styles.editListBtn}
            onClick={onOpenEditList}
            title="Paste or edit your Marvel films & series lists"
          >
            <Edit3 size={15} /> Edit Marvel List
          </button>

          <button
            style={{
              ...styles.expandBtn,
              ...(isExpanded ? styles.expandBtnActive : {})
            }}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? "Hide Checklist" : "View Checklist Breakdown"}
          </button>
        </div>
      </div>

      {/* 3 Metric Stat Cards */}
      <div style={styles.statsGrid}>
        {/* Card 1: Marvel Films */}
        <div style={styles.statCard}>
          <div style={styles.statCardHeader}>
            <div style={styles.statIconBadgeFilm}>
              <Film size={18} color="#ffffff" />
            </div>
            <span style={styles.statLabel}>Marvel Films</span>
            <span style={films.missing === 0 ? styles.badgeComplete : styles.badgeMissing}>
              {films.missing === 0 ? "Complete 🎉" : `${films.missing} Missing`}
            </span>
          </div>

          <div style={styles.statNumbers}>
            <span style={styles.statCountPrimary}>{films.owned}</span>
            <span style={styles.statCountDivider}>/</span>
            <span style={styles.statCountTotal}>{films.total}</span>
            <span style={styles.statPercentText}>({films.percent}%)</span>
          </div>

          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressBar,
                width: `${films.percent}%`,
                backgroundColor: "#e50914"
              }}
            />
          </div>

          <div style={styles.statFooterText}>
            <span>Got: <strong>{films.owned} movies</strong></span>
            <span>Need: <strong style={{ color: films.missing > 0 ? "#f59e0b" : "#46d369" }}>{films.missing} more</strong></span>
          </div>
        </div>

        {/* Card 2: Marvel Series */}
        <div style={styles.statCard}>
          <div style={styles.statCardHeader}>
            <div style={styles.statIconBadgeSeries}>
              <Tv size={18} color="#ffffff" />
            </div>
            <span style={styles.statLabel}>Marvel Series</span>
            <span style={series.missing === 0 ? styles.badgeComplete : styles.badgeMissing}>
              {series.missing === 0 ? "Complete 🎉" : `${series.missing} Missing`}
            </span>
          </div>

          <div style={styles.statNumbers}>
            <span style={styles.statCountPrimary}>{series.owned}</span>
            <span style={styles.statCountDivider}>/</span>
            <span style={styles.statCountTotal}>{series.total}</span>
            <span style={styles.statPercentText}>({series.percent}%)</span>
          </div>

          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressBar,
                width: `${series.percent}%`,
                backgroundColor: "#3b82f6"
              }}
            />
          </div>

          <div style={styles.statFooterText}>
            <span>Got: <strong>{series.owned} series</strong></span>
            <span>Need: <strong style={{ color: series.missing > 0 ? "#f59e0b" : "#46d369" }}>{series.missing} more</strong></span>
          </div>
        </div>

        {/* Card 3: Total Marvel Universe */}
        <div style={{ ...styles.statCard, ...styles.statCardTotal }}>
          <div style={styles.statCardHeader}>
            <div style={styles.statIconBadgeTotal}>
              <Trophy size={18} color="#ffffff" />
            </div>
            <span style={styles.statLabel}>Total Marvel Universe</span>
            <span style={total.missing === 0 ? styles.badgeComplete : styles.badgeTotal}>
              {total.percent}% Collected
            </span>
          </div>

          <div style={styles.statNumbers}>
            <span style={styles.statCountPrimaryGold}>{total.owned}</span>
            <span style={styles.statCountDivider}>/</span>
            <span style={styles.statCountTotal}>{total.total}</span>
            <span style={styles.statRemainingTag}>
              {total.missing > 0 ? `${total.missing} titles to go` : "100% Complete!"}
            </span>
          </div>

          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressBar,
                width: `${total.percent}%`,
                backgroundColor: "#10b981"
              }}
            />
          </div>

          <div style={styles.statFooterText}>
            <span>Total Collected: <strong>{total.owned}</strong></span>
            <span>Total Missing: <strong style={{ color: total.missing > 0 ? "#ef4444" : "#46d369" }}>{total.missing}</strong></span>
          </div>
        </div>
      </div>

      {/* Expanded Interactive Checklist Breakdown */}
      {isExpanded && (
        <div style={styles.checklistSection} className="animate-pop">
          <div style={styles.checklistToolbar}>
            {/* Tab: Films vs Series */}
            <div style={styles.subTabGroup}>
              <button
                type="button"
                style={{
                  ...styles.subTabBtn,
                  ...(checklistTab === "films" ? styles.subTabActiveFilm : styles.subTabInactive)
                }}
                onClick={() => setChecklistTab("films")}
              >
                <Film size={14} /> Films ({films.owned}/{films.total})
              </button>
              <button
                type="button"
                style={{
                  ...styles.subTabBtn,
                  ...(checklistTab === "series" ? styles.subTabActiveSeries : styles.subTabInactive)
                }}
                onClick={() => setChecklistTab("series")}
              >
                <Tv size={14} /> Series ({series.owned}/{series.total})
              </button>
            </div>

            {/* Filter: All / Missing / Owned */}
            <div style={styles.filterPills}>
              <button
                type="button"
                style={{
                  ...styles.filterPill,
                  ...(checklistFilter === "all" ? styles.filterPillActive : {})
                }}
                onClick={() => setChecklistFilter("all")}
              >
                All ({currentItems.length})
              </button>
              <button
                type="button"
                style={{
                  ...styles.filterPill,
                  ...(checklistFilter === "missing" ? styles.filterPillActiveMissing : {})
                }}
                onClick={() => setChecklistFilter("missing")}
              >
                Missing ({currentItems.filter((i) => !i.isOwned).length})
              </button>
              <button
                type="button"
                style={{
                  ...styles.filterPill,
                  ...(checklistFilter === "owned" ? styles.filterPillActiveOwned : {})
                }}
                onClick={() => setChecklistFilter("owned")}
              >
                Got ({currentItems.filter((i) => i.isOwned).length})
              </button>
            </div>
          </div>

          {/* Checklist Items Grid */}
          <div style={styles.checklistGrid}>
            {filteredChecklist.length === 0 ? (
              <div style={styles.emptyChecklistMsg}>
                {checklistFilter === "missing"
                  ? "🎉 Incredible! You have collected every title in this list!"
                  : "No items match your filter."}
              </div>
            ) : (
              filteredChecklist.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.checklistItemCard,
                    ...(item.isOwned ? styles.cardOwned : styles.cardMissing)
                  }}
                >
                  <div style={styles.itemMainInfo}>
                    {item.isOwned ? (
                      <CheckCircle2 size={18} color="var(--accent-green)" />
                    ) : (
                      <XCircle size={18} color="#ef4444" />
                    )}
                    <span style={styles.itemTitle}>{item.title}</span>
                  </div>

                  <div style={styles.itemActions}>
                    {item.isOwned ? (
                      <button
                        type="button"
                        style={styles.viewInLibBtn}
                        onClick={() => item.matchedItem && onSelectItem && onSelectItem(item.matchedItem)}
                      >
                        View in Library
                      </button>
                    ) : (
                      <div style={styles.missingActionGroup}>
                        <span style={styles.missingTag}>Missing</span>
                        <button
                          type="button"
                          style={styles.copyTitleBtn}
                          onClick={() => handleCopyTitle(item.title)}
                          title="Copy title to search or download"
                        >
                          {copiedTitle === item.title ? (
                            <Check size={13} color="var(--accent-green)" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#111114",
    border: "1px solid rgba(229, 9, 20, 0.35)",
    borderRadius: "14px",
    padding: "20px 24px",
    marginBottom: "24px",
    boxShadow: "0 12px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(229, 9, 20, 0.12)",
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },
  bannerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "14px"
  },
  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "14px"
  },
  marvelLogo: {
    backgroundColor: "#e50914",
    color: "#ffffff",
    fontWeight: 900,
    fontSize: "1.1rem",
    letterSpacing: "1.5px",
    padding: "6px 14px",
    borderRadius: "6px",
    boxShadow: "0 4px 16px rgba(229, 9, 20, 0.6)"
  },
  bannerTitle: {
    fontSize: "1.25rem",
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "0.3px"
  },
  bannerSubtitle: {
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    marginTop: "2px"
  },
  actionButtons: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  editListBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 15px",
    backgroundColor: "#e50914",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(229, 9, 20, 0.4)",
    transition: "transform 0.15s, background 0.15s"
  },
  expandBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 14px",
    backgroundColor: "#1c1c1f",
    color: "#ffffff",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s"
  },
  expandBtnActive: {
    backgroundColor: "rgba(229, 9, 20, 0.15)",
    borderColor: "#e50914",
    color: "#ffffff"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "14px"
  },
  statCard: {
    backgroundColor: "#0d0d0f",
    border: "1px solid #222226",
    borderRadius: "12px",
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)"
  },
  statCardTotal: {
    borderColor: "rgba(70, 211, 105, 0.3)"
  },
  statCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  statIconBadgeFilm: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    backgroundColor: "#e50914",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  statIconBadgeSeries: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    backgroundColor: "#3b82f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  statIconBadgeTotal: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    backgroundColor: "#10b981",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  statLabel: {
    fontSize: "0.88rem",
    fontWeight: 700,
    color: "#ffffff",
    flex: 1,
    marginLeft: "10px"
  },
  badgeMissing: {
    padding: "3px 8px",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    color: "#f59e0b",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    borderRadius: "12px",
    fontSize: "0.74rem",
    fontWeight: 700
  },
  badgeComplete: {
    padding: "3px 8px",
    backgroundColor: "rgba(70, 211, 105, 0.15)",
    color: "var(--accent-green)",
    border: "1px solid rgba(70, 211, 105, 0.3)",
    borderRadius: "12px",
    fontSize: "0.74rem",
    fontWeight: 700
  },
  badgeTotal: {
    padding: "3px 8px",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#10b981",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    borderRadius: "12px",
    fontSize: "0.74rem",
    fontWeight: 700
  },
  statNumbers: {
    display: "flex",
    alignItems: "baseline",
    gap: "4px"
  },
  statCountPrimary: {
    fontSize: "1.8rem",
    fontWeight: 900,
    color: "#ffffff"
  },
  statCountPrimaryGold: {
    fontSize: "1.8rem",
    fontWeight: 900,
    color: "#ffffff"
  },
  statCountDivider: {
    fontSize: "1.2rem",
    color: "var(--text-muted)",
    marginLeft: "2px",
    marginRight: "2px"
  },
  statCountTotal: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "var(--text-secondary)"
  },
  statPercentText: {
    fontSize: "0.88rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    marginLeft: "6px"
  },
  statRemainingTag: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#ef4444",
    marginLeft: "auto"
  },
  progressTrack: {
    width: "100%",
    height: "6px",
    backgroundColor: "#1e1e24",
    borderRadius: "6px",
    overflow: "hidden"
  },
  progressBar: {
    height: "100%",
    borderRadius: "6px",
    transition: "width 0.4s ease"
  },
  statFooterText: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "0.78rem",
    color: "var(--text-muted)"
  },
  checklistSection: {
    backgroundColor: "#0d0d0f",
    border: "1px solid #27272e",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  },
  checklistToolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "10px",
    borderBottom: "1px solid #1f1f26",
    paddingBottom: "12px"
  },
  subTabGroup: {
    display: "flex",
    backgroundColor: "#16161a",
    borderRadius: "8px",
    padding: "3px",
    gap: "4px"
  },
  subTabBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 12px",
    fontSize: "0.82rem",
    fontWeight: 600,
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  subTabActiveFilm: {
    backgroundColor: "#e50914",
    color: "#ffffff",
    boxShadow: "0 2px 8px rgba(229, 9, 20, 0.4)"
  },
  subTabActiveSeries: {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.4)"
  },
  subTabInactive: {
    backgroundColor: "transparent",
    color: "var(--text-secondary)"
  },
  filterPills: {
    display: "flex",
    gap: "6px"
  },
  filterPill: {
    padding: "5px 10px",
    backgroundColor: "transparent",
    border: "1px solid #2a2a32",
    borderRadius: "14px",
    color: "var(--text-secondary)",
    fontSize: "0.76rem",
    fontWeight: 600,
    cursor: "pointer"
  },
  filterPillActive: {
    backgroundColor: "#2a2a32",
    color: "#ffffff",
    borderColor: "#444450"
  },
  filterPillActiveMissing: {
    backgroundColor: "rgba(239, 68, 68, 0.18)",
    color: "#ef4444",
    borderColor: "rgba(239, 68, 68, 0.4)"
  },
  filterPillActiveOwned: {
    backgroundColor: "rgba(70, 211, 105, 0.18)",
    color: "var(--accent-green)",
    borderColor: "rgba(70, 211, 105, 0.4)"
  },
  checklistGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "10px",
    maxHeight: "340px",
    overflowY: "auto",
    paddingRight: "4px"
  },
  emptyChecklistMsg: {
    gridColumn: "1 / -1",
    textAlign: "center",
    padding: "30px 20px",
    color: "var(--accent-green)",
    fontWeight: 600,
    fontSize: "0.95rem"
  },
  checklistItemCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid",
    gap: "10px",
    transition: "all 0.15s"
  },
  cardOwned: {
    backgroundColor: "rgba(70, 211, 105, 0.04)",
    borderColor: "rgba(70, 211, 105, 0.2)"
  },
  cardMissing: {
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    borderColor: "rgba(239, 68, 68, 0.25)"
  },
  itemMainInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flex: 1,
    overflow: "hidden"
  },
  itemTitle: {
    fontSize: "0.88rem",
    fontWeight: 600,
    color: "#ffffff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  itemActions: {
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  viewInLibBtn: {
    padding: "4px 8px",
    backgroundColor: "rgba(70, 211, 105, 0.12)",
    color: "var(--accent-green)",
    border: "1px solid rgba(70, 211, 105, 0.3)",
    borderRadius: "5px",
    fontSize: "0.72rem",
    fontWeight: 700,
    cursor: "pointer"
  },
  missingActionGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  missingTag: {
    padding: "2px 6px",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#ef4444",
    borderRadius: "4px",
    fontSize: "0.7rem",
    fontWeight: 700
  },
  copyTitleBtn: {
    padding: "4px 6px",
    backgroundColor: "#16161a",
    border: "1px solid #2a2a32",
    borderRadius: "4px",
    color: "var(--text-muted)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }
};
