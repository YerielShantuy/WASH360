"use client";
import { useEffect } from "react";

/** Locks the PWA to portrait. ModuleHandwashSession overrides to landscape while active. */
export default function PortraitLock() {
  useEffect(() => {
    try { (screen.orientation as any).lock("portrait").catch(() => {}); } catch {} // eslint-disable-line @typescript-eslint/no-explicit-any
    return () => {
      try { screen.orientation.unlock(); } catch {}
    };
  }, []);
  return null;
}
