"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/mobile/sign-in");
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-4 px-4 py-4 active:bg-red-50"
      >
        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
          <LogOut size={18} className="text-red-500" />
        </div>
        <span className="flex-1 text-left text-red-500 font-semibold text-sm">Sign Out</span>
      </button>
    </div>
  );
}
