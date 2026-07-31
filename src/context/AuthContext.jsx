import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, googleProvider, isFirebaseConfigured } from "../services/firebase";
import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
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
        await addAllowedUser(email, "Bootstrap Admin");
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
      // Handle page return after signInWithRedirect
      getRedirectResult(auth)
        .then(async (result) => {
          if (result && result.user) {
            const user = result.user;
            const allowed = await checkWhitelist(user);
            if (allowed) {
              setCurrentUser({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split("@")[0],
                photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`
              });
              setIsWhitelisted(true);
              addToast(`Welcome, ${user.displayName || 'User'}!`, "success");
            }
          }
        })
        .catch((err) => {
          console.error("Redirect auth error:", err);
          const msg = `Firebase Auth Error: ${err.message}`;
          addToast(msg, "error", 10000);
        });

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
            addToast("Access Denied — You are not authorized to use this app.", "error");
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

  const loginWithGoogle = async () => {
    if (isFirebaseConfigured() && auth && googleProvider) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const allowed = await checkWhitelist(user);

        if (!allowed) {
          await firebaseSignOut(auth);
          setCurrentUser(null);
          setIsWhitelisted(false);
          addToast("Access Denied — You are not authorized to use this app.", "error");
          return false;
        }
        addToast(`Welcome back, ${user.displayName || 'User'}!`, "success");
        return true;
      } catch (err) {
        console.error("Google Auth error:", err);
        const errMsg = err.code || err.message || "Unknown error";
        
        let userInstruction = `Firebase Auth Error (${errMsg}): ${err.message}`;
        if (err.code === "auth/unauthorized-domain") {
          userInstruction = "Domain Not Authorized! Go to Firebase Console -> Authentication -> Settings -> Authorized domains and add 'ahmedhanysharaf-creator.github.io'";
        } else if (err.code === "auth/operation-not-allowed") {
          userInstruction = "Google Sign-In Disabled! Go to Firebase Console -> Authentication -> Sign-in method -> Edit Google -> Enable.";
        }
        
        alert(userInstruction);
        addToast(userInstruction, "error", 10000);
        return false;
      }
    } else {
      addToast("Firebase keys not set. Signed in via local mode!", "warning", 5000);
      return loginAsDemoUser("Alice (Demo User)", "alice@filmlibrary.com");
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
        loginWithGoogle,
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
