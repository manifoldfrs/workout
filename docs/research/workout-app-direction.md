# Workout app: research and proposed direction

Status: integrated OpenAI API review selected by the user, with Cloudflare permitted for backend hosting. The later [motorsport training brief](../product/motorsport-training-brief.md) governs product and programme requirements where this research differs. This is the research snapshot that preceded implementation. See the [README](../../README.md) and [local implementation notes](../development/local-app.md) for current capability and validation. Nothing has been submitted to TestFlight.

## Recommendation

Build a personal, offline-first Expo iPhone app that makes your existing programme easy to follow and record. Keep the programme stable, create each week's sessions automatically, and let AI propose changes from actual training history for you to approve.

The core loop is **open today's workout → confirm or adjust each set → finish → review the week → approve next week's changes**.

Priorities:

1. Fast, dependable logging on your iPhone 15 Pro Max.
2. A calm, caring interface with elegant typography and restrained colour.
3. No weekly copying of notes or spreadsheets.
4. Recommendations that explain their evidence and preserve your control.
5. TypeScript application code, Effect for domain parsing and effectful operations, Bun for package management, Expo for the native app.

Start with a single-user app and your supplied motorsport programme. Defer accounts, cloud sync, social features, video classes, a large exercise catalogue, a custom Apple Watch app, and automatic programme generation from scratch. The user already records on an Apple Watch Ultra 3, so read-only HealthKit import is now being evaluated for the initial experience. See the [Apple Watch integration proposal](apple-watch-integration.md) for matching, timer options, and additional privacy constraints.

## 1. Evidence and limitations

Research used RepoPromptCE for local source review, Exa for web discovery and page extraction, and Ref for technical documentation. An Exa rate limit temporarily interrupted research. Later calls succeeded and supplied the main missing training and competitor sources.

- The workout repository initially contained only `README.md`, with a clean `master` tracking `origin/master`. There is no existing application architecture or pinned dependency version to reuse.
- Reviewed Delphi design-system source and its frontend root layout. This is a source-level review, not a rendered browser or device audit.
- Retrieved Superlogical and Delphi website text. Text extraction supports content and information-hierarchy observations, not precise claims about their current rendered spacing, colours, animation, or responsive layout.
- The supplied screenshot could not be opened. macOS denied access to its temporary directory. Attach it to the conversation for a visual review.
- Competitor findings below are first-party feature descriptions, not hands-on usability measurements or independent validation of their training algorithms.
- Training findings use the retrieved ACSM overview's abstract and introductory sections, the motorsport study abstract, and the available Formula 1 article excerpt. They do not establish an individually safe load or an optimal GT3 training prescription.
- OpenAI availability and Effect release status are moving targets. Recheck them, and pin actual dependency versions, before implementation.

## 2. What to borrow from workout apps

| Reference | Observed first-party behaviour | Implication for this app |
| --- | --- | --- |
| [Hevy previous values][hevy-previous] | Shows previous performance beside current sets. Tapping a previous value copies it. Allows last exercise performance or last performance within the same routine. Missing history stays blank. | Put history beside the input. Never require a trip to a chart just to find the last weight. Distinguish Monday and Friday pull-ups when their role differs. |
| [Hevy effort logging][hevy-effort] | Optional per-set RPE, including the ability to leave it blank. | Effort should be quick and optional. Ask for final-set RIR on relevant lifts rather than adding mandatory fields to every set. Missing effort is unknown, not easy. |
| [Strong][strong] | Positions itself as a notebook replacement that stays out of the way. Lists supersets, custom exercises, timers, RPE, history charts, and CSV export. | Make the active session the primary experience. Support alternating exercises and export from the beginning. |
| [Fitbod][fitbod] | Describes recommendations adapted to training history, recovery, equipment, and goals through a proprietary algorithm. | Learn from adaptive planning, but make each proposed change reviewable. Marketing claims do not prove the algorithm's clinical or sporting effectiveness. |
| Nike Training Club | Your stated preference is its approachable training experience, without needing follow-along video. No independent feature audit performed here. | Borrow the welcoming tone, not a content-library-first structure. |

The differentiator is not another exercise database. It is a dependable personal log connected to a transparent weekly planning conversation, with proper support for strength, carries, neck work, and cycling.

## 3. Your ChatGPT subscription: two practical routes

[OpenAI documents separate billing for ChatGPT and the API][openai-billing]. A ChatGPT subscription does not supply API credits for arbitrary requests from our Expo app. Do not design a generic “Sign in with ChatGPT to power this app” flow on that assumption, extract session cookies, or repurpose coding-tool credentials.

### A. Supplemental ChatGPT: explicit export and import

Retained as an optional supplement to the selected in-app API experience, not the primary workflow.

1. The app generates a compact weekly review packet containing the active programme revision, actual sets and cardio, optional effort, missed sessions, equipment constraints, and your notes.
2. You preview what will be shared, then copy or export it for your existing ChatGPT conversation. This retains the context you already have there.
3. The packet includes instructions and a versioned machine-readable response format. ChatGPT proposes changes and explains them.
4. You paste the structured result into the app or import a file. The app parses it and shows an old-versus-new preview.
5. You approve selected changes. Only future, unstarted sessions are updated.

This removes manual worksheet recreation and retyping weights. It does not eliminate the handoff between apps. File attachment, sharing, and copy/paste behaviour must be tested on your actual iPhone. The app should always provide explicit copy and paste controls, not assume a share target or undocumented deep link exists.

A malformed response leaves the current plan intact and shows an actionable import error. A correction prompt can help you ask ChatGPT for the expected format. The model's promise to return JSON is not validation.

### B. Integrated AI: selected primary workflow

The user selected seamless in-app review through OpenAI's separately billed API, with their ChatGPT subscription available for supplemental planning.

Proposed request path: **Expo app → authenticated Cloudflare Worker → OpenAI API → validated draft → user approval**.

Cloudflare hosts the TypeScript/Effect backend, while OpenAI runs model inference. Cloudflare Workers AI is not required for this design. The Expo app sends an explicitly approved review packet. The Worker keeps the OpenAI API key in a server-side secret, enforces request and spending limits, parses the response, and returns a draft. Logging remains local and usable when the backend or model is unavailable.

Keep workout history on the phone initially rather than adding a cloud database solely for model requests. Backend authentication and any durable quota enforcement still need an explicit design. A public endpoint or a shared secret embedded in the app is not acceptable. Choose the model, spending cap, authentication, and retention policy before deployment. No resources or credentials have been provisioned.

Use [structured model output][openai-structured] for the wire format, followed by Effect Schema parsing and domain checks. Schema-conforming output can still be wrong or unsafe. Handle missing parsed output, refusals, incomplete responses, timeouts, and invalid recommendations without mutating the active plan.

Do not add a second schema library simply because a provider example uses Zod. Verify the pinned Effect version's JSON Schema support against the provider's supported subset. Keep the provider's nullable/required-field rules private to the boundary.

No API price estimate is promised here. Select a model after evaluating recommendation quality on representative history, then measure tokens and price using current rates.

### Why not make a ChatGPT MCP app the first route?

The retrieved [OpenAI developer-mode help page][openai-mcp] says custom MCP apps are web-only, describes full write support for Business/Enterprise/Edu, and describes Pro support as read/fetch. These restrictions and the user's unspecified subscription tier make it an unsuitable dependency for an iPhone-first personal app today.

An Apps SDK/MCP integration could be a later companion after verifying current availability. It is not a way to embed subscription-backed inference into an arbitrary native app. A remote integration would also need secure access to workout data that currently lives only on the phone.

## 4. Training evidence and recommendations policy

### What the evidence supports

- [Formula 1's training article][f1] describes a mix of cardio and strength training and the importance of preparation before the season. It does not validate the exact four-day schedule supplied in this conversation.
- [McKnight et al.][motorsport-study] measured aerobic capacity, body composition, and isometric neck strength across F1, IndyCar, NASCAR, and IMSA GTD drivers. Differences between categories argue against treating F1 benchmarks as mandatory GT3 targets. This is observational evidence, not proof that a particular programme improves race performance.
- The [updated ACSM position stand][acsm-current] synthesizes 137 systematic reviews. It supports progressive resistance training and distinguishes strength, power, and hypertrophy goals. Training to momentary fatigue did not consistently improve outcomes. Much of the underlying evidence concerns inexperienced healthy adults, not GT3 drivers.
- The [older 2009 ACSM position stand][acsm-2009] described load increases of 2–10% when the current workload could be performed for one or two repetitions beyond the target. Treat this as historical general guidance, not a universal weekly increment, and do not present it as the latest stand.

Your three strength/power days and one dedicated aerobic day are a reasonable programme to support as user-provided input. They have not been independently prescribed or certified here. Four training days leave three non-training days, with the interval block contained within Wednesday.

### Proposed conservative policy, subject to approval

- Preserve the existing exercises and weekly structure unless you request a programme change.
- Start without invented weights, heart-rate zones, recovery scores, or one-repetition maxima. Import real history or record an initial session.
- Offer **hold**, **increase**, **reduce**, or **needs more information** as review outcomes. Holding steady is a valid recommendation.
- For suitable rep-range accessory exercises, consider a small available load increase only after the prescribed work is completed with the agreed effort margin. Otherwise consider retaining the load and developing repetitions within the range.
- Heavy fixed-repetition lifts and explosive lifts need their own agreed policies. Do not apply an accessory double-progression rule to deadlift triples or hang power cleans automatically.
- Never infer technique quality or bar speed from completed repetitions. Ask when it matters.
- Round proposed loads to the actual equipment increments and preserve per-hand versus total-load meaning. If there is no acceptable increment, hold or ask rather than silently rounding upward.
- Missing sessions or reduced repetitions are observations, not proof of poor recovery. Ask whether the cause was schedule, equipment, fatigue, pain, or something else.
- Record aerobic duration, interval completion, and optional effort independently of lifting volume. Do not generate a heart-rate range without a known basis or call a session verified Zone 2 solely because it lasted 45 minutes.
- Keep neck progression manual pending confirmation of the device, resistance scale, technique, and appropriate guidance. The user has specified forward, backward, left, and right holds. Pain or neurological symptoms must not lead to an automated increase. Persistent or concerning symptoms warrant qualified assessment.
- Do not generate unsupervised heat-acclimation or dehydration protocols from the motorsport goal.

Each proposal should show its evidence, the change, the reason, and what remains unknown. Do not show invented confidence percentages or promise injury prevention or race readiness.

## 5. Seed programme, preserving your supplied intent

Actual working loads remain unspecified. Pounds and per-hand dumbbell recording are confirmed. The later [motorsport training brief](../product/motorsport-training-brief.md) expands the seed below with warm-up sets, neck directions, rest, quality, and the hard 60-minute full-session cap. Ranges remain ranges, not automatically selected targets. Distinguish actual progressive warm-up sets from timed mobility and stretching blocks.

| Day | Blocks, in order |
| --- | --- |
| Monday | Dynamic warm-up 7 min. Deadlift 4 × 3, rest 2.5–3 min. Alternate pull-ups 3 × 6–8 and incline dumbbell press 3 × 6–8, resting 60 sec after each exercise. Farmer carry 3 × 30–40 m, rest 60–90 sec. Neck Flex 1 round, 20–30 sec per direction. Stretch 5 min. |
| Wednesday | Dynamic warm-up 7–8 min. Hang power clean 5 × 2, rest 2 min. Alternate push press 3 × 4–5 and chest-supported row 3 × 8, resting 60–75 sec. Bike intervals: 2 min hard then 2 min easy, repeated 3 times, 12 min total. Neck Flex 1 round. Stretch 5 min. |
| Friday | Dynamic warm-up 7–8 min. Front squat 4 × 4, rest 2.5–3 min. Alternate pull-ups 2–3 × 6–8 and dumbbell shoulder press 2–3 × 6–8, resting 60 sec. Seated cable rotation 2 × 10 per side. Neck Flex 1 round. Stretch 5 min. |
| Saturday or Sunday | Easy bike warm-up 5 min. Zone 2 cycling 40–50 min. Easy cooldown/stretching 5 min. |

Clarify before making a fully runnable template:

- Available load increments and the basis for non-dumbbell carry loads. Pounds and per-hand dumbbells are already confirmed.
- Pull-ups: bodyweight, added weight, or assistance.
- Neck device/resistance scale and appropriate progression guidance. Directions and initial hold/rest ranges are now specified in the product brief.
- Friday volume is now settled at two sets per upper-body exercise for the current programme, superseding the original 2–3 range above. Prescribed rest-range choices remain to be resolved.
- Preferred weekend day, baseline loads, and any relevant limitations.

These missing details should not prevent us from prototyping the logging interface with clearly labelled illustrative data.

## 6. Design direction

### Design references

The native direction uses warm neutral surfaces, explicit text/background/border roles, readable system typography, tabular numerals, and one clear primary action. Shared tokens keep screens consistent. Source paths and private implementation details from unrelated projects are deliberately excluded from this public repository. No private source code or bundled font files are copied.

[Superlogical][superlogical] presents a direct explanation of the problem and a short numbered plan, with emphasis on well-crafted, reliable software. [Delphi's public site][delphi] leads with a personal outcome, shows conversational examples, and gives trust and ownership their own sections. Borrow their clarity and human tone. Precise visual matching still needs screenshots or a rendered review.

### Proposed visual vocabulary, not sampled website values

- Warm off-white background, near-black text, pale neutral surfaces, and one muted green accent for completion.
- Comfortable whitespace around headings, denser organisation within a set list. Avoid nested cards around every number.
- System sans for body text and controls, tabular numerals for loads, repetitions, and timers. A serif title treatment is an optional visual experiment, not an observed Delphi token.
- Proposed 48–56 point primary controls, with safe-area-aware bottom actions and generous spacing between numeric fields.
- Dynamic Type, VoiceOver labels, visible unit labels, sufficient contrast, reduced-motion support, and clear states that do not rely on colour alone. Follow [Apple's HIG][apple-hig] and validate on the actual device.
- Keep the main workout usable one-handed. Test the keyboard, decimal entry, scrolling, and bottom action together on the 15 Pro Max rather than designing only a static mockup.
- Calm copy: “Ready when you are”, “Saved on this phone”, “Keep this weight next time”, and “Move this session?” Avoid guilt, artificial urgency, confetti, streak penalties, or unearned praise.

### Three destinations and one focused session screen

**Today:** the next scheduled workout, its purpose, a short exercise preview, and one Start/Resume action. A missed session offers move, skip, or start. It does not silently count as completed or penalise you.

**Active session:** current exercise and set, previous comparable performance with its date, editable target/actual inputs, and a large Complete set action. A clear next-exercise label handles alternating sets. Rest controls stay reachable. History and technique links are secondary.

**Plan:** the four-day week, editable schedule, current programme revision, and upcoming targets. No need to generate a new document every week.

**Progress:** recent sessions, per-exercise history, aerobic minutes, and a weekly review. Avoid combining unrelated modalities into a single misleading progress score.

Settings and export can live behind a small secondary menu. Chat should not be the home screen or the required interface for logging a set.

## 7. Technical direction

### Runtime and dependencies

Use one Expo app rather than starting with a monorepo. Use TypeScript/TSX for application code and `app.config.ts` for app configuration. JSON, native build metadata, lockfiles, and EAS workflow configuration are unavoidable platform artefacts, not a second application language.

[Bun is supported for Expo dependency installation and EAS builds][expo-bun]. Commit one Bun lockfile, pin Bun in build configuration, and use frozen installs in CI. Node LTS is still required for parts of Expo's toolchain. The phone executes JavaScript in [Hermes][expo-hermes], not Bun. Do not import `bun:sqlite` or Bun/Node runtime services into the mobile bundle.

The retrieved [Effect repository][effect] identifies v4 as a release candidate, and your standards target v4. Before scaffolding, select and pin an exact compatible version and record the RC trade-off. Do not mix remembered v3 and v4 APIs. First prove Effect Schema, service execution, and persistence on a physical-device Expo development build. This research has not established a tested Expo/Effect version matrix.

### Storage and ownership

[Expo SQLite persists across app restarts][expo-storage] and is a suitable starting point for a single-device log. It is not a backup or automatic sync solution. Include versioned JSON export/import and a tested restore path before relying on the app for real training history. CSV can provide readable set history but is not the full-fidelity backup format.

Prefer a direct `expo-sqlite` implementation behind a cohesive workout-store capability. Compare Effect's React Native SQL integration against the selected Expo setup before adding it, rather than assuming a React Native adapter is automatically Expo-compatible.

Proposed owners, not a requirement to create a folder or interface for every row:

| Owner | Responsibility | Why it earns a boundary |
| --- | --- | --- |
| Workout domain | Programme and session meaning, measurement types, legal transitions, comparison and progression calculations. | Keeps numerical and lifecycle rules independent of UI and storage. |
| Workout store | Durable session changes, programme revisions, atomic approval, history reads, migrations and row parsing. | SQLite transactions and encoded records must not spread into screens. |
| Weekly review | Builds a snapshot from actual history, parses an imported draft, checks applicability, and coordinates approval. | Owns evidence selection and plan-change policy across entrypoints. |
| Expo boundary and composition root | Native lifecycle, file sharing/import, keyboard/UI events, runtime acquisition and cleanup. | Native APIs and resources stay outside the domain. |
| Model backend | Authentication, provider request/response mapping, credentials, limits, and typed integration failures. | Required for the selected integrated API mode. Keep one provider client private until a separate adapter earns its place. |

There are no existing owners in this repository. Direct functions and one store are the alternatives considered. Avoid generic repository frameworks, event buses, agent orchestration systems, or pass-through services. UI layout and pure arithmetic do not need Effect wrappers just to satisfy a slogan. Meaningful I/O and application operations use Effect with explicit interfaces and expected errors.

### Domain distinctions required by this programme

- **Programme revision:** approved recurring templates and progression settings, separate from the workouts actually performed.
- **Scheduled occurrence:** a planned session on a local calendar date, with explicit move/skip behaviour. Maintain stable occurrence identity when rescheduled.
- **Session:** a snapshot of the prescription at start plus actual results. Later plan changes cannot rewrite that historical prescription.
- **Set result:** distinguish weighted repetitions, bodyweight/added-weight/assisted repetitions, loaded distance, timed work, and interval phases. Do not represent them all as optional weight/reps fields.
- **Load:** preserve unit and basis, including total barbell load versus per-hand dumbbells. Assistance is a distinct meaning, not an unexplained negative weight.
- **Effort:** optional reported RIR or another explicitly chosen scale. Do not equate missing effort, pain, and fatigue.
- **Proposal:** proposed changes tied to the programme revision and history snapshot used to generate them. Draft, accepted, rejected, and stale states have different allowed operations.

Brand identifiers and mixable units. Parse keyboard input, saved rows, backup files, and AI responses at their boundaries. Unknown history remains absent. Completion is explicit: prefilled targets are never counted as performed sets.

### Save and approval guarantees

- Persist a set result before displaying a durable “saved” state. A failed write leaves the entry available for retry and clearly unsaved.
- Use stable session/set identities and guarded transitions so repeated taps or retried saves cannot create duplicate results. Undo edits the recorded result, not a second unrelated set.
- Persist enough session and timer state to resume after app termination. Derive remaining rest time from recorded timestamps, not a JavaScript loop assumed to run while iOS suspends the app. Notifications are optional convenience, not the source of truth.
- A new week can instantiate occurrences from the approved recurrence without an LLM. Guard occurrence creation against duplicates. Preserve local date and timezone intent across travel.
- Preview before importing or applying. Repeated acceptance of the same proposal must not increment the load again.
- Recheck programme revision and relevant history at approval. Reject or rebuild stale proposals rather than silently overwriting intervening edits.
- Apply the new revision and approval record atomically. Never hold a SQLite transaction open during a model request or while waiting for human approval.
- Expo documents that unrelated async queries can enter `withTransactionAsync`. Use appropriately scoped [exclusive transactions][expo-transactions] where needed and test the real adapter's concurrency behaviour.

Expected failures include invalid input, malformed import, unsupported backup/schema version, unavailable storage, failed migration, stale proposal, and optional model-service errors. Keep their typed errors precise. Ordinary missing history is not a storage failure.

### Privacy

Keep history local by default. Show exactly what leaves the phone for AI review, omit unnecessary identity data, and avoid putting workout notes, health details, prompts, or credentials in telemetry. Imported notes are data, not instructions authorising actions.

For API mode, hold credentials server-side and redacted through application code. Do not embed a shared secret in the Expo bundle or an `EXPO_PUBLIC_*` setting. Explicitly decide retention and deletion before introducing server storage. Plain JSON backups contain personal training data, so warn before sharing and remove temporary export files when practical. Local-first alone does not establish encryption or privacy compliance.

## 8. TestFlight and release approach

Use pinned source SHAs, checks on that SHA, separate marketing/build versions, identified build artefacts, and manual store-delivered smoke tests.

Do not copy another project's identifiers, credentials, private infrastructure, or deployment configuration into this app.

First release path:

1. Choose the app name, unique bundle identifier, Expo project, and Apple team. Confirm paid Apple Developer membership and App Store Connect access. No account setup or paid build is authorised by this research document.
2. Pin compatible Expo, React Native, TypeScript, Effect, Bun, and EAS tooling. Establish an iOS development build and device smoke test before adding AI.
3. Configure a production/store build profile. TestFlight needs a signed production IPA, not an Expo Go session or an ad hoc internal-distribution build. [Expo submission guide][expo-submit].
4. Use remote developer-facing version management and automatic build-number increments, with marketing version set explicitly. [Expo versioning guide][expo-versions].
5. Run checks on the selected source SHA, build, and record the EAS build ID and actual build number. Submit that exact build to App Store Connect/TestFlight.
6. Complete beta information and applicable compliance questions. Use an internal tester with appropriate App Store Connect access for personal testing. External testing can require Beta App Review. [Apple TestFlight overview][testflight].
7. Install through TestFlight on the iPhone 15 Pro Max and execute the acceptance checks below. Upload success alone is not evidence the app works.

TestFlight builds expire after 90 days, so it is a beta distribution channel requiring ongoing uploads, not permanent private installation. Budget for developer membership, build-service usage as applicable, and optional API usage. No exact current pricing was researched.

Defer over-the-air updates initially. Native dependency changes still require a compatible new native build, and update/migration compatibility needs an explicit design before enabling remote updates.

## 9. Smallest useful delivery sequence

### Milestone 1: the log

Create the Expo shell and calm native screens, implement the seed programme, typed modalities, automatic recurrence, actual set logging, rest timing, offline persistence, session recovery, history, and backup/restore. First targets come from user input or imported history. No AI dependency.

### Milestone 2: the weekly partner

Implement the review packet and proposal preview/approval through the selected OpenAI API workflow, with Cloudflare Worker hosting proposed for the backend. Include evidence, unknowns, per-change approval, stale-draft handling, and no-change outcomes. Retain ChatGPT export/import as an optional supplement.

### Milestone 3: dependable personal TestFlight use

Test the real app across the full four-day schedule, restore from an exported backup, validate upgrades with existing history, then create a traceable TestFlight candidate. Read-only HealthKit import now needs an early physical-device feasibility test because of the user's existing Watch workflow. Defer cloud sync, a custom Watch app, and a richer conversational experience. Imported health data has separate sharing and backup restrictions described in the Watch proposal.

### Acceptance criteria to test through public behaviour

- Start the scheduled workout in two deliberate taps or fewer from Today. Record an unchanged prefilled set with one completion tap. These are proposed usability targets, not measured results.
- In airplane mode, complete weighted reps, pull-ups, a carry, timed neck work, and a cycling interval session.
- Kill and reopen the app mid-session. Every confirmed set and the current session survive. A failed save is never reported as durable.
- Alternate A/B exercises with their correct rest rules. Skipped and unfinished work never appears completed.
- Preserve kg/lb and per-hand/total semantics across editing, history, export, and restore. Assess roundtrip and conversion properties with generated cases.
- Repeat a tap, import, week creation, or proposal approval without duplicating records or applying an increase twice.
- Reject malformed, unsupported, unknown-exercise, stale, and implausible proposals without damaging the plan. Missing history cannot yield invented baseline weights.
- Simulate storage failures and optional provider timeout/refusal/incomplete output through real service interfaces or faithful test implementations.
- Test actual SQLite transactions and migrations on the native runtime. A Bun SQLite test alone cannot prove Expo adapter behaviour.
- Exercise Dynamic Type, VoiceOver, reduced motion, low-contrast conditions, decimal keyboard entry, and thumb reach on the target device.
- Restore a full backup into a clean test installation and compare programme revisions, history, units, and proposal state.

Use Bun to run package scripts. Evaluate Vitest with the matching Effect test package for Effect tests rather than insisting that Bun's test runner must handle every native concern. Device-level happy paths remain necessary. Do not replace behavioural coverage with mocked module calls.

## 10. Decisions needed next

1. Before deploying the AI backend, select authentication, an OpenAI model, a spending cap, and data-retention behaviour. Integrated API mode is already selected, with Cloudflare hosting permitted.
2. What equipment increments do you use, and can you provide a recent completed week with actual weights? Pounds and per-hand dumbbell recording are confirmed.
3. Which neck device/resistance scale do you use, and which targets within programme ranges should be selected? The product brief also records unresolved accessory cut priorities.
4. What should the app be called, and do you already have an Apple Developer membership?
5. Attach the screenshot so the first visual prototype can be checked against your intended reference.

The primary AI integration choice is settled. The logging prototype can proceed independently of backend provisioning.

## Sources

[hevy-previous]: https://www.hevyapp.com/features/track-exercises/
[hevy-effort]: https://www.hevyapp.com/features/how-to-calculate-rpe/
[strong]: https://www.strong.app/
[fitbod]: https://fitbod.me/
[superlogical]: https://www.superlogical.com/
[delphi]: https://www.delphi.ai/
[openai-billing]: https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform
[openai-mcp]: https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt
[openai-structured]: https://github.com/openai/openai-node/blob/main/docs/structured-outputs.md
[f1]: https://www.formula1.com/en/latest/article/fit-for-f1-how-the-drivers-train-for-the-season-ahead.2pl4k93qzhfEmG9aX1kNcQ
[motorsport-study]: https://doi.org/10.1249/mss.0000000000001961
[acsm-current]: https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/
[acsm-2009]: https://pubmed.ncbi.nlm.nih.gov/19204579/
[expo-bun]: https://docs.expo.dev/guides/using-bun
[expo-hermes]: https://github.com/expo/expo/blob/main/docs/pages/more/glossary-of-terms.mdx
[effect]: https://github.com/Effect-TS/effect
[expo-storage]: https://docs.expo.dev/develop/user-interface/store-data
[expo-transactions]: https://docs.expo.dev/versions/latest/sdk/sqlite/#executing-queries-within-an-async-transaction
[expo-submit]: https://docs.expo.dev/submit/ios
[expo-versions]: https://docs.expo.dev/build-reference/app-versions/
[testflight]: https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/
[apple-hig]: https://developer.apple.com/design/human-interface-guidelines
