import MobileBottomNav from "@/components/mobile/BottomNav";
import OnboardingSlides from "@/components/mobile/OnboardingSlides";
import PointsFloatOverlay from "@/components/mobile/PointsFloatOverlay";
import PwaInstallBanner from "@/components/mobile/PwaInstallBanner";

export default function MobileAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex-1 pb-20 min-h-0">
        {children}
      </main>
      <MobileBottomNav />
      <OnboardingSlides />
      <PointsFloatOverlay />
      <PwaInstallBanner />
    </>
  );
}
