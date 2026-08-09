import React, { useState } from "react";
import { ToastProvider, useToast } from "./context/ToastContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { ToastContainer } from "./components/ToastContainer";
import { DetailModal } from "./components/DetailModal";
import { WhitelistModal } from "./components/WhitelistModal";
import { SettingsModal } from "./components/SettingsModal";

import { Home } from "./pages/Home";
import { Library } from "./pages/Library";
import { AddEditMedia } from "./pages/AddEditMedia";
import { ToolsHub } from "./pages/ToolsHub";
import { Login } from "./pages/Login";
import { deleteMediaEntry } from "./services/storage";

const AppContent = () => {
  const { currentUser, isWhitelisted, loading } = useAuth();
  const { addToast } = useToast();

  const [activePage, setActivePage] = useState("home"); // "home" | "library" | "add" | "tools" | "login"
  const [selectedToolId, setSelectedToolId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const [showWhitelist, setShowWhitelist] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loaderLogo}>FILM LIBRARY</div>
        <span style={styles.loaderText}>Initializing dark cinema environment...</span>
      </div>
    );
  }

  if (!currentUser || !isWhitelisted) {
    return <Login onLoginSuccess={() => setActivePage("library")} />;
  }

  const handleEdit = (item) => {
    setSelectedItem(null);
    setEditItem(item);
    setActivePage("add");
  };

  const handleDelete = async (itemId) => {
    try {
      await deleteMediaEntry(itemId);
      addToast("Media entry deleted from library.", "info");
      setSelectedItem(null);
      setActivePage("library");
    } catch (err) {
      addToast(`Failed to delete item: ${err.message}`, "error");
    }
  };

  const handleSelectTool = (toolId = null) => {
    setEditItem(null);
    setSelectedToolId(toolId);
    setActivePage("tools");
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        activePage={activePage}
        setActivePage={(page) => {
          setEditItem(null);
          if (page !== "tools") setSelectedToolId(null);
          setActivePage(page);
        }}
        onSelectTool={handleSelectTool}
        onOpenWhitelist={() => setShowWhitelist(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Screen Router */}
      <main className="main-content">
        {activePage === "home" && (
          <Home
            setActivePage={setActivePage}
            onSelectItem={(item) => setSelectedItem(item)}
          />
        )}

        {activePage === "library" && (
          <Library
            onSelectItem={(item) => setSelectedItem(item)}
            onEditItem={handleEdit}
          />
        )}

        {activePage === "tools" && (
          <ToolsHub key={selectedToolId || "all"} initialToolId={selectedToolId} />
        )}

        {activePage === "add" && (
          <AddEditMedia
            editItem={editItem}
            onSaveSuccess={() => {
              setEditItem(null);
              setActivePage("library");
            }}
            onCancel={() => {
              setEditItem(null);
              setActivePage("library");
            }}
          />
        )}
      </main>

      {/* Cinematic Detail Popup Modal */}
      {selectedItem && (
        <DetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onItemUpdate={(updatedItem) => setSelectedItem(updatedItem)}
        />
      )}

      {/* Whitelist Security Modal */}
      {showWhitelist && (
        <WhitelistModal onClose={() => setShowWhitelist(false)} />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* Bottom-Right Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

const styles = {
  loadingScreen: {
    minHeight: "100vh",
    backgroundColor: "var(--bg-main)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px"
  },
  loaderLogo: {
    fontSize: "2rem",
    fontWeight: 900,
    letterSpacing: "3px",
    color: "var(--accent-red)"
  },
  loaderText: {
    color: "var(--text-secondary)",
    fontSize: "0.95rem"
  }
};
