"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { auth, onAuthStateChanged } from "@/lib/firebase";

const AuthContext = createContext({
  user: null,
  loading: true,
  isNewAccount: false,
  previousUid: null,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [previousUid, setPreviousUid] = useState(null);
  const prevUidRef = useRef(null);

  useEffect(() => {
    // ── Dev-only preview mock (guarded; never runs in production build) ──
    if (
      process.env.NODE_ENV === "development" &&
      typeof window !== "undefined" &&
      window.localStorage.getItem("cv_preview_user") === "1"
    ) {
      const now = Date.now();
      setUser({
        uid: "preview-user",
        email: "preview@careervibe.app",
        displayName: "Preview User",
        photoURL: null,
        metadata: {
          creationTime: new Date(now - 86400000).toISOString(),
          lastSignInTime: new Date(now).toISOString(),
        },
      });
      setLoading(false);
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Track UID changes for account-switch detection
      const oldUid = prevUidRef.current;
      const newUid = firebaseUser?.uid || null;

      if (oldUid !== null && newUid !== null && oldUid !== newUid) {
        setPreviousUid(oldUid);
      }

      // Detect brand-new accounts (created within the last 10 seconds).
      // The cv_<uid>_seen marker (set by the app after its first clean-slate
      // wipe) prevents re-triggering on reloads: lastSignInTime stays equal to
      // creationTime across refreshes of the first session, which would
      // otherwise wipe the new user's freshly saved data on every reload.
      if (firebaseUser) {
        const created = new Date(firebaseUser.metadata.creationTime).getTime();
        const lastLogin = new Date(firebaseUser.metadata.lastSignInTime).getTime();
        const seen =
          typeof window !== "undefined" &&
          window.localStorage.getItem(`cv_${firebaseUser.uid}_seen`) === "1";
        setIsNewAccount(!seen && Math.abs(lastLogin - created) < 10000);
      } else {
        setIsNewAccount(false);
      }

      prevUidRef.current = newUid;
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isNewAccount, previousUid }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
