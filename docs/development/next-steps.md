# Resume work: Exercise Your Demons

## Where we stopped

The user approved the current UI in Plannotator after implementation commit `8e63d24` (`Simplify workout setup and clarify cycling guidance`). The next step is physical-iPhone validation, not another general UI redesign.

Implemented:

- Four training-day templates for **Motorsport Strength & Stamina**.
- Manual logging, durable saves, undo, deliberate omissions, completion and history.
- Native SQLite and separate browser-local storage.
- Optional rest timers and a full-session 60-minute budget.
- Friday uses two pull-up sets and two shoulder-press sets automatically.
- Duration drafts start at zero, repetition fields say “Repetitions”, and empty resistance fields have faded placeholders.
- Completed-session review ends normally without asking for an early-finish reason.
- Routine UI contains no preview/development banners. History has no manual backup controls.
- Cycling guidance points to the Zone 2 BPM range on the user's Watch. It does not calculate or import a personal range.

**Watch imports, personalized AI coaching, a backend and TestFlight are not implemented.** The current seven-day review is a deterministic local summary that can only keep the programme unchanged.

Last implementation validation: 16 service/domain tests with real SQLite and 7 browser tests passed, along with formatting, strict TypeScript, Expo dependency compatibility and iOS Hermes bundle export. This is not physical-device or signed-build evidence.

## Start here next time

1. Read the [training brief](../product/motorsport-training-brief.md), [implementation notes](local-app.md) and [Watch integration plan](../research/apple-watch-integration.md).
2. Check Git status before editing. Preserve any unrelated changes.
3. Follow the [README](../../README.md#run-locally) to install pinned dependencies and run the app. Do not assume the previous development server is still running.
4. Begin the iPhone checklist below. Record actual device/build details and observed results before claiming native support is verified.

Keep application code in TypeScript/TSX with Expo, Effect and Bun. Reuse existing domain and service owners. Follow the supplied coding standards, test through real interfaces and do not introduce module mocks. Prefer RepoPrompt for repository work. Do not delegate to subagents.

## 1. Validate on the iPhone

Target: iPhone 15 Pro Max, paired with Apple Watch Ultra 3.

- [ ] Establish a compatible native test path and record the Expo/iOS versions used. Choose native identity and development signing only when needed for that build, with the user present for account steps.
- [ ] Verify numeric keyboards, keyboard dismissal, bottom-button reach, safe areas and scrolling on every logging modality.
- [ ] Check Dynamic Type and VoiceOver, including input labels and completion controls.
- [ ] Log synthetic sessions with networking unavailable after launch. Verify saves, undo, omissions and normal/early completion.
- [ ] Background, lock and terminate the app during a session. Confirm saved results, full-session elapsed time and optional rest deadlines recover correctly.
- [ ] Exercise native SQLite reopen, failed-write and upgrade behaviour. Never reset unreadable history silently.
- [ ] Decide on a recovery/export experience before relying on irreplaceable training history. Export/restore service APIs remain, but the removed History controls should not simply be reinstated. Recovery from an already-corrupt native journal is unresolved.

**Done when:** the core logger passes on the physical device, with failures recorded and fixed. A browser reload or JavaScript bundle export is insufficient.

## 2. Connect recorded Apple Watch workouts

Use the [existing integration plan](../research/apple-watch-integration.md), not a new speculative architecture.

- [ ] Verify compatible pinned versions for the proposed HealthKit bridge and its native dependencies before installation.
- [ ] Create a native development build with HealthKit capability and accurate read-permission descriptions. HealthKit integration cannot run in Expo Go.
- [ ] Read one authorized Functional Strength Training recording and one Indoor Cycling recording from the paired phone.
- [ ] Parse source identifiers, timestamps, recorded duration and available heart-rate measurements at the native boundary.
- [ ] Add explicit recording-to-session matching, with correction/unlinking.
- [ ] Link Wednesday's separate strength and cycling recordings to one app session. Preserve their identities and avoid double-counting elapsed time.
- [ ] Handle unavailable data, delayed sync, duplicate refresh, late samples and source deletion without damaging manual logs.
- [ ] Keep access read-only. Do not write duplicate workouts or infer performed strength sets from Watch recordings.
- [ ] Verify whether configured zone boundaries are accessible. Do not assume heart-rate samples reveal the Watch's Zone 2 settings.

**Done when:** real recordings and available measurements can be linked reliably on the physical phone, while logging still works without Health access.

## 3. Add personalized notes and reviewable progression

The user wants exercise notes to become useful coaching based on Watch metrics and actual repetitions, sets, loads and quality reports. This is a confirmed requirement, not an active feature.

- [ ] Design persisted proposals, their supporting evidence, freshness and explicit acceptance before allowing programme changes.
- [ ] Keep missing metrics, effort, equipment increments and zone boundaries unknown. Do not fabricate BPM targets, readiness or technique scores.
- [ ] Generate concise, exercise-specific notes with an inspectable reason. Keep ordinary cues available offline or when AI is unavailable.
- [ ] Use a confirmed zone range or an agreed calculation basis before displaying personalized BPM guidance. Watch zones are estimates, not proof of a measured physiological threshold.
- [ ] Require approval for changes to load, volume, rest, schedule or training frequency. Apply them to future prescriptions without rewriting saved sessions.
- [ ] Preserve the 60-minute full-session budget, heavy-lift rest and conservative progression rules. Reported grinding or deterioration must not count as a successful progression signal.
- [ ] Before enabling remote AI, settle authentication, model, spending limits, retention and provider suitability. Cloudflare and OpenAI remain unprovisioned.
- [ ] Obtain the separate disclosures and permission needed for sending imported health measurements to remote services. HealthKit access is not permission to send data to AI.
- [ ] Test unavailable AI, stale proposals, missing evidence and proposals that violate programme constraints.

**Done when:** recommendations use real permitted evidence, fail safely when evidence is missing, and cannot silently alter training.

## 4. Remaining product work before wider use

- [ ] Individual progressive warm-up sets, separate from working sets. Currently warm-up is one aggregate duration block.
- [ ] Calendar occurrences, move/skip behaviour and explicit weekend-day selection.
- [ ] Optional perceived effort, talk-test and recovery inputs, plus richer previous-performance context.
- [ ] Confirm phone timer preferences and whether Watch recordings include warm-up/stretching.
- [ ] Confirm equipment increments, neck resistance scale, cable-rotation rest scope and Monday/Friday accessory omission priorities.
- [ ] Check realistic long-term journal size and recovery. The current singleton JSON journal scales with history size.

Do not reopen the resolved Friday volume choice. Two sets per upper-body exercise are prescribed for the current programme. Reassess through a future approved programme.

## 5. Prepare TestFlight

- [ ] Choose the final bundle identifier and establish Apple Developer access, signing and App Store Connect setup.
- [ ] Verify native release builds, upgrade behaviour and physical-device acceptance.
- [ ] Complete accurate privacy disclosures, permission copy and health-data storage/deletion checks.
- [ ] Keep credentials, signing assets, real workout backups and health records out of this public repository.
- [ ] Distribute through TestFlight and collect real-device feedback.

Production infrastructure and distribution remain later work. Development signing may be needed earlier for the HealthKit proof.

## Validation and UI feedback

Use the [README validation commands](../../README.md#validate). Browser tests normally manage their own server on port 8081, so check for an existing review server before running them. Keep synthetic test data separate from the user's browser session.

For another requested UI review, start the web app and run:

```sh
PLANNOTATOR_ORIGIN=pi plannotator annotate http://localhost:8081/ --app --json
```

Do not impose a 30-minute command timeout. It previously stopped the review server while comments were still being written. Keep the command alive until the user submits or closes, and preserve the returned feedback. Esc switches to app interaction, and Command-Shift-A enables annotation. Do not refresh or close a review with unsent comments until they have been copied or otherwise confirmed saved.
