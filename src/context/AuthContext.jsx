import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db, isFirebaseConfigured } from "../services/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { fetchAllowedUsers, addAllowedUser } from "../services/storage";
import { useToast } from "./ToastContext";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const { addToast } = useToast();

  const checkWhitelist = async (email) => {
    if (!email) return false;
    const cleanEmail = email.toLowerCase().trim();

    try {
      const allowed = await fetchAllowedUsers();
      
      // Bootstrap Rule: If no allowed users exist yet, first user becomes admin
      if (allowed.length === 0) {
        await addAllowedUser(cleanEmail, "Bootstrap Admin");
        addToast(`Welcome! You are the first user and have been granted administrator access.`, "success");
        return true;
      }

      return allowed.some((u) => u.email.toLowerCase() === cleanEmail);
    } catch (err) {
      console.error("Whitelist check failed:", err);
      return false;
    }
  };

  const setUserSession = (userObj) => {
    setCurrentUser(userObj);
    setIsWhitelisted(true);
    localStorage.setItem("filmlibrary_demo_user", JSON.stringify(userObj));
  };

  const clearSession = () => {
    localStorage.removeItem("filmlibrary_demo_user");
    setCurrentUser(null);
    setIsWhitelisted(false);
  };

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check if there's a saved session
      const savedSessionStr = localStorage.getItem("filmlibrary_demo_user");
      if (savedSessionStr) {
        try {
          const savedUser = JSON.parse(savedSessionStr);
          if (savedUser && savedUser.email) {
            setCurrentUser(savedUser);
            setIsWhitelisted(true);
            setLoading(false);
            return;
          }
        } catch (e) {
          clearSession();
        }
      }

      // 2. Sync with Firebase Auth state if configured
      if (isFirebaseConfigured() && auth) {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            const userObj = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email.split("@")[0],
              photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`
            };
            setUserSession(userObj);
          } else {
            // Auto guest fallback for unauthenticated Firebase users
            const defaultUser = {
              uid: "guest_admin",
              email: "admin@filmlibrary.app",
              displayName: "Guest Admin",
              photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=admin@filmlibrary.app"
            };
            setUserSession(defaultUser);
          }
          setLoading(false);
        });
        return unsubscribe;
      } else {
        // 3. Local Mode Auto Guest Fallback (guarantees instant app access)
        const defaultUser = {
          uid: "guest_admin",
          email: "admin@filmlibrary.app",
          displayName: "Guest Admin",
          photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=admin@filmlibrary.app"
        };
        setUserSession(defaultUser);
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Email & Password Sign In
  const loginWithEmailPassword = async (email, password) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !password) {
      addToast("Please enter both email and password.", "error");
      return false;
    }

    // Check whitelist BEFORE allowing login
    const allowed = await checkWhitelist(cleanEmail);
    if (!allowed) {
      addToast("Access denied. Your email is not on the authorized whitelist.", "error");
      return false;
    }

    if (isFirebaseConfigured() && auth) {
      try {
        const result = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const user = result.user;
        const userObj = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || cleanEmail.split("@")[0],
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`
        };
        setUserSession(userObj);
        addToast(`Signed in successfully as ${userObj.displayName}`, "success");
        return true;
      } catch (err) {
        console.warn("Firebase Auth Error:", err.message);
        addToast(`Sign in failed: ${err.message}`, "error");
        return false;
      }
    } else {
      // Local-only mode (no Firebase) — whitelist already checked above
      const localUser = {
        uid: `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`,
        email: cleanEmail,
        displayName: cleanEmail.split("@")[0],
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`
      };
      setUserSession(localUser);
      addToast(`Signed in as ${localUser.displayName}`, "success");
      return true;
    }
  };

  // Email & Password Account Registration
  const registerWithEmailPassword = async (name, email, password) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanName = (name || "").trim() || cleanEmail.split("@")[0];

    if (!cleanEmail || !password) {
      addToast("Please enter both email and password.", "error");
      return false;
    }

    if (password.length < 6) {
      addToast("Password must be at least 6 characters.", "error");
      return false;
    }

    // Check whitelist BEFORE allowing registration
    const allowed = await checkWhitelist(cleanEmail);
    if (!allowed) {
      addToast("Access denied. Your email is not on the authorized whitelist. Contact the administrator.", "error");
      return false;
    }

    if (isFirebaseConfigured() && auth) {
      try {
        const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const user = result.user;
        
        if (cleanName) {
          try {
            await updateProfile(user, { displayName: cleanName });
          } catch (pErr) {}
        }

        const userObj = {
          uid: user.uid,
          email: user.email,
          displayName: cleanName,
          photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`
        };
        setUserSession(userObj);
        addToast(`Account created! Welcome, ${cleanName}!`, "success");
        return true;
      } catch (err) {
        console.warn("Firebase Auth Register Error:", err.message);
        addToast(`Registration failed: ${err.message}`, "error");
        return false;
      }
    } else {
      // Local-only mode — whitelist already checked above
      const localUser = {
        uid: `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`,
        email: cleanEmail,
        displayName: cleanName,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`
      };
      setUserSession(localUser);
      addToast(`Account registered for ${cleanName}!`, "success");
      return true;
    }
  };

  // Update Display Name and Avatar Photo URL
  const updateUserProfile = async (newDisplayName, newPhotoURL) => {
    if (!currentUser) return false;

    const cleanName = (newDisplayName || "").trim() || currentUser.displayName || currentUser.email?.split("@")[0] || "User";
    const cleanPhotoURL = newPhotoURL || currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.email || 'User'}`;

    const updatedUser = {
      ...currentUser,
      displayName: cleanName,
      photoURL: cleanPhotoURL
    };

    setUserSession(updatedUser);

    if (isFirebaseConfigured() && auth && auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, {
          displayName: cleanName,
          photoURL: cleanPhotoURL
        });
      } catch (pErr) {
        console.warn("Firebase Auth updateProfile error:", pErr);
      }
    }

    if (isFirebaseConfigured() && db && currentUser.email) {
      try {
        const userRef = doc(db, "allowed_users", currentUser.email.toLowerCase().trim());
        await setDoc(userRef, {
          displayName: cleanName,
          photoURL: cleanPhotoURL,
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn("Firestore update allowed_users error:", e);
      }
    }

    addToast(`Profile updated! Welcome, ${cleanName}!`, "success");
    return true;
  };

  const logout = async () => {
    if (isFirebaseConfigured() && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (e) {}
    }
    clearSession();
    addToast("Signed out successfully", "info");
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isWhitelisted,
        loginWithEmailPassword,
        registerWithEmailPassword,
        updateUserProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
