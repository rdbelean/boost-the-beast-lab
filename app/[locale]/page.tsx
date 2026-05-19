import Header from "@/components/layout/Header";
import ScrollToTop from "@/components/util/ScrollToTop";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import PainPoints from "@/components/landing/PainPoints";
import HowItWorks from "@/components/landing/HowItWorks";
import FounderMarco from "@/components/landing/FounderMarco";
import SocialProof from "@/components/landing/SocialProof";
import MarcoExplanation from "@/components/landing/MarcoExplanation";
import Substance from "@/components/landing/Substance";
import WearableSync from "@/components/landing/WearableSync";
import Products from "@/components/landing/Products";
import GuaranteeCard from "@/components/landing/GuaranteeCard";
import TrustSection from "@/components/landing/TrustSection";

// Landing section-order — Trust-First v2 (deutscher Markt, Premium):
//   Hero               — hook + founder strip + press line
//   TrustBar           — categorical authority strip (Bundesliga, 15+ Jahre)
//   PainPoints         — "we see you" (3 cards + transition to Marco)
//   HowItWorks         — 3-step mechanism + CTA
//   FounderMarco       — deep authority (the bio)
//   SocialProof        — Castrop/Aydin case studies
//   MarcoExplanation   — personal letter ("Why €39.90?")  ← tranche 2B
//   Substance          — "What's actually in it" facts     ← tranche 2B
//   WearableSync       — data depth argument
//   Products           — the offer + anchor pricing
//   GuaranteeCard      — 24h money-back risk-reversal      ← tranche 2B
//   TrustSection       — science/credibility closers (removed in 2C)
export default function HomePage() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <PainPoints />
        <HowItWorks />
        <FounderMarco />
        <SocialProof />
        <MarcoExplanation />
        <Substance />
        <WearableSync />
        <Products />
        <GuaranteeCard />
        <TrustSection />
      </main>
      <Footer />
    </>
  );
}
