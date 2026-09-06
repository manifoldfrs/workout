# Motorsport training product brief

Status: user-supplied requirements, with unresolved implementation and programming choices called out below. These requirements take precedence over the earlier [research recommendations](../research/workout-app-direction.md). This document records the intended app behaviour, not an independently prescribed training programme.

Use the [domain glossary](../../CONTEXT.md) for consistent terminology. The [local implementation notes](../development/local-app.md) distinguish current preview features from the remaining requirements below.

## Athlete and purpose

The programme supports adult amateur endurance-racing preparation alongside a demanding working life, using ordinary gym equipment without requiring pool access. Beginner in motorsport does not establish lifting experience or technique proficiency.

Training should develop strength, durability, cardiovascular fitness, controlled neck strength, trunk stability, coordination, fatigue resistance, and sustained concentration. The user wants to stay lean and athletic, not maximise muscle size. Gym records are not a substitute for race readiness.

Professional driver preparation inspires the balance of resistance training, cycling, neck/trunk work, and recovery. Do not reproduce professional-driver loading or use racing as a decorative theme.

## Confirmed preferences

- Record workouts on the **Apple Watch Ultra 3**, usually in Apple's Workout app as Functional Strength Training or Indoor Cycling. On Wednesday, stop strength recording and start a separate Indoor Cycling recording. Link both to one app session without merging or duplicating the originals.
- Design for **thumb-first use on the iPhone 15 Pro Max**, including quick logging between sets. This is a mobile app, not a spreadsheet squeezed onto a phone.
- Log loads in **pounds**.
- Record dumbbell loads **per hand**, visibly labelled `lb / hand`. A pair of 35 lb dumbbells is entered as 35, not 70.
- Preserve carry distances in **metres** as prescribed. A pound preference does not silently convert all other measurements.
- Confirm the load basis for non-dumbbell carries and the specific neck-resistance setup rather than inferring it.
- Four training days now: Monday, Wednesday, Friday, and one weekend cycling session.
- Every session has a **60-minute wall-clock cap**, including warm-up, ramp-up sets, working sets, rest, equipment setup, water/reset time, and stretching.
- Main-lift recovery takes priority over fitting more exercises into the hour.
- Use TypeScript, Effect, Bun, and Expo. In-app OpenAI API review is selected, with Cloudflare permitted for backend hosting and ChatGPT export/import as an optional supplement.

## Product rules

1. Prefer a simpler, repeatable programme over more exercises when adherence or recovery conflicts with volume.
2. Prefer motorsport requirements over generic bodybuilding conventions. Do not add leg-isolation work just to increase volume.
3. Rest is part of the prescription. Never assume nonstop movement between stations or automatically reduce heavy-lift rest to recover time.
4. Display estimated total duration before starting, including uncertainty. Do not label a session as fitting the hour while omitting transitions or working-set time.
5. When the projected finish exceeds the cap, recommend omitting lower-priority accessories. Explain the time saving, obtain approval, and preserve the original prescription in history.
6. Intentionally omitted accessories do not prevent a session from being finished. Omitted work remains distinguishable from performed work and unreviewed unfinished work.
7. No PR-chasing gamification, reckless load increases, guilt for recovery days, or encouragement to train through fatigue or pain.
8. Warm-up sets and working sets are distinct. Warm-up performance does not establish that the working prescription was completed.
9. AI proposes changes. The user approves them. Invalid or incompatible proposals never silently change the programme.
10. The app remains a fast workout log, not a chat interface that must be used to complete a set.

## Thumb-friendly mobile experience

- Keep frequent actions, including Complete set, next-step controls, and numeric-entry confirmation, in the lower reachable area above the safe area and keyboard. Avoid repeated trips to top-corner buttons.
- Use generously spaced touch targets, aiming for 48–56 point primary controls. Test comfortable reach with either hand on the actual phone.
- Prefill from the approved target or previous comparable performance, but require explicit completion. Let the user tap to edit pounds/reps with a numeric keyboard. Never require typing unchanged values again.
- Keep the current set prominent, with previous performance and `lb / hand` readable without opening another screen. Avoid dense tables, tiny checkboxes, and horizontal scrolling.
- Support quick undo for accidental taps. Do not make swipes, long presses, or precise dragging the only way to perform an essential action.
- Health workout linking should need a clear confirmation, not manual entry of timestamps. Show Wednesday's strength and cycling recordings together while preserving their separate measurements.
- Make optional timers secondary to logging. Verify large text, screen-reader labels, keyboard visibility, scrolling, and bottom controls together, not just in a static mockup.

## Current programme

Ranges are intentional. Do not silently select a count, load, or rest duration when the user has not chosen one. Exact timer targets within ranges can be confirmed and reused as preferences.

### Monday: deadlift, upper body, neck

- Dynamic warm-up: about 7 min total, including easy bike, leg swings, walking lunges, hip hinges, arm/shoulder mobility, and progressive deadlift warm-up sets.
- Deadlift: 4 × 3 working sets. Rest 2.5–3 min between each working set. Moderate-heavy, no grinding, generally 1–2 good reps still possible.
- Pull-ups: 3 × 6–8.
- Incline dumbbell press: 3 × 6–8.
- Alternate pull-ups and incline press: A, about 60 sec rest, B, about 60 sec rest, repeat. Each movement receives roughly two minutes of rest plus the other exercise's execution before repeating.
- Farmer carry: 3 × 30–40 m, resting 60–90 sec between carries.
- NeckFlex or neck isometrics: forward, backward, left, right. One round initially, 20–30 sec per direction, resting 20–30 sec between directions. A second round is a future option, not enabled automatically, with about 60 sec between rounds.
- Light stretching: about 5 min.

### Wednesday: power, upper body, short conditioning

- Dynamic warm-up: about 7–8 min total, including easy bike, hip hinges, squat-to-stand, shoulder mobility, and empty-bar clean progression.
- Hang power clean: 5 × 2, about 2 min rest between sets. Moderate load, explosive and technically clean reps. Stop the exercise if speed or technique deteriorates.
- Push press: 3 × 4–5.
- Chest-supported row: 3 × 8.
- Alternate push press and row, resting 60–75 sec after each exercise.
- Stationary-bike intervals: 2 min hard, 2 min easy, repeated three times. Planned phase time is 12 min, with setup budgeted separately.
- Neck: one round, 20–30 sec per direction. Apply the general between-direction rest rule.
- Light stretching: about 5 min.

### Friday: front squat, upper body, neck/core

- Dynamic warm-up: about 7–8 min total, including easy bike, leg swings, walking lunges, bodyweight squats, shoulder mobility, and progressive front squat warm-up sets.
- Front squat: 4 × 4, resting 2.5–3 min between each working set. Moderate-heavy, no grinders.
- Pull-ups: 2–3 × 6–8.
- Dumbbell shoulder press: 2–3 × 6–8.
- Alternate pull-ups and shoulder press, resting about 60 sec after each exercise.
- Seated cable rotation: 2 × 10 per side, resting about 45–60 sec. Confirm whether this rest follows each side or each left/right pair before instantiating its timer sequence.
- Neck: one round, 20–30 sec per direction, resting 20–30 sec between directions.
- Light stretching: about 5 min.

### Weekend: dedicated aerobic session

- Stationary bike, no intervals.
- Easy warm-up: 5 min.
- Zone 2: 40–50 min, easy enough to speak in complete sentences.
- Easy cooldown/stretching: 5 min.
- Record actual duration, optional measured heart rate, perceived effort, and an optional talk-test observation. Do not invent a heart-rate zone or infer physiological Zone 2 from elapsed time alone.

The upper end, 5 + 50 + 5 minutes, consumes the entire hour before any setup or transition time. Select a shorter duration within the range when needed. Do not claim that the 50-minute option always fits the full-session cap.

### Shared recovery and transition rules

| Context | Prescribed recovery |
| --- | --- |
| Deadlift / front squat | 150–180 sec between working sets |
| Hang power clean | About 120 sec between sets |
| Medium compound lift performed alone | About 75–90 sec between sets |
| Alternating pair | About 60 sec after each exercise, with Wednesday's specific 60–75 sec range retained |
| Carries | 60–90 sec between carries |
| Core work | 45–60 sec, with side/pair scope explicitly established |
| Neck | 20–30 sec between directions, about 60 sec between complete rounds |
| Different exercise stations | Allow roughly 1–2 min for setup, water, and reset |

Specific exercise prescriptions take precedence over a general rule. Distinguish recovery between repetitions of the same exercise from rest between A and B and setup between stations. Switching to standalone exercises because equipment is unavailable changes the timing estimate and uses the standalone recovery rule.

## Duration planning and live adjustment

The estimator includes the full sequence of work, recovery, and transitions. Progressive lift warm-up sets are already included in the supplied warm-up budget, so do not count them twice. Conversely, if the warm-up takes longer in practice, record the overrun and reforecast rather than pretending it stayed within budget.

Represent each time interval once. When resting and setting up genuinely overlap, count the elapsed overlap once. Otherwise budget them separately. Do not assume zero setup time for alternating stations or append an unnecessary final between-set rest when the next interval is a transition or cooldown.

Working-set duration, travel between stations, equipment availability, and exact targets inside ranges are not all known yet. Present bounded estimates or labelled assumptions with a breakdown. Calibrate them from actual sessions over time. A range whose upper bound exceeds 60 minutes needs a conservative adjustment, not a green “fits” based on its midpoint.

Before starting, present the planned finish and any suggested accessory omission. During the session, reforecast after completed sets, extended rest, equipment delays, and approved edits. Reserve the stretching budget and protect main-lift recovery. Do not wait until minute 60 to reveal an infeasible plan.

Pausing an exercise or timer does not pause wall-clock time or extend the hour. At the cap, offer a safe finish rather than prescribing more work. Never demand an abrupt stop mid-repetition or silently discard overtime. Record what actually happened, including time beyond the cap. If no safe remaining plan fits, say so and offer to end without claiming the original prescription was completed.

Wednesday's omission priority is confirmed: cut upper-body accessory work from the push-press/chest-supported-row pair before cutting cycling intervals or neck work when time runs short. Preserve the clean prescription, protected rest, warm-up, and stretching. The app proposes the specific omission for approval rather than silently deleting work. Monday and Friday omission priorities remain unresolved. Use these day-specific priorities consistently in manual and AI recommendations.

## Logging, timers, and session state

Update under consideration: the user already records with Apple Watch and may not need duplicate phone timers. The [Apple Watch integration proposal](../research/apple-watch-integration.md) recommends reading saved workouts through HealthKit, keeping rest prescriptions visible, and making phone countdowns optional. The automatic-timer behaviour below is the earlier requirement, now under review. Timer defaults are not settled, and no Watch integration is implemented. Full-session budgeting remains required regardless of the chosen timer mode.

- Show current exercise, working/warm-up set role, target load and repetitions, previous comparable result, next exercise, and the prescribed rest.
- Start the appropriate recovery countdown automatically after an explicit set completion. At block boundaries show the applicable transition or next phase instead of an unrelated generic rest timer.
- Show the next exercise and setup needs during rest. Heavy-lift timers must not be shortened by the scheduler. If the user ends rest early, preserve that deviation in actual history rather than presenting it as prescribed recovery.
- Persist confirmed results and timer state. Backgrounding, locking, or restarting the phone must not erase a set or restart the full rest period.
- Timers describe elapsed time, not proof of performed work. On returning after a long interruption, distinguish elapsed interval phases from athlete-confirmed completion. Do not manufacture completed repetitions or neck holds.
- For intervals, show hard/easy phase, remaining phase time, round, and the next phase. Extra pauses remain visible in elapsed session time, even though the planned cycling phases total 12 min.
- For neck work, record direction, resistance descriptor or measured load when meaningful, target and actual hold duration, and recovery. A band colour or device level is not a fabricated pound value.
- Support perceived difficulty and explicit “grindy”, “technique deteriorated”, and clean-rep quality reports. Do not infer positive quality from an untouched control.
- A session can be in progress, finished, or ended early. Finished sessions retain performed and intentionally omitted work separately. Unreviewed remaining work must be resolved explicitly, not automatically marked complete.
- Completion and prescription adherence are distinct. A finished, deliberately shortened session is a valid record, not a failed workout, and it does not earn credit for omitted sets.

## Progression and weekly review

### Strength

Protect technically clean reps and generally 1–2 reps in reserve. No training-to-failure target for main lifts. Increases are gradual and constrained by real available increments. Exact increment and repeated-success rules remain to be agreed, not invented from generic gym defaults.

A grind or deterioration flag prevents an automatic increase from that result and prompts a conservative review. Missing effort or technique information is unknown. An omitted accessory is not a failed heavy-lift attempt.

### Explosive work

Clean repetitions and maintained speed/technique are prerequisites for considering increased load. Completion of 5 × 2 alone is insufficient evidence. Use the athlete's explicit quality report initially, not an invented velocity measurement. Offer to stop cleans when deterioration is reported, even if prescribed sets remain.

### Cardio

Develop consistency or duration before aggressively increasing intensity. Preserve the interval-free weekend session and the 60-minute total budget. Once that budget is full, do not automatically lengthen the session or add another day. Changing weekly frequency requires approval.

### Neck

Controlled, gradual progression in resistance or hold duration, never ballistic work or jumps to professional F1 loading. The specific device, resistance scale, technique guidance, and acceptable increments remain unresolved. Progression stays reviewable and conservative. Reported pain or concerning neurological symptoms are not a training challenge to overcome or an invitation to increase resistance.

### Recovery and future phases

Weekly review considers optional fatigue, sleep, perceived recovery, schedule pressure, and relevant driving activity without inventing a readiness score. Non-training days remain genuine recovery. Moving the weekend ride to Sunday makes Saturday a recovery day rather than creating a second aerobic session.

Future 5–6-day training, simulator work, more cycling, more neck/trunk endurance, and heat preparation belong to a later explicitly selected phase when real driving demands justify them. Do not activate them from a long-term goal or simply add bodybuilding volume. Heat work needs separate qualified guidance and safety constraints.

AI receives the governing time/rest/quality constraints with the review packet. Deterministic checks also reject proposals that break the cap, shorten protected rest, assume absent baseline loads, introduce prohibited volume, or treat reported deterioration as a successful progression signal. If a proposal lacks enough information to check feasibility, return it for clarification rather than accepting it as safe.

## Behavioural acceptance examples

- Enter 35 for an incline dumbbell set and see `35 lb / hand` in the session, history, and exported review, with no silent doubling.
- Log progressive deadlift warm-up sets and keep them separate from the four working triples.
- Finish a deadlift working set and receive its prescribed 150–180 sec target after a value has been selected, not a generic 60 sec timer.
- Alternate A/B sets without forcing nonstop station changes. An equipment delay changes the forecast, not the heavy-lift recovery prescription.
- When accessories put the forecast beyond 60 minutes, recommend an approved lower-priority omission with its expected saving. Never shorten deadlift or squat rest instead.
- Omit a carry for time, finish the session, and preserve the omitted carry without counting it as performed or classifying it as a failed strength attempt.
- Mark a clean set as technically deteriorated and receive a stop/review path rather than a heavier next-set target or congratulatory PR prompt.
- Track four neck directions and their distinct holds and resistance. A timer expiring without confirmation does not record an actual hold automatically.
- Complete three hard/easy cycling rounds, record any interruptions truthfully, and preserve the weekend ride as interval-free.
- Choose a 50-minute Zone 2 block and see that its 5-minute warm-up and 5-minute cooldown leave no setup allowance. Shorten within the range or flag the estimate as infeasible.
- Lock or restart the phone during rest, then recover the saved result and correct elapsed timing without crediting unperformed work.
- Complete the four-day week and leave the remaining three days as recovery. Do not schedule active recovery or a fifth day automatically.
- Import an AI proposal that violates a protected rest rule or exceeds the full-session budget and reject it without changing the approved plan.

## Still to resolve

- Whether Watch recording includes warm-up/stretching and whether the Watch currently supplies rest/interval alerts. Wednesday's separate strength and cycling recordings are confirmed.

- Monday and Friday accessory omission order. Wednesday's upper-body pair is confirmed as lower priority than cycling and neck when time runs short.
- Current working weights and available equipment increments, pull-up assistance/added-load mode, and carry load basis.
- Neck device/resistance scale and progression guidance. Directions, initial round count, and hold/rest ranges are now known.
- Exact preferred timer values within ranges, Friday's 2–3 set choice, and cable-rotation rest after each side versus after both sides.
- Preferred weekend day and actual warm-up/setup timings. No guarantee that every exercise listed fits every session until timing is evaluated.
- Backend authentication, model, spending limit, and retention, plus app naming, Apple Developer access, and the design screenshot.
