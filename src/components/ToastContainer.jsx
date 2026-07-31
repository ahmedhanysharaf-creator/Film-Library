import React from "react";
import { useToast } from "../context/ToastContext";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div style={styles.container}>
      {toasts.map((toast) => (
        <div key={toast.id} style={{ ...styles.toast, ...styles[toast.type] }} className="animate-pop">
          <div style={styles.icon}>
            {toast.type === "success" && <CheckCircle2 size={20} color="#46d369" />}
            {toast.type === "error" && <AlertCircle size={20} color="#e50914" />}
            {toast.type === "warning" && <AlertTriangle size={20} color="#f5c518" />}
            {toast.type === "info" && <Info size={20} color="#3b82f6" />}
          </div>
          <span style={styles.message}>{toast.message}</span>
          <button style={styles.closeBtn} onClick={() => removeToast(toast.id)}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

const styles = {
  container: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxWidth: "400px",
    width: "calc(100% - 48px)"
  },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 18px",
    backgroundColor: "#1c1c1c",
    borderRadius: "8px",
    border: "1px solid #2a2a2a",
    boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
    color: "#ffffff",
    fontSize: "0.9rem",
    lineHeight: "1.4"
  },
  success: { borderLeft: "4px solid #46d369" },
  error: { borderLeft: "4px solid #e50914" },
  warning: { borderLeft: "4px solid #f5c518" },
  info: { borderLeft: "4px solid #3b82f6" },
  icon: { display: "flex", alignItems: "center" },
  message: { flex: 1, fontWeight: 500 },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#a3a3a3",
    cursor: "pointer",
    padding: "2px",
    display: "flex",
    alignItems: "center"
  }
};
