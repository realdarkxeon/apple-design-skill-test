import { useEffect, useState } from 'react';

/** Tracks the OS light/dark preference the site's CSS tokens follow. Starts as 'light' on the server. */
export function useColorScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setScheme(query.matches ? 'dark' : 'light');
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return scheme;
}
