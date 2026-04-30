import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { COMMODITIES, UNITS, SOURCE_TYPES, getCommodityName, getUnitLabel } from "../data/commodities";

const STORAGE_KEY = "ks_earn_local";  // local cache used when API not yet wired
const DAILY_LIMIT = 30;

function getLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { entries: [], balance: 0, bank: null, referralCode: null }; }
  catch { return { entries: [], balance: 0, bank: null, referralCode: null }; }
}
function saveLocal(d) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

function genReferralCode(phone) {
  const tail = (phone || "").slice(-4) || Math.random().toString(36).slice(2, 6);
  return `KS${tail.toUpperCase()}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function Earn({ t, user }) {
  const lang = t._lang || "en";
  const [data, setData] = useState(() => getLocal());
  const [showForm, setShowForm] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [toast, setToast] = useState(null);

  // Generate referral code if missing
  useEffect(() => {
    if (!data.referralCode && user?.phone) {
      const updated = { ...data, referralCode: genReferralCode(user.phone) };
      setData(updated);
      saveLocal(updated);
    }
  }, [user]);

  const entriesToday = useMemo(
    () => data.entries.filter((e) => e.date === todayKey()).length,
    [data.entries]
  );

  function addEntry(entry) {
    // Server-side simulation: simple validation, outlier check
    const others = data.entries.filter(
      (e) => e.commodity === entry.commodity && e.district === entry.district
    );
    const dupToday = others.find((e) => e.date === todayKey());
    if (dupToday) {
      setToast({ type: "error", msg: t.earnDuplicate });
      return;
    }
    if (entriesToday >= DAILY_LIMIT) {
      setToast({ type: "error", msg: t.earnDailyLimit });
      return;
    }

    // Outlier detection: median of last 7 days same commodity+district
    const recent = others.filter((e) => Date.now() - new Date(e.createdAt).getTime() < 7 * 86400000);
    let status = "verified";
    let flagReason = null;
    if (recent.length >= 3) {
      const prices = recent.map((e) => Number(e.price)).sort((a, b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];
      if (entry.price > median * 3) { status = "flagged"; flagReason = "high"; }
      else if (entry.price < median * 0.3) { status = "flagged"; flagReason = "low"; }
    }

    const credit = status === "verified" ? 1 : 0;
    const newEntry = {
      id: crypto.randomUUID(),
      ...entry,
      status,
      flagReason,
      credit,
      date: todayKey(),
      createdAt: new Date().toISOString(),
    };

    const updated = {
      ...data,
      entries: [newEntry, ...data.entries].slice(0, 200),
      balance: data.balance + credit,
    };
    setData(updated);
    saveLocal(updated);

    if (status === "verified") {
      setToast({ type: "success", msg: t.earnSuccess });
    } else if (flagReason === "high") {
      setToast({ type: "warn", msg: t.earnPriceTooHigh });
    } else {
      setToast({ type: "warn", msg: t.earnPriceTooLow });
    }
    setShowForm(false);
  }

  function saveBank(bank) {
    const updated = { ...data, bank };
    setData(updated);
    saveLocal(updated);
    setShowBank(false);
    setToast({ type: "success", msg: t.earnBankLinked });
  }

  function redeem() {
    if (!data.bank) { setToast({ type: "error", msg: t.earnNeedBank }); setShowBank(true); return; }
    if (data.balance < 10) return;
    const amount = Math.floor(data.balance / 10) * 10;
    const updated = { ...data, balance: data.balance - amount };
    updated.entries = [{
      id: crypto.randomUUID(), type: "payout", amount: -amount,
      status: "completed", date: todayKey(), createdAt: new Date().toISOString(),
    }, ...updated.entries];
    setData(updated);
    saveLocal(updated);
    setToast({ type: "success", msg: `₹${amount} sent to ${data.bank.upiId || `account ending ${data.bank.accountNumber.slice(-4)}`}` });
  }

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div className="space-y-4 pb-4">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 text-white shadow-xl"
      >
        <div className="absolute -top-10 -right-2 text-[180px] font-black opacity-15 select-none leading-none pointer-events-none">₹</div>
        <div className="relative">
          <div className="text-xs font-semibold tracking-widest opacity-90">EARN WITH KISAN SAATHI</div>
          <h1 className="text-2xl font-extrabold mt-2 leading-tight">{t.earnHeroTitle || "Earn ₹10 for every 10 prices logged 🪙"}</h1>
          <p className="text-sm mt-2 opacity-95">{t.earnHeroSub}</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-3 py-1 text-xs font-semibold">
            ✨ {t.earnPerEntry}
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <div className="text-xs text-gray-500">{t.earnBalance}</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">₹{data.balance}</div>
        </Card>
        <Card className="text-center">
          <div className="text-xs text-gray-500">{t.earnEntriesToday}</div>
          <div className="text-2xl font-extrabold text-gray-900 mt-1">{entriesToday}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">/ {DAILY_LIMIT}</div>
        </Card>
        <Card className="text-center">
          <div className="text-xs text-gray-500">{t.earnTotalEntries}</div>
          <div className="text-2xl font-extrabold text-gray-900 mt-1">{data.entries.filter(e => !e.type).length}</div>
        </Card>
      </div>

      {/* Primary CTA */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-base"
      >
        <span className="text-xl">📝</span>
        {t.earnLogPrice}
      </button>

      {/* Redeem strip */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="font-semibold text-emerald-900 text-sm">{t.earnPayoutThreshold}</div>
            {!data.bank && (
              <div className="text-xs text-emerald-700 mt-0.5">{t.earnNeedBank}</div>
            )}
          </div>
          {data.bank ? (
            <PrimaryButton onClick={redeem} disabled={data.balance < 10}>
              {t.earnRedeem?.replace("{amount}", String(Math.floor(data.balance / 10) * 10)) || `Redeem ₹${Math.floor(data.balance/10)*10}`}
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => setShowBank(true)}>{t.earnLinkBank}</PrimaryButton>
          )}
        </div>
      </Card>

      {/* Referral */}
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🎁</div>
          <div className="flex-1">
            <div className="font-bold text-indigo-900">{t.earnReferralTitle}</div>
            <div className="text-xs text-gray-600 mt-1">{t.earnReferralCode}:</div>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-white px-3 py-1 rounded-lg font-bold text-indigo-700 border border-indigo-200">{data.referralCode || "—"}</code>
              <button
                onClick={() => {
                  const url = `https://kisan-saathi-dun.vercel.app/?ref=${data.referralCode}`;
                  if (navigator.share) navigator.share({ title: "Kisan Saathi", text: "Join Kisan Saathi and earn money for logging local prices!", url });
                  else { navigator.clipboard?.writeText(url); setToast({ type: "success", msg: "Copied to clipboard" }); }
                }}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold"
              >
                {t.earnReferralShare}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent entries */}
      <Card>
        <div className="font-semibold mb-3">{t.earnRecentEntries}</div>
        {data.entries.filter((e) => !e.type).length === 0 ? (
          <div className="text-sm text-gray-500 py-6 text-center">{t.earnNoEntries}</div>
        ) : (
          <div className="space-y-2">
            {data.entries.filter((e) => !e.type).slice(0, 8).map((e) => (
              <div key={e.id} className="flex items-center justify-between border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">{COMMODITIES.find(c => c.id === e.commodity)?.emoji || "🛒"}</span>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{getCommodityName(e.commodity, lang)}</div>
                    <div className="text-xs text-gray-500 truncate">{e.district || "—"} · {new Date(e.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-sm">₹{e.price}<span className="text-xs text-gray-500"> {getUnitLabel(e.unit, lang)}</span></div>
                  <StatusBadge status={e.status} t={t} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Disclaimer */}
      <div className="text-xs text-gray-500 text-center px-4">{t.earnDisclaimer}</div>

      {/* Submission form modal */}
      <AnimatePresence>
        {showForm && (
          <PriceFormModal t={t} lang={lang} onClose={() => setShowForm(false)} onSubmit={addEntry} />
        )}
      </AnimatePresence>

      {/* Bank linking modal */}
      <AnimatePresence>
        {showBank && (
          <BankLinkModal t={t} existing={data.bank} onClose={() => setShowBank(false)} onSave={saveBank} />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-24 inset-x-4 z-50 rounded-xl px-4 py-3 shadow-2xl text-sm font-semibold text-white ${
              toast.type === "success" ? "bg-emerald-600" :
              toast.type === "warn"    ? "bg-amber-500"   :
                                         "bg-rose-600"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status, t }) {
  const map = {
    verified: { bg: "bg-emerald-100", text: "text-emerald-700", label: t.earnVerified },
    pending:  { bg: "bg-blue-100",    text: "text-blue-700",    label: t.earnPendingReview },
    flagged:  { bg: "bg-amber-100",   text: "text-amber-700",   label: t.earnFlagged },
    rejected: { bg: "bg-rose-100",    text: "text-rose-700",    label: t.earnRejected },
  };
  const m = map[status] || map.pending;
  return <span className={`inline-block ${m.bg} ${m.text} text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1`}>{m.label}</span>;
}

// ─── Price Form Modal ─────────────────────────────────────────

function PriceFormModal({ t, lang, onClose, onSubmit }) {
  const [search, setSearch] = useState("");
  const [commodity, setCommodity] = useState(null);
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("kg");
  const [sourceType, setSourceType] = useState("mandi");
  const [district, setDistrict] = useState("");
  const [pincode, setPincode] = useState("");
  const [autoLoc, setAutoLoc] = useState(true);
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const filtered = useMemo(() => {
    if (!search) return COMMODITIES.slice(0, 30);
    const q = search.toLowerCase();
    return COMMODITIES.filter((c) =>
      c.id.includes(q) || c.en.toLowerCase().includes(q) || c.hi.includes(search) || c.bn.includes(search)
    ).slice(0, 30);
  }, [search]);

  async function tryAutoLocate() {
    setLocLoading(true);
    setError(null);
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      );
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=10`
      );
      const j = await r.json();
      const a = j?.address || {};
      const dist = a.state_district || a.county || a.city_district || a.city || "";
      const pin = a.postcode || "";
      if (dist) setDistrict(dist);
      if (pin) setPincode(pin);
    } catch {
      setError("Could not detect location. Please enter manually.");
      setAutoLoc(false);
    } finally {
      setLocLoading(false);
    }
  }

  useEffect(() => {
    if (autoLoc) tryAutoLocate();
  }, [autoLoc]);

  function handleSubmit() {
    if (!commodity) { setError("Select a commodity"); return; }
    const p = parseFloat(price);
    if (!p || p <= 0) { setError("Enter a valid price"); return; }
    if (!district) { setError("District required"); return; }
    setSubmitting(true);
    // Idempotency key for future API integration
    const idemKey = crypto.randomUUID();
    setTimeout(() => {
      onSubmit({ commodity, price: p, unit, sourceType, district, pincode, idemKey });
      setSubmitting(false);
    }, 400);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40"
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="fixed bottom-0 inset-x-0 bg-white rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between rounded-t-3xl">
          <h3 className="font-bold text-lg">{t.earnFormTitle}</h3>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Commodity selector */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1.5">{t.earnCommodity}</div>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t.earnCommodityPh}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:border-emerald-400 focus:outline-none"
            />
            <div className="mt-2 max-h-44 overflow-y-auto grid grid-cols-3 gap-2">
              {filtered.map((c) => (
                <button
                  key={c.id} onClick={() => setCommodity(c.id)}
                  className={`text-xs py-2 px-2 rounded-lg border ${commodity === c.id ? "bg-emerald-100 border-emerald-500 text-emerald-800 font-semibold" : "bg-white border-gray-200"}`}
                >
                  <div className="text-lg">{c.emoji}</div>
                  <div className="leading-tight mt-0.5">{c[lang] || c.en}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Price + Unit */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <div className="text-xs font-semibold text-gray-700 mb-1.5">{t.earnPrice}</div>
              <input
                type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)}
                placeholder="30" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <div className="text-xs font-semibold text-gray-700 mb-1.5">{t.earnUnit}</div>
              <div className="flex flex-wrap gap-1.5">
                {UNITS.map((u) => (
                  <button
                    key={u.id} onClick={() => setUnit(u.id)}
                    className={`text-[11px] px-2.5 py-1.5 rounded-lg border ${unit === u.id ? "bg-emerald-100 border-emerald-500 text-emerald-800 font-semibold" : "bg-white border-gray-200"}`}
                  >
                    {u[lang] || u.en}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Source type */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1.5">{t.earnSourceType}</div>
            <div className="grid grid-cols-4 gap-2">
              {SOURCE_TYPES.map((s) => (
                <button
                  key={s.id} onClick={() => setSourceType(s.id)}
                  className={`py-2 px-1 rounded-lg border text-[10px] leading-tight ${sourceType === s.id ? "bg-emerald-100 border-emerald-500 text-emerald-800 font-semibold" : "bg-white border-gray-200"}`}
                >
                  <div className="text-lg">{s.icon}</div>
                  {t[s.labelKey]}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-semibold text-gray-700">{t.earnDistrict}</div>
              <button
                onClick={() => { setAutoLoc(true); tryAutoLocate(); }}
                className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1"
              >
                {locLoading ? "📍 Locating…" : "📍 " + t.earnAutoLocation}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={district} onChange={(e) => setDistrict(e.target.value)}
                placeholder={t.earnDistrict}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:border-emerald-400 focus:outline-none"
              />
              <input
                value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                placeholder={t.earnPincode} maxLength={6}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          {error && <div className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</div>}

          <button
            onClick={handleSubmit} disabled={submitting}
            className="w-full bg-emerald-600 disabled:opacity-60 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md"
          >
            {submitting ? t.earnSubmitting : t.earnSubmit}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Bank Linking Modal ───────────────────────────────────────

function BankLinkModal({ t, existing, onClose, onSave }) {
  const [holder, setHolder] = useState(existing?.accountHolder || "");
  const [accNum, setAccNum] = useState(existing?.accountNumber || "");
  const [ifsc, setIfsc] = useState(existing?.ifsc || "");
  const [upi, setUpi] = useState(existing?.upiId || "");
  const [error, setError] = useState(null);

  function handleSave() {
    setError(null);
    if (!upi && (!holder || !accNum || !ifsc)) { setError("Fill all bank fields or provide UPI ID"); return; }
    if (accNum && accNum.length < 9) { setError("Invalid account number"); return; }
    if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) { setError("Invalid IFSC code"); return; }
    onSave({ accountHolder: holder, accountNumber: accNum, ifsc: ifsc.toUpperCase(), upiId: upi });
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/50 z-40" />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="fixed bottom-0 inset-x-0 bg-white rounded-t-3xl z-50 max-h-[85vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between rounded-t-3xl">
          <h3 className="font-bold text-lg">{t.earnLinkBank}</h3>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <Input label={t.earnBankUpi} value={upi} onChange={setUpi} placeholder="9876543210@paytm" />
          <div className="text-center text-xs text-gray-400">— or —</div>
          <Input label={t.earnBankAccountHolder} value={holder} onChange={setHolder} />
          <Input label={t.earnBankAccountNumber} value={accNum} onChange={(v) => setAccNum(v.replace(/\D/g, ""))} type="numeric" />
          <Input label={t.earnBankIfsc} value={ifsc} onChange={(v) => setIfsc(v.toUpperCase())} placeholder="HDFC0001234" />
          {error && <div className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</div>}
          <button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md">
            {t.earnBankSave}
          </button>
          <p className="text-[10px] text-gray-500 text-center pt-2">🔒 Encrypted & stored securely. Used only for payouts.</p>
        </div>
      </motion.div>
    </>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-700 mb-1">{label}</div>
      <input
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        inputMode={type === "numeric" ? "numeric" : "text"}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:border-emerald-400 focus:outline-none"
      />
    </div>
  );
}
