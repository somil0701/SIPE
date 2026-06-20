import { LandingNav } from './LandingNav'
import { HeroSection } from './HeroSection'
import { LearningLoopSection } from './LearningLoopSection'
import { FeatureShowcaseSection } from './FeatureShowcaseSection'
import { PlatformFeaturesSection } from './PlatformFeaturesSection'
import { FinalCTASection } from './FinalCTASection'
import { LandingFooter } from './LandingFooter'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <HeroSection />
        <LearningLoopSection />
        <FeatureShowcaseSection />
        <PlatformFeaturesSection />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  )
}
