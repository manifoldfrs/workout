# Local app implementation

Status: the first local logging preview. The [training brief](../product/motorsport-training-brief.md) remains the target specification, not a claim that every requirement is implemented.

## Selected runtime

Direct dependency versions are pinned and `bun.lock` is committed. Expo's compatibility check passes for Expo 57.0.20, React Native 0.86.3, React 19.2.3 and Expo SQLite 57.0.2. TypeScript is 6.0.3. Effect and its Vitest integration are 4.0.0-rc.112, paired with Vitest 4.1.0.

Effect v4 is a release candidate. Its pinned public API exposes `Schema.TaggedError`, rather than the `Schema.TaggedErrorClass` spelling in the supplied standards. The implementation uses the installed API. Internal exports found in source are not treated as public APIs.

Bun manages dependencies and package scripts. The phone runs Hermes, not Bun. Node's SQLite module is confined to tests. No Node or Bun database implementation enters the mobile bundle.

## Owners and why they exist

| Owner | Responsibility | Alternative considered |
| --- | --- | --- |
| `src/domain/workout-model.ts` | Units, identifiers, modalities, outcomes and parsed journal consistency. | Raw optional weight/reps fields would allow mismatched units and fabricated defaults. |
| `src/domain/workout-programmes.ts` | The four prescribed templates, rest, setup assumptions and movement cues. | UI-owned arrays would duplicate prescriptions in logging and planning. |
| `src/domain/workout-commands.ts` | Pure session transitions, duplicate-result handling, completion rules and protected rest. | Screen callbacks would spread rules across logging, restore and tests. |
| `src/domain/workout-review.ts` | Budget calculations and conservative, seven-day simulated review. | A generic planner or AI service would add indirection before real model integration exists. |
| `WorkoutService` | Parse commands, read current history, apply policy, validate and durably save before confirming success. Also owns export and restore sequencing. | Calling the store from every screen would duplicate save ordering and revision handling. |
| `JournalStore` | Parsed journal reads and atomic revision-checked persistence. | Raw database calls would expose SQL or browser storage to the application. Native SQLite and browser storage are real implementation variants. |
| SQLite adapter | Private SQL, initial schema setup, persisted-row parsing and conditional updates. | A general SQL repository framework is unnecessary for one local journal. Its narrow connection contract also runs the same SQL against real Node SQLite in tests. |
| Platform storage layers | Acquire/release native SQLite or select browser storage. | Import-time resource acquisition would obscure failures and ownership. |
| App boundary and screens | Own the runtime lifetime, error display, editable drafts, confirmation, keyboard and navigation. | Screen-specific runtimes would create competing database lifetimes. |

Ordinary named exports keep module ownership explicit. No generic event bus, global singleton store, provider wrapper, cloud database or speculative authentication service is added.

## Persistence and failure behaviour

The first native schema stores one versioned journal row. Setup is transactional. Each save is a single conditional `UPDATE` against the expected revision. The UI only advances after the save succeeds. Conflicting writers must reload. A failed save leaves the current entry available for correction or retry.

Starts use a session identifier, records use the session/set identity, and finished-session/review guards prevent repeated submission from duplicating completed work. Correcting a recorded set requires an explicit undo. User-triggered rest restart is a new timer action, not a claim that repeated timer starts preserve the old deadline.

The full prescription is copied into a session when it starts. Future template edits do not rewrite old sessions. Preparation, performed working sets, pending work and omissions remain distinct. An early finish records the remaining work as omitted with the selected reason.

The browser adapter uses local storage and Web Locks to serialize conditional saves across tabs. It reports an error when these APIs are unavailable. Browser data is separate from native SQLite and can be cleared by the browser. Neither is cloud backup or an encryption guarantee.

Backups contain manually logged training only. Import parses the version, units, session identity, lifecycle consistency and modality before a replacement save. Restore requires explicit replacement confirmation and rejects a stale current revision. Restoring preserves training records but clears review-approval freshness so a pre-restore draft cannot be applied accidentally. Invalid data is not replaced with an empty journal. Recovering an already-corrupt native store through an in-app restore screen is not yet implemented, because ordinary restore requires a readable current revision and journal.

The singleton journal is a deliberate first-version trade-off. Reads, writes and JSON import memory use scale with history size. Benchmark realistic multi-year history before long-term use. If a storage or import limit becomes necessary, it must not strand valid exported backups.

## Timing assumptions

The 60-minute budget includes warm-up, work, prescribed rest, station changes and stretching. Heavy-lift rest is never reduced by the estimator. Current assumptions include 20–45 seconds for lifting work and 60–120 seconds for station changes, including movement between alternating exercises. Actual setup can exceed estimates. They are not measured durations or readiness assessments.

Outstanding prescribed recovery remains in the forecast even when the optional phone timer is off. Entry timestamps only inform a planning estimate. They do not prove that prescribed rest was followed. The full-session timestamp continues through backgrounding and overtime.

The UI offers an explicit finish at the hour, but still accepts truthful records of work already performed. It does not demand stopping mid-repetition or discard overtime. Omissions need approval and show their approximate contribution to the remaining estimate. Wednesday prioritizes remaining push-press/row work before cycling or neck. Monday/Friday priorities stay undecided.

Friday's pre-start estimate currently displays the full three-set template even after choosing two sets, so it is conservative rather than an exact two-set preview. Cable rotation records a completed left/right pair. Its timer stays unavailable until the rest scope is configured.

## Verification evidence

- Formatting and strict TypeScript checks pass.
- Effect/Vitest tests use the public workout service with the actual SQLite adapter and a real Node SQLite database. They cover all four programmes, modality/load-basis checks, undo, omissions, early finish, protected rest, timer expiry, duplicate commands, stale approval, JSON restore, corrupt data, rejected writes, revision conflicts, and reopening a database file.
- Generated valid loads and repetitions exercise command parsing, duplicate-result invariance and JSON roundtrips. These fixtures are synthetic, not personal workout data.
- Playwright exercises the real browser UI at 430 × 932. It covers logging with networking disabled after startup, reload recovery, optional rest recovery, undo, omissions, early finish, history, malformed/valid restore, simulated review acceptance, Friday's explicit choice, and refusal to reset corrupt browser data.
- The iOS production JavaScript/Hermes bundle exports successfully. No signed native binary or physical-device pass is claimed.
- No module mocks or external AI calls are used.

## Remaining before relying on real history

1. Run the Expo SQLite bridge on the target iPhone. Verify process termination, backgrounding, locked-screen timing, database errors, backup restore and upgrades. Node SQLite and a browser reload cannot prove these native behaviours.
2. Validate Dynamic Type, VoiceOver, numeric keyboards, copy/paste backup usability and thumb reach on the physical phone. Browser screenshots only establish an initial layout.
3. Add individual progressive warm-up set logging. The preview currently records warm-up as one preparation duration, never as working triples.
4. Add calendar occurrences, move/skip behaviour and explicit weekend-day selection. Current recurring templates are manually started, not automatically scheduled.
5. Add the remaining optional perceived-effort/talk-test/recovery fields, richer previous-performance context and deliberate interval guidance if wanted. No rest-adherence measurement or background alerts are claimed.
6. Prove read-only HealthKit integration on a development build. No HealthKit dependency, entitlement, fabricated Watch data or health-data export path is present yet. See the [Watch proposal](../research/apple-watch-integration.md).
7. Design real proposal persistence and acceptance before allowing load, volume or schedule changes. The current local review can only hold the existing programme and record a revision-checked acceptance.
8. Only then choose deployment identities, credentials, backend authentication, provider model, quotas and retention. Cloudflare, OpenAI and TestFlight are still unprovisioned.
