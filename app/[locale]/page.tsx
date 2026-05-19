import Header from "@/components/layout/Header";
import ScrollToTop from "@/components/util/ScrollToTop";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/landing/Hero";
import PainPoints from "@/components/landing/PainPoints";
import SolutionReveal from "@/components/landing/SolutionReveal";
import HowItWorks from "@/components/landing/HowItWorks";
import FounderMarco from "@/components/landing/FounderMarco";
import WearableSync from "@/components/landing/WearableSync";
import Products from "@/components/landing/Products";
import SocialProof from "@/components/landing/SocialProof";
import TrustSection from "@/components/landing/TrustSection";

// Landing section-order drives the conversion narrative (Hormozi-style):
//   Hero          — hook ("Your BMI is lying to you")
//   PainPoints    — "we see you" (5 pains the reader nods at)
//   SolutionReveal — "here's the difference" (3 pillars answer)
//   HowItWorks    — the mechanism
//   FounderMarco  — earned trust
//   SocialProof   — 5,0★ + athlete testimonials
//   WearableSync  — data depth argument
//   Products      — the offer + anchor pricing (will become ValueStack in tranche 2)
//   TrustSection  — science/credibility closers
export default function HomePage() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main>
        <Hero />
        <PainPoints />
        <SolutionReveal />
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
