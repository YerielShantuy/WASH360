"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  LayoutDashboard,
  Droplets,
  Trash2,
  AlertTriangle,
  Cpu,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/water-quality", label: "Water Quality", icon: Droplets },
  { href: "/trash", label: "Trash Data", icon: Trash2 },
  { href: "/reports", label: "Reports", icon: AlertTriangle },
  { href: "/modules", label: "Modules", icon: Cpu },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  return (
    <aside className="w-60 bg-[#0F172A] flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0284C7] flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">WASH360</p>
            <p className="text-slate-400 text-xs">Council Portal</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Main navigation">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px] ${
                active
                  ? "bg-[#0284C7]/20 text-[#38BDF8] border-l-2 border-[#0284C7]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border-l-2 border-transparent"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="px-3 py-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-medium">
              {username[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
          <span className="text-slate-300 text-sm truncate">{username}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors min-h-[44px]"
          aria-label="Sign out"
        >
          <LogOut size={18} className="shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
