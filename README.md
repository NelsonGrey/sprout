# Sprout Streak

Sprout Streak is a subscription-based classroom and family financial-literacy app — a
digital reward/behavior-tracking system with no ads, built for schools and
families rather than the ad-monetized arcade-game portfolio this org also
ships. The repository contains a working web/mobile product foundation,
public stakeholder and curriculum pages, school/classroom workflows, and the
implemented Firestore schema and security rules.

## Key Features

The current foundation provides:

- Google, Apple, and email/password authentication paths
- School, classroom, staff-access, roster, student-ledger, and bulk-operation workflows
- A responsive public website with stakeholder, curriculum, readiness, privacy, terms, cookies, and support routes
- Eight original Pre-K–6 starter lessons
- A shared evergreen/mint/coral design system for public web, authenticated web, and Flutter
- Firebase project config for dev/staging/prod, a consolidated backend
  (single `api` Cloud Function behind a Hosting `/api/**` rewrite)
- CI/CD wired to the same `develop` → `staging` → `main` promotion model as
  the org's other apps

## Getting Started

This project consists of:
- **Web App**: React 19 + TypeScript + Vite (`packages/web/`)
- **Mobile App**: Flutter app for Apple iPhone/iPad and Google Android
  phone/tablet form factors (`packages/mobile/`)
- **Backend**: Firebase Functions — the live API. Real backend source lives
  in a private companion repo (`NelsonGrey/sprout-functions`);
  `packages/functions/` is gitignored here and must be cloned separately for
  local dev/emulator use:
  ```bash
  git clone https://github.com/NelsonGrey/sprout-functions.git packages/functions
  cd packages/functions && npm ci && npm run build
  ```
- **Shared Libraries**: Common TypeScript types (`packages/shared/`)
- **Firebase Utils**: Client/Admin SDK helper wrappers (`packages/firebase-utils/`)

### Prerequisites
- Node.js 20+
- Flutter SDK 3.24+
- Xcode (for iOS development)
- Android Studio (for Android development)
- Firebase CLI (`npm i -g firebase-tools`)

### Quick Start
```bash
# Install dependencies
npm install

# Start the web dev server
npm run dev

# Run the mobile app
cd packages/mobile && flutter pub get && flutter run

# Run the Firebase emulators (auth/firestore/storage/functions)
npm run emulators
```

### Tests
```bash
npm run test           # web + shared + firebase-utils
npm run test:mobile    # Flutter widget tests
```

## Technical Details

### Architecture
- **Frontend**: React 19 + TypeScript + Vite, Wouter for routing, TanStack
  Query, Radix UI, Tailwind CSS v4
- **Backend**: Firebase Functions (TypeScript) + Firestore, one consolidated
  `api` Cloud Function behind a Hosting `/api/**` rewrite — chosen over a
  standalone-function-per-endpoint model to keep the default public attack
  surface small and centralize auth/dispatch in one place
  (`sprout-functions`'s `src/router.ts`)
- **Mobile**: Flutter, `go_router` for navigation, `provider` for state
- **Design system**: semantic CSS/Tailwind tokens in
  `packages/web/src/index.css` and matching Flutter palette/breakpoints in
  `packages/mobile/lib/design_system/sprout_theme.dart`; one 1280px web
  content boundary with responsive 20/32/48px gutters
- **Auth**: Google + Apple sign-in, both platforms behind an `AuthService`
  interface (`packages/mobile/lib/core/services/auth/`) extracted from the
  org's shared `game-shell` package's auth layer — everything else in
  `game-shell` (AdMob ads, GDPR/ATT consent, IAP ad-removal) was
  deliberately left out, since Sprout Streak is a no-ads subscription product, not
  one of the ad-monetized arcade games that package targets

### System Requirements
- **Browser Support**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile Support**: iPhone/iPad on iOS/iPadOS 16+; Android phones/tablets
  on the project API 21+ minimum. Each form factor requires its own release QA.

### Firebase Projects
Three environments, one Firebase project each — see `.firebaserc`:

| Alias | Project ID |
| --- | --- |
| development (default) | `nelsongrey-sprout-dev` |
| staging | `nelsongrey-sprout-staging` |
| production | `nelsongrey-sprout-prod` |

Config is split across `firebase.json` (staging/prod-strength CSP, used as
the default) and `firebase.dev.json` (lighter headers, used for local/dev
deploys) — deploy with `firebase deploy --config firebase.<env>.json`.

## Automated Deployment

Push to `develop`/`staging`/`main` deploys web hosting to the matching
environment (see `.github/workflows/firebase-hosting-*.yml`); `master-pipeline.yml`
handles build/test/functions-deploy and pulls `sprout-functions` in via a
`FUNCTIONS_REPO_PAT`-authenticated checkout, branch-mapped to the target
environment.

### Manual Deployment
```bash
npm run deploy          # deploy web + functions
npm run deploy:web      # deploy web only
```

## Getting Help

- **Documentation**: this README, plus:
  - [Business Requirements](docs/BUSINESS_REQUIREMENTS.md) — market/competitive analysis (ETM Machine + ClassBank deep dives), personas, revenue model
  - [Technical Requirements](docs/TECHNICAL_REQUIREMENTS.md) — architecture, implementation status, proposed Firestore data model
- **Security**: see `.github/SECURITY.md`

---

© 2026 Sprout Streak, a product of Nelson Grey LLC. All rights reserved.
