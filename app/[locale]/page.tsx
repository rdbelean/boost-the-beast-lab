import Header from "@/components/layout/Header";
import ScrollToTop from "@/components/util/ScrollToTop";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/landing/Hero";
import PainPoints from "@/components/landing/PainPoints";
import HowItWorks from "@/components/landing/HowItWorks";
import FounderMarco from "@/components/landing/FounderMarco";
import WearableSync from "@/components/landing/WearableSync";
import Products from "@/components/landing/Products";
import SocialProof from "@/components/landing/SocialProof";
import TrustSection from "@/components/landing/TrustSection";

// Landing section-order drives the conversion narrative:
//   Hero      — hook
//   PainPoints — "we see you"
//   HowItWorks — the mechanism
//   FounderMarco — who is behind this, earned trust
//   WearableSync — data depth argument
//   Products — the offer + anchor pricing
//   SocialProof — 5,0★ + 3 real testimonials + Google link
//   TrustSection — science/credibility closers
export default function HomePage() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main>
        <Hero />
        <PainPoints />
        <HowItWorks />
        <FounderMarco />
        <WearableSync />
        <Products />
        <SocialProof />
        <TrustSection />
      </main>
      <Footer />
    </>
  );
}
