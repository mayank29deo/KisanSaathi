import { useEffect, useState, useCallback } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, isConfigured } from "../config/firebase";
import { isAdminEmail } from "../config/adminEmails";

export default function Admin() {
  const [fbUser, setFbUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("payouts");
  const [logModalUser, setLogModalUser] = useState(null); // user being logged for, null = closed

  // Listen for auth state changes
  useEffect(() => {
    if (!auth) return;
    const unsub = auth.onAuthStateChanged((u) => setFbUser(u));
    return unsub;
  }, []);

  const isAdmin = isAdminEmail(fbUser?.email);

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
      alert(`Failed: ${j.error || "unknown"}${j.detail ? "\n\n" + JSON.stringify(j.detail) : ""}`);
      return;
    }
    const tag = j.adopted ? "✓ Marked existing pending payout as paid" : "✓ Payout recorded";
    alert(`${tag}: ₹${j.amount}\nRef: ${j.reference}`);
    fetchDashboard();
  }

  async function logPayout({ userId, amount, method, reference, transferDate }) {
    const token = await fbUser.getIdToken();
    const r = await fetch("/api/admin/log-payout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, amount, method, reference, transferDate }),
    });
    const j = await r.json();
    if (!r.ok) {
      alert(`Failed: ${j.error || "unknown"}`);
      return false;
    }
    fetchDashboard();
    return true;
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

      {/* Stats banner — each card click-jumps to the related tab */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatCard label="Total Users" value={stats.totalUsers} onClick={() => setTab("users")} />
          <StatCard label="Active Today" value={stats.activeToday} accent="emerald" onClick={() => setTab("entries")} />
          <StatCard label="Entries Today" value={stats.totalEntriesToday} onClick={() => setTab("entries")} />
          <StatCard label="Total Owed" value={`₹${stats.totalBalanceOwed || 0}`} accent="amber" onClick={() => setTab("users")} />
          <StatCard
            label="Payouts Ready"
            value={`${stats.payoutsReadyCount} (₹${stats.payoutsReadyAmount || 0})`}
            accent="emerald-dark"
            highlight
            onClick={() => setTab("payouts")}
          />
          <StatCard
            label="Disbursed All-Time"
            value={`₹${stats.totalDisbursedAllTime || 0}`}
            accent="emerald-dark"
            sub={`${stats.totalPayoutCount || 0} payouts`}
            onClick={() => setTab("history")}
          />
          <StatCard
            label="Bank Linked"
            value={stats.bankLinkedCount}
            accent="emerald"
            onClick={() => setTab("banks")}
          />
          <StatCard
            label="Flagged"
            value={stats.flaggedCount}
            accent={stats.flaggedCount ? "red" : null}
            onClick={() => setTab("flagged")}
          />
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-gray-200 flex gap-1 overflow-x-auto">
          <TabBtn active={tab === "payouts"} onClick={() => setTab("payouts")} count={data?.payoutsReady?.length}>
            🪙 Payouts Ready
          </TabBtn>
          <TabBtn active={tab === "history"} onClick={() => setTab("history")} count={data?.payoutHistory?.length}>
            📜 Payout History
          </TabBtn>
          <TabBtn active={tab === "banks"} onClick={() => setTab("banks")} count={data?.bankLinks?.length}>
            🏦 Bank Links
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
          {tab === "payouts" && <PayoutsTable rows={data?.payoutsReady || []} onMarkPaid={markPaid} onLogManual={(u) => setLogModalUser(u)} />}
          {tab === "history" && <HistoryTable rows={data?.payoutHistory || []} />}
          {tab === "banks" && <BankLinksTable rows={data?.bankLinks || []} onLogManual={(u) => setLogModalUser(u)} />}
          {tab === "users" && <UsersTable rows={data?.users || []} onLogManual={(u) => setLogModalUser(u)} />}
          {tab === "entries" && <EntriesTable rows={data?.recentEntries || []} />}
          {tab === "flagged" && <FlaggedTable rows={data?.flagged || []} onReview={reviewEntry} />}
        </div>
      </div>

      {logModalUser && (
        <LogPayoutModal
          user={logModalUser}
          onClose={() => setLogModalUser(null)}
          onSubmit={async (vals) => {
            const ok = await logPayout({ userId: logModalUser.userId, ...vals });
            if (ok) setLogModalUser(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────

function StatCard({ label, value, accent, highlight, sub, onClick }) {
  const accentClass = {
    emerald: "text-emerald-600",
    "emerald-dark": "text-emerald-700",
    amber: "text-amber-600",
    red: "text-red-600",
  }[accent] || "text-gray-900";
  const baseCls = `bg-white rounded-xl p-3 border text-left w-full ${
    highlight ? "border-emerald-300 ring-2 ring-emerald-100" : "border-gray-200"
  } ${onClick ? "hover:border-emerald-400 hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer" : ""}`;
  const content = (
    <>
      <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${accentClass}`}>{value ?? 0}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </>
  );
  if (onClick) {
    return <button onClick={onClick} className={baseCls}>{content}</button>;
  }
  return <div className={baseCls}>{content}</div>;
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

function PayoutsTable({ rows, onMarkPaid, onLogManual }) {
  if (rows.length === 0) {
    return <EmptyState icon="🪙" title="No payouts ready" subtitle="When a user crosses ₹10 with a linked bank/UPI, they'll appear here." />;
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
            <Th>User</Th>
            <Th>Phone</Th>
            <Th>Location</Th>
            <Th align="right">Balance</Th>
            <Th align="right">Disburse</Th>
            <Th align="right">Paid Lifetime</Th>
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
              <Td className="text-gray-600 text-xs">{p.district || "—"}{p.state ? `, ${p.state}` : ""}</Td>
              <Td align="right" className="font-semibold">₹{p.balance}</Td>
              <Td align="right" className="font-bold text-emerald-700">₹{p.payoutAmount}</Td>
              <Td align="right" className="text-gray-600">₹{p.lifetimeDisbursed || 0}</Td>
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
                      const dest = p.upiId || p.ifsc;
                      const ref = prompt(
                        `You sent ₹${p.payoutAmount} to:\n\n${p.name} (+91 ${p.phone})\n${dest}\n\nEnter Transaction ID / UTR:`
                      );
                      if (ref === null) return; // cancelled
                      onMarkPaid(p.userId, ref);
                    }}
                    className="px-3 py-1 bg-emerald-600 text-white rounded-md text-xs font-semibold hover:bg-emerald-700"
                    title="Record this transfer — debits balance, adds to history"
                  >
                    Mark Paid ₹{p.payoutAmount}
                  </button>
                  <button
                    onClick={() => onLogManual({
                      userId: p.userId, name: p.name, phone: p.phone,
                      upiId: p.upiId, ifsc: p.ifsc, accountHolder: p.accountHolder,
                      defaultAmount: p.payoutAmount,
                    })}
                    className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-50"
                    title="Log a manual/retroactive transfer"
                  >
                    + Log
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

function UsersTable({ rows, onLogManual }) {
  const [search, setSearch] = useState("");
  const filtered = rows.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.name || "").toLowerCase().includes(s)
      || (u.phone || "").includes(s)
      || (u.email || "").toLowerCase().includes(s)
      || (u.district || "").toLowerCase().includes(s);
  });
  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, phone, email, location…"
        className="w-full px-3 py-2 mb-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
      />
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Location</Th>
              <Th>Provider</Th>
              <Th align="right">Balance Owed</Th>
              <Th align="right">Paid Lifetime</Th>
              <Th>Bank / UPI</Th>
              <Th>Joined</Th>
              <Th align="center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.userId} className="border-b border-gray-100 hover:bg-gray-50">
                <Td className="font-medium">{u.name}</Td>
                <Td>{u.phone ? `+91 ${u.phone}` : "—"}</Td>
                <Td className="text-gray-600 text-xs">{u.district || "—"}{u.state ? `, ${u.state}` : ""}</Td>
                <Td>{u.provider === "google" ? "🟦 Google" : "📱 Phone"}</Td>
                <Td align="right" className={u.balance >= 10 ? "font-bold text-emerald-700" : ""}>₹{u.balance}</Td>
                <Td align="right" className="text-gray-600">₹{u.lifetimeDisbursed || 0}</Td>
                <Td>
                  {u.bankLinked ? (
                    <span className="text-emerald-600 text-xs font-mono">{u.bankUpi || u.bankIfsc}</span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </Td>
                <Td className="text-gray-500 text-xs">{fmtDate(u.createdAt)}</Td>
                <Td align="center">
                  <button
                    onClick={() => onLogManual({
                      userId: u.userId, name: u.name, phone: u.phone,
                      upiId: u.bankUpi, ifsc: u.bankIfsc, accountHolder: u.bankHolder,
                      defaultAmount: u.balance >= 10 ? Math.floor(u.balance / 10) * 10 : 0,
                    })}
                    className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded text-xs font-semibold hover:bg-gray-50"
                  >
                    + Log Transfer
                  </button>
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><Td colSpan={9} className="text-center text-gray-400 py-8">No matches</Td></tr>
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

function BankLinksTable({ rows, onLogManual }) {
  const [search, setSearch] = useState("");
  const filtered = rows.filter((b) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (b.userName || "").toLowerCase().includes(s)
      || (b.userPhone || "").includes(s)
      || (b.upiId || "").toLowerCase().includes(s)
      || (b.ifsc || "").toLowerCase().includes(s)
      || (b.accountHolder || "").toLowerCase().includes(s)
      || (b.district || "").toLowerCase().includes(s);
  });

  if (rows.length === 0) {
    return <EmptyState icon="🏦" title="No bank links yet" subtitle="Users who link UPI or bank details will appear here, just like the BankLinks sheet tab." />;
  }

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, phone, UPI, IFSC, holder, location…"
        className="w-full px-3 py-2 mb-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
      />

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3 text-sm">
        <span className="text-emerald-800 font-semibold">{filtered.length}</span>
        <span className="text-emerald-700"> users with linked payout method</span>
        <span className="text-emerald-600 ml-2">
          ({filtered.filter((b) => b.upiId).length} UPI · {filtered.filter((b) => b.ifsc).length} Bank)
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
              <Th>Linked</Th>
              <Th>User Name</Th>
              <Th>Phone</Th>
              <Th>Location</Th>
              <Th>UPI ID</Th>
              <Th>IFSC</Th>
              <Th>Account Holder</Th>
              <Th align="center">Acc #</Th>
              <Th align="right">Balance</Th>
              <Th align="right">Paid Lifetime</Th>
              <Th align="center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.userId} className="border-b border-gray-100 hover:bg-emerald-50/30">
                <Td className="text-xs whitespace-nowrap text-gray-500">{fmtDateTime(b.updatedAt || b.createdAt)}</Td>
                <Td className="font-medium">{b.userName}</Td>
                <Td>{b.userPhone ? `+91 ${b.userPhone}` : "—"}</Td>
                <Td className="text-gray-600 text-xs">{b.district || "—"}{b.state ? `, ${b.state}` : ""}</Td>
                <Td>
                  {b.upiId ? <span className="font-mono text-emerald-700">{b.upiId}</span> : <span className="text-gray-400">—</span>}
                </Td>
                <Td>
                  {b.ifsc ? <span className="font-mono">{b.ifsc}</span> : <span className="text-gray-400">—</span>}
                </Td>
                <Td>{b.accountHolder || <span className="text-gray-400">—</span>}</Td>
                <Td align="center">
                  {b.hasAccountNumber
                    ? <span className="text-emerald-600 text-xs font-semibold">yes</span>
                    : <span className="text-gray-400 text-xs">no</span>}
                </Td>
                <Td align="right" className={b.balance >= 10 ? "font-bold text-emerald-700" : ""}>₹{b.balance || 0}</Td>
                <Td align="right" className="text-gray-600">₹{b.lifetimeDisbursed || 0}</Td>
                <Td align="center">
                  <button
                    onClick={() => onLogManual({
                      userId: b.userId, name: b.userName, phone: b.userPhone,
                      upiId: b.upiId, ifsc: b.ifsc, accountHolder: b.accountHolder,
                      defaultAmount: b.balance >= 10 ? Math.floor(b.balance / 10) * 10 : 0,
                    })}
                    className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded text-xs font-semibold hover:bg-gray-50"
                  >
                    + Log Transfer
                  </button>
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><Td colSpan={11} className="text-center text-gray-400 py-8">No matches</Td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HistoryTable({ rows }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const filtered = rows.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.userName || "").toLowerCase().includes(s)
      || (p.userPhone || "").includes(s)
      || (p.nbfcRef || "").toLowerCase().includes(s)
      || (p.district || "").toLowerCase().includes(s);
  });

  // Total disbursed in the filtered view
  const totalShown = filtered.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);

  if (rows.length === 0) {
    return <EmptyState icon="📜" title="No payouts yet" subtitle="Once you mark someone paid or log a manual transfer, it'll appear here." />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, location, transaction ref…"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <div className="flex gap-1 flex-wrap">
          {["all", "completed", "pending", "processing", "failed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap ${
                statusFilter === s ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3 text-sm">
        <span className="text-emerald-800 font-semibold">
          ₹{totalShown.toLocaleString("en-IN")} disbursed
        </span>
        <span className="text-emerald-600 ml-2">
          across {filtered.filter((p) => p.status === "completed").length} payouts in view
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
              <Th>Date</Th>
              <Th>User</Th>
              <Th>Phone</Th>
              <Th>Location</Th>
              <Th align="right">Amount</Th>
              <Th>Method</Th>
              <Th>Destination</Th>
              <Th>Reference</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <Td className="text-xs whitespace-nowrap">{fmtDateTime(p.completedAt || p.requestedAt)}</Td>
                <Td className="font-medium">{p.userName}</Td>
                <Td>{p.userPhone ? `+91 ${p.userPhone}` : "—"}</Td>
                <Td className="text-gray-600 text-xs">{p.district || "—"}{p.state ? `, ${p.state}` : ""}</Td>
                <Td align="right" className="font-bold text-emerald-700">₹{p.amount}</Td>
                <Td className="capitalize text-xs">{p.method}</Td>
                <Td className="font-mono text-xs">{p.upiId || p.ifsc || "—"}</Td>
                <Td className="font-mono text-[11px] text-gray-500 truncate max-w-[160px]" title={p.nbfcRef}>
                  {p.nbfcRef || "—"}
                </Td>
                <Td><PayoutStatusBadge status={p.status} reason={p.failureReason} /></Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><Td colSpan={9} className="text-center text-gray-400 py-8">No matches</Td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LogPayoutModal({ user, onClose, onSubmit }) {
  const [amount, setAmount] = useState(user.defaultAmount > 0 ? String(user.defaultAmount) : "");
  const [method, setMethod] = useState(user.upiId ? "upi" : user.ifsc ? "bank" : "upi");
  const [reference, setReference] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return alert("Enter a valid amount");
    setSubmitting(true);
    await onSubmit({ amount: amt, method, reference: reference.trim(), transferDate: new Date(transferDate).toISOString() });
    setSubmitting(false);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-emerald-700">Log Manual Transfer</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {user.name} {user.phone ? `(+91 ${user.phone})` : ""}
            </p>
          </div>

          {/* Pre-filled destination context */}
          {(user.upiId || user.ifsc) && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="text-xs text-gray-500 mb-1">Linked payout method:</div>
              {user.upiId && <div className="font-mono text-emerald-700">UPI: {user.upiId}</div>}
              {user.ifsc && <div className="font-mono">{user.ifsc} ({user.accountHolder})</div>}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="e.g. 50"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Method</label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { v: "upi", l: "UPI" },
                  { v: "bank", l: "Bank" },
                  { v: "mobile", l: "Mobile" },
                  { v: "other", l: "Other" },
                ].map((m) => (
                  <button
                    key={m.v}
                    onClick={() => setMethod(m.v)}
                    className={`py-2 rounded-lg text-xs font-semibold ${
                      method === m.v ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {m.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                Transaction ID / UTR / Reference
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="e.g. UTR123456789"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                Transfer Date / Time
              </label>
              <input
                type="datetime-local"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold text-gray-700"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Logging…" : `Log ₹${amount || "?"}`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function PayoutStatusBadge({ status, reason }) {
  const cls = {
    completed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    processing: "bg-blue-100 text-blue-700",
    failed: "bg-red-100 text-red-700",
  }[status] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${cls}`} title={reason}>
      {status}
    </span>
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
function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}
