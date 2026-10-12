import ShinyText from './ShinyText';
import { useColorScheme } from './useColorScheme';

/** ShinyText in the site's --text-2 / --text colours (it parses colours itself, so CSS variables won't do). */
export default function StatusShine({ text }: { text: string }) {
  const dark = useColorScheme() === 'dark';
  return (
    <ShinyText
      text={text}
      color={dark ? '#d2d2d7' : '#424245'}
      shineColor={dark ? '#ffffff' : '#0071e3'}
      speed={3}
      delay={2.5}
    />
  );
}
