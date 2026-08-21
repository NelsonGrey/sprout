import 'package:flutter/material.dart';

import 'package:sprout/core/models/goal.dart';

/// Previews how a hypothetical spend would change a goal's trail —
/// client-side arithmetic only, never a write. Dart mirror of
/// packages/web/src/features/student/SpendDetourPreview.tsx.
class SpendDetourPreview extends StatefulWidget {
  const SpendDetourPreview({super.key, required this.goal});

  final Goal goal;

  @override
  State<SpendDetourPreview> createState() => _SpendDetourPreviewState();
}

class _SpendDetourPreviewState extends State<SpendDetourPreview> {
  final _amountController = TextEditingController();

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final parsed = double.tryParse(_amountController.text.trim());
    final spendCents = (parsed != null && parsed > 0)
        ? (parsed * 100).round()
        : null;
    final remainingCents = spendCents == null
        ? null
        : (widget.goal.targetCents -
                  (widget.goal.savedCents - spendCents).clamp(
                    0,
                    widget.goal.targetCents,
                  ))
              .clamp(0, widget.goal.targetCents);

    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Try a spend on paper — nothing here is real',
            style: Theme.of(context).textTheme.labelSmall,
          ),
          Row(
            children: [
              const Text('\$'),
              const SizedBox(width: 4),
              SizedBox(
                width: 64,
                child: TextField(
                  key: const Key('spendDetourAmountField'),
                  controller: _amountController,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: const InputDecoration(
                    isDense: true,
                    hintText: '0.00',
                    contentPadding: EdgeInsets.all(8),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
            ],
          ),
          if (remainingCents != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                "You'd still need \$${(remainingCents / 100).toStringAsFixed(2)} more toward ${widget.goal.name}.",
              ),
            ),
        ],
      ),
    );
  }
}
