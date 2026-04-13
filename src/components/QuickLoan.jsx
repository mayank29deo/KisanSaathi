import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DOCS = [
  { id: "pan",      label: "PAN Card",              labelHi: "पैन कार्ड",          labelBn: "প্যান কার্ড",      icon: "🪪" },
  { id: "aadhaar",  label: "Aadhaar Card",           labelHi: "आधार कार्ड",         labelBn: "আধার কার্ড",       icon: "🆔" },
  { id: "passbook", label: "Bank Passbook (front)",   labelHi: "बैंक पासबुक (सामने)", labelBn: "ব্যাংক পাসবুক (সামনে)", icon: "🏦" },
];

const STEPS = ["upload", "processing", "approved"];

// Simulated loan parameters
function calcLoan() {
  const base = 50000 + Math.floor(Math.random() * 250000);
  const limit = Math.round(base / 10000) * 10000;
  const rate = (9.5 + Math.random() * 2.5).toFixed(1);
  return { limit, rate: parseFloat(rate) };
}

function emi(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (r === 0) return Math.round(principal / months);
  return Math.round((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
}

export default function QuickLoan({ t, lang = "en" }) {
  const [docs, setDocs]       = useState({});       // { pan: dataUrl, aadhaar: dataUrl, ... }
  const [step, setStep]       = useState("upload");  // upload | processing | approved
  const [loan, setLoan]       = useState(null);       // { limit, rate }
  const [tenure, setTenure]   = useState(12);
  const [error, setError]     = useState(null);
  const fileRefs = useRef({});

  const allUploaded = DOCS.every((d) => docs[d.id]);

  function handleFile(docId, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(t?.loanFileTooLarge || "File too large. Max 5MB.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setDocs((prev) => ({ ...prev, [docId]: reader.result }));
    reader.readAsDataURL(file);
  }

  function removeDoc(docId) {
    setDocs((prev) => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
  }

  async function submitApplication() {
    if (!allUploaded) return;
    setStep("processing");
    setError(null);

    // Simulated 3-second processing
    await new Promise((r) => setTimeout(r, 3000));

    setLoan(calcLoan());
    setStep("approved");
  }

  function resetFlow() {
    setDocs({});
    setStep("upload");
    setLoan(null);
    setTenure(12);
    setError(null);
  }

  const docLabel = (doc) => lang === "hi" ? doc.labelHi : lang === "bn" ? doc.labelBn : doc.label;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⚡</span>
            <h2 className="text-xl font-extrabold">{t?.loanTitle || "Quick Farm Loan"}</h2>
          </div>
          <p className="text-blue-100 text-sm">
            {t?.loanSubtitle || "Get pre-approved in minutes. Upload 3 documents — no branch visit needed."}
          </p>
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-0 px-2">
        {["Upload Docs", "Verification", "Approved"].map((label, i) => {
          const stepIdx = STEPS.indexOf(step);
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <div key={label} className="flex-1 flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                done ? "bg-emerald-500 text-white" :
                active ? "bg-blue-600 text-white shadow-md" :
                "bg-gray-200 text-gray-500"
              }`}>
                {done ? "✓" : i + 1}
              </div>
              <div className="ml-1.5 mr-2 min-w-0 flex-shrink">
                <p className={`text-xs font-semibold truncate ${active ? "text-blue-700" : "text-gray-500"}`}>
                  {label}
                </p>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 ${done ? "bg-emerald-400" : "bg-gray-200"}`} />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Upload ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {DOCS.map((doc) => (
              <div
                key={doc.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  docs[doc.id] ? "border-emerald-200" : "border-gray-100"
                }`}
              >
                <div className="p-4 flex items-center gap-3">
                  <span className="text-2xl flex-shrink-0">{doc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{docLabel(doc)}</p>
                    {docs[doc.id] ? (
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">Uploaded ✓</p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">{t?.loanUploadHint || "Photo or PDF, max 5MB"}</p>
                    )}
                  </div>

                  {docs[doc.id] ? (
                    <button
                      onClick={() => removeDoc(doc.id)}
                      className="text-xs bg-red-50 text-red-500 font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                    >
                      {t?.loanRemove || "Remove"}
                    </button>
                  ) : (
                    <label className="text-xs bg-blue-50 text-blue-600 font-semibold px-3 py-1.5 rounded-lg cursor-pointer active:scale-95 transition-transform">
                      <input
                        ref={(el) => (fileRefs.current[doc.id] = el)}
                        type="file"
                        accept="image/*,.pdf"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleFile(doc.id, e)}
                      />
                      {t?.loanUpload || "Upload"}
                    </label>
                  )}
                </div>

                {/* Preview */}
                {docs[doc.id] && docs[doc.id].startsWith("data:image") && (
                  <div className="px-4 pb-3">
                    <img
                      src={docs[doc.id]}
                      alt={doc.label}
                      className="w-full h-32 object-cover rounded-xl border border-gray-100"
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Error */}
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={submitApplication}
              disabled={!allUploaded}
              className={`w-full py-4 rounded-2xl text-white font-bold text-sm shadow-md transition-all ${
                allUploaded
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 active:scale-95"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {t?.loanApply || "Apply for Pre-Approval →"}
            </button>

            <p className="text-xs text-gray-400 text-center px-4">
              {t?.loanDisclaimer || "Prototype only — no real money involved. Your documents are processed locally and not stored."}
            </p>
          </motion.div>
        )}

        {/* ── Step 2: Processing ─────────────────────────────── */}
        {step === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 gap-5"
          >
            {/* Animated rings */}
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping opacity-30" />
              <div className="absolute inset-2 border-4 border-blue-300 rounded-full animate-ping opacity-40" style={{ animationDelay: "0.5s" }} />
              <div className="absolute inset-4 border-4 border-blue-400 rounded-full animate-spin" style={{ borderTopColor: "transparent" }} />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🔍</div>
            </div>

            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{t?.loanVerifying || "Verifying your documents…"}</p>
              <p className="text-sm text-gray-500 mt-1">{t?.loanPleaseWait || "This usually takes under a minute."}</p>
            </div>

            <div className="space-y-2 w-full max-w-xs">
              {["Checking PAN validity…", "Verifying Aadhaar…", "Reading bank details…"].map((s, i) => (
                <motion.div
                  key={s}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.8 }}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  {s}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Approved ───────────────────────────────── */}
        {step === "approved" && loan && (
          <motion.div
            key="approved"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Approval hero */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-200 rounded-2xl p-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                className="text-5xl mb-3"
              >
                🎉
              </motion.div>
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">
                {t?.loanApproved || "Pre-Approved!"}
              </p>
              <p className="text-4xl font-black text-emerald-700">
                ₹{loan.limit.toLocaleString("en-IN")}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                @ {loan.rate}% p.a. · {t?.loanNoCollateral || "No collateral required"}
              </p>
            </div>

            {/* Loan details */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Loan Details</p>

              <div className="grid grid-cols-2 gap-3">
                <DetailCard label={t?.loanInterest || "Interest Rate"} value={`${loan.rate}% p.a.`} icon="📊" />
                <DetailCard label={t?.loanType || "Loan Type"} value={t?.loanAgriLoan || "Agri Loan"} icon="🌾" />
                <DetailCard label={t?.loanProcessing || "Processing Fee"} value="₹0" icon="💰" />
                <DetailCard label={t?.loanDisbursal || "Disbursal"} value={t?.loanSameDay || "Same day"} icon="⚡" />
              </div>

              {/* Tenure selector */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">{t?.loanTenure || "Select Tenure"}</p>
                <div className="grid grid-cols-3 gap-2">
                  {[12, 24, 36].map((m) => (
                    <button
                      key={m}
                      onClick={() => setTenure(m)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        tenure === m
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {m} {t?.loanMonths || "months"}
                    </button>
                  ))}
                </div>
              </div>

              {/* EMI calculator */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-500 font-semibold">{t?.loanEMI || "Monthly EMI"}</p>
                  <p className="text-2xl font-black text-blue-700">
                    ₹{emi(loan.limit, loan.rate, tenure).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{t?.loanTotal || "Total Repayment"}</p>
                  <p className="text-sm font-bold text-gray-700">
                    ₹{(emi(loan.limit, loan.rate, tenure) * tenure).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => alert(t?.loanPrototypeAlert || "This is a prototype. In the live version, this will initiate KYC & disbursal.")}
              className="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-md bg-gradient-to-r from-emerald-500 to-green-600 active:scale-95 transition-all"
            >
              {t?.loanAccept || "Accept Offer & Proceed →"}
            </button>

            <button
              onClick={resetFlow}
              className="w-full py-3 rounded-2xl text-gray-500 font-semibold text-sm border border-gray-200 active:scale-95 transition-all"
            >
              {t?.loanStartOver || "Start Over"}
            </button>

            {/* Prototype disclaimer */}
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <span className="text-base flex-shrink-0">⚠️</span>
              <p className="text-xs text-amber-800 leading-relaxed">
                {t?.loanPrototypeNote || "This is a prototype demo. No real money is being processed. In the production version, this will connect to a licensed NBFC partner for real loan disbursal."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailCard({ label, value, icon }) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2.5 flex items-center gap-2">
      <span className="text-base">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
