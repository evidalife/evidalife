import type { BriefingSlide, Lang } from '@/lib/health-engine';
import WelcomeSlide from './WelcomeSlide';
import LongevityScoreSlide from './LongevityScoreSlide';
import BioAgeSlide from './BioAgeSlide';
import DomainSlide from './DomainSlide';
import ClosingSlide from './ClosingSlide';

export default function SlideCard({ slide, lang }: { slide: BriefingSlide; lang: Lang }) {
  switch (slide.data.type) {
    case 'welcome':
      return <WelcomeSlide data={slide.data} lang={lang} />;
    case 'longevity_score':
      return <LongevityScoreSlide data={slide.data} lang={lang} />;
    case 'bio_age_score':
      return <BioAgeSlide data={slide.data} lang={lang} />;
    case 'domain_summary':
      return <DomainSlide data={slide.data} lang={lang} />;
    case 'closing':
      return <ClosingSlide data={slide.data} lang={lang} />;
    default:
      return null;
  }
}
