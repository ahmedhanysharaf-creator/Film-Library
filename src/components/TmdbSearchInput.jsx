import React, { useState, useEffect, useRef } from "react";
import { Search, Film, Tv, Loader2 } from "lucide-react";
import { searchTmdb } from "../services/tmdb";

export const TmdbSearchInput = ({ onSelectMedia, initialQuery = "" }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        const data = await searchTmdb(query);
        setResults(data);
        setLoading(false);
        setOpen(true);
      } else {
        setResults([]);
        setOpen(false);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    setQuery(item.title);
    setOpen(false);
    onSelectMedia(item);
  };

  return (
    <div style={styles.wrapper} ref={dropdownRef}>
      <div style={styles.inputContainer}>
        <Search size={18} color="var(--text-muted)" style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search movie or TV series on TMDB (e.g. Inception, Breaking Bad)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          style={styles.input}
        />
        {loading && <Loader2 size={18} color="var(--accent-red)" className="animate-spin" style={styles.loaderIcon} />}
      </div>

      {open && results.length > 0 && (
        <div style={styles.dropdown} className="animate-pop glass-panel">
          {results.map((item) => (
            <div
              key={`${item.type}_${item.tmdb_id}`}
              style={styles.dropdownItem}
              onClick={() => handleSelect(item)}
            >
              <img
                src={item.poster_url || "https://via.placeholder.com/40x60?text=No+Poster"}
                alt={item.title}
                style={styles.thumb}
              />
              <div style={styles.itemInfo}>
                <div style={styles.itemTitle}>{item.title}</div>
                <div style={styles.itemSub}>
                  <span className={`badge ${item.type === "series" ? "badge-green" : "badge-red"}`} style={{ fontSize: "0.68rem" }}>
                    {item.type === "series" ? "Series" : "Movie"}
                  </span>
                  <span>{item.year || "N/A"}</span>
                  {item.imdb_rating > 0 && <span>★ {item.imdb_rating}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  wrapper: {
    position: "relative",
    width: "100%"
  },
  inputContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center"
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    pointerEvents: "none"
  },
  loaderIcon: {
    position: "absolute",
    right: "14px"
  },
  input: {
    width: "100%",
    padding: "12px 42px 12px 44px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    outline: "none",
    transition: "var(--transition)"
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    maxHeight: "320px",
    overflowY: "auto",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "10px",
    zIndex: 150,
    boxShadow: "var(--shadow-md)"
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 14px",
    cursor: "pointer",
    borderBottom: "1px solid var(--border-subtle)",
    transition: "background-color 0.15s ease"
  },
  thumb: {
    width: "36px",
    height: "54px",
    borderRadius: "4px",
    objectFit: "cover"
  },
  itemInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  itemTitle: {
    fontWeight: 600,
    fontSize: "0.92rem",
    color: "#ffffff"
  },
  itemSub: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.78rem",
    color: "var(--text-muted)"
  }
};
