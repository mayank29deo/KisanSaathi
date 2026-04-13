import { useState, useCallback } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";

const STORAGE_KEY = "ks_users";
const SESSION_KEY = "ks_session";

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function persistSession(profile) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
}

export function useAuth() {
  const [user, setUser] = useState(() => getSession());

  // Register a new user by phone
  const register = useCallback(({ name, phone, lang }) => {
    const users = getUsers();
    if (users[phone]) {
      return { ok: false, error: "phone_exists" };
    }
    const profile = {
      name: name.trim(),
      phone,
      lang: lang || "en",
      savedCrops: [],
      savedLocation: null,
      registeredAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    users[phone] = profile;
    saveUsers(users);
    persistSession(profile);
    setUser(profile);
    return { ok: true };
  }, []);

  // Login existing user by phone
  const login = useCallback((phone) => {
    const users = getUsers();
    const profile = users[phone];
    if (!profile) {
      return { ok: false, error: "not_found" };
    }
    profile.lastLogin = new Date().toISOString();
    users[phone] = profile;
    saveUsers(users);
    persistSession(profile);
    setUser(profile);
    return { ok: true };
  }, []);

  // Google Sign-In via Firebase popup
  const signInWithGoogle = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const gUser  = result.user;

      // Use Google UID as the key (unique, stable)
      const key = `google_${gUser.uid}`;
      const users = getUsers();

      let profile = users[key];
      if (profile) {
        // Returning user — update last login
        profile.lastLogin = new Date().toISOString();
        profile.photoURL  = gUser.photoURL || profile.photoURL;
      } else {
        // New Google user
        profile = {
          name:         gUser.displayName || "User",
          email:        gUser.email,
          phone:        gUser.phoneNumber || "",
          photoURL:     gUser.photoURL || null,
          provider:     "google",
          lang:         "en",
          savedCrops:   [],
          savedLocation: null,
          registeredAt: new Date().toISOString(),
          lastLogin:    new Date().toISOString(),
        };
      }

      users[key] = profile;
      saveUsers(users);
      persistSession(profile);
      setUser(profile);
      return { ok: true };
    } catch (err) {
      // User closed popup or other Firebase error
      if (err?.code === "auth/popup-closed-by-user") {
        return { ok: false, error: "popup_closed" };
      }
      return { ok: false, error: err?.message || "google_failed" };
    }
  }, []);

  // Update user profile fields
  const updateUser = useCallback((fields) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...fields };
      const users = getUsers();
      // Key is either phone or google UID
      const key = prev.provider === "google" ? `google_${prev.email}` : prev.phone;

      // Find the actual key by matching profile
      const actualKey = Object.keys(users).find((k) => {
        const u = users[k];
        return u.email === prev.email && u.provider === prev.provider
          || u.phone === prev.phone && !prev.provider;
      }) || key;

      users[actualKey] = updated;
      saveUsers(users);
      persistSession(updated);
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return { user, register, login, signInWithGoogle, updateUser, logout };
}
