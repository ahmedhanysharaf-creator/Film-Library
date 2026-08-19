import React, { useState, useEffect, useRef } from "react";
import { X, Shield, Plus, Trash2, Mail, UserCheck } from "lucide-react";
import { fetchAllowedUsers, addAllowedUser, removeAllowedUser } from "../services/storage";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const WhitelistModal = ({ onClose }) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const backdropMouseDownRef = useRef(false);

  const [allowedUsers, setAllowedUsers] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    const users = await fetchAllowedUsers();
    setAllowedUsers(users);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes("@")) {
      addToast("Please enter a valid email address.", "error");
      return;
    }
    try {
      await addAllowedUser(newEmail, currentUser?.displayName || currentUser?.email || "Admin");
      addToast(`Added ${newEmail} to authorized whitelist!`, "success");
      setNewEmail("");
      loadUsers();
    } catch (err) {
      addToast(`Failed to add user: ${err.message}`, "error");
    }
  };

  const handleRemove = async (email) => {
    try {
      await removeAllowedUser(email);
      addToast(`Removed ${email} from whitelist.`, "info");
      loadUsers();
    } catch (err) {
      addToast(`Failed to remove user: ${err.message}`, "error");
    }
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
            <Shield size={22} color="var(--accent-red)" />
            <h3 style={styles.title}>Manage Access Whitelist (`allowed_users`)</h3>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p style={styles.subtitle}>
          Only Google accounts listed below are allowed to access this Film Library instance.
        </p>

        {/* Add User Form */}
        <form onSubmit={handleAdd} style={styles.addForm}>
          <div style={styles.inputGroup}>
            <Mail size={18} color="var(--text-muted)" style={styles.inputIcon} />
            <input
              type="email"
              placeholder="Enter Google Email (e.g. user@gmail.com)..."
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={styles.input}
            />
          </div>
          <button type="submit" style={styles.addBtn}>
            <Plus size={16} /> Add Email
          </button>
        </form>

        {/* Allowed Users List */}
        <div style={styles.usersList}>
          {loading ? (
            <div style={styles.loadingText}>Loading whitelist...</div>
          ) : allowedUsers.length === 0 ? (
            <div style={styles.loadingText}>No authorized users found.</div>
          ) : (
            allowedUsers.map((user) => (
              <div key={user.email} style={styles.userRow}>
                <div style={styles.userInfo}>
                  <UserCheck size={18} color="var(--accent-green)" />
                  <div>
                    <div style={styles.userEmail}>{user.email}</div>
                    <div style={styles.userMeta}>
                      Added by: {user.added_by || "System"}
                    </div>
                  </div>
                </div>

                <button
                  style={styles.deleteBtn}
                  onClick={() => handleRemove(user.email)}
                  title="Remove User"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
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
    backgroundColor: "rgba(0,0,0,0.85)",
    zIndex: 250,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },
  modal: {
    width: "100%",
    maxWidth: "540px",
    borderRadius: "14px",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    boxShadow: "var(--shadow-lg)"
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
  subtitle: {
    fontSize: "0.88rem",
    color: "var(--text-secondary)",
    lineHeight: "1.4"
  },
  addForm: {
    display: "flex",
    gap: "10px"
  },
  inputGroup: {
    flex: 1,
    position: "relative",
    display: "flex",
    alignItems: "center"
  },
  inputIcon: {
    position: "absolute",
    left: "12px",
    pointerEvents: "none"
  },
  input: {
    width: "100%",
    padding: "10px 14px 10px 38px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "0.9rem",
    outline: "none"
  },
  addBtn: {
    padding: "10px 16px",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.88rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  usersList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "240px",
    overflowY: "auto"
  },
  loadingText: {
    textAlign: "center",
    padding: "20px",
    color: "var(--text-muted)"
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    backgroundColor: "var(--bg-elevated)",
    borderRadius: "8px",
    border: "1px solid var(--border-subtle)"
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  userEmail: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#ffffff"
  },
  userMeta: {
    fontSize: "0.75rem",
    color: "var(--text-muted)"
  },
  deleteBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "4px"
  }
};
