import { useState, useCallback } from "react";

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
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
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
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    setUser(profile);
    return { ok: true };
  }, []);

  // Update user profile fields (name, lang, savedLocation, savedCrops…)
  const updateUser = useCallback((fields) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...fields };
      const users = getUsers();
      users[prev.phone] = updated;
      saveUsers(users);
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return { user, register, login, updateUser, logout };
}
