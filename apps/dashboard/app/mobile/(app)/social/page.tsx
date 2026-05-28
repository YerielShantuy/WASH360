"use client";
import { useState } from "react";
import { Trophy, Users, Calendar, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { useEffect } from "react";
import { DEMO_EVENTS } from "@/lib/mobileMockData";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

type Tab = "events" | "friends" | "leaderboard" | "community";

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "events", label: "Events", Icon: Calendar },
  { id: "friends", label: "Friends", Icon: Users },
  { id: "leaderboard", label: "Ranks", Icon: Trophy },
  { id: "community", label: "Feed", Icon: Globe },
];

function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}`;
}

type LeaderboardRow = { id: string; username: string; total_points: number; level: number };

function LeaderboardTab({ myId }: { myId: string }) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (supabase as Parameters<typeof supabase.from>[0] extends string ? typeof supabase : never)
      .from("profiles")
      .select("id, username, total_points, level")
      .order("total_points", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setRows((data ?? []) as LeaderboardRow[]);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center pt-10"><span className="text-slate-400 text-sm">Loading...</span></div>;

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
              return (
                <div key={row.id} className="flex flex-col items-center gap-1">
                  <div className={`${sizes[i]} rounded-full ${colors[i]} flex items-center justify-center`}>
                    <span className={`font-black text-sm ${textColors[i]}`}>{row.username.slice(0, 2).toUpperCase()}</span>
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
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${isMe ? "bg-sky-50 border-sky-200" : rank <= 3 ? "bg-amber-50 border-amber-100" : "bg-white border-slate-100"}`}
            >
              <div className="w-8 text-center">
                <span className={`font-black ${rank <= 3 ? "text-lg" : "text-slate-400 text-sm"}`}>{rankBadge(rank)}</span>
              </div>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm ${isMe ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                {row.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${isMe ? "text-sky-700" : "text-slate-800"}`}>
                  {row.username} {isMe && <span className="text-sky-400 text-xs font-normal">(you)</span>}
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

function EventsTab() {
  return (
    <div className="flex flex-col gap-3 p-4 pb-safe">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
        {["All", "Cleanup", "Hygiene", "Water"].map((f, i) => (
          <button key={f} className={`flex-none px-3 py-1.5 rounded-full text-xs font-bold ${i === 0 ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-500"}`}>
            {f}
          </button>
        ))}
      </div>

      {DEMO_EVENTS.map((ev, i) => (
        <motion.div
          key={ev.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: i * 0.05 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-3"
        >
          <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center text-3xl flex-none">
            {ev.category === "cleanup" ? "🧹" : ev.category === "hygiene" ? "🧼" : "💧"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 font-bold text-sm leading-tight">{ev.title}</p>
            <p className="text-slate-400 text-xs mt-0.5">{ev.location}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-slate-400 text-xs">{new Date(ev.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
              <span className="text-slate-200">·</span>
              <span className="text-sky-600 text-xs font-semibold">{ev.attendees} going</span>
            </div>
          </div>
          <button className="self-center border border-sky-500 text-sky-600 text-xs font-bold px-3 py-1.5 rounded-xl">
            RSVP
          </button>
        </motion.div>
      ))}
    </div>
  );
}

function FriendsTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 pt-16 px-6">
      <Users size={48} className="text-slate-200" />
      <div className="text-center">
        <p className="text-slate-700 font-bold text-base">Friends Coming Soon</p>
        <p className="text-slate-400 text-sm mt-1 leading-relaxed">Add friends to see their activities and challenge each other on cleanups!</p>
      </div>
      <button className="bg-sky-600 text-white font-bold px-6 py-3 rounded-xl text-sm">
        Invite Friends
      </button>
    </div>
  );
}

function CommunityTab() {
  const FEED = [
    { id: "f1", user: "Siti J.", action: "completed a Trash Bingo in Monas zone", time: "2m ago", emoji: "🎯", pts: 100 },
    { id: "f2", user: "Budi C.", action: "did a 7-step handwash at Kota Tua module", time: "15m ago", emoji: "🤲", pts: 75 },
    { id: "f3", user: "Rini W.", action: "reported a clogged drain in Gambir", time: "1h ago", emoji: "📋", pts: 50 },
    { id: "f4", user: "Adi G.", action: "RSVPed to Kali Ciliwung Cleanup", time: "2h ago", emoji: "🧹", pts: 0 },
    { id: "f5", user: "Dewi E.", action: "reached Level 5!", time: "3h ago", emoji: "⭐", pts: 0 },
  ];

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
    </div>
  );
}

export default function SocialPage() {
  const [tab, setTab] = useState<Tab>("leaderboard");
  const [myId, setMyId] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
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
                tab === id
                  ? "bg-white shadow-sm text-sky-600"
                  : "text-slate-400"
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
            {tab === "events" && <EventsTab />}
            {tab === "friends" && <FriendsTab />}
            {tab === "leaderboard" && <LeaderboardTab myId={myId} />}
            {tab === "community" && <CommunityTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
