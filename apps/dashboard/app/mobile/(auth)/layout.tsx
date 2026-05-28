// Auth pages: no bottom nav, just the mobile shell
export default function MobileAuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex-1">{children}</div>;
}
