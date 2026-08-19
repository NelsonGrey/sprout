import type { Goal } from '@sprout/shared';
import { PartyPopper, Target, Trash2 } from 'lucide-react';
import { IconButton } from './icon-button';

const CHECKPOINTS = [25, 50, 75];

/** One goal's progress — the "goal trail" from the Build a Goal Trail
 * starter lesson: a bar toward a target with checkpoint marks along the
 * way, not just a bare percentage. Shared between StudentDetailPane
 * (teacher, with a delete control) and MyBalancePage (student, read-only —
 * pass no onDelete). */
export function GoalProgressCard({ goal, onDelete }: { goal: Goal; onDelete?: () => void }) {
  const pct = goal.targetCents > 0 ? Math.min(100, (goal.savedCents / goal.targetCents) * 100) : 0;
  const achieved = goal.savedCents >= goal.targetCents;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-ink">
          <Target size={16} className="shrink-0 text-brand-bright" />
          <span>{goal.name}</span>
          {achieved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-xs font-bold text-brand">
              <PartyPopper size={12} /> Reached!
            </span>
          )}
        </div>
        {onDelete && (
          <IconButton label={`Delete goal ${goal.name}`} variant="secondary" onClick={onDelete}>
            <Trash2 size={14} />
          </IconButton>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        ${(goal.savedCents / 100).toFixed(2)} of ${(goal.targetCents / 100).toFixed(2)} saved
      </p>
      <div className="relative mt-3 h-2 rounded-full bg-bg" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${goal.name} progress`}>
        <div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        {CHECKPOINTS.map((checkpoint) => (
          <span
            key={checkpoint}
            aria-hidden="true"
            className="absolute top-0 h-2 w-px bg-surface"
            style={{ left: `${checkpoint}%` }}
          />
        ))}
      </div>
    </div>
  );
}
