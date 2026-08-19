import type { SavingsLabel } from '@sprout/shared';
import { Target, Umbrella } from 'lucide-react';

const config: Record<SavingsLabel, { text: string; icon: typeof Target; className: string }> = {
  goal: { text: 'Goal', icon: Target, className: 'bg-mint text-brand' },
  just_in_case: { text: 'Just in case', icon: Umbrella, className: 'bg-info-soft text-info' },
};

/** Small pill shown next to an 'earn' transaction that's been tagged as
 * saved toward something vs. held in reserve — the labeling called for by
 * the Goal Trail / Plan for the Unexpected starter lessons. Shared between
 * the teacher-facing (StudentDetailPane) and student-facing (MyBalancePage)
 * history lists so the two stay visually consistent. */
export function SavingsLabelBadge({ label }: { label: SavingsLabel }) {
  const { text, icon: Icon, className } = config[label];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>
      <Icon size={12} /> {text}
    </span>
  );
}
