import React, { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import STRINGS from "./i18n/strings";

// Screens
import Home from "./screens/Home";
import Mandi from "./screens/Mandi";
import Finance from "./screens/Finance";
import Advisory from "./screens/Advisory";
import Detector from "./screens/Detector";
import Health from "./screens/Health";
import Sell from "./screens/Sell";
import Auth from "./screens/Auth";

// Components
import TabButton from "./components/TabButton";

const TABS = ["home", "mandi", "finance", "advisory", "detect", "health", "sell", "account"];

export default function App() {
  const [tab, setTab] = useState("home");
  const [lang, setLang] = useState("en");
  const [farmerName, setFarmerName] = useState(null);

  const t = STRINGS[lang];

  // 🔹 Load saved language on app start
  useEffect(() => {
    const savedLang = localStorage.getItem("lang");
    if (savedLang && STRINGS[savedLang]) {
      setLang(savedLang);
    }
  }, []);

  // 🔹 Save language whenever it changes
  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  function onLogin(name) {
    setFarmerName(name);
    setTab("home");
  }

  function logout() {
    setFarmerName(null);
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="text-xl font-bold">
          🌾 {t.app} {farmerName && <span className="text-sm">— {farmerName}</span>}
        </div>

        <div className="flex gap-2 items-center">
          {/* 🌐 Language Selector */}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-white"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="bn">বাংলা</option>
          </select>

          {farmerName ? (
            <button onClick={logout} className="text-sm underline">
              {t.logout || "Logout"}
            </button>
          ) : (
            <button onClick={() => setTab("account")} className="text-sm underline">
              {t.signIn || "Sign In"}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">
          {tab === "home" && <Home t={t} setTab={setTab} />}
          {tab === "mandi" && <Mandi t={t} />}
          {tab === "finance" && <Finance t={t} />}
          {tab === "advisory" && <Advisory t={t} />}
          {tab === "detect" && <Detector t={t} />}
          {tab === "health" && <Health t={t} />}
          {tab === "sell" && <Sell t={t} />}
          {tab === "account" && <Auth t={t} onLogin={onLogin} />}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t p-2 grid grid-cols-7">
        <TabButton active={tab === "home"} label={t.home} onClick={() => setTab("home")} icon="🏠" />
        <TabButton active={tab === "mandi"} label={t.mandi} onClick={() => setTab("mandi")} icon="🧾" />
        <TabButton active={tab === "finance"} label={t.finance} onClick={() => setTab("finance")} icon="🏦" />
        <TabButton active={tab === "advisory"} label={t.advisory} onClick={() => setTab("advisory")} icon="🧑‍🌾" />
        <TabButton active={tab === "detect"} label={t.detect} onClick={() => setTab("detect")} icon="📷" />
        <TabButton active={tab === "health"} label={t.health} onClick={() => setTab("health")} icon="🏥" />
        <TabButton active={tab === "sell"} label={t.sell} onClick={() => setTab("sell")} icon="🛒" />
      </div>
    </div>
  );
}
