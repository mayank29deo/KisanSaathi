import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Language → BCP-47 speech recognition locale
 * Chrome on Android has excellent support for these.
 */
const SPEECH_LANG = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
};

const CATEGORY_ICONS = {
  crops: "🌾",
  soil: "🪨",
  weather: "🌦️",
  pests: "🐛",
  schemes: "🏛️",
  market: "📈",
  livestock: "🐄",
  general: "💡",
};

/**
 * Check if SpeechRecognition is available
 */
function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function VoiceAssistant({ t, lang = "en" }) {
  const [listening, setListening]   = useState(false);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState(null);
  const [speaking, setSpeaking]     = useState(false);
  const recognitionRef = useRef(null);
  const supported = !!getSpeechRecognition();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  /* ── Start listening ─────────────────────────────────────────── */
  function startListening() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError(t?.voiceNotSupported || "Voice input not supported on this browser.");
      return;
    }

    setError(null);
    setResult(null);
    setTranscript("");

    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LANG[lang] || "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "no-speech") {
        setError(t?.voiceNoSpeech || "No speech detected. Tap the mic and speak.");
      } else if (event.error !== "aborted") {
        setError(t?.voiceError || "Could not capture voice. Please try again.");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  /* ── Send question to Claude ─────────────────────────────────── */
  async function askAI(question) {
    if (!question || question.trim().length < 2) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/voice-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), lang }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setResult(json.result);
    } catch (err) {
      setError(err.message || "Could not get answer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Read answer aloud ───────────────────────────────────────── */
  function speakAnswer(text) {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG[lang] || "en-IN";
    utterance.rate = 0.9;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend   = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  /* ── Handle flow: stop mic → send to AI ──────────────────────── */
  function handleMicPress() {
    if (listening) {
      stopListening();
      // Wait a beat for final transcript to settle, then auto-submit
      setTimeout(() => {
        setTranscript((t) => {
          if (t && t.trim().length >= 2) askAI(t);
          return t;
        });
      }, 300);
    } else {
      startListening();
    }
  }

  const catIcon = CATEGORY_ICONS[result?.category] || "💡";

  return (
    <div className="space-y-4">
      {/* Main voice card */}
      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-100 p-5 space-y-4">
        {/* Title */}
        <div className="flex items-center gap-2">
          <span className="text-lg">🎙️</span>
          <h3 className="font-bold text-gray-900 text-base">
            {t?.voiceTitle || "Ask Kisan Saathi"}
          </h3>
          <span className="text-xs bg-violet-100 text-violet-600 font-semibold px-2 py-0.5 rounded-full">AI</span>
        </div>

        <p className="text-xs text-gray-500">
          {t?.voiceHint || "Tap the mic, ask in Hindi, Bengali or English — get instant answers."}
        </p>

        {/* Mic button */}
        <div className="flex flex-col items-center gap-3 py-2">
          <motion.button
            onClick={handleMicPress}
            animate={listening ? { scale: [1, 1.1, 1] } : { scale: 1 }}
            transition={listening ? { repeat: Infinity, duration: 1.2 } : {}}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors ${
              listening
                ? "bg-red-500 text-white shadow-red-200"
                : "bg-white text-violet-600 border-2 border-violet-200 shadow-violet-100 active:scale-90"
            }`}
            disabled={loading || !supported}
          >
            {listening ? (
              <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                <path d="M19 11a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V22h2v-2.06A9 9 0 0 0 21 11h-2z"/>
              </svg>
            )}
          </motion.button>

          <p className="text-xs text-gray-500 font-medium">
            {listening
              ? (t?.voiceListening || "Listening… tap to stop")
              : loading
              ? (t?.voiceThinking || "Thinking…")
              : (t?.voiceTap || "Tap to speak")}
          </p>
        </div>

        {/* Live transcript */}
        <AnimatePresence>
          {transcript && (
            <motion.div
              key="transcript"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-xl border border-gray-100 p-3"
            >
              <p className="text-xs text-gray-400 mb-1 font-medium">
                {t?.voiceYouSaid || "You said:"}
              </p>
              <p className="text-sm text-gray-800 leading-relaxed">
                {transcript}
                {listening && <span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse ml-0.5 rounded-sm" />}
              </p>

              {/* Re-ask / edit buttons */}
              {!listening && !loading && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => askAI(transcript)}
                    className="text-xs bg-violet-600 text-white font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                  >
                    {t?.voiceAskAgain || "Ask AI →"}
                  </button>
                  <button
                    onClick={() => { setTranscript(""); setResult(null); }}
                    className="text-xs bg-gray-100 text-gray-600 font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                  >
                    {t?.voiceClear || "Clear"}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-violet-600 font-medium">{t?.voiceThinking || "Thinking…"}</span>
          </div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Not supported fallback */}
        {!supported && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            {t?.voiceNotSupported || "Voice input not supported on this browser. Please use Google Chrome."}
          </div>
        )}
      </div>

      {/* ── AI Answer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <motion.div
            key="answer"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Answer card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{catIcon}</span>
                  <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">
                    {t?.voiceAnswer || "Kisan Saathi says"}
                  </p>
                </div>

                {/* Read aloud button */}
                <button
                  onClick={() => speaking ? stopSpeaking() : speakAnswer(result.answer)}
                  className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                    speaking
                      ? "bg-red-100 text-red-600"
                      : "bg-violet-100 text-violet-600"
                  }`}
                >
                  {speaking ? "⏹ Stop" : "🔊 " + (t?.voiceReadAloud || "Listen")}
                </button>
              </div>

              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {result.answer}
              </div>
            </div>

            {/* Action step */}
            {result.actionStep && (
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
                <span className="text-lg flex-shrink-0">✅</span>
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-0.5">
                    {t?.voiceNextStep || "Do this today"}
                  </p>
                  <p className="text-sm text-emerald-800">{result.actionStep}</p>
                </div>
              </div>
            )}

            {/* Related topics */}
            {result.relatedTopics?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                  {t?.voiceRelated || "Ask about"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.relatedTopics.map((topic, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setTranscript(topic);
                        askAI(topic);
                      }}
                      className="text-xs bg-gray-50 border border-gray-200 text-gray-700 font-medium px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-violet-50 hover:border-violet-200"
                    >
                      {topic} →
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
