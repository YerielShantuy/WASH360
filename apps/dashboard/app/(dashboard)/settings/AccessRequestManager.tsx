"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase";

type RequestStatus = "pending" | "approved" | "rejected";

type AccessRequest = {
  id: string;
  email: string;
  name: string;
  organization: string;
  role_requested: string;
  reason: string | null;
  status: RequestStatus;
  created_at: string;
};

const statusColor: Record<RequestStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AccessRequestManager() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("access_requests" as never)
      .select("id, email, name, organization, role_requested, reason, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setRequests((data as AccessRequest[] | null) ?? []);
        setLoading(false);
      });
  }, []);

  function handleAction(id: string, action: "approved" | "rejected") {
    startTransition(async () => {
      const res = await fetch(`/api/access-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: action } : r))
        );
      }
    });
  }

  if (loading) {
    return (
      <div className="px-6 py-8 text-center text-sm text-slate-400">
        Loading requests…
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-sm text-slate-400">
        No access requests yet.
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const reviewed = requests.filter((r) => r.status !== "pending");

  return (
    <div className="divide-y divide-slate-100">
      {pending.length === 0 && (
        <div className="px-6 py-4 text-sm text-slate-400 italic">
          No pending requests.
        </div>
      )}

      {pending.map((r) => (
        <div key={r.id} className="px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-slate-800 truncate">{r.name}</p>
                <span className="text-xs text-slate-400">·</span>
                <p className="text-xs text-slate-500 truncate">{r.email}</p>
              </div>
              <p className="text-xs text-slate-500 mb-1">
                <span className="font-medium text-slate-600">{r.organization}</span>
                {" — "}
                <span className="capitalize">{r.role_requested}</span>
                {" · "}
                {timeAgo(r.created_at)}
              </p>
              {r.reason && (
                <p className="text-xs text-slate-500 line-clamp-2 mt-1 bg-slate-50 rounded px-2.5 py-1.5">
                  {r.reason}
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleAction(r.id, "approved")}
                disabled={isPending}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => handleAction(r.id, "rejected")}
                disabled={isPending}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}

      {reviewed.length > 0 && (
        <>
          <div className="px-6 py-2.5 bg-slate-50">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Previously reviewed
            </p>
          </div>
          {reviewed.map((r) => (
            <div key={r.id} className="px-6 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">
                  {r.name}{" "}
                  <span className="text-slate-400 font-normal text-xs">({r.email})</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{r.organization} · {timeAgo(r.created_at)}</p>
              </div>
              <span className={`shrink-0 inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[r.status]}`}>
                {r.status}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
