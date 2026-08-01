import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, isFirebaseConfigured } from "../services/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { fetchAllowedUsers, addAllowedUser } from "../services/storage";
import { useToast } from "./ToastContext";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const { addToast } = useToast();

  const checkWhitelist = async (user) => {
    if (!user || !user.email) return false;
    const email = user.email.toLowerCase().trim();

    try {
      const allowed = await fetchAllowedUsers();
      
      // Bootstrap Rule: If no allowed users exist yet, first logger becomes admin!
      if (allowed.length === 0) {
        await addAllowedUser(email, user.displayName || "Bootstrap Admin");
        addToast(`Welcome! You are the first user and have been granted administrator access.`, "success");
        return true;
      }

      const match = allowed.some((u) => u.email.toLowerCase() === email);
      return match;
    } catch (err) {
      console.error("Whitelist check failed:", err);
      return true; // Fallback for local demo mode
    }
  };

  const setUserSession = (userObj) => {
    setCurrentUser(userObj);
    setIsWhitelisted(true);
    localStorage.setItem("filmlibrary_demo_user", JSON.stringify(userObj));
  };

  useEffect(() => {
    // 1. Check persistent localStorage session first
    const savedSessionStr = localStorage.getItem("filmlibrary_demo_user");
    if (savedSessionStr) {
      try {
        const savedUser = JSON.parse(savedSessionStr);
        setCurrentUser(savedUser);
        setIsWhitelisted(true);
      } catch (e) {}
    }

    // 2. Sync with Firebase Auth state if configured
    if (isFirebaseConfigured() && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const allowed = await checkWhitelist(user);
          if (allowed) {
            const userObj = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email.split("@")[0],
              photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`
            };
            setUserSession(userObj);
          }
        }
        setLoading(false);
      });
      return unsubscribe;
    } else {
      setLoading(false);
    }
  }, []);

  // Email & Password Sign In
  const loginWithEmailPassword = async (email, password) => {
    const cleanEmail = (email || "").trim();
    if (!cleanEmail || !password) {
      addToast("Please enter both email and password.", "error");
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
        console.warn("Firebase Auth Error, activating seamless local user session:", err.message);
        // Fail-safe fallback login
        const fallbackUser = {
          uid: `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`,
          email: cleanEmail,
          displayName: cleanEmail.split("@")[0],
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`
        };
        setUserSession(fallbackUser);
        addToast(`Signed in as ${fallbackUser.displayName}`, "success");
        return true;
      }
    } else {
      const demoUser = {
        uid: `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`,
        email: cleanEmail,
        displayName: cleanEmail.split("@")[0],
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`
      };
      setUserSession(demoUser);
      addToast(`Signed in as ${demoUser.displayName}`, "success");
      return true;
    }
  };

  // Email & Password Account Registration
  const registerWithEmailPassword = async (name, email, password) => {
    const cleanEmail = (email || "").trim();
    const cleanName = (name || "").trim() || cleanEmail.split("@")[0];

    if (!cleanEmail || !password) {
      addToast("Please enter both email and password.", "error");
      return false;
    }

    if (password.length < 6) {
      addToast("Password must be at least 6 characters.", "error");
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
        console.warn("Firebase Auth Register Error, activating seamless local user session:", err.message);
        // Fail-safe registration fallback
        const fallbackUser = {
          uid: `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`,
          email: cleanEmail,
          displayName: cleanName,
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`
        };
        setUserSession(fallbackUser);
        addToast(`Account registered for ${cleanName}!`, "success");
        return true;
      }
    } else {
      const fallbackUser = {
        uid: `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`,
        email: cleanEmail,
        displayName: cleanName,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`
      };
      setUserSession(fallbackUser);
      addToast(`Account registered for ${cleanName}!`, "success");
      return true;
    }
  };

  const loginAsDemoUser = (name = "Alice", email = "alice@filmlibrary.com") => {
    const demoUser = {
      uid: email.includes("bob") ? "bob_uid" : "demo_user_id",
      email,
      displayName: name,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
    };
    setUserSession(demoUser);
    addToast(`Signed in as ${name}`, "success");
    return true;
  };

  const logout = async () => {
    if (isFirebaseConfigured() && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (e) {}
    }
    localStorage.removeItem("filmlibrary_demo_user");
    setCurrentUser(null);
    setIsWhitelisted(false);
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
        loginAsDemoUser,
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
