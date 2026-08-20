import 'package:flutter/material.dart';

import 'package:sprout/design_system/sprout_theme.dart';

/// Honest "can't record right now" notice for a transaction composer while
/// offline — mirrors packages/web/src/components/ui/offline-notice.tsx.
/// See 05_IMPLEMENTATION_HANDOFF.md's Slice 2 stop condition: "If
/// idempotent queueing is not complete, show 'Reconnect to record' and do
/// not report queued success." This app doesn't queue writes locally yet,
/// so the composer disables its own submit action entirely rather than
/// accepting a draft it can't actually send.
class OfflineNotice extends StatelessWidget {
  const OfflineNotice({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: SproutColors.warningSoft,
        border: Border.all(color: SproutColors.warning.withValues(alpha: 0.4)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi_off, size: 16, color: SproutColors.warning),
          const SizedBox(width: 8),
          const Flexible(
            child: Text(
              "You're offline. Reconnect to record this transaction.",
              style: TextStyle(color: SproutColors.warning, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
