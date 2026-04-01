import PublicNavbar from "@/app/components/PublicNavbar";
import SubscribePageContent from "@/app/components/SubscribePageContent";

export default function SubscribePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1f2937_0%,#0b1020_35%,#030712_100%)] text-zinc-100">
      <PublicNavbar />
      <SubscribePageContent />
    </main>
  );
}
