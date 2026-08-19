import React, { useState } from "react";
import { Search, Download, FileText, ExternalLink, RefreshCw, Sparkles, MonitorPlay, Terminal, Globe } from "lucide-react";
import { DownloadSites } from "./DownloadSites";
import { Renamer } from "./Renamer";

export const ToolsHub = ({ initialToolId = null, onOpenRenamer }) => {
  const [activeToolId, setActiveToolId] = useState(initialToolId);
  const [iframeKey, setIframeKey] = useState(0);

  const tools = [
    {
      id: "downloads",
      name: "Download Sources Vault",
      tagline: "Movie & Series Web Links Hub",
      description: "Manage, organize, and search across your favorite movie and TV series download websites, trackers, and portals.",
      icon: Globe,
      badge: "Websites & Trackers",
      isInternal: true,
      color: "#06b6d4"
    },
    {
      id: "renamer",
      name: "Python Media Renamer",
      tagline: "Movie & Series Renamer Suite",
      description: "Manage multi-part Python renamers, auto-detect code formats, and generate copy-pasteable PowerShell execution commands.",
      icon: Terminal,
      badge: "PowerShell & Python",
      isInternal: true,
      color: "#f59e0b"
    },
    {
      id: "subdetect",
      name: "SubDetect Pro",
      tagline: "Embedded Subtitle Inspector",
      description: "Identify movies and series with built-in embedded subtitles locally in your browser using high-performance chunked media inspection.",
      icon: Search,
      badge: "Local Media WASM",
      url: "./tools/subdetect/index.html",
      color: "#e50914"
    },
    {
      id: "downloader",
      name: "Subtitle Downloader",
      tagline: "SubDL Auto Downloader",
      description: "Automatically search, fetch, and download Arabic subtitles for movies and series in one click using the SubDL API.",
      icon: Download,
      badge: "SubDL API",
      url: "./tools/subtitle-downloader/index.html",
      color: "#3b82f6"
    },
    {
      id: "matcher",
      name: "Subtitle Matcher",
      tagline: "Batch Matcher & Renamer",
      description: "Intelligently match and rename external subtitle files to your local film and TV show episode library directly in your browser.",
      icon: FileText,
      badge: "File System Access",
      url: "./tools/subtitle-matcher/index.html",
      color: "#10b981"
    }
  ];

  const activeTool = tools.find((t) => t.id === activeToolId);

  const handleRefreshIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div style={styles.container}>
      {/* Header Banner */}
      <div style={styles.header}>
        <div style={styles.headerTitleGroup}>
          <div style={styles.headerBadge}>
            <Sparkles size={14} color="#e50914" />
            <span>Integrated Workspace</span>
          </div>
          <h1 style={styles.title}>Tools Hub Dashboard</h1>
          <p style={styles.subtitle}>
            Access all download sources, Python media renamers, embedded stream detectors, subtitle auto-downloaders, and matchers directly within Film Library.
          </p>
        </div>

        {activeToolId && (
          <button style={styles.backBtn} onClick={() => setActiveToolId(null)}>
            ← Back to Tools Grid
          </button>
        )}
      </div>

      {/* If a tool is active, display the workspace viewer */}
      {activeToolId === "downloads" ? (
        <DownloadSites />
      ) : activeToolId === "renamer" ? (
        <Renamer />
      ) : activeTool ? (
        <div style={styles.toolViewerCard} className="glass-panel">
          <div style={styles.viewerHeader}>
            <div style={styles.viewerTitleInfo}>
              <span
                style={{
                  ...styles.toolDot,
                  backgroundColor: activeTool.color
                }}
              />
              <span style={styles.viewerToolName}>{activeTool.name}</span>
              <span style={styles.viewerBadge}>{activeTool.badge}</span>
            </div>

            <div style={styles.viewerControls}>
              <button
                style={styles.controlBtn}
                onClick={handleRefreshIframe}
                title="Reload tool frame"
              >
                <RefreshCw size={14} /> Refresh
              </button>

              <a
                href={activeTool.url}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.controlBtnLink}
                title="Open in standalone new browser tab"
              >
                <ExternalLink size={14} /> Open Standalone Tab
              </a>
            </div>
          </div>

          <div style={styles.iframeContainer}>
            <iframe
              key={iframeKey}
              src={activeTool.url}
              title={activeTool.name}
              style={styles.iframe}
              allow="drag-and-drop; file-system-access"
            />
          </div>
        </div>
      ) : (
        /* Tools Selection Grid */
        <div style={styles.grid}>
          {tools.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <div key={tool.id} style={styles.card} className="glass-panel hover-card">
                <div style={styles.cardHeader}>
                  <div
                    style={{
                      ...styles.iconContainer,
                      backgroundColor: `${tool.color}18`,
                      borderColor: `${tool.color}40`,
                      color: tool.color
                    }}
                  >
                    <IconComponent size={24} />
                  </div>
                  <span style={styles.cardBadge}>{tool.badge}</span>
                </div>

                <div style={styles.cardBody}>
                  <h3 style={styles.cardTitle}>{tool.name}</h3>
                  <span style={styles.cardTagline}>{tool.tagline}</span>
                  <p style={styles.cardDesc}>{tool.description}</p>
                </div>

                <div style={styles.cardActions}>
                  <button
                    style={{
                      ...styles.primaryLaunchBtn,
                      backgroundColor: tool.color,
                      flex: tool.url ? 1 : "unset",
                      width: tool.url ? "auto" : "100%"
                    }}
                    onClick={() => setActiveToolId(tool.id)}
                  >
                    <MonitorPlay size={16} /> Launch Workspace
                  </button>

                  {tool.url && (
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.secondaryTabBtn}
                      title="Open standalone"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "32px 24px 60px"
  },
  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: "32px",
    flexWrap: "wrap",
    gap: "16px"
  },
  headerTitleGroup: {
    maxWidth: "700px"
  },
  headerBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(229, 9, 20, 0.12)",
    border: "1px solid rgba(229, 9, 20, 0.3)",
    color: "#ff4d4d",
    fontSize: "0.8rem",
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: "12px",
    marginBottom: "12px"
  },
  title: {
    fontSize: "2.2rem",
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "-0.5px",
    margin: "0 0 8px"
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "1rem",
    lineHeight: 1.5,
    margin: 0
  },
  backBtn: {
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    color: "#ffffff",
    padding: "10px 18px",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "var(--transition)"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "24px"
  },
  card: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "16px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "transform 0.2s ease, box-shadow 0.2s ease"
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px"
  },
  iconContainer: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  cardBadge: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    backgroundColor: "var(--bg-elevated)",
    padding: "4px 10px",
    borderRadius: "6px",
    border: "1px solid var(--border-subtle)"
  },
  cardBody: {
    marginBottom: "24px"
  },
  cardTitle: {
    fontSize: "1.3rem",
    fontWeight: 700,
    color: "#ffffff",
    margin: "0 0 4px"
  },
  cardTagline: {
    display: "block",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: "12px"
  },
  cardDesc: {
    fontSize: "0.9rem",
    color: "var(--text-muted)",
    lineHeight: 1.5,
    margin: 0
  },
  cardActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  primaryLaunchBtn: {
    flex: 1,
    border: "none",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "0.9rem",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)"
  },
  secondaryTabBtn: {
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    padding: "12px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none"
  },
  toolViewerCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "var(--shadow-md)"
  },
  viewerHeader: {
    padding: "14px 20px",
    backgroundColor: "var(--bg-elevated)",
    borderBottom: "1px solid var(--border-subtle)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  viewerTitleInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  toolDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%"
  },
  viewerToolName: {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "#ffffff"
  },
  viewerBadge: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    backgroundColor: "var(--bg-surface)",
    padding: "3px 8px",
    borderRadius: "4px"
  },
  viewerControls: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  controlBtn: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  controlBtnLink: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    color: "#3b82f6",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: "6px",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  iframeContainer: {
    width: "100%",
    height: "calc(88vh - 120px)",
    minHeight: "650px",
    backgroundColor: "#0d0f14"
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none"
  }
};
