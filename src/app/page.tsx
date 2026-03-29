import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import UpcomingEventsSection from "@/components/UpcomingEventsSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen nexus-animated-bg text-slate-900">
      <Navbar />
      <HeroSection />
      <UpcomingEventsSection />
      <TestimonialsSection />
      <Footer />
    </main>
  );
}