import { useEffect, useState } from 'react';

/** Browser online/offline state — see 01_EXPERIENCE_FOUNDATIONS.md §8.1's
 * "offline with cache"/"offline without cache" view states and
 * 05_IMPLEMENTATION_HANDOFF.md's Slice 2 stop condition: until real
 * idempotent offline queueing is built and tested, a transaction composer
 * must not accept a submission it can't actually send, or imply queued
 * success. This hook only detects the state; callers are responsible for
 * disabling their own submit action and showing honest "reconnect" copy
 * (see C-SYNC-INDICATOR in the shared component inventory). */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
