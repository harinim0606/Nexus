import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen nexus-animated-bg text-slate-900">
      {/* Sticky translucent Navbar with micro interactions */}
      <Navbar />

      {/* Animated Hero and CTA */}
      <HeroSection />

      {/* Feature cards with hover lift and smooth entry */}
      <FeaturesSection />

      {/* Reusable footer */}
      <Footer />
    </main>
  );
}