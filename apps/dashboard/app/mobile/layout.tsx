import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "WASH360",
  description: "Gamified water hygiene & environmental civic-tech app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WASH360",
  },
};

export const viewport: Viewport = {
  themeColor: "#0284C7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function MobileRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 max-w-[430px] mx-auto shadow-2xl relative">
      {children}
    </div>
  );
}
