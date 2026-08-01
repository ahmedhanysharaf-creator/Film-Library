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

  useEffect(() => {
    if (isFirebaseConfigured() && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const allowed = await checkWhitelist(user);
          if (allowed) {
            setCurrentUser({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email.split("@")[0],
              photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`
            });
            setIsWhitelisted(true);
          } else {
            await firebaseSignOut(auth);
            setCurrentUser(null);
            setIsWhitelisted(false);
            addToast("Access Denied — You are not authorized on the whitelist.", "error");
          }
        } else {
          setCurrentUser(null);
          setIsWhitelisted(false);
        }
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // Local Demo Auth check
      const localUserStr = localStorage.getItem("filmlibrary_demo_user");
      if (localUserStr) {
        try {
          const user = JSON.parse(localUserStr);
          setCurrentUser(user);
          setIsWhitelisted(true);
        } catch (e) {}
      }
      setLoading(false);
    }
  }, []);

  // Email & Password Sign In
  const loginWithEmailPassword = async (email, password) => {
    if (!email || !password) {
      addToast("Please enter both email and password.", "error");
      return false;
    }

    if (isFirebaseConfigured() && auth) {
      try {
        const result = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = result.user;
        const allowed = await checkWhitelist(user);

        if (!allowed) {
          await firebaseSignOut(auth);
          setCurrentUser(null);
          setIsWhitelisted(false);
          addToast("Access Denied — Your email is not whitelisted.", "error");
          return false;
        }
        addToast(`Signed in successfully as ${user.displayName || user.email}`, "success");
        return true;
      } catch (err) {
        console.error("Email login error:", err);
        let msg = err.message;
        if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
          msg = "Invalid email or password.";
        }
        addToast(`Sign In Error: ${msg}`, "error");
        return false;
      }
    } else {
      // Local Storage Fallback User Login
      const demoUser = {
        uid: `user_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
        email: email.trim(),
        displayName: email.split("@")[0],
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
      };
      setCurrentUser(demoUser);
      setIsWhitelisted(true);
      localStorage.setItem("filmlibrary_demo_user", JSON.stringify(demoUser));
      addToast(`Signed in as ${demoUser.displayName}`, "success");
      return true;
    }
  };

  // Email & Password Account Registration
  const registerWithEmailPassword = async (name, email, password) => {
    if (!email || !password) {
      addToast("Please enter both email and password.", "error");
      return false;
    }

    if (password.length < 6) {
      addToast("Password must be at least 6 characters.", "error");
      return false;
    }

    if (isFirebaseConfigured() && auth) {
      try {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = result.user;
        
        if (name && name.trim()) {
          await updateProfile(user, { displayName: name.trim() });
        }

        const allowed = await checkWhitelist(user);
        if (!allowed) {
          await firebaseSignOut(auth);
          setCurrentUser(null);
          setIsWhitelisted(false);
          addToast("Access Denied — Account created, but your email is not on the whitelist.", "error");
          return false;
        }

        addToast(`Account created! Welcome ${name || user.email}`, "success");
        return true;
      } catch (err) {
        console.error("Registration error:", err);
        let msg = err.message;
        if (err.code === "auth/email-already-in-use") {
          msg = "An account with this email already exists. Try signing in.";
        }
        addToast(`Registration Error: ${msg}`, "error");
        return false;
      }
    } else {
      return loginWithEmailPassword(email, password);
    }
  };

  const loginAsDemoUser = (name = "Alice", email = "alice@filmlibrary.com") => {
    const demoUser = {
      uid: email.includes("bob") ? "bob_uid" : "demo_user_id",
      email,
      displayName: name,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
    };
    setCurrentUser(demoUser);
    setIsWhitelisted(true);
    localStorage.setItem("filmlibrary_demo_user", JSON.stringify(demoUser));
    addToast(`Signed in as ${name}`, "success");
    return true;
  };

  const logout = async () => {
    if (isFirebaseConfigured() && auth) {
      await firebaseSignOut(auth);
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
