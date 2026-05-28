"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Camera, Trophy, User } from "lucide-react";
import { motion } from "framer-motion";

const NAV_LEFT = [
  { href: "/mobile", label: "Home", Icon: Home },
  { href: "/mobile/maps", label: "Maps", Icon: Map },
];
const NAV_RIGHT = [
  { href: "/mobile/social", label: "Social", Icon: Trophy },
  { href: "/mobile/account", label: "Account", Icon: User },
];

function NavItem({ href, label, Icon }: { href: string; label: string; Icon: React.ElementType }) {
  const path = usePathname();
  const active = href === "/mobile" ? path === href : path.startsWith(href);
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 active:opacity-60 min-h-[56px]"
    >
      <Icon size={22} className={active ? "text-sky-600" : "text-slate-400"} strokeWidth={active ? 2.5 : 1.8} />
      <span className={`text-[10px] font-semibold tracking-wide ${active ? "text-sky-600" : "text-slate-400"}`}>
        {label}
      </span>
    </Link>
  );
}

export default function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-100 flex items-end z-50 pb-safe shadow-[0_-4px_20px_rgba(2,132,199,0.08)]">
      {NAV_LEFT.map((item) => <NavItem key={item.href} {...item} />)}

      {/* Camera FAB — elevated amber button */}
      <div className="flex-1 flex justify-center items-end pb-1">
        <Link href="/mobile/camera" aria-label="Camera">
          <motion.div
            whileTap={{ scale: 0.90 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="relative -top-5 w-16 h-16 rounded-full bg-amber-400 shadow-[0px_4px_0px_rgba(0,0,0,0.12),0px_8px_20px_rgba(245,158,11,0.35)] flex items-center justify-center"
          >
            <Camera size={28} className="text-white" strokeWidth={2} />
          </motion.div>
        </Link>
      </div>

      {NAV_RIGHT.map((item) => <NavItem key={item.href} {...item} />)}
    </nav>
  );
}
