import MobileBottomNav from "@/components/mobile/BottomNav";

export default function MobileAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex-1 pb-20 min-h-0">
        {children}
      </main>
      <MobileBottomNav />
    </>
  );
}
