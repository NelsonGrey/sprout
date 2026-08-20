import { WifiOff } from 'lucide-react';

/** Honest "can't record right now" notice for a transaction composer while
 * offline — see 05_IMPLEMENTATION_HANDOFF.md's Slice 2 stop condition:
 * "If idempotent queueing is not complete, show 'Reconnect to record' and
 * do not report queued success." This app doesn't queue writes locally
 * yet, so the composer disables its own submit action entirely rather
 * than accepting a draft it can't actually send. */
export function OfflineNotice() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning">
      <WifiOff size={16} className="shrink-0" />
      <span>You&rsquo;re offline. Reconnect to record this transaction.</span>
    </div>
  );
}
