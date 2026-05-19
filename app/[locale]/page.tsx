import Header from "@/components/layout/Header";
import ScrollToTop from "@/components/util/ScrollToTop";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import PainPoints from "@/components/landing/PainPoints";
import HowItWorks from "@/components/landing/HowItWorks";
import FounderMarco from "@/components/landing/FounderMarco";
import WearableSync from "@/components/landing/WearableSync";
import Products from "@/components/landing/Products";
import SocialProof from "@/components/landing/SocialProof";
import TrustSection from "@/components/landing/TrustSection";

// Landing section-order — Trust-First v2 (deutscher Markt, Premium):
//   Hero          — hook + marco-mini-card + press line
//   TrustBar      — categorical authority strip (Bundesliga, 15+ Jahre)
//   PainPoints    — "we see you" (3 cards + transition to Marco)
//   HowItWorks    — 3-step mechanism + CTA
//   FounderMarco  — deep authority (the bio)
//   SocialProof   — 5,0★ + Castrop/Aydin case studies
//   WearableSync  — data depth argument
//   Products      — the offer + anchor pricing (GuaranteeCard joins in tranche 2B)
//   TrustSection  — science/credibility closers (will be unhooked in tranche 2C
//                   when FinalCTA replaces it)
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
        <WearableSync />
        <Products />
        <TrustSection />
      </main>
      <Footer />
    </>
  );
}
