import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    name: string;
    email: string;
    organization: string;
    role_requested: string;
    reason?: string | null;
  };

  const { name, email, organization, role_requested, reason } = body;

  if (!name || !email || !organization || !role_requested) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Prevent duplicate pending requests for same email
  const { data: existing } = await supabase
    .from("access_requests" as never)
    .select("id, status")
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "A pending request already exists for this email." }, { status: 409 });
  }

  const { error } = await supabase
    .from("access_requests" as never)
    .insert({
      name,
      email,
      organization,
      role_requested,
      reason: reason ?? null,
      status: "pending",
    } as never);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
