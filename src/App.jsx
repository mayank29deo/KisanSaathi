import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import STRINGS from "./i18n/strings";
import { useAuth } from "./hooks/useAuth";

// Screens
import Home from "./screens/Home";
import Mandi from "./screens/Mandi";
import Finance from "./screens/Finance";
import Advisory from "./screens/Advisory";
import Detector from "./screens/Detector";
import Health from "./screens/Health";
import Sell from "./screens/Sell";
import AuthScreen from "./screens/AuthScreen";

// Components
import TabButton from "./components/TabButton";

const LANG_KEY = "ks_lang";

export default function App() {
  const { user, register, login, signInWithGoogle, updateUser, logout } = useAuth();

  // Persist language: prefer user profile lang, else localStorage, else "en"
  const [lang, setLang] = useState(() => {
    if (user?.lang) return user.lang;
    return localStorage.getItem(LANG_KEY) || "en";
  });

  const [tab, setTab] = useState("home");
  const [showProfile, setShowProfile] = useState(false);

  // Keep lang in sync when user logs in/out
  useEffect(() => {
    if (user?.lang && user.lang !== lang) {
      setLang(user.lang);
    }
  }, [user]);

  // Persist language choice
  function handleLangChange(newLang) {
    setLang(newLang);
    localStorage.setItem(LANG_KEY, newLang);
    if (user) updateUser({ lang: newLang });
  }

  const t = { ...(STRINGS[lang] || STRINGS.en), _lang: lang };

  // Auth gate
  if (!user) {
    return (
      <AuthScreen
        t={t}
        onAuth={(mode, data) => {
          if (mode === "register") return register(data);
          return login(data.phone);
        }}
        onGoogleSignIn={signInWithGoogle}
      />
    );
  }

  // Avatar initials from user name
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white shadow-sm">
        <div className="text-xl font-bold text-emerald-700">
          🌾 {t.app}
        </div>

        <div className="flex gap-2 items-center">
          {/* Language Selector */}
          <select
            value={lang}
            onChange={(e) => handleLangChange(e.target.value)}
            className="border rounded-lg px-2 py-1 text-sm bg-white text-gray-700"
          >
            <option value="en">EN</option>
            <option value="hi">हि</option>
            <option value="bn">বা</option>
          </select>

          {/* User Avatar */}
          <button
            onClick={() => setShowProfile(true)}
            className="w-9 h-9 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center shadow-sm active:scale-95 transition-transform overflow-hidden"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              initials
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">
          {tab === "home" && <Home t={t} setTab={setTab} user={user} />}
          {tab === "mandi" && <Mandi t={t} />}
          {tab === "finance" && <Finance t={t} />}
          {tab === "advisory" && <Advisory t={t} />}
          {tab === "detect" && <Detector t={t} />}
          {tab === "health" && <Health t={t} />}
          {tab === "sell" && <Sell t={t} />}
        </AnimatePresence>
      </div>

      {/* Bottom Tabs */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t p-2 grid grid-cols-7">
        <TabButton active={tab === "home"}     label={t.home}     onClick={() => setTab("home")}     icon="🏠" />
        <TabButton active={tab === "mandi"}    label={t.mandi}    onClick={() => setTab("mandi")}    icon="🧾" />
        <TabButton active={tab === "finance"}  label={t.finance}  onClick={() => setTab("finance")}  icon="🏦" />
        <TabButton active={tab === "advisory"} label={t.advisory} onClick={() => setTab("advisory")} icon="🧑‍🌾" />
        <TabButton active={tab === "detect"}   label={t.detect}   onClick={() => setTab("detect")}   icon="📷" />
        <TabButton active={tab === "health"}   label={t.health}   onClick={() => setTab("health")}   icon="🏥" />
        <TabButton active={tab === "sell"}     label={t.sell}     onClick={() => setTab("sell")}     icon="🛒" />
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <ProfileModal
            user={user}
            t={t}
            lang={lang}
            onLangChange={handleLangChange}
            onUpdate={updateUser}
            onLogout={() => { logout(); setShowProfile(false); }}
            onClose={() => setShowProfile(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileModal({ user, t, lang, onLangChange, onUpdate, onLogout, onClose }) {
  const [name, setName] = useState(user.name);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (name.trim().length < 2) return;
    onUpdate({ name: name.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const joinDate = user.registeredAt
    ? new Date(user.registeredAt).toLocaleDateString("en-IN", { year: "numeric", month: "long" })
    : "";

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40"
      />

      {/* Sheet */}
      <motion.div
        key="sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="fixed bottom-0 inset-x-0 bg-white rounded-t-3xl z-50 px-6 pt-6 pb-10 shadow-2xl"
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-600 text-white text-2xl font-bold flex items-center justify-center shadow">
            {user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-gray-900 text-lg">{user.name}</div>
            <div className="text-sm text-gray-400">+91 {user.phone}</div>
            {joinDate && (
              <div className="text-xs text-gray-400 mt-0.5">
                {t.memberSince || "Member since"} {joinDate}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Edit name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.authNameLabel || "Your Name"}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
              />
              <button
                onClick={handleSave}
                className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl active:scale-95 transition-transform"
              >
                {saved ? "✓" : t.editProfile || "Save"}
              </button>
            </div>
            {saved && (
              <p className="text-xs text-emerald-600 mt-1">{t.profileSaved || "Profile saved!"}</p>
            )}
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.authLangLabel || "Preferred Language"}
            </label>
            <select
              value={lang}
              onChange={(e) => onLangChange(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="bn">বাংলা</option>
            </select>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full border border-red-200 text-red-500 font-semibold py-3 rounded-xl text-sm active:scale-95 transition-transform mt-2"
          >
            {t.logoutLabel || "Logout"}
          </button>
        </div>
      </motion.div>
    </>
  );
}
