import type { SpendCategory } from '@sprout/shared';
import { CircleCheck, Heart, Shuffle } from 'lucide-react';

const config: Record<SpendCategory, { text: string; icon: typeof CircleCheck; className: string }> = {
  need: { text: 'Need', icon: CircleCheck, className: 'bg-info-soft text-info' },
  want: { text: 'Want', icon: Heart, className: 'bg-accent-soft text-accent' },
  both: { text: 'It depends', icon: Shuffle, className: 'bg-warning-soft text-warning' },
};

/** Small pill shown next to a 'spend' transaction that's been categorized
 * as a need, a want, or "it depends" — the sorting exercise from the Need,
 * Want, or Both? starter lesson, so a purchase is recorded as a reasoned
 * choice, not just an amount. Shared between StudentDetailPane (teacher)
 * and MyBalancePage (student), mirroring SavingsLabelBadge. */
export function SpendCategoryBadge({ category }: { category: SpendCategory }) {
  const { text, icon: Icon, className } = config[category];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>
      <Icon size={12} /> {text}
    </span>
  );
}
