import React, { useState } from "react";
import { Film, ShieldCheck, Mail, Lock, User, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Login = ({ onLoginSuccess }) => {
  const { loginWithEmailPassword, registerWithEmailPassword } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let success = false;
    if (isRegisterMode) {
      success = await registerWithEmailPassword(name, email, password);
    } else {
      success = await loginWithEmailPassword(email, password);
    }

    setLoading(false);
    if (success && onLoginSuccess) {
      onLoginSuccess();
    }
  };

  return (
    <div style={styles.container}>
      {/* Dark Backdrop Background */}
      <div style={styles.bgOverlay} />

      <div style={styles.card} className="glass-modal animate-pop">
        {/* Brand Header */}
        <div style={styles.header}>
          <div style={styles.logoBadge}>
            <Film size={28} color="#ffffff" />
          </div>
          <h1 style={styles.title}>
            FILM<span style={{ color: "var(--accent-red)" }}>LIBRARY</span>
          </h1>
          <p style={styles.subtitle}>Your personal cinema, organized.</p>
        </div>

        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="login-tabs-wrapper">
          <button
            type="button"
            className={`login-tab-btn ${!isRegisterMode ? "active" : "inactive"}`}
            onClick={() => setIsRegisterMode(false)}
          >
            <LogIn size={16} /> Sign In
          </button>
          <button
            type="button"
            className={`login-tab-btn ${isRegisterMode ? "active" : "inactive"}`}
            onClick={() => setIsRegisterMode(true)}
          >
            <UserPlus size={16} /> Create Account
          </button>
        </div>

        {/* Sign In / Register Form */}
        <form onSubmit={handleSubmit} style={styles.form} autoComplete="off">
          {isRegisterMode && (
            <div style={styles.inputGroup}>
              <User size={18} color="var(--text-muted)" style={styles.inputIcon} />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isRegisterMode}
                autoComplete="off"
                style={styles.input}
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <Mail size={18} color="var(--text-muted)" style={styles.inputIcon} />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <Lock size={18} color="var(--text-muted)" style={styles.inputIcon} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={styles.input}
            />
            <button
              type="button"
              style={styles.togglePasswordBtn}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? (
              "Processing..."
            ) : isRegisterMode ? (
              <>
                <UserPlus size={18} /> Register & Access Library
              </>
            ) : (
              <>
                <LogIn size={18} /> Sign In
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div style={styles.securityNotice}>
          <ShieldCheck size={18} color="var(--accent-green)" />
          <span>Cross-Device Cloud Access • Guarded by Whitelist</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    position: "relative",
    backgroundColor: "var(--bg-main)"
  },
  bgOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: "radial-gradient(circle at 50% 30%, rgba(229, 9, 20, 0.15), transparent 70%), url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&auto=format&fit=crop&q=80')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    opacity: 0.35
  },
  card: {
    width: "100%",
    maxWidth: "440px",
    borderRadius: "16px",
    padding: "36px 32px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    position: "relative",
    zIndex: 10,
    boxShadow: "0 20px 50px rgba(0,0,0,0.9)",
    border: "1px solid var(--border-subtle)",
    textAlign: "center"
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px"
  },
  logoBadge: {
    width: "52px",
    height: "52px",
    backgroundColor: "var(--accent-red)",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 24px rgba(229, 9, 20, 0.5)",
    marginBottom: "4px"
  },
  title: {
    fontSize: "1.7rem",
    fontWeight: 800,
    letterSpacing: "1px",
    color: "#ffffff"
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)"
  },
  tabs: {
    display: "flex",
    backgroundColor: "var(--bg-elevated)",
    borderRadius: "8px",
    padding: "4px",
    border: "1px solid var(--border-subtle)"
  },
  tabBtn: {
    flex: 1,
    padding: "10px",
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    fontWeight: 600,
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "var(--transition)"
  },
  tabActive: {
    backgroundColor: "var(--bg-surface)",
    color: "#ffffff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  },
  inputGroup: {
    position: "relative",
    display: "flex",
    alignItems: "center"
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    pointerEvents: "none"
  },
  input: {
    width: "100%",
    padding: "12px 42px 12px 44px",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "0.95rem",
    outline: "none"
  },
  togglePasswordBtn: {
    position: "absolute",
    right: "12px",
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center"
  },
  submitBtn: {
    width: "100%",
    padding: "14px 20px",
    backgroundColor: "var(--accent-red)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    boxShadow: "0 6px 20px rgba(229, 9, 20, 0.4)",
    marginTop: "4px"
  },

  securityNotice: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    paddingTop: "4px"
  }
};
