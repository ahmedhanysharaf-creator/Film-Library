import React, { useState, useEffect } from "react";
import { Film, Plus, Play, Tv, Star, MonitorPlay, ShieldCheck, Sparkles, FolderPlus } from "lucide-react";
import { fetchLibraryItems } from "../services/storage";
import { PosterCard } from "../components/PosterCard";

export const Home = ({ setActivePage, onSelectItem }) => {
  const [items, setItems] = useState([]);
  const [featuredItem, setFeaturedItem] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchLibraryItems();
      setItems(data);
      if (data.length > 0) {
        setFeaturedItem(data[0]);
      }
    };
    loadData();
  }, []);

  return (
    <div style={styles.container} className="animate-fade">
      {/* Featured Cinematic Hero Banner */}
      {featuredItem && (
        <div style={{
          ...styles.hero,
          backgroundImage: `linear-gradient(to right, rgba(13,13,13,0.95) 20%, rgba(13,13,13,0.4) 60%, rgba(13,13,13,0.95) 100%), url(${featuredItem.backdrop_url || featuredItem.poster_url})`
        }}>
          <div style={styles.heroContent}>
            <div style={styles.heroBadges}>
              <span className="badge badge-red">
                <Sparkles size={12} /> Featured Showcase
              </span>
              <span className="badge badge-rating">
                <Star size={12} fill="#f5c518" /> {featuredItem.imdb_rating}
              </span>
            </div>

            <h1 style={styles.heroTitle}>{featuredItem.title}</h1>
            
            <div style={styles.heroMeta}>
              <span>{featuredItem.year}</span>
              <span>•</span>
              <span>{(featuredItem.genres || []).join(", ")}</span>
              {featuredItem.runtime > 0 && (
                <>
                  <span>•</span>
                  <span>{featuredItem.runtime} mins</span>
                </>
              )}
            </div>

            <p style={styles.heroOverview}>{featuredItem.overview}</p>

            <div style={styles.heroActions}>
              <button style={styles.heroPlayBtn} onClick={() => onSelectItem(featuredItem)}>
                <Play size={18} fill="#ffffff" />
                View & Play Media
              </button>
              
              <button style={styles.heroBrowseBtn} onClick={() => setActivePage("library")}>
                Browse All {items.length} Items
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container Content */}
      <div style={styles.mainWrapper}>
        {/* Two Prominent Action Cards */}
        <div style={styles.actionGrid}>
          <div style={styles.actionCard} onClick={() => setActivePage("add")}>
            <div style={{ ...styles.actionIcon, backgroundColor: "rgba(229, 9, 20, 0.2)" }}>
              <FolderPlus size={32} color="var(--accent-red)" />
            </div>
            <div>
              <h3 style={styles.actionTitle}>Add to Library</h3>
              <p style={styles.actionDesc}>
                Auto-fetch metadata from TMDB and map local file paths on your PC.
              </p>
            </div>
          </div>

          <div style={styles.actionCard} onClick={() => setActivePage("library")}>
            <div style={{ ...styles.actionIcon, backgroundColor: "rgba(70, 211, 105, 0.2)" }}>
              <Film size={32} color="var(--accent-green)" />
            </div>
            <div>
              <h3 style={styles.actionTitle}>The Library</h3>
              <p style={styles.actionDesc}>
                Filter movies & TV series by genre, search titles, and launch VLC in 1-click.
              </p>
            </div>
          </div>
        </div>

        {/* Recently Added Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Recently Added to Collection</h2>
            <button style={styles.viewAllBtn} onClick={() => setActivePage("library")}>
              View All ({items.length}) →
            </button>
          </div>

          <div style={styles.posterGrid}>
            {items.slice(0, 6).map((item) => (
              <PosterCard
                key={item.id}
                item={item}
                onClick={() => onSelectItem(item)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "32px"
  },
  hero: {
    height: "500px",
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    alignItems: "center",
    padding: "0 50px",
    position: "relative"
  },
  heroContent: {
    maxWidth: "650px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    zIndex: 2
  },
  heroBadges: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  heroTitle: {
    fontSize: "3.2rem",
    fontWeight: 800,
    letterSpacing: "-0.5px",
    color: "#ffffff",
    lineHeight: "1.1"
  },
  heroMeta: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "var(--text-secondary)",
    fontSize: "0.95rem",
    fontWeight: 500
  },
  heroOverview: {
    fontSize: "1rem",
    color: "var(--text-secondary)",
    lineHeight: "1.6",
    maxHeight: "80px",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  heroActions: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginTop: "8px"
  },
  heroPlayBtn: {
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "6px",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 6px 20px rgba(229, 9, 20, 0.4)"
  },
  heroBrowseBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    color: "#ffffff",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    padding: "12px 24px",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    backdropFilter: "blur(8px)"
  },
  mainWrapper: {
    maxWidth: "1400px",
    width: "100%",
    margin: "0 auto",
    padding: "0 32px",
    display: "flex",
    flexDirection: "column",
    gap: "40px"
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "24px"
  },
  actionCard: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "12px",
    padding: "28px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    cursor: "pointer",
    transition: "var(--transition)"
  },
  actionIcon: {
    width: "64px",
    height: "64px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  actionTitle: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "4px"
  },
  actionDesc: {
    fontSize: "0.88rem",
    color: "var(--text-secondary)",
    lineHeight: "1.4"
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    fontSize: "1.4rem",
    fontWeight: 800,
    color: "#ffffff"
  },
  viewAllBtn: {
    background: "none",
    border: "none",
    color: "var(--accent-red)",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer"
  },
  posterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "20px"
  }
};
