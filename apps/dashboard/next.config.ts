import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// Load root .env.local so Next picks up shared env values in monorepo
const envPath = path.resolve(__dirname, "../../.env.local");
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith("#")) return;
    const idx = line.indexOf("=");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key) process.env[key] = val;
  });
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
