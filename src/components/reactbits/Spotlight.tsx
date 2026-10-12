import type { CSSProperties, ReactNode } from 'react';
import SpotlightCard from './SpotlightCard';
import { useColorScheme } from './useColorScheme';

interface Props {
  children?: ReactNode;
  className?: string;
}

/** SpotlightCard dressed in the site's own surface, hairline and shadow tokens; the light is the accent blue. */
export default function Spotlight({ children, className }: Props) {
  const scheme = useColorScheme();
  return (
    <SpotlightCard
      className={className}
      theme={scheme}
      spotlightColor={scheme === 'dark' ? '#2997ff' : '#0071e3'}
      intensity={scheme === 'dark' ? 0.14 : 0.32}
      spotlightSize={320}
      borderGlow={0.7}
      style={
        {
          '--spotlight-card-surface': 'var(--bg-raised)',
          '--spotlight-card-border': 'var(--separator)',
          '--spotlight-card-shadow': 'var(--shadow-sm)',
        } as CSSProperties
      }
    >
      {children}
    </SpotlightCard>
  );
}
