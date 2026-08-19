# Sprout Streak mobile

The shared Flutter application for four required form factors:

- Apple iPhone
- Apple iPad
- Google Android phone
- Google Android tablet

The application uses `SproutTheme.light` from
`lib/design_system/sprout_theme.dart`, matching the public and authenticated
web palette. `SproutLayout` defines the phone/tablet/wide breakpoints,
20/32/48px responsive gutters, and the universal 1280px content boundary.
Use `SproutResponsiveBody` for new screens instead of introducing one-off
maximum widths.

## Validation

```bash
flutter analyze --no-fatal-infos
flutter test
```

A shared Flutter codebase does not by itself establish tablet readiness.
Release QA must separately cover iPhone, iPad, Android phone, and Android
tablet dimensions, including portrait/landscape, text scaling, keyboard and
safe-area behavior, overflow, touch targets, and VoiceOver/TalkBack.
