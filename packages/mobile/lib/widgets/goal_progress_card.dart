import 'package:flutter/material.dart';

import 'package:sprout/core/models/goal.dart';
import 'package:sprout/design_system/sprout_theme.dart';

const _checkpoints = [0.25, 0.5, 0.75];
const _defaultRatePercent = '5';

/// One goal's progress — the "goal trail" from the Build a Goal Trail
/// starter lesson: a bar toward a target with checkpoint marks along the
/// way, not just a bare percentage. Mirrors
/// packages/web/src/components/ui/goal-progress-card.tsx. Shared between
/// the teacher-facing student ledger (with delete + "Interest Joins the
/// Team"'s apply-interest control) and a future student self-view
/// (read-only — pass neither onDelete nor onApplyInterest).
class GoalProgressCard extends StatefulWidget {
  const GoalProgressCard({
    super.key,
    required this.goal,
    this.onDelete,
    this.onApplyInterest,
  });

  final Goal goal;
  final VoidCallback? onDelete;
  final ValueChanged<double>? onApplyInterest;

  @override
  State<GoalProgressCard> createState() => _GoalProgressCardState();
}

class _GoalProgressCardState extends State<GoalProgressCard> {
  final _rateController = TextEditingController(text: _defaultRatePercent);

  @override
  void dispose() {
    _rateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final goal = widget.goal;
    final pct = goal.targetCents > 0
        ? (goal.savedCents / goal.targetCents).clamp(0, 1).toDouble()
        : 0.0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.flag,
                  size: 16,
                  color: SproutColors.brandBright,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    goal.name,
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ),
                if (goal.achieved)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: SproutColors.mint,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text(
                      'Reached!',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: SproutColors.brand,
                      ),
                    ),
                  ),
                if (widget.onDelete != null)
                  IconButton(
                    key: Key('deleteGoalButton-${goal.id}'),
                    icon: const Icon(Icons.delete_outline, size: 18),
                    tooltip: 'Delete goal ${goal.name}',
                    onPressed: widget.onDelete,
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                '\$${(goal.savedCents / 100).toStringAsFixed(2)} of \$${(goal.targetCents / 100).toStringAsFixed(2)} saved',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: pct,
                          minHeight: 8,
                          semanticsLabel: '${goal.name} progress',
                          semanticsValue: '${(pct * 100).round()}%',
                        ),
                      ),
                      for (final checkpoint in _checkpoints)
                        Positioned(
                          left: checkpoint * constraints.maxWidth,
                          child: Container(
                            width: 1,
                            height: 8,
                            color: SproutColors.surface,
                          ),
                        ),
                    ],
                  );
                },
              ),
            ),
            if (widget.onApplyInterest != null)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Row(
                  children: [
                    const Icon(
                      Icons.trending_up,
                      size: 16,
                      color: SproutColors.info,
                    ),
                    const SizedBox(width: 6),
                    SizedBox(
                      width: 56,
                      child: TextField(
                        key: Key('interestRateField-${goal.id}'),
                        controller: _rateController,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: const InputDecoration(
                          isDense: true,
                          contentPadding: EdgeInsets.all(8),
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Text('%', style: TextStyle(fontSize: 12)),
                    const Spacer(),
                    OutlinedButton(
                      key: Key('applyInterestButton-${goal.id}'),
                      onPressed: goal.savedCents <= 0
                          ? null
                          : () {
                              final rate = double.tryParse(
                                _rateController.text.trim(),
                              );
                              if (rate != null) widget.onApplyInterest!(rate);
                            },
                      child: const Text('Apply interest'),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
