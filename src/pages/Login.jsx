import React from "react";
import { Film, ShieldCheck, PlayCircle, Users, Tv } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Login = ({ onLoginSuccess }) => {
  const { loginWithGoogle, loginAsDemoUser } = useAuth();

  const handleGoogleSignIn = async () => {
    const success = await loginWithGoogle();
    if (success && onLoginSuccess) {
      onLoginSuccess();
    }
  };

  const handleDemoSignIn = (name, email) => {
    loginAsDemoUser(name, email);
    if (onLoginSuccess) {
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

        {/* Primary Action: Google Auth */}
        <button style={styles.googleBtn} onClick={handleGoogleSignIn}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            style={styles.googleIcon}
          />
          Sign in with Google
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or test instant demo mode</span>
        </div>

        {/* Demo Users Quick Selector */}
        <div style={styles.demoGroup}>
          <button style={styles.demoBtn} onClick={() => handleDemoSignIn("Alice (User 1)", "alice@filmlibrary.com")}>
            <Users size={16} color="var(--accent-green)" />
            Continue as Alice (User 1)
          </button>
          <button style={styles.demoBtn} onClick={() => handleDemoSignIn("Bob (User 2)", "bob@filmlibrary.com")}>
            <Users size={16} color="#3b82f6" />
            Continue as Bob (User 2)
          </button>
        </div>

        {/* Whitelist Guard Note */}
        <div style={styles.securityNotice}>
          <ShieldCheck size={18} color="var(--accent-green)" />
          <span>Private Access Guarded by Firestore Whitelist (`allowed_users`)</span>
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
    padding: "40px 32px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
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
    width: "56px",
    height: "56px",
    backgroundColor: "var(--accent-red)",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 24px rgba(229, 9, 20, 0.5)",
    marginBottom: "8px"
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 800,
    letterSpacing: "1px",
    color: "#ffffff"
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)"
  },
  googleBtn: {
    width: "100%",
    padding: "14px 20px",
    backgroundColor: "#ffffff",
    color: "#000000",
    border: "none",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease"
  },
  googleIcon: {
    width: "20px",
    height: "20px"
  },
  divider: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderBottom: "1px solid var(--border-subtle)",
    lineHeight: "0.1em",
    margin: "8px 0"
  },
  dividerText: {
    backgroundColor: "var(--bg-elevated)",
    padding: "0 12px",
    color: "var(--text-muted)",
    fontSize: "0.78rem",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  demoGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  demoBtn: {
    width: "100%",
    padding: "10px 16px",
    backgroundColor: "var(--bg-elevated)",
    color: "#ffffff",
    border: "1px solid var(--border-subtle)",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.88rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  },
  securityNotice: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    paddingTop: "8px"
  }
};
