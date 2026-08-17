import { useEffect, useState } from 'react';

type ThemeName = 'path' | 'balance';

const STORAGE_KEY = 'sprout-theme-comparison';

function applyTheme(theme: ThemeName) {
  if (theme === 'balance') {
    document.documentElement.dataset.theme = 'balance';
  } else {
    delete document.documentElement.dataset.theme;
  }
}

/** TEMPORARY comparison scaffolding — lets the two brand-concept palettes
 * (see /assets/brand-concepts) be flipped live in the running app so a
 * direction can be picked before committing to a full site-wide reskin.
 * Remove this component (and index.css's [data-theme="balance"] block)
 * once that decision is made. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>('path');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    const initial = stored === 'balance' ? 'balance' : 'path';
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const choose = (next: ThemeName) => {
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <div className="flex items-center rounded-full border border-border bg-surface p-0.5 text-xs">
      <button
        type="button"
        onClick={() => choose('path')}
        className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
          theme === 'path' ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
        }`}
      >
        Path
      </button>
      <button
        type="button"
        onClick={() => choose('balance')}
        className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
          theme === 'balance' ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
        }`}
      >
        Balance
      </button>
    </div>
  );
}
