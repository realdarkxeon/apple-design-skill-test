import Aurora from './Aurora';
import { useColorScheme } from './useColorScheme';

/** Soft aurora behind the hero, tuned per colour scheme so it stays a backdrop, not a feature. */
export default function HeroAurora() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return (
    <Aurora
      key={scheme}
      className="hero-aurora"
      colorStops={dark ? ['#0a3d91', '#0071e3', '#6e4bd8'] : ['#9cc8ff', '#c9b8ff', '#9fe3ff']}
      lightMode={!dark}
      amplitude={0.9}
      blend={0.55}
      speed={0.6}
      height={0.55}
      opacity={dark ? 0.75 : 0.6}
    />
  );
}
