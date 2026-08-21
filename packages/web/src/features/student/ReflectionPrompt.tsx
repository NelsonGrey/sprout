import { useState } from 'react';
import { Sparkles } from 'lucide-react';

/** A discussion-only reflection prompt — no text input, nothing stored.
 * Reuses the exact "Discuss aloud, nothing saved" pattern from the Learn
 * guided runner (see features/learn/LearnRunPage.tsx's Reflect step): no
 * student reflection data contract (minimization/access/retention/export/
 * deletion) has been approved, so this can never become a text field no
 * matter how natural that might look — see UC-STU-04's "What would you
 * try next?" prompt and 01_EXPERIENCE_FOUNDATIONS.md §9: "The student can
 * skip a written reflection and answer orally to an authorized adult." */
export function ReflectionPrompt({ prompts, defaultOpen = false }: { prompts: string[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left text-sm font-bold text-ink"
      >
        <Sparkles size={15} className="shrink-0 text-brand-bright" />
        What would you try next?
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 pl-6 text-sm text-ink-muted">
          <p>Discuss aloud with an adult — nothing typed here is saved.</p>
          {prompts.map((prompt) => (
            <p key={prompt}>→ {prompt}</p>
          ))}
        </div>
      )}
    </div>
  );
}
