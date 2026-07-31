/**
 * Custom URI Protocol Launcher for VLC Media Player
 * Scheme: filmlibrary://open?path=...&token=...
 */

export const getSecurityToken = () => {
  return localStorage.getItem("filmlibrary_security_token") || "FILM_LIBRARY_SECRET_2026";
};

export const setSecurityToken = (token) => {
  localStorage.setItem("filmlibrary_security_token", token);
};

export const launchInVlc = (path, title, addToast) => {
  if (!path) {
    if (addToast) addToast("No file path available for this item.", "error");
    return false;
  }

  const token = getSecurityToken();
  const encodedPath = encodeURIComponent(path);
  const encodedToken = encodeURIComponent(token);
  
  const protocolUrl = `filmlibrary://open?path=${encodedPath}&token=${encodedToken}`;

  console.log(`[VLC Launcher] Triggering protocol URL: ${protocolUrl}`);

  if (addToast) {
    addToast(`Opening "${title || 'Media'}" in VLC...`, "info");
  }

  try {
    // Attempt window protocol launch
    window.location.href = protocolUrl;

    // Optional copy fallback helper toast after 1.5s
    setTimeout(() => {
      // In case protocol wasn't registered or failed silently
    }, 1500);

    return true;
  } catch (err) {
    console.error("Failed to launch protocol:", err);
    copyPathToClipboard(path, addToast);
    return false;
  }
};

export const copyPathToClipboard = (path, addToast) => {
  if (!path) return;
  navigator.clipboard.writeText(path).then(
    () => {
      if (addToast) addToast("File path copied to clipboard!", "success");
    },
    (err) => {
      console.error("Clipboard copy error:", err);
      if (addToast) addToast("Failed to copy path.", "error");
    }
  );
};
