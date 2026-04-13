import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthScreen({ onAuth, t }) {
  const [mode, setMode] = useState("register"); // "register" | "login"
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lang, setLang] = useState("en");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError(t.authErrorPhone || "Enter a valid 10-digit phone number.");
      return;
    }

    if (mode === "register" && name.trim().length < 2) {
      setError(t.authErrorName || "Enter your name (at least 2 characters).");
      return;
    }

    setLoading(true);
    // Simulate async (keeps UX consistent if we wire real OTP later)
    setTimeout(() => {
      const result = onAuth(mode, { name, phone: cleanPhone, lang });
      setLoading(false);
      if (!result.ok) {
        if (result.error === "phone_exists") {
          setError(t.authErrorExists || "Phone already registered. Please login instead.");
        } else if (result.error === "not_found") {
          setError(t.authErrorNotFound || "Phone not found. Please register first.");
        } else {
          setError(t.authErrorGeneric || "Something went wrong. Please try again.");
        }
      }
    }, 400);
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500">
      {/* Top hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-white text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-7xl mb-4"
        >
          🌾
        </motion.div>
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-3xl font-extrabold tracking-tight"
        >
          {t.app || "Kisan Saathi"}
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-emerald-100 mt-2 text-sm max-w-xs"
        >
          {t.authTagline || "Your smart farming companion — weather, market prices, crop advice & more."}
        </motion.p>
      </div>

      {/* Card */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 22, delay: 0.1 }}
        className="bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl"
      >
        {/* Mode toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          {["register", "login"].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === m
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {m === "register"
                ? t.register || "Register"
                : t.login || "Login"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === "register" && (
              <motion.div
                key="name-field"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.authNameLabel || "Your Name"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.namePlaceholder || "Enter your name"}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
                  autoComplete="name"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.authPhoneLabel || "Mobile Number"}
            </label>
            <div className="flex gap-2">
              <div className="flex items-center px-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 font-medium">
                +91
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98765 43210"
                maxLength={10}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
                autoComplete="tel"
                inputMode="numeric"
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {mode === "register" && (
              <motion.div
                key="lang-field"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.authLangLabel || "Preferred Language"}
                </label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                  <option value="bn">বাংলা</option>
                </select>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-md active:scale-95 transition-transform disabled:opacity-60 text-sm"
          >
            {loading
              ? (t.authLoading || "Please wait…")
              : mode === "register"
              ? (t.authCTA || "Get Started →")
              : (t.login || "Login")}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5 leading-relaxed">
          {t.authDisclaimer || "Your data stays on your device. No account password needed — your phone number is your identity."}
        </p>
      </motion.div>
    </div>
  );
}
