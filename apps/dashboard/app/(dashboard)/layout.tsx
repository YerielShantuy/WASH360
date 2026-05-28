import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import Sidebar from "@/components/ui/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/sign-in");
  }

  // Verify council role
  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { role: string; username: string } | null;

  if (profile?.role !== "council" && profile?.role !== "admin") {
    redirect("/sign-in");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar username={profile?.username ?? user.email ?? ""} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
