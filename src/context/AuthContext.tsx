import React, { createContext, useEffect, useState } from "react";
import { auth } from "../firebase";
import { signInAnonymously, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: (displayName: string) => Promise<void>;
  userDisplayName: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      // Try to recover display name from local storage if page refresh
      if (currentUser) {
          const storedName = localStorage.getItem('displayName');
          if (storedName) setUserDisplayName(storedName);
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async (displayName: string) => {
    try {
      if (!user) {
        await signInAnonymously(auth);
      }
      // Note: Anonymous users don't persist display names in Auth profile easily without updates
      // We'll manage it locally for this session
      setUserDisplayName(displayName);
      localStorage.setItem('displayName', displayName);
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, userDisplayName }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Hook - exported separately to avoid fast-refresh issues
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

