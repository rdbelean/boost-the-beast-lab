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
import SampleShowcase from "@/components/landing/SampleShowcase";
import WearableSync from "@/components/landing/WearableSync";
import Products from "@/components/landing/Products";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";

// Landing section-order — Trust-First v2 (deutscher Markt, Premium):
//   Hero               — hook + founder strip + press line
//   TrustBar           — categorical authority strip (Bundesliga, 15+ Jahre)
//   PainPoints         — "we see you" (3 cards + transition to Marco)
//   HowItWorks         — 3-step mechanism + CTA
//   FounderMarco       — deep authority (the bio)
//   SocialProof        — Castrop/Aydin case studies
//   MarcoExplanation   — personal letter ("Why €39.90?")
//   Substance          — "What's actually in it" facts
//   SampleShowcase     — free sample-report downloads (6 PDFs)
//   WearableSync       — data depth argument
//   Products           — the offer + anchor pricing
//   FAQ                — 7 objection-busting questions
//   FinalCTA           — closing big-CTA section
//
// Note: the 24h money-back guarantee (GuaranteeCard) is intentionally NOT
// rendered on production main. It lives only on the prompt-experiment-v1
// preview branch until the refund process is fully operationalised.
// Marco's letter also ends without the "money back" closer line for the
// same reason — see messages/*.json `marco_explanation.body` (no close_a).
//
// TrustSection.tsx is no longer rendered on Landing — FinalCTA is the new
// closer. The component itself is kept in the repo for now (not deleted)
// in case future pages need it.
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
        <SampleShowcase />
        <WearableSync />
        <Products />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
