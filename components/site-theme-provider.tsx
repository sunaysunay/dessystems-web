'use client';
import { useEffect } from 'react';

const THEME_CLASSES = ['site-hyper-clean', 'site-swiss-minimal', 'site-warm-editorial'] as const;

export function SiteThemeProvider() {
  useEffect(() => {
    fetch('/api/bop/sys/theme-config')
      .then(r => r.json())
      .then(j => {
        const theme = j.theme ?? 'hyper-clean';
        const cls = `site-${theme}`;
        const html = document.documentElement;
        THEME_CLASSES.forEach(c => html.classList.remove(c));
        if (cls !== 'site-hyper-clean') html.classList.add(cls);
      })
      .catch(() => {});
  }, []);
  return null;
}
