import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { firebaseAuth } from "../services/firebase";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};

    const initAuth = async () => {
      try {
        await setPersistence(firebaseAuth, browserLocalPersistence);
      } catch (error) {
        console.error("Failed to set auth persistence", error);
      }

      unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (!isMounted) {
          return;
        }

        setAuthUser(user || null);

        if (!user) {
          setProfile(null);
          localStorage.removeItem("idToken");
          setLoading(false);
          return;
        }

        try {
          const token = await user.getIdToken();
          if (!isMounted) {
            return;
          }

          localStorage.setItem("idToken", token);
          const response = await authApi.me();

          if (!isMounted) {
            return;
          }

          setProfile(response.data.user);
        } catch (error) {
          console.error("Failed to load user profile", error);
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      });
    };

    initAuth();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = async ({ email, password }) => {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
  };

  const logout = async () => {
    await signOut(firebaseAuth);
    setProfile(null);
  };

  const register = async ({ name, email, password, role, linkedDeviceId }) => {
    await authApi.signup({ name, email, password, role, linkedDeviceId });
    await login({ email, password });
  };

  const value = useMemo(
    () => ({
      authUser,
      profile,
      loading,
      login,
      logout,
      register,
      refreshProfile: async () => {
        const response = await authApi.me();
        setProfile(response.data.user);
      },
    }),
    [authUser, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
