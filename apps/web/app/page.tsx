import { DisclaimerSection } from '@/components/landing/disclaimer-section';
import { HeroSection } from '@/components/landing/hero-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { WhySection } from '@/components/landing/why-section';
import { Footer } from '@/components/ui/footer';
import { NavHeader } from '@/components/ui/nav-header';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <WhySection />
        <DisclaimerSection />
      </main>
      <Footer />
    </div>
  );
}
