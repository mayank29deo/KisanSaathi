import { useEffect, useState, useCallback } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, isConfigured } from "../config/firebase";

const ADMIN_EMAILS = ["mayank29deo@gmail.com"];

export default function Admin() {
  const [fbUser, setFbUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("payouts");

  // Listen for auth state changes
  useEffect(() => {
    if (!auth) return;
    const unsub = auth.onAuthStateChanged((u) => setFbUser(u));
    return unsub;
  }, []);

  const isAdmin = fbUser && ADMIN_EMAILS.includes(fbUser.email);

  const fetchDashboard = useCallback(async () => {
    if (!fbUser) return;
    setLoading(true);
    try {
      const token = await fbUser.getIdToken();
      const r = await fetch("/api/admin/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (!r.ok) {
        setAuthError(j.error || "fetch_failed");
        setData(null);
      } else {
        setData(j);
        setAuthError("");
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fbUser]);

  useEffect(() => {
    if (isAdmin) fetchDashboard();
  }, [isAdmin, fetchDashboard]);

  async function handleSignIn() {
    if (!isConfigured) {
      setAuthError("Firebase not configured");
      return;
    }
    setSigningIn(true);
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err.message || "sign_in_failed");
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    setData(null);
  }

  async function markPaid(userId, nbfcRef = "") {
    const token = await fbUser.getIdToken();
    const r = await fetch("/api/admin/mark-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, nbfcRef }),
    });
    const j = await r.json();
    if (!r.ok) {
      alert(`Failed: ${j.error || "unknown"}`);
      return;
    }
    alert(`✓ Marked paid: ₹${j.amount} (payout ${j.payoutId.slice(0, 8)})`);
    fetchDashboard();
  }

  async function reviewEntry(entryId, action) {
    const token = await fbUser.getIdToken();
    const r = await fetch("/api/admin/review-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ entryId, action }),
    });
    const j = await r.json();
    if (!r.ok) {
      alert(`Failed: ${j.error || "unknown"}`);
      return;
    }
    fetchDashboard();
  }

  // ─── Sign-in screen ──────────────────────────────────────────
  if (!fbUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-emerald-100">
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">🌾</div>
            <h1 className="text-2xl font-bold text-emerald-700">KisanSaathi Admin</h1>
            <p className="text-sm text-gray-500 mt-1">Restricted access</p>
          </div>
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full bg-white border-2 border-gray-200 hover:border-emerald-400 rounded-xl px-4 py-3 flex items-center justify-center gap-3 font-semibold text-gray-700 active:scale-95 transition-all disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4C12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.9-8 19.9-20c0-1.3-.1-2.4-.3-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 18.9 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4C16.3 4 9.7 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c4.4-4 7-9.8 7-16.3c0-1.3-.1-2.4-.4-3.5z"/></svg>
            {signingIn ? "Signing in..." : "Sign in with Google"}
          </button>
          {authError && (
            <p className="text-sm text-red-600 mt-4 text-center">{authError}</p>
          )}
          <p className="text-xs text-gray-400 mt-6 text-center">
            Only authorized admin emails can access this page.
          </p>
        </div>
      </div>
    );
  }

  // ─── Unauthorized ────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-3">🚫</div>
          <h1 className="text-xl font-bold text-gray-900">Unauthorized</h1>
          <p className="text-sm text-gray-600 mt-2">
            <span className="font-semibold">{fbUser.email}</span> is not in the admin allowlist.
          </p>
          <button
            onClick={handleSignOut}
            className="mt-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // ─── Loading ─────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-emerald-600 animate-pulse">Loading dashboard…</div>
      </div>
    );
  }

  // ─── Dashboard ───────────────────────────────────────────────
  const stats = data?.stats || {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🌾</div>
            <div>
              <div className="font-bold text-emerald-700">KisanSaathi Admin</div>
              <div className="text-xs text-gray-500">{fbUser.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboard}
              disabled={loading}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? "…" : "↻ Refresh"}
            </button>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Stats banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard label="Total Users" value={stats.totalUsers} />
          <StatCard label="Active Today" value={stats.activeToday} accent="emerald" />
          <StatCard label="Entries Today" value={stats.totalEntriesToday} />
          <StatCard label="Total Owed" value={`₹${stats.totalBalanceOwed || 0}`} accent="amber" />
          <StatCard
            label="Payouts Ready"
            value={`${stats.payoutsReadyCount} (₹${stats.payoutsReadyAmount || 0})`}
            accent="emerald-dark"
            highlight
          />
          <StatCard label="Flagged" value={stats.flaggedCount} accent={stats.flaggedCount ? "red" : null} />
          <StatCard label="DB Time" value={new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }).slice(0, 5)} />
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-gray-200 flex gap-1 overflow-x-auto">
          <TabBtn active={tab === "payouts"} onClick={() => setTab("payouts")} count={data?.payoutsReady?.length}>
            🪙 Payouts Ready
          </TabBtn>
          <TabBtn active={tab === "users"} onClick={() => setTab("users")} count={data?.users?.length}>
            👥 Users
          </TabBtn>
          <TabBtn active={tab === "entries"} onClick={() => setTab("entries")} count={data?.recentEntries?.length}>
            📋 Recent Entries
          </TabBtn>
          <TabBtn active={tab === "flagged"} onClick={() => setTab("flagged")} count={data?.flagged?.length} red={data?.flagged?.length}>
            ⚠️ Flagged
          </TabBtn>
        </div>

        {/* Tab content */}
        <div className="mt-4">
          {tab === "payouts" && <PayoutsTable rows={data?.payoutsReady || []} onMarkPaid={markPaid} />}
          {tab === "users" && <UsersTable rows={data?.users || []} />}
          {tab === "entries" && <EntriesTable rows={data?.recentEntries || []} />}
          {tab === "flagged" && <FlaggedTable rows={data?.flagged || []} onReview={reviewEntry} />}
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────

function StatCard({ label, value, accent, highlight }) {
  const accentClass = {
    emerald: "text-emerald-600",
    "emerald-dark": "text-emerald-700",
    amber: "text-amber-600",
    red: "text-red-600",
  }[accent] || "text-gray-900";
  return (
    <div className={`bg-white rounded-xl p-3 border ${highlight ? "border-emerald-300 ring-2 ring-emerald-100" : "border-gray-200"}`}>
      <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${accentClass}`}>{value ?? 0}</div>
    </div>
  );
}

function TabBtn({ active, onClick, count, children, red }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
        active
          ? "border-emerald-600 text-emerald-700"
          : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`ml-2 px-2 py-0.5 text-[11px] rounded-full ${
          red ? "bg-red-100 text-red-700" : active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
        }`}>{count}</span>
      )}
    </button>
  );
}

function PayoutsTable({ rows, onMarkPaid }) {
  if (rows.length === 0) {
    return <EmptyState icon="🪙" title="No payouts ready" subtitle="When a user crosses ₹10 with a linked bank/UPI, they'll appear here." />;
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
            <Th>User</Th>
            <Th>Phone</Th>
            <Th align="right">Balance</Th>
            <Th align="right">Disburse</Th>
            <Th>UPI / Bank</Th>
            <Th>Holder</Th>
            <Th align="center">Action</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.userId} className="border-b border-gray-100 hover:bg-emerald-50/40">
              <Td className="font-semibold">{p.name}</Td>
              <Td>{p.phone ? `+91 ${p.phone}` : "—"}</Td>
              <Td align="right" className="font-semibold">₹{p.balance}</Td>
              <Td align="right" className="font-bold text-emerald-700">₹{p.payoutAmount}</Td>
              <Td>
                {p.upiId ? (
                  <span className="font-mono text-emerald-700">{p.upiId}</span>
                ) : (
                  <span className="font-mono">{p.ifsc}</span>
                )}
              </Td>
              <Td>{p.accountHolder || "—"}</Td>
              <Td align="center">
                <div className="flex justify-center gap-1">
                  <button
                    onClick={() => {
                      const ref = prompt(`Confirm disbursal of ₹${p.payoutAmount} to ${p.name}.\n\nOptional NBFC reference / transaction ID:`);
                      if (ref === null) return;
                      onMarkPaid(p.userId, ref);
                    }}
                    className="px-3 py-1 bg-emerald-600 text-white rounded-md text-xs font-semibold hover:bg-emerald-700"
                  >
                    Mark Paid ₹{p.payoutAmount}
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsersTable({ rows }) {
  const [search, setSearch] = useState("");
  const filtered = rows.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.name || "").toLowerCase().includes(s)
      || (u.phone || "").includes(s)
      || (u.email || "").toLowerCase().includes(s);
  });
  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, phone, email…"
        className="w-full px-3 py-2 mb-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
      />
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Email</Th>
              <Th>Provider</Th>
              <Th align="right">Balance</Th>
              <Th>Bank</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.userId} className="border-b border-gray-100 hover:bg-gray-50">
                <Td className="font-medium">{u.name}</Td>
                <Td>{u.phone ? `+91 ${u.phone}` : "—"}</Td>
                <Td className="text-gray-600">{u.email || "—"}</Td>
                <Td>{u.provider === "google" ? "🟦 Google" : "📱 Phone"}</Td>
                <Td align="right" className={u.balance >= 10 ? "font-bold text-emerald-700" : ""}>₹{u.balance}</Td>
                <Td>
                  {u.bankLinked ? (
                    <span className="text-emerald-600 text-xs font-semibold">✓ {u.bankUpi || u.bankIfsc}</span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </Td>
                <Td className="text-gray-500 text-xs">{fmtDate(u.createdAt)}</Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><Td colSpan={7} className="text-center text-gray-400 py-8">No matches</Td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EntriesTable({ rows }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const filtered = rows.filter((e) => statusFilter === "all" || e.status === statusFilter);
  return (
    <div>
      <div className="flex gap-2 mb-3">
        {["all", "verified", "flagged", "rejected", "pending"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
              statusFilter === s ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
              <Th>Time</Th>
              <Th>User</Th>
              <Th>Commodity</Th>
              <Th align="right">Price</Th>
              <Th>Source</Th>
              <Th>Location</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                <Td className="text-gray-500 text-xs whitespace-nowrap">{fmtTime(e.createdAt)}</Td>
                <Td className="font-medium">{e.userName}</Td>
                <Td className="capitalize">{e.commodity.replace(/_/g, " ")}</Td>
                <Td align="right" className="font-semibold">₹{e.price}/{e.unit}</Td>
                <Td className="text-gray-600 text-xs capitalize">{e.sourceType.replace(/_/g, " ")}</Td>
                <Td className="text-gray-600 text-xs">{e.district}{e.state ? `, ${e.state}` : ""}</Td>
                <Td><StatusBadge status={e.status} reason={e.flagReason} /></Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><Td colSpan={7} className="text-center text-gray-400 py-8">No entries</Td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FlaggedTable({ rows, onReview }) {
  if (rows.length === 0) {
    return <EmptyState icon="✅" title="No flagged entries" subtitle="When the outlier detector or geo check flags an entry, it'll appear here." />;
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
            <Th>Time</Th>
            <Th>User</Th>
            <Th>Commodity</Th>
            <Th align="right">Price</Th>
            <Th>Location</Th>
            <Th>Flag Reason</Th>
            <Th align="center">Review</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-b border-gray-100 hover:bg-amber-50/40">
              <Td className="text-gray-500 text-xs whitespace-nowrap">{fmtTime(e.createdAt)}</Td>
              <Td className="font-medium">{e.userName}</Td>
              <Td className="capitalize">{e.commodity.replace(/_/g, " ")}</Td>
              <Td align="right" className="font-semibold">₹{e.price}/{e.unit}</Td>
              <Td className="text-gray-600 text-xs">{e.district}{e.state ? `, ${e.state}` : ""}</Td>
              <Td className="text-amber-700 text-xs font-medium">{e.flagReason || "review"}</Td>
              <Td align="center">
                <div className="flex justify-center gap-1">
                  <button
                    onClick={() => onReview(e.id, "verify")}
                    className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                  >
                    ✓ Verify (+₹1)
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Reject this entry by ${e.userName}? No credit will be given.`)) onReview(e.id, "reject");
                    }}
                    className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200"
                  >
                    ✕ Reject
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status, reason }) {
  const cls = {
    verified: "bg-emerald-100 text-emerald-700",
    flagged: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
    pending: "bg-gray-100 text-gray-700",
  }[status] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${cls}`} title={reason}>
      {status}
    </span>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div className="text-5xl mb-3">{icon}</div>
      <div className="font-semibold text-gray-700">{title}</div>
      <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return <th className={`px-3 py-2.5 text-${align}`}>{children}</th>;
}
function Td({ children, align = "left", className = "", colSpan }) {
  return <td colSpan={colSpan} className={`px-3 py-2.5 text-${align} ${className}`}>{children}</td>;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false })
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
