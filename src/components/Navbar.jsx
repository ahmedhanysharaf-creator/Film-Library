import React, { useState } from "react";
import { Film, Plus, Shield, Settings, LogOut, User, ChevronDown, MonitorPlay, Download, Wrench, Search, FileText, LayoutGrid, FolderSync, Terminal, Globe } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Navbar = ({ activePage, setActivePage, activeUniverse = "all", onSelectUniverse, onSelectTool, onOpenWhitelist, onOpenSettings, onOpenProfile }) => {
  const { currentUser, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Clean formatted user display name
  const rawName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "User";
  const formattedName = rawName.includes("@") ? rawName.split("@")[0] : rawName;

  // Helper for 100% deterministic tab button styles
  const getTabStyle = (pageName) => {
    const isActive = activePage === pageName;
    return {
      backgroundColor: isActive ? "var(--accent-red)" : "#1c1c1c",
      color: isActive ? "#ffffff" : "#a3a3a3",
      border: isActive ? "1px solid var(--accent-red)" : "1px solid #2a2a2a",
      boxShadow: isActive ? "0 4px 14px rgba(229, 9, 20, 0.4)" : "none",
      fontSize: "0.92rem",
      fontWeight: isActive ? 700 : 600,
      padding: "8px 16px",
      borderRadius: "20px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      outline: "none"
    };
  };

  return (
    <nav style={styles.nav} className="glass-panel navbar-root">
      <div style={styles.container} className="navbar-container">
        {/* Brand Logo */}
        <div style={styles.brand} className="navbar-brand" onClick={() => setActivePage("library")}>
          <div style={styles.logoIcon}>
            <Film size={22} color="#ffffff" />
          </div>
          <span style={styles.title} className="navbar-brand-text">
            FILM<span style={{ color: "var(--accent-red)" }}>LIBRARY</span>
          </span>
        </div>

        {/* Navigation Links */}
        <div style={styles.links} className="navbar-links">

          <button
            style={getTabStyle("library")}
            onClick={() => {
              setActivePage("library");
            }}
          >
            The Library
          </button>

          <button
            style={getTabStyle("tools")}
            onClick={() => {
              onSelectTool ? onSelectTool(null) : setActivePage("tools");
            }}
          >
            <LayoutGrid size={16} color={activePage === "tools" ? "#ffffff" : "#a3a3a3"} />
            Tools Hub Dashboard
          </button>

          <button
            style={getTabStyle("add")}
            className="navbar-add-tab desktop-only"
            onClick={() => {
              setActivePage("add");
            }}
          >
            <Plus size={16} color={activePage === "add" ? "#ffffff" : "#a3a3a3"} />
            Add to Library
          </button>
        </div>

        {/* User Profile & Actions */}
        <div style={styles.profileSection} className="navbar-profile">
          {currentUser ? (
            <div style={styles.dropdownWrapper}>
              <button
                style={styles.profileBtn}
                className="navbar-profile-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <img
                  src={currentUser.photoURL}
                  alt={formattedName}
                  style={styles.avatar}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.email || 'AhmedHany'}`;
                  }}
                />
                <span style={styles.userName} className="navbar-user-name">{formattedName}</span>
                <ChevronDown size={14} color="#a3a3a3" />
              </button>

              {dropdownOpen && (
                <div style={styles.dropdownMenu} className="animate-pop navbar-profile-dropdown">
                  <div style={styles.userHeader}>
                    <div style={styles.userHeaderName}>{formattedName}</div>
                    <div style={styles.userHeaderEmail}>{currentUser.email}</div>
                  </div>
                  <div style={styles.divider} />

                  <button
                    style={styles.menuItem}
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenWhitelist();
                    }}
                  >
                    <Shield size={16} color="var(--accent-red)" />
                    Manage Access (Whitelist)
                  </button>

                  <button
                    style={styles.menuItem}
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenSettings();
                    }}
                  >
                    <Settings size={16} color="#a3a3a3" />
                    Companion Settings
                  </button>

                  <div style={styles.divider} />
                  
                  <button
                    style={styles.menuItem}
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenProfile();
                    }}
                  >
                    <User size={16} color="var(--accent-red)" />
                    Edit Profile & Avatar
                  </button>

                  <div style={styles.divider} />

                  <button
                    style={{ ...styles.menuItem, color: "var(--accent-red)" }}
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button style={styles.loginBtn} onClick={() => setActivePage("login")}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    height: "68px",
    display: "flex",
    alignItems: "center"
  },
  container: {
    width: "100%",
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer"
  },
  logoIcon: {
    width: "36px",
    height: "36px",
    backgroundColor: "var(--accent-red)",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(229, 9, 20, 0.4)"
  },
  title: {
    fontSize: "1.3rem",
    fontWeight: 800,
    letterSpacing: "1px",
    color: "#ffffff"
  },
  links: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  linkBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#a3a3a3",
    fontSize: "0.92rem",
    fontWeight: 600,
    padding: "8px 16px",
    borderRadius: "20px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "var(--transition)"
  },
  linkActive: {
    color: "#ffffff",
    backgroundColor: "var(--accent-red)",
    borderColor: "var(--accent-red)",
    boxShadow: "0 4px 14px rgba(229, 9, 20, 0.4)",
    fontWeight: 700
  },
  profileSection: {
    position: "relative"
  },
  dropdownWrapper: {
    position: "relative"
  },
  profileBtn: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    padding: "6px 14px 6px 6px",
    borderRadius: "20px",
    cursor: "pointer",
    color: "#ffffff",
    fontSize: "0.92rem",
    fontWeight: 700
  },
  avatar: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    objectFit: "cover"
  },
  userName: {
    maxWidth: "140px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  dropdownMenu: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    width: "240px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "12px",
    padding: "8px",
    boxShadow: "var(--shadow-md)"
  },
  userHeader: {
    padding: "8px 12px"
  },
  userHeaderName: {
    fontWeight: 700,
    fontSize: "0.95rem",
    color: "#ffffff"
  },
  userHeaderEmail: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    marginTop: "2px"
  },
  divider: {
    height: "1px",
    backgroundColor: "var(--border-subtle)",
    margin: "6px 0"
  },
  menuItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    background: "none",
    border: "none",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "0.88rem",
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "left",
    transition: "var(--transition)"
  },
  loginBtn: {
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    padding: "8px 18px",
    borderRadius: "6px",
    fontWeight: 600,
    cursor: "pointer"
  },
  vlcRegBtn: {
    backgroundColor: "rgba(70, 211, 105, 0.15)",
    border: "1px solid var(--accent-green)",
    color: "var(--accent-green)",
    fontSize: "0.85rem",
    fontWeight: 700,
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginLeft: "8px"
  },
  toolsDropdownMenu: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    width: "230px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "12px",
    padding: "8px",
    boxShadow: "var(--shadow-md)",
    zIndex: 110
  },
  marvelBadge: {
    backgroundColor: "#e50914",
    color: "#ffffff",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "0.68rem",
    fontWeight: 900,
    letterSpacing: "0.5px",
    lineHeight: 1
  },
  dcBadge: {
    backgroundColor: "#0055ff",
    color: "#ffffff",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "0.68rem",
    fontWeight: 900,
    letterSpacing: "0.5px",
    lineHeight: 1
  }
};
