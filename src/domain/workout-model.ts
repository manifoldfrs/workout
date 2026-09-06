import { Effect, Schema } from "effect"

/** Session identifiers are stable across repeated start requests. */
export const SessionId = Schema.NonEmptyString.pipe(Schema.brand("SessionId"))
/** Session identity, distinct from a set identifier. */
export type SessionId = typeof SessionId.Type
/** A set identifier is unique within its programme. */
export const SetId = Schema.NonEmptyString.pipe(Schema.brand("SetId"))
/** Identifies one prescribed set, not an exercise name. */
export type SetId = typeof SetId.Type
/** Wall-clock milliseconds, never a workout duration in seconds. */
export const Timestamp = Schema.Number.check(
  Schema.isFinite(),
  Schema.isGreaterThanOrEqualTo(0),
).pipe(Schema.brand("Timestamp"))
/** Wall-clock milliseconds used for durable session timing. */
export type Timestamp = typeof Timestamp.Type
/** Non-negative external load in pounds, with basis recorded separately. */
export const Pounds = Schema.Number.check(Schema.isFinite(), Schema.isGreaterThanOrEqualTo(0)).pipe(
  Schema.brand("Pounds"),
)
/** Carry distances remain in metres regardless of the load unit. */
export const Metres = Schema.Number.check(Schema.isFinite(), Schema.isGreaterThan(0)).pipe(
  Schema.brand("Metres"),
)
/** Positive durations are measured in seconds. */
export const Seconds = Schema.Number.check(Schema.isFinite(), Schema.isGreaterThan(0)).pipe(
  Schema.brand("Seconds"),
)
/** Duration in seconds, distinct from a timestamp. */
export type Seconds = typeof Seconds.Type
/** The four recurring training templates. */
export const ProgrammeId = Schema.Literals(["monday", "wednesday", "friday", "weekend"])
/** Programme names do not imply that a session was completed. */
export type ProgrammeId = typeof ProgrammeId.Type

const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))
const PositiveCount = Schema.Int.check(Schema.isGreaterThan(0))
const LoadBasis = Schema.Literals(["total", "perHand"])

/** Measured load distinguishes assistance, body weight, and external resistance. */
export const WorkoutLoad = Schema.TaggedUnion({
  bodyweight: {},
  external: { pounds: Pounds, basis: LoadBasis },
  assisted: { pounds: Pounds },
})
/** Actual results never infer weight or resistance from the prescription. */
export const SetMeasurement = Schema.TaggedUnion({
  reps: { repetitions: Count, load: WorkoutLoad },
  carry: { metres: Metres, pounds: Pounds, basis: LoadBasis },
  hold: { seconds: Seconds, resistance: Schema.NonEmptyString },
  duration: { seconds: Seconds },
})
/** A completed measurement, preserving modality and load basis. */
export type SetMeasurement = typeof SetMeasurement.Type

/** Prescribed targets remain ranges until the athlete makes a choice. */
export const SetTarget = Schema.TaggedUnion({
  reps: {
    min: PositiveCount,
    max: PositiveCount,
    load: Schema.Literals(["total", "perHand", "pullup", "choose"]),
  },
  carry: { min: Metres, max: Metres },
  hold: { min: Seconds, max: Seconds },
  duration: { min: Seconds, max: Seconds },
})
/** Target ranges, not actual performance. */
export type SetTarget = typeof SetTarget.Type

/** A prescription includes rest and work estimates without guessing actual performance. */
export const SetPrescription = Schema.Struct({
  id: SetId,
  exercise: Schema.NonEmptyString,
  group: Schema.NonEmptyString,
  label: Schema.NonEmptyString,
  role: Schema.Literals(["preparation", "working", "cooldown"]),
  target: SetTarget,
  rest: Schema.Struct({ min: Count, max: Count }),
  workEstimate: Schema.Struct({ min: Count, max: Count }),
  transition: Schema.Struct({ min: Count, max: Count }),
  cue: Schema.String,
})
/** A set snapshot protects history from future template changes. */
export interface SetPrescription extends Schema.Schema.Type<typeof SetPrescription> {}

/** Reported quality stays unknown until the athlete explicitly provides it. */
export const RepQuality = Schema.Literals(["unreported", "clean", "grindy", "deteriorated"])
/** Rep quality is an observation, not measured velocity. */
export type RepQuality = typeof RepQuality.Type
/** Performed, omitted, and pending work are different outcomes. */
export const SetOutcome = Schema.TaggedUnion({
  pending: {},
  performed: {
    measurement: SetMeasurement,
    quality: RepQuality,
    rir: Schema.optionalKey(Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 10 }))),
    recordedAt: Timestamp,
  },
  omitted: { reason: Schema.NonEmptyString },
})
/** Omitted work must not count as a performed set. */
export type SetOutcome = typeof SetOutcome.Type
/** One session set owns its immutable prescription and current outcome. */
export const SessionSet = Schema.Struct({ prescription: SetPrescription, outcome: SetOutcome })
/** Session set snapshot used by the logger and review. */
export interface SessionSet extends Schema.Schema.Type<typeof SessionSet> {}

/** Session completion is explicit and independent of prescription adherence. */
export const SessionState = Schema.TaggedUnion({
  active: {},
  finished: {
    endedAt: Timestamp,
    completion: Schema.Literals(["completed", "endedEarly"]),
  },
})
/** A local training session is not a second Apple Health recording. */
export const WorkoutSession = Schema.Struct({
  id: SessionId,
  programmeId: ProgrammeId,
  startedAt: Timestamp,
  sets: Schema.Array(SessionSet),
  state: SessionState,
  restDeadline: Schema.optionalKey(Timestamp),
})
/** Stores actual results and the prescription used at session start. */
export interface WorkoutSession extends Schema.Schema.Type<typeof WorkoutSession> {}

/** Versioned local journal. No credentials or imported HealthKit data belong here. */
export const WorkoutJournal = Schema.Struct({
  formatVersion: Schema.Literal(1),
  revision: Count,
  sessions: Schema.Array(WorkoutSession),
  reviewedRevision: Schema.optionalKey(Count),
})
/** Full-fidelity local backup shape for manually logged training. */
export interface WorkoutJournal extends Schema.Schema.Type<typeof WorkoutJournal> {}

/** Parse failures are safe to display without echoing personal data. */
export class InvalidWorkoutData extends Schema.TaggedError<InvalidWorkoutData>()(
  "InvalidWorkoutData",
  {
    message: Schema.String,
  },
) {}

/** A first run has no fabricated history or working weights. */
export function emptyWorkoutJournal(): WorkoutJournal {
  return { formatVersion: 1, revision: 0, sessions: [] }
}

/** Measurement compatibility protects load basis and exercise modality on every input path. */
export function measurementFitsTarget(target: SetTarget, measurement: SetMeasurement): boolean {
  if (target._tag !== measurement._tag) return false
  if (target._tag !== "reps" || measurement._tag !== "reps") return true
  if (target.load === "choose") return measurement.load._tag === "external"
  if (target.load === "pullup")
    return measurement.load._tag !== "external" || measurement.load.basis === "total"
  return measurement.load._tag === "external" && measurement.load.basis === target.load
}

/** Rehydrate only internally consistent journals, including imported backups. */
export function parseWorkoutJournal(
  input: unknown,
): Effect.Effect<WorkoutJournal, InvalidWorkoutData> {
  return Schema.decodeUnknownEffect(WorkoutJournal)(input).pipe(
    Effect.mapError(
      () =>
        new InvalidWorkoutData({
          message: "Workout data is invalid or uses an unsupported version.",
        }),
    ),
    Effect.flatMap((journal) => {
      const duplicateSessions =
        new Set(journal.sessions.map((session) => session.id)).size !== journal.sessions.length
      const activeSessions = journal.sessions.filter(
        (session) => session.state._tag === "active",
      ).length
      const invalidSession = journal.sessions.some((session) => {
        if (session.sets.length === 0) return true
        if (
          session.restDeadline !== undefined &&
          (session.restDeadline < session.startedAt || session.state._tag === "finished")
        )
          return true
        if (session.state._tag === "finished") {
          const endedAt = session.state.endedAt
          if (
            session.sets.some(
              (set) => set.outcome._tag === "performed" && set.outcome.recordedAt > endedAt,
            )
          )
            return true
        }
        if (new Set(session.sets.map((set) => set.prescription.id)).size !== session.sets.length)
          return true
        if (
          session.state._tag === "finished" &&
          (session.state.endedAt < session.startedAt ||
            session.sets.some((set) => set.outcome._tag === "pending"))
        )
          return true
        return session.sets.some(
          ({ prescription, outcome }) =>
            prescription.target.min > prescription.target.max ||
            prescription.rest.min > prescription.rest.max ||
            prescription.workEstimate.min > prescription.workEstimate.max ||
            prescription.transition.min > prescription.transition.max ||
            (outcome._tag === "performed" &&
              (!measurementFitsTarget(prescription.target, outcome.measurement) ||
                outcome.recordedAt < session.startedAt)),
        )
      })
      if (
        duplicateSessions ||
        activeSessions > 1 ||
        invalidSession ||
        (journal.reviewedRevision !== undefined && journal.reviewedRevision > journal.revision)
      ) {
        return Effect.fail(
          new InvalidWorkoutData({
            message:
              "Workout data contains inconsistent sessions. Your current log was not changed.",
          }),
        )
      }
      return Effect.succeed(journal)
    }),
  )
}
