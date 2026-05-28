"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Trophy, Users, Calendar, Globe, Search, UserPlus, Check, X, ChevronRight, MapPin, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer } from "vaul";
import { createClient } from "@/lib/supabase";
import { DEMO_EVENTS } from "@/lib/mobileMockData";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

type Tab = "events" | "friends" | "leaderboard" | "community";

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "events",      label: "Events",   Icon: Calendar },
  { id: "friends",     label: "Friends",  Icon: Users    },
  { id: "leaderboard", label: "Ranks",    Icon: Trophy   },
  { id: "community",   label: "Feed",     Icon: Globe    },
];

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type EventItem = {
  id: string; title: string; org_name: string;
  event_date: string; location: unknown; description: string;
};
type FriendProfile = { id: string; username: string; level: number; total_points: number };
type FriendRequest  = { senderId: string; username: string; level: number; created_at: string };
type SearchUser     = { id: string; username: string; level: number; state: "none" | "pending" | "friend" };
type LeaderboardRow = { id: string; username: string; total_points: number; level: number };

// ─────────────────────────────────────────────────────────────
// EventsTab
// ─────────────────────────────────────────────────────────────
function EventsTab({ myId }: { myId: string }) {
  const db = createClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const [events, setEvents] = useState<EventItem[]>([]);
  const [myRsvps, setMyRsvps] = useState<Set<string>>(new Set());
  const [rsvpLoading, setRsvpLoading] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("All");
  const [selected, setSelected] = useState<EventItem | null>(null);

  const filters = ["All", "Cleanup", "Hygiene", "Water"];

  // Load real events + my RSVPs
  useEffect(() => {
    if (!myId) return;
    async function load() {
      const { data: evs } = await db
        .from("cleanup_events")
        .select("id, title, org_name, description, event_date, location")
        .eq("status", "approved")
        .gte("event_date", new Date().toISOString())
        .order("event_date")
        .limit(20);

      // Fall back to demo data if DB empty
      const list: EventItem[] = evs?.length
        ? evs
        : DEMO_EVENTS.map((e) => ({
            id: e.id, title: e.title, org_name: "WASH360",
            event_date: e.date, location: e.location, description: "Community event",
          }));
      setEvents(list);

      if (evs?.length && myId) {
        const ids = evs.map((e: EventItem) => e.id);
        const { data: rsvps } = await db
          .from("event_participants")
          .select("event_id")
          .eq("user_id", myId)
          .in("event_id", ids);
        setMyRsvps(new Set((rsvps ?? []).map((r: { event_id: string }) => r.event_id)));
      }
    }
    load();
  }, [myId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleRsvp(eventId: string) {
    if (!myId || rsvpLoading.has(eventId)) return;
    setRsvpLoading((s) => new Set(s).add(eventId));

    const already = myRsvps.has(eventId);
    setMyRsvps((prev) => {
      const next = new Set(prev);
      already ? next.delete(eventId) : next.add(eventId);
      return next;
    });

    try {
      if (already) {
        await db.from("event_participants").delete()
          .eq("event_id", eventId).eq("user_id", myId);
      } else {
        await db.from("event_participants").insert({ event_id: eventId, user_id: myId });
      }
    } catch {
      // Revert optimistic update on failure
      setMyRsvps((prev) => {
        const next = new Set(prev);
        already ? next.add(eventId) : next.delete(eventId);
        return next;
      });
    }
    setRsvpLoading((s) => { const n = new Set(s); n.delete(eventId); return n; });
  }

  function eventEmoji(ev: EventItem) {
    const t = ev.title.toLowerCase();
    if (t.includes("clean") || t.includes("trash")) return "🧹";
    if (t.includes("wash") || t.includes("hygiene")) return "🧼";
    return "💧";
  }

  function locationStr(loc: unknown): string {
    if (typeof loc === "string") return loc;
    if (loc && typeof loc === "object" && "name" in loc) return String((loc as {name: unknown}).name);
    return "Sydney, NSW";
  }

  return (
    <>
      {/* Event detail drawer */}
      <Drawer.Root open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[32px] shadow-2xl pb-safe focus:outline-none max-h-[70vh] overflow-y-auto">
            <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-5" />
            {selected && (
              <div className="px-6 pb-8 flex flex-col gap-4">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center text-4xl">
                  {eventEmoji(selected)}
                </div>
                <div>
                  <h2 className="font-black text-xl text-slate-900">{selected.title}</h2>
                  <p className="text-slate-400 text-sm mt-0.5">{selected.org_name}</p>
                </div>
                <div className="flex flex-col gap-2 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-slate-300 flex-none" />
                    <span>{new Date(selected.event_date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="text-slate-300 flex-none" />
                    <span>{locationStr(selected.location)}</span>
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">{selected.description}</p>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  transition={spring}
                  onClick={() => { toggleRsvp(selected.id); setSelected(null); }}
                  className={`w-full h-[52px] rounded-[20px] font-black text-base ${
                    myRsvps.has(selected.id)
                      ? "bg-slate-100 text-slate-600"
                      : "bg-sky-600 text-white shadow-[0px_4px_0px_rgba(2,132,199,0.25)]"
                  }`}
                >
                  {myRsvps.has(selected.id) ? "Cancel RSVP" : "RSVP to this event"}
                </motion.button>
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <div className="flex flex-col gap-3 p-4 pb-safe">
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-none px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                filter === f ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {events.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-8">No upcoming events right now</p>
        )}

        {events.map((ev, i) => {
          const rsvped = myRsvps.has(ev.id);
          const loading = rsvpLoading.has(ev.id);
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.04 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-3"
            >
              <button
                onClick={() => setSelected(ev)}
                className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center text-3xl flex-none active:scale-95"
              >
                {eventEmoji(ev)}
              </button>
              <div className="flex-1 min-w-0" onClick={() => setSelected(ev)}>
                <p className="text-slate-800 font-bold text-sm leading-tight">{ev.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{ev.org_name}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-slate-400 text-xs">
                    {new Date(ev.event_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.94 }}
                transition={spring}
                onClick={() => toggleRsvp(ev.id)}
                disabled={loading}
                className={`self-center flex-none text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ${
                  rsvped
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "border border-sky-500 text-sky-600"
                }`}
              >
                {rsvped ? <><Check size={12} className="inline mr-0.5" />Going</> : "RSVP"}
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// FriendsTab
// ─────────────────────────────────────────────────────────────
function FriendsTab({ myId }: { myId: string }) {
  const db = createClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const [view, setView] = useState<"list" | "search">("list");
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [listLoading, setListLoading] = useState(true);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFriends = useCallback(async () => {
    if (!myId) return;
    setListLoading(true);
    // Fetch all friendship rows involving me
    const { data: rows } = await db
      .from("friendships")
      .select("user_a, user_b, status, created_at")
      .or(`user_a.eq.${myId},user_b.eq.${myId}`);

    const acceptedIds: string[] = [];
    const pendingReqs: { senderId: string; created_at: string }[] = [];

    for (const r of rows ?? []) {
      if (r.status === "accepted") {
        acceptedIds.push(r.user_a === myId ? r.user_b : r.user_a);
      } else if (r.status === "pending" && r.user_b === myId) {
        pendingReqs.push({ senderId: r.user_a, created_at: r.created_at });
      }
    }

    // Fetch profiles for friends
    if (acceptedIds.length > 0) {
      const { data: profiles } = await db
        .from("profiles")
        .select("id, username, level, total_points")
        .in("id", acceptedIds);
      setFriends(profiles ?? []);
    } else {
      setFriends([]);
    }

    // Fetch profiles for pending senders
    if (pendingReqs.length > 0) {
      const senderIds = pendingReqs.map((r) => r.senderId);
      const { data: senderProfiles } = await db
        .from("profiles")
        .select("id, username, level")
        .in("id", senderIds);
      const map = new Map((senderProfiles ?? []).map((p: FriendProfile) => [p.id, p]));
      setRequests(
        pendingReqs
          .map((r) => {
            const p = map.get(r.senderId) as FriendProfile | undefined;
            return p ? { senderId: r.senderId, username: p.username, level: p.level, created_at: r.created_at } : null;
          })
          .filter(Boolean) as FriendRequest[]
      );
    } else {
      setRequests([]);
    }
    setListLoading(false);
  }, [myId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadFriends(); }, [loadFriends]);

  // Debounced search
  useEffect(() => {
    if (!view || view !== "search" || !query.trim()) {
      setSearchResults([]);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const { data: profiles } = await db
        .from("profiles")
        .select("id, username, level")
        .ilike("username", `%${query.trim()}%`)
        .neq("id", myId)
        .limit(10);

      // Check friendship state for each result
      const ids = (profiles ?? []).map((p: FriendProfile) => p.id);
      let friendshipRows: { user_a: string; user_b: string; status: string }[] = [];
      if (ids.length > 0) {
        const { data: fRows } = await db
          .from("friendships")
          .select("user_a, user_b, status")
          .or(`user_a.eq.${myId},user_b.eq.${myId}`);
        friendshipRows = fRows ?? [];
      }

      const results: SearchUser[] = (profiles ?? []).map((p: FriendProfile) => {
        const row = friendshipRows.find(
          (f) =>
            (f.user_a === myId && f.user_b === p.id) ||
            (f.user_b === myId && f.user_a === p.id)
        );
        const state: SearchUser["state"] = !row
          ? "none"
          : row.status === "accepted"
          ? "friend"
          : "pending";
        return { id: p.id, username: p.username, level: p.level, state };
      });
      setSearchResults(results);
    }, 350);
  }, [query, view, myId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendRequest(targetId: string) {
    setActionLoading((s) => new Set(s).add(targetId));
    setSearchResults((prev) =>
      prev.map((u) => (u.id === targetId ? { ...u, state: "pending" } : u))
    );
    try {
      await db.from("friendships").insert({ user_a: myId, user_b: targetId });
    } catch { /* ignore duplicate */ }
    setActionLoading((s) => { const n = new Set(s); n.delete(targetId); return n; });
  }

  async function acceptRequest(senderId: string) {
    setActionLoading((s) => new Set(s).add(senderId));
    await db.from("friendships").update({ status: "accepted" })
      .eq("user_a", senderId).eq("user_b", myId);
    await loadFriends();
    setActionLoading((s) => { const n = new Set(s); n.delete(senderId); return n; });
  }

  async function declineRequest(senderId: string) {
    setActionLoading((s) => new Set(s).add(senderId));
    await db.from("friendships").delete()
      .eq("user_a", senderId).eq("user_b", myId);
    setRequests((prev) => prev.filter((r) => r.senderId !== senderId));
    setActionLoading((s) => { const n = new Set(s); n.delete(senderId); return n; });
  }

  async function removeFriend(friendId: string) {
    setActionLoading((s) => new Set(s).add(friendId));
    await db.from("friendships").delete()
      .or(`and(user_a.eq.${myId},user_b.eq.${friendId}),and(user_a.eq.${friendId},user_b.eq.${myId})`);
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
    setActionLoading((s) => { const n = new Set(s); n.delete(friendId); return n; });
  }

  function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
    const dim = size === "md" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
    return (
      <div className={`${dim} rounded-full bg-sky-100 flex items-center justify-center font-black text-sky-700 flex-none`}>
        {name[0]?.toUpperCase() ?? "?"}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Search bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by username…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setView("search"); }}
            onFocus={() => setView("search")}
            onBlur={() => { if (!query) setView("list"); }}
            className="w-full h-[44px] pl-9 pr-4 rounded-[14px] bg-slate-100 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setView("list"); setSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Search results */}
      {view === "search" && (
        <div className="flex flex-col gap-2 px-4 pb-safe">
          {!query && <p className="text-slate-400 text-sm text-center py-6">Type a username to search</p>}
          {query && searchResults.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-6">No users found for "{query}"</p>
          )}
          {searchResults.map((user) => (
            <div key={user.id} className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
              <Avatar name={user.username} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-800">{user.username}</p>
                <p className="text-slate-400 text-xs">Level {user.level}</p>
              </div>
              {user.state === "friend" && (
                <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full">Friends</span>
              )}
              {user.state === "pending" && (
                <span className="text-slate-400 text-xs font-medium">Pending</span>
              )}
              {user.state === "none" && (
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  transition={spring}
                  onClick={() => sendRequest(user.id)}
                  disabled={actionLoading.has(user.id)}
                  className="flex items-center gap-1.5 bg-sky-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl disabled:opacity-50"
                >
                  <UserPlus size={13} /> Add
                </motion.button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Friends list view */}
      {view === "list" && (
        <div className="flex flex-col gap-4 px-4 pb-safe">
          {/* Pending requests */}
          {requests.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                Friend Requests · {requests.length}
              </p>
              <div className="flex flex-col gap-2">
                {requests.map((req) => (
                  <div key={req.senderId} className="flex items-center gap-3 bg-sky-50 border border-sky-100 rounded-2xl px-4 py-3">
                    <Avatar name={req.username} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800">{req.username}</p>
                      <p className="text-slate-400 text-xs">Level {req.level} · wants to be friends</p>
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        transition={spring}
                        onClick={() => acceptRequest(req.senderId)}
                        disabled={actionLoading.has(req.senderId)}
                        className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center disabled:opacity-50"
                        aria-label="Accept"
                      >
                        <Check size={16} />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        transition={spring}
                        onClick={() => declineRequest(req.senderId)}
                        disabled={actionLoading.has(req.senderId)}
                        className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center disabled:opacity-50"
                        aria-label="Decline"
                      >
                        <X size={16} />
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My friends */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
              {listLoading ? "Loading…" : `My Friends · ${friends.length}`}
            </p>
            {!listLoading && friends.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Users size={40} className="text-slate-200" />
                <p className="text-slate-500 font-semibold text-sm">No friends yet</p>
                <p className="text-slate-400 text-xs">Search for users above to add them</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {friends.map((f) => (
                <div key={f.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl shadow-sm px-4 py-3">
                  <Avatar name={f.username} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800">{f.username}</p>
                    <p className="text-slate-400 text-xs">Level {f.level} · {f.total_points.toLocaleString()} pts</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    transition={spring}
                    onClick={() => removeFriend(f.id)}
                    disabled={actionLoading.has(f.id)}
                    className="text-slate-300 hover:text-slate-500 transition-colors p-1 disabled:opacity-40"
                    aria-label="Remove friend"
                  >
                    <X size={16} />
                  </motion.button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LeaderboardTab  (with Supabase Realtime)
// ─────────────────────────────────────────────────────────────
function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}`;
}

function LeaderboardTab({ myId }: { myId: string }) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    const supabase = createClient();
    const { data } = await (supabase as any)
      .from("profiles")
      .select("id, username, total_points, level")
      .order("total_points", { ascending: false })
      .limit(10);
    setRows((data ?? []) as LeaderboardRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaderboard();

    // Realtime: refresh whenever any profile's points change
    const supabase = createClient();
    const channel = supabase
      .channel("leaderboard-watch")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLeaderboard]);

  if (loading) return <div className="flex justify-center pt-10"><span className="text-slate-400 text-sm">Loading…</span></div>;

  const top3 = rows.slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* Podium */}
      {top3.length >= 3 && (
        <div className="bg-gradient-to-b from-amber-50 to-white border-b border-amber-100 px-4 py-5">
          <div className="flex items-end justify-center gap-4">
            {[top3[1], top3[0], top3[2]].map((row, i) => {
              const realRank = i === 0 ? 2 : i === 1 ? 1 : 3;
              const heights = ["h-20", "h-28", "h-16"];
              const sizes = ["w-12 h-12", "w-16 h-16", "w-12 h-12"];
              const colors = ["bg-slate-200", "bg-amber-100 ring-2 ring-amber-400", "bg-orange-100"];
              const textColors = ["text-slate-600", "text-amber-700", "text-orange-600"];
              const isMe = row.id === myId;
              return (
                <div key={row.id} className="flex flex-col items-center gap-1">
                  <div className={`${sizes[i]} rounded-full ${isMe ? "bg-sky-600 ring-2 ring-sky-300" : colors[i]} flex items-center justify-center`}>
                    <span className={`font-black text-sm ${isMe ? "text-white" : textColors[i]}`}>{row.username.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <span className="text-xl">{rankBadge(realRank)}</span>
                  <p className="text-slate-700 text-xs font-bold text-center w-16 truncate">{row.username}</p>
                  <p className="text-slate-400 text-[10px]">{row.total_points.toLocaleString()}</p>
                  <div className={`w-16 ${heights[i]} rounded-t-xl ${i === 1 ? "bg-amber-400" : "bg-slate-200"}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full list */}
      <div className="flex flex-col gap-2 p-4 pb-safe">
        {rows.length === 0 && <p className="text-center text-slate-400 text-sm pt-8">No users yet — be the first!</p>}
        {rows.map((row, i) => {
          const rank = i + 1;
          const isMe = row.id === myId;
          return (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.03 }}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                isMe ? "bg-sky-50 border-sky-200" : rank <= 3 ? "bg-amber-50 border-amber-100" : "bg-white border-slate-100"
              }`}
            >
              <div className="w-8 text-center">
                <span className={`font-black ${rank <= 3 ? "text-lg" : "text-slate-400 text-sm"}`}>{rankBadge(rank)}</span>
              </div>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm ${isMe ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                {row.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${isMe ? "text-sky-700" : "text-slate-800"}`}>
                  {row.username}{isMe && <span className="text-sky-400 text-xs font-normal ml-1">(you)</span>}
                </p>
                <p className="text-slate-400 text-xs">Level {row.level}</p>
              </div>
              <div className="flex items-center gap-1">
                <Trophy size={12} className="text-amber-500" />
                <span className="text-slate-700 font-bold text-sm">{row.total_points.toLocaleString()}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CommunityTab  (activity feed — static for now)
// ─────────────────────────────────────────────────────────────
const FEED = [
  { id: "f1", user: "Siti J.",  action: "completed Trash Bingo in Monas zone",      time: "2m ago",  emoji: "🎯", pts: 100 },
  { id: "f2", user: "Budi C.",  action: "did a 7-step handwash at Kota Tua module", time: "15m ago", emoji: "🤲", pts: 75  },
  { id: "f3", user: "Rini W.",  action: "reported a clogged drain in Gambir",        time: "1h ago",  emoji: "📋", pts: 50  },
  { id: "f4", user: "Adi G.",   action: "RSVPed to Kali Ciliwung Cleanup",           time: "2h ago",  emoji: "🧹", pts: 0   },
  { id: "f5", user: "Dewi E.",  action: "reached Level 5!",                          time: "3h ago",  emoji: "⭐", pts: 0   },
] as const;

function CommunityTab() {
  return (
    <div className="flex flex-col gap-2.5 p-4 pb-safe">
      {FEED.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: i * 0.04 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center font-black text-sm text-sky-700 flex-none">
            {item.user.split(" ")[0][0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 text-sm">
              <span className="font-bold">{item.user}</span>{" "}
              <span className="text-slate-500">{item.action}</span>
              {" "}<span className="text-lg">{item.emoji}</span>
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-slate-300 text-xs">{item.time}</span>
              {item.pts > 0 && <span className="text-amber-500 text-xs font-bold">+{item.pts} pts</span>}
            </div>
          </div>
        </motion.div>
      ))}
      <p className="text-center text-slate-300 text-xs pt-2">Live community feed coming in the next update</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function SocialPage() {
  const [tab, setTab] = useState<Tab>("leaderboard");
  const [myId, setMyId] = useState("");

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session) setMyId(session.user.id);
    });
  }, []);

  return (
    <div className="flex flex-col min-h-full bg-[#F0F9FF]">
      {/* Header */}
      <div className="bg-white px-4 pb-3 pt-10 border-b border-slate-100">
        <h1 className="text-slate-900 font-black text-xl mb-3">Community</h1>
        {/* Segmented control */}
        <div className="grid grid-cols-4 bg-slate-100 rounded-[14px] p-1 gap-0.5">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-0.5 py-1.5 rounded-[10px] transition-all ${
                tab === id ? "bg-white shadow-sm text-sky-600" : "text-slate-400"
              }`}
            >
              <Icon size={14} className={tab === id ? "text-sky-600" : "text-slate-400"} />
              <span className={`text-[10px] font-bold ${tab === id ? "text-sky-600" : "text-slate-400"}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {tab === "events"      && <EventsTab      myId={myId} />}
            {tab === "friends"     && <FriendsTab     myId={myId} />}
            {tab === "leaderboard" && <LeaderboardTab myId={myId} />}
            {tab === "community"   && <CommunityTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
