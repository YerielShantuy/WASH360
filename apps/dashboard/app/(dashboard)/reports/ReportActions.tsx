"use client";

import { useState, useTransition } from "react";

type Status = "pending" | "acknowledged" | "resolved";

async function updateReportStatus(id: string, status: Status) {
  const res = await fetch(`/api/reports/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
}

export function ReportActions({
  reportId,
  currentStatus,
}: {
  reportId: string;
  currentStatus: Status;
}) {
  const [status, setStatus] = useState<Status>(currentStatus);
  const [isPending, startTransition] = useTransition();

  function handleUpdate(next: Status) {
    startTransition(async () => {
      try {
        await updateReportStatus(reportId, next);
        setStatus(next);
      } catch {
        // Silently fail — UI stays in previous state
      }
    });
  }

  if (status === "resolved") {
    return (
      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        Resolved
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {status === "pending" && (
        <button
          onClick={() => handleUpdate("acknowledged")}
          disabled={isPending}
          className="text-xs font-medium text-sky-600 hover:text-sky-700 px-2.5 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors disabled:opacity-50"
        >
          Acknowledge
        </button>
      )}
      {(status === "pending" || status === "acknowledged") && (
        <button
          onClick={() => handleUpdate("resolved")}
          disabled={isPending}
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 px-2.5 py-1 rounded border border-emerald-200 hover:bg-emerald-50 transition-colors disabled:opacity-50"
        >
          Resolve
        </button>
      )}
      {status === "acknowledged" && (
        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          Acknowledged
        </span>
      )}
    </div>
  );
}
