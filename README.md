# Exercise Your Demons

A quiet, thumb-friendly iPhone workout log for driver conditioning, built with Expo, TypeScript, Effect and Bun.

**Status: working local preview, not a TestFlight release.** No backend, accounts, credentials or live AI calls.

## Run locally

Use Bun 1.3.2 and a compatible Node installation. Validation currently runs with Node 26.7.0.

```sh
bun install --frozen-lockfile
bun run web
```

Open the local address printed by Expo. `bun start` also starts native development tooling. Choosing the native app identity, signing and physical-device validation is a separate next step.

## In this preview

- Motorsport Strength & Stamina, with four training-day templates and two upper-body sets per exercise on Friday.
- Logging for loaded/bodyweight/assisted reps, carries in metres, neck holds and cycling phases.
- Pounds with visible per-hand versus total load. No invented starting weights or personal history.
- Preserved session prescriptions, undo, deliberate omissions and explicit early finishes.
- SQLite on native, browser-local storage for the web preview, and restart recovery.
- Optional rest timers and full-session time estimates, including setup, rest and stretching.
- A simulated seven-day review that can only recommend holding the programme steady. Acceptance checks the journal revision.

## Validate

```sh
bun run check
bunx playwright install chromium
bun run test:e2e
bun run export:ios
bun expo install --check
```

Tests include real SQLite operations, failure recovery, generated roundtrips, and iPhone-sized browser flows. An iOS bundle export does not prove the app works on an iPhone.

## Still ahead

Physical iPhone testing, individual ramp-up set entries, calendar scheduling, richer workout feedback, HealthKit imports, real progression proposals and TestFlight. Warm-up is currently recorded as one preparation block. Browser startup needs the development server, it is not an offline-installable PWA.

Do not rely on this preview as the only copy of real training history. Backup controls have been removed from History at the user's request. The tested export/restore service remains, but there is currently no in-app backup interface. Native recovery, upgrades, keyboard reach, Dynamic Type and VoiceOver still need device checks.

## Project notes

- [Resume work: prioritized next steps](docs/development/next-steps.md)
- [Local implementation and remaining checks](docs/development/local-app.md)
- [Governing training brief](docs/product/motorsport-training-brief.md)
- [Apple Watch integration proposal](docs/research/apple-watch-integration.md)
- [Domain glossary](CONTEXT.md)
- [Research and direction](docs/research/workout-app-direction.md)

This repository is public. Keep real workout backups, health data, credentials and signing files outside tracked files.
