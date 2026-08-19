import { useEffect } from 'react';

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = `${title} | Sprout Streak`;
    const tag = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    const previous = tag?.content;
    if (tag) tag.content = description;
    return () => {
      document.title = 'Sprout Streak | Money habits that grow with students';
      if (tag && previous) tag.content = previous;
    };
  }, [description, title]);
}
