# Apple Watch integration

Status: researched proposal, not implemented. The user records workouts with an Apple Watch Ultra 3, usually as Functional Strength Training or Indoor Cycling, and wants to avoid redundant phone controls. Wednesday's recording pattern is confirmed: stop Functional Strength Training, then start a separate Indoor Cycling workout. The exact timer preference still needs confirmation.

This extends the [motorsport training brief](../product/motorsport-training-brief.md). Sources are Apple documentation and the candidate React Native library's documentation, inspected with Exa and Ref. No physical-device integration or installed-version compatibility test has been performed.

## Recommended division of responsibility

**Apple's Workout app records the activity. Our app records the training detail and helps plan what comes next.**

| Apple Watch / Apple Health | Our app |
| --- | --- |
| Workout recording, start/end, and recorded duration | The prescribed programme and full-session time budget |
| Heart-rate samples and available workout statistics | Weights in pounds, dumbbells per hand, repetitions, and working/warm-up distinction |
| Available energy and cycling measurements | Effort, grind/technique reports, neck resistance and holds |
| The existing Apple Fitness history | Linking the Watch recording to the training log and reviewing progress |
| Optional Watch-managed cycling goals and intervals later | Conservative recommendations and explicit approval |

Do not ask the user to record a second HealthKit workout from our app. Initially request read access only, with no workout-writing permission. Our app's session log is a separate record, not a duplicate workout sent back to Apple Health or Fitness.

## How the connection works

**Apple Watch Workout app → Apple Health / HealthKit on the paired iPhone → our Expo app.**

HealthKit is the integration point, not a direct API for reading the Fitness app's screens. Apple documents that saved Watch workouts sync to other devices, where apps can query them after authorization. [Apple's multidevice session][apple-session-video], [HKWorkout][workout].

The first version should refresh when our app opens or returns to the foreground, with a manual Refresh action. Read the saved workout once it is available, match it to a session, then fetch the associated measurements. Background delivery can improve freshness later, but it is not a guaranteed live feed. Locked-device HealthKit reads can be unavailable. [Observer queries][observer], [privacy][privacy].

Keep logging usable when the Watch is offline, a workout has not arrived, or Health access is unavailable. Use honest states such as “No matching Apple Health workout available” and “Last refreshed”, not an assertion that permission was denied or that the workout will arrive within a specific number of seconds.

### What we can read

- Stable workout identifier, start/end timestamps, activity type, source/device information where supplied, and recorded duration.
- Heart-rate samples associated with the workout and available average/minimum/maximum statistics.
- Energy and cycling distance/power/cadence only if actually recorded, exposed by the chosen library, and authorized. Do not require these for the first version or assume a stationary bike supplies them.
- Workout events and activities if available, without assuming every ordinary Apple Workout recording includes our desired interval boundaries or strength-set detail.

Apple's [workout representation][workout] and the candidate library's [workout queries][library-workouts] support these categories. Their exact shapes and availability need testing against the selected versions and real records.

For the user's current activity labels:

- Functional Strength Training corresponds to [HealthKit's functional strength activity][functional-strength].
- Indoor Cycling is [cycling][cycling] with an indoor indication where available, such as [indoor-workout metadata][indoor]. Missing indoor metadata is unknown, not automatically outdoor or indoor.
- A strength recording does not tell us whether a particular deadlift set was 3 clean repetitions, whether the dumbbells were 35 lb per hand, or which neck directions were completed. Those remain athlete-entered observations.
- One whole-session strength recording must not be treated as proof of the cycling block's duration or the completion of all exercises.

### What we should not promise

- Live control of Apple's running Workout app from our Expo app.
- Instant live heart rate from an Apple-owned workout session.
- Automatic detection of repetitions, lifted weight, rest intervals, grinding, or clean technique from heart rate.
- Every value shown in Fitness, including proprietary scores, zones, or presentation, being available through the selected HealthKit bridge.

Apple's [workout mirroring API][mirroring] connects a developer's own watchOS app to its companion iOS app. It is not documented as a way to attach to Apple's Workout app. A custom Watch app would be a separate scope and native-development decision, not a prerequisite for reading saved workouts.

## Personalized exercise notes

Confirmed direction from UI feedback: exercise notes should become specific to the athlete as linked Watch metrics and recorded workout results accumulate. This remains unimplemented. The current cycling cue uses the Watch's displayed Zone 2 range without inventing a numeric target.

Apple documents personalized, estimated heart-rate zones and a Heart Rate Zone workout view. Settings on the Watch are under Workout → Heart Rate Zones. Automatic zones require a date of birth in Health. These estimates do not establish a laboratory-measured physiological zone. See [Apple's Heart Rate Zones guide](https://support.apple.com/guide/watch/view-heart-rate-zones-apd897dccddf/watchos).

Before enabling personalized notes:

- Combine matched cycling measurements with actual session outcomes. Strength repetitions, sets, loads, omissions and quality remain manually recorded evidence, not inferred from heart rate.
- Keep source, observation date and measurement coverage with the evidence. Missing or stale samples stay unknown. Do not claim a workout met its heart-rate target from an average or elapsed time alone.
- Verify whether the chosen native API exposes the athlete's configured zone boundaries. Heart-rate samples alone do not reveal those settings. If unavailable, obtain a confirmed range or separately agreed calculation basis rather than inventing defaults.
- Generate short, exercise-specific guidance with an inspectable reason. Generic cues remain available without fabricated personal metrics when Health data or AI is unavailable.
- Apply existing approval and safety constraints whenever a note proposes changing load, volume, rest or schedule. Preserve guidance already saved in session prescriptions.
- Follow the separate health-data sharing consent, minimization and provider-policy checks below before sending any imported measurements to AI. Asking for personalized notes does not itself enable a remote data-sharing path.
- Validate with a physical device and real authorized measurements before claiming personalized BPM guidance works. Test missing zones, missing samples, mismatched recordings and unavailable AI through the same public interfaces.

## Match the recording without duplicating work

Suggested experience after a session: “Found Functional Strength Training around the time of your Monday workout. Link it?” Show the recorded times and duration so the user can recognise it.

- Use time overlap, activity compatibility, and recording source to suggest a match. Do not link solely because a workout occurred on Monday.
- Start with a one-tap confirmation. Offer manual selection and unlinking when a suggested match is wrong.
- Link Wednesday's separate strength and cycling recordings to one app training session. This is the user's confirmed workflow. Preserve each recording's identity and measurements. Either can arrive first, so support a partially linked session without inventing the missing recording or requiring duplicate manual entries.
- Do not assign the same recording to several unrelated sessions or add imported activity duration on top of the manually logged session duration as though they were separate workouts.
- If the user only recorded on the Watch, show an unmatched activity that can be attached to the intended session. Do not fabricate completed strength sets to fill an empty log.
- Use the HealthKit workout identifier to avoid duplicate imports. A different source may have written a second recording of the same activity, so overlapping candidates still need review.
- Changes and deletions must be reconciled. Apple [anchored queries][anchors] return additions and deleted-object identifiers. Save the import changes and their next anchor together so an interrupted sync can be safely repeated.
- Samples can arrive after a workout is first imported. Refresh linked-workout statistics on later app opens or relevant data changes, rather than treating the first empty heart-rate result as final.
- A deleted HealthKit workout must not delete manually entered sets. Remove the imported measurements/link as appropriate and show that the source recording is no longer available. An empty query alone does not prove deletion.

### Three different time measurements

Preserve these separately:

1. **Full session elapsed time:** from beginning the warm-up through the end of stretching, including rest and setup. This governs the 60-minute budget.
2. **Watch recording interval:** start to end of the Watch recording, which may begin late or finish before stretching.
3. **Recorded workout duration:** the HealthKit value, which can account for pauses and need not equal end minus start. [Apple's duration definition][duration].

Never replace full-session elapsed time with a shorter paused workout duration to claim the cap was met. For overlapping recordings, do not simply sum their durations. If the true session start is unknown, show that uncertainty instead of manufacturing an exact adherence result.

## Reconsider timers

The earlier brief called for automatic phone rest timers. The Watch context makes that a choice to revisit, not a reason to remove prescribed rest.

Proposed behaviour:

- No prominent duplicate workout stopwatch by default. A local start timestamp can quietly support the budget while the phone handles set logging. It does not create another HealthKit workout.
- Keep prescribed rest visible, including the full heavy-lift rest. Offer an optional “Start rest timer” or an opt-in automatic timer after each set.
- If the user already handles intervals or rest on the Watch or bike, don't run competing alerts on the phone.
- Retain optional neck hold and hard/easy interval cues for cases where the Watch is merely recording, not guiding the activity.
- Timer expiry never proves that work was performed. With phone timing off, do not infer that prescribed rest was followed or violated from sparse set-entry timestamps.
- Reforecast the session budget from known elapsed time and remaining work regardless of which device provides alerts. If the app was never opened during the workout, it cannot provide live accessory-cut guidance retrospectively.

The default timer mode is not yet selected. Ask whether the user actively uses Watch timers/custom intervals or primarily watches the workout's overall elapsed time.

## A useful later addition: send cycling sessions to the Watch

[WorkoutKit][workoutkit] can create, preview, and schedule planned workouts for Apple's Workout app. Apple's [custom-workout presentation][workoutkit-video] demonstrates repeated work/recovery intervals, goals, and alerts, with separate permission to schedule workouts.

Potential fit:

- Wednesday: timed hard/easy cycling phases handled on the Watch.
- Weekend: an easy timed indoor-cycling workout, without intervals.

This preserves the user's existing Apple Workout recording habit and could reduce phone timer needs without building a replacement Watch app. It is a later feasibility test, not a promised first-version feature. Verify indoor-cycling support, applicable goals/alerts, current API availability, and the exact planned-workout-to-recorded-workout linkage. Older conference code is not a pinned current API contract.

The HealthKit library researched here does not establish WorkoutKit support. WorkoutKit is a native Swift framework. We would need a suitable maintained TypeScript bridge or explicit approval for a small native integration if no suitable bridge exists. Do not silently break the user's TypeScript-only application-code requirement.

## Expo and Effect implementation direction

Candidate: [`@kingstinct/react-native-healthkit`][library], which documents TypeScript bindings, Expo configuration, workout queries, statistics, and anchored changes. It requires native dependencies, including Nitro Modules, and a custom Expo development build. It does not work in Expo Go. Using a native library from TypeScript is different from maintaining our own watchOS app.

First prove a minimal read-only integration on the actual paired iPhone 15 Pro Max and Watch Ultra 3:

1. Select compatible Expo/React Native, library, Nitro, iOS, and watchOS versions. Inspect pinned APIs rather than copying mixed-version examples.
2. Configure HealthKit capability and an accurate usage description. Request only workout and heart-rate read access initially. Add other measurement permissions only when their feature is wanted.
3. Read one saved Functional Strength Training workout and one Indoor Cycling workout.
4. Confirm identifiers, types, units, timing, source data, available heart-rate samples, and the delay between saving and reading.
5. Demonstrate manual matching, duplicate refresh, and missing-data behaviour before designing charts or enabling background import.

A cohesive Health data reader should own native queries, unit conversion, sample parsing, permissions workflow, and expected native failures. The session-matching policy stays separate from native mechanics. Do not put the library's mutable/native workout proxy objects in SQLite, application models, or AI requests. Return parsed domain records instead. Wrap unavoidable Promise APIs at the Effect boundary and keep resource/listener cleanup explicit.

## Permission and privacy requirements

Apple intentionally does not reveal whether a person denied read access for an individual HealthKit type. Completing the authorization flow is not proof of access. Empty data can reflect absence, delay, or authorization limits. Newer time-bound access APIs must be availability-gated if used. [Authorization][authorization].

Keep the app fully usable without Health access. Provide a way to disconnect and clear imported data without deleting the user's training log or the originals in Apple Health.

HealthKit access does **not** grant permission to send health data to Cloudflare or OpenAI. [Apple's privacy guidance][privacy] requires express permission and restricts third-party sharing. [App Review Guidelines 5.1.2 and 5.1.3][review] separately require disclosure and explicit permission for third-party AI sharing and impose additional health-data restrictions.

Recommended first boundary: read and display Watch data locally, but exclude imported HealthKit measurements from both automatic API review packets and ordinary ChatGPT exports by default. Before offering AI review of those measurements, verify provider terms and suitability for the permitted health/fitness use, disclose both recipients, choose retention, and obtain separate permission. Consent alone does not establish compliance.

Prefer a minimal summary over raw sensor streams if sharing is later enabled. Do not include heart-rate arrays, source identifiers, health details, or prompts in telemetry. Do not use energy estimates to prescribe weight loss or infer readiness from a single heart-rate value.

Review local storage protection and backup exclusion for cached HealthKit records. Keep imported sensor data out of general backup/export by default until storage, deletion, and Apple's iCloud restrictions are addressed. This does not change Apple's own management of its Health store. [Privacy][privacy], [Review Guidelines][review].

## Acceptance checks

- Workouts and logging remain usable when Health access is not requested, restricted, or returns no data.
- A saved Watch workout can be attached to the correct app session with no new workout written to HealthKit.
- Two Wednesday recordings can belong to one training session without doubled duration or fabricated interval/strength results.
- Repeated refresh, interrupted import, late samples, and source deletion behave consistently and preserve manual logs.
- Functional Strength Training and cycling with missing indoor metadata remain distinguishable without guesses.
- Paused workout duration never replaces the full-session budget silently.
- Phone timing can be disabled without hiding the prescribed rest or implying adherence was measured.
- Imported health data stays out of model requests, exports, logs, and backups unless the explicitly permitted path allows it.
- Device testing covers phone locking, delayed Watch sync, app termination, and actual records from both activity types. Simulator mocks alone do not verify this experience.

## Questions that change the design

Wednesday is confirmed as separate strength and cycling recordings. Remaining questions:

1. Does the Watch provide rest/interval alerts today, or is it mainly an overall recorder?
2. Does the Watch recording normally include warm-up and stretching?

[workout]: https://developer.apple.com/documentation/healthkit/hkworkout
[functional-strength]: https://developer.apple.com/documentation/healthkit/hkworkoutactivitytype/functionalstrengthtraining
[cycling]: https://developer.apple.com/documentation/healthkit/hkworkoutactivitytype/cycling
[indoor]: https://developer.apple.com/documentation/healthkit/hkmetadatakeyindoorworkout
[duration]: https://developer.apple.com/documentation/healthkit/hkworkout/duration
[authorization]: https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data
[privacy]: https://developer.apple.com/documentation/healthkit/protecting-user-privacy
[observer]: https://developer.apple.com/documentation/healthkit/hkobserverquery
[anchors]: https://developer.apple.com/documentation/healthkit/hkanchoredobjectquery
[mirroring]: https://developer.apple.com/documentation/healthkit/building-a-multidevice-workout-app
[apple-session-video]: https://developer.apple.com/videos/play/wwdc2023/10023/
[workoutkit]: https://developer.apple.com/documentation/WorkoutKit/customizing-workouts-with-workoutkit
[workoutkit-video]: https://developer.apple.com/videos/play/wwdc2023/10016/
[library]: https://github.com/Kingstinct/react-native-healthkit
[library-workouts]: https://kingstinct-react-native-healthkit.mintlify.app/guides/workouts
[review]: https://developer.apple.com/app-store/review/guidelines/
