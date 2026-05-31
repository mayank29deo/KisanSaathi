import { useState, useEffect, useCallback } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, isConfigured } from "../config/firebase";

const STORAGE_KEY = "ks_users";
const SESSION_KEY = "ks_session";

// Fire-and-forget POST to /api/signup so backend can record + notify (Sheets/email).
// Does NOT block UX or affect auth result.
function notifyBackendSignup(profile, providerOverride) {
  try {
    const id = profile.provider === "google"
      ? `google_${profile.email || profile.phone || Date.now()}`
      : profile.phone;

    fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: profile.name,
        phone: profile.phone || null,
        email: profile.email || null,
        provider: providerOverride || profile.provider || "phone",
        photoURL: profile.photoURL || null,
        lang: profile.lang || "en",
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

// Build a local user profile from a Supabase user row (used during
// cross-device login restore).
function profileFromBackend(u) {
  return {
    name: u.name || "User",
    phone: u.phone || u.id || "",
    email: u.email || "",
    lang: u.lang || "en",
    provider: u.provider || "phone",
    photoURL: u.photo_url || null,
    savedCrops: [],
    savedLocation: null,
    registeredAt: u.created_at || new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };
}

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

  // Single source of truth for backend signup notification.
  // Runs whenever `user` changes (register, login, Google sign-in, restored session).
  // Per-user flag in localStorage ensures exactly-once per user per device —
  // prevents the duplicate-email bug where explicit calls + useEffect both fired.
  useEffect(() => {
    if (!user) return;
    const uid = user.phone || user.email || "anon";
    const flagKey = `ks_synced_${uid}`;
    if (localStorage.getItem(flagKey)) return;
    notifyBackendSignup(user, user.provider || "phone");
    localStorage.setItem(flagKey, "1");
  }, [user]);

  // Register a new user by phone. Async so we can also check the backend
  // for cross-device duplicates (user signed up on another device already).
  const register = useCallback(async ({ name, phone, lang }) => {
    const users = getUsers();
    if (users[phone]) return { ok: false, error: "phone_exists" };

    // Cross-device dup check via backend
    try {
      const r = await fetch(`/api/check-user?phone=${encodeURIComponent(phone)}`);
      const data = await r.json();
      if (data?.user) {
        // Phone already registered on another device — auto-restore profile and log in
        const restored = profileFromBackend(data.user);
        users[phone] = restored;
        saveUsers(users);
        persistSession(restored);
        setUser(restored);
        return { ok: true, restored: true };
      }
    } catch {}

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

  // Login existing user by phone. Async so we can fall back to the backend
  // when the user signed up on a different device.
  const login = useCallback(async (phone) => {
    const users = getUsers();
    let profile = users[phone];

    if (!profile) {
      // Fast path failed — try backend
      try {
        const r = await fetch(`/api/check-user?phone=${encodeURIComponent(phone)}`);
        const data = await r.json();
        if (data?.user) {
          profile = profileFromBackend(data.user);
          users[phone] = profile;
        }
      } catch {}
    }

    if (!profile) return { ok: false, error: "not_found" };

    profile.lastLogin = new Date().toISOString();
    users[phone] = profile;
    saveUsers(users);
    persistSession(profile);
    setUser(profile);
    return { ok: true };
  }, []);

  // Google Sign-In via Firebase popup
  const signInWithGoogle = useCallback(async () => {
    if (!isConfigured || !auth) {
      return { ok: false, error: "Firebase not configured" };
    }
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
      // notifyBackendSignup fires from useEffect — don't double-call here
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
