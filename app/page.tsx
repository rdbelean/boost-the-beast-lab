import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import WearableSync from "@/components/landing/WearableSync";
import Products from "@/components/landing/Products";
import TrustSection from "@/components/landing/TrustSection";
export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <WearableSync />
        <Products />
        <TrustSection />
      </main>
      <Footer />
    </>
  );
}
