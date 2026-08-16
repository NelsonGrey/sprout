// Shared Firebase utilities for Firebase-first architecture.
//
// Only client-safe (browser) exports go through this barrel — server.ts
// (Admin SDK) is intentionally NOT re-exported here so packages/web never
// pulls firebase-admin (and its Node-only deps) into a browser bundle.
// The sprout-functions companion repo can import server.ts's compiled
// output directly if it wants these helpers, or use firebase-admin itself.
export { FirebaseClient } from './client.js';
export type { FirebaseConfig } from './client.js';
export {
  AuthHelpers,
  FunctionsHelpers,
  StorageHelpers
} from './client.js';
