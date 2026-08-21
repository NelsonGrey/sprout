import { Volume2 } from 'lucide-react';

/** Reads `text` aloud via the browser's native Web Speech API — the
 * "optional text-to-speech" pairing 01_EXPERIENCE_FOUNDATIONS.md §9
 * requires alongside icon+text for early-reader controls ("icon-only
 * meaning is insufficient"). Renders nothing when unsupported (older
 * Safari/Firefox configurations) rather than showing a dead button. */
export function ReadAloudButton({ text }: { text: string }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  return (
    <button
      type="button"
      onClick={() => {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
      }}
      aria-label={`Read aloud: ${text}`}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-mint p-2 text-brand"
    >
      <Volume2 size={16} />
    </button>
  );
}
