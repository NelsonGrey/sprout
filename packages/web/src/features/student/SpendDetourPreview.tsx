import { useState } from 'react';
import type { Goal } from '@sprout/shared';
import { Route } from 'lucide-react';

/** Previews how a hypothetical spend would change a goal's trail —
 * client-side arithmetic only, never a write. Matches UC-STU-02's
 * "compare optional spend detour" and 02_RESPONSIVE_WEB_APP.md's
 * W-STUDENT-02: "Spending previews how the goal trail changes without
 * blocking the choice or applying shame." There is deliberately no submit
 * action here — recording a real transaction remains staff-only (see
 * firestore.rules); this is discussion material, same spirit as
 * ReflectionPrompt. */
export function SpendDetourPreview({ goal }: { goal: Goal }) {
  const [amount, setAmount] = useState('');
  const parsed = Number.parseFloat(amount);
  const spendCents = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : null;
  const previewSavedCents = spendCents === null ? null : Math.max(0, goal.savedCents - spendCents);
  const remainingCents = previewSavedCents === null ? null : Math.max(0, goal.targetCents - previewSavedCents);

  return (
    <div className="mt-3 border-t border-border pt-3">
      <label className="flex items-center gap-2 text-xs font-bold text-ink-muted">
        <Route size={14} className="shrink-0 text-accent" />
        Try a spend on paper — nothing here is real
      </label>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-sm text-ink-muted">$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          aria-label={`Preview a spend against ${goal.name}`}
          className="w-20 rounded-md border border-border bg-canvas px-2 py-1 text-sm text-ink"
        />
      </div>
      {remainingCents !== null && (
        <p className="mt-2 text-sm text-ink" aria-live="polite">
          You'd still need ${(remainingCents / 100).toFixed(2)} more toward {goal.name}.
        </p>
      )}
    </div>
  );
}
