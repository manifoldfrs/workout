import { Effect, Schema } from "effect"
import { findWorkoutProgramme } from "./workout-programmes"
import {
  InvalidWorkoutData,
  ProgrammeId,
  Seconds,
  SessionId,
  SetId,
  SetMeasurement,
  SetOutcome,
  Timestamp,
  measurementFitsTarget,
  type WorkoutJournal,
  type WorkoutSession,
} from "./workout-model"

/** Commands parse all caller input before touching saved sessions. */
export const WorkoutCommand = Schema.TaggedUnion({
  start: {
    sessionId: SessionId,
    programmeId: ProgrammeId,
    upperBodySets: Schema.optionalKey(Schema.Literals([2, 3])),
  },
  record: {
    sessionId: SessionId,
    setId: SetId,
    measurement: SetMeasurement,
    quality: SetOutcome.cases.performed.fields.quality,
    rir: SetOutcome.cases.performed.fields.rir,
  },
  undo: { sessionId: SessionId, setId: SetId },
  omit: { sessionId: SessionId, setId: SetId, reason: Schema.NonEmptyString },
  finish: { sessionId: SessionId },
  endEarly: { sessionId: SessionId, reason: Schema.NonEmptyString },
  rest: { sessionId: SessionId, setId: SetId, seconds: Seconds },
  clearRest: { sessionId: SessionId },
  approveReview: { revision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)) },
})
/** Parsed workout operation, not a persistence representation. */
export type WorkoutCommand = typeof WorkoutCommand.Type
/** Expected conflicts with the workout prescription or session lifecycle. */
export class WorkoutRuleViolation extends Schema.TaggedError<WorkoutRuleViolation>()(
  "WorkoutRuleViolation",
  { message: Schema.String },
) {}

/** Parse a command without exposing entered values in error messages. */
export function parseWorkoutCommand(
  input: unknown,
): Effect.Effect<WorkoutCommand, InvalidWorkoutData> {
  return Schema.decodeUnknownEffect(WorkoutCommand)(input).pipe(
    Effect.mapError(
      () =>
        new InvalidWorkoutData({
          message: "Check the workout entry. Use valid numbers and choose the load basis.",
        }),
    ),
  )
}

function failure(message: string) {
  return Effect.fail(new WorkoutRuleViolation({ message }))
}
function withoutTimer(session: WorkoutSession): WorkoutSession {
  const { restDeadline: _, ...remaining } = session
  return remaining
}
function startSession(
  journal: WorkoutJournal,
  command: Extract<WorkoutCommand, { _tag: "start" }>,
  now: Timestamp,
) {
  const existing = journal.sessions.find((session) => session.id === command.sessionId)
  if (existing)
    return existing.programmeId === command.programmeId
      ? Effect.succeed(journal)
      : failure("This session identifier already belongs to a different programme.")
  if (journal.sessions.some((session) => session.state._tag === "active"))
    return failure("Resume or finish your current session first.")
  const programme = findWorkoutProgramme(command.programmeId)
  if (!programme) return failure("This workout programme is unavailable.")
  if (programme.id === "friday" && command.upperBodySets === undefined)
    return failure("Choose two or three upper-body sets for Friday.")
  const sets = programme.sets.filter(
    (set) =>
      !(
        programme.id === "friday" &&
        command.upperBodySets === 2 &&
        (set.id === "pullup-3" || set.id === "shoulder-3")
      ),
  )
  return Effect.succeed({
    ...journal,
    sessions: [
      ...journal.sessions,
      {
        id: command.sessionId,
        programmeId: programme.id,
        startedAt: now,
        state: { _tag: "active" as const },
        sets: sets.map((prescription) => ({ prescription, outcome: { _tag: "pending" as const } })),
      },
    ],
  })
}

function updateSession(
  session: WorkoutSession,
  command: Exclude<WorkoutCommand, { _tag: "start" | "approveReview" }>,
  now: Timestamp,
): Effect.Effect<WorkoutSession, WorkoutRuleViolation> {
  if (session.state._tag === "finished") {
    if (command._tag === "finish" || command._tag === "endEarly") return Effect.succeed(session)
    return failure("This session is already finished. Its history has not changed.")
  }
  if (command._tag === "clearRest")
    return Effect.succeed(session.restDeadline === undefined ? session : withoutTimer(session))
  if (command._tag === "finish") {
    if (session.sets.some((set) => set.outcome._tag === "pending"))
      return failure("Record or deliberately omit the remaining work before finishing.")
    return Effect.succeed({
      ...withoutTimer(session),
      state: { _tag: "finished", endedAt: now, completion: "completed" },
    })
  }
  if (command._tag === "endEarly") {
    return Effect.succeed({
      ...withoutTimer(session),
      state: { _tag: "finished", endedAt: now, completion: "endedEarly" },
      sets: session.sets.map((set) =>
        set.outcome._tag === "pending"
          ? { ...set, outcome: { _tag: "omitted", reason: command.reason } }
          : set,
      ),
    })
  }
  const targetSet = session.sets.find((set) => set.prescription.id === command.setId)
  if (!targetSet) return failure("This set is not part of the session.")
  if (command._tag === "rest") {
    const { rest, group } = targetSet.prescription
    if (targetSet.outcome._tag !== "performed")
      return failure("Record this set before starting its optional rest timer.")
    if (group === "rotation")
      return failure(
        "Cable-rotation rest scope is not configured. Follow the displayed prescription manually.",
      )
    if (command.seconds < rest.min || command.seconds > rest.max || rest.max === 0)
      return failure(
        "Choose a rest duration within the prescribed range. Heavy-lift rest is protected.",
      )
    return Effect.succeed({
      ...session,
      restDeadline: Timestamp.make(now + command.seconds * 1000),
    })
  }
  if (command._tag === "undo" && targetSet.outcome._tag === "pending")
    return Effect.succeed(session)
  if (command._tag === "omit" && targetSet.outcome._tag !== "pending")
    return Effect.succeed(session)
  if (command._tag === "record" && targetSet.outcome._tag !== "pending") {
    const outcome = targetSet.outcome
    if (
      outcome._tag === "performed" &&
      Schema.toEquivalence(SetMeasurement)(outcome.measurement, command.measurement) &&
      outcome.quality === command.quality &&
      outcome.rir === command.rir
    )
      return Effect.succeed(session)
    return failure("This set already has a result. Undo it before recording a correction.")
  }
  if (
    command._tag === "record" &&
    !measurementFitsTarget(targetSet.prescription.target, command.measurement)
  )
    return failure("This measurement does not match the exercise or its load basis.")
  if (
    command._tag === "record" &&
    targetSet.prescription.group === "clean" &&
    session.sets.some(
      (set) =>
        set.prescription.group === "clean" &&
        set.outcome._tag === "performed" &&
        (set.outcome.quality === "deteriorated" || set.outcome.quality === "grindy"),
    )
  ) {
    return failure(
      "Stop cleans after reported grinding or technique deterioration. Omit the remaining clean sets.",
    )
  }
  const sets = session.sets.map((set) => {
    if (set.prescription.id !== command.setId) return set
    switch (command._tag) {
      case "undo":
        return { ...set, outcome: { _tag: "pending" as const } }
      case "omit":
        return set.outcome._tag === "pending"
          ? { ...set, outcome: { _tag: "omitted" as const, reason: command.reason } }
          : set
      case "record":
        return {
          ...set,
          outcome: {
            _tag: "performed" as const,
            measurement: command.measurement,
            quality: command.quality,
            ...(command.rir === undefined ? {} : { rir: command.rir }),
            recordedAt: now,
          },
        }
    }
  })
  return Effect.succeed({ ...withoutTimer(session), sets })
}

/** Pure transitions enforce explicit completion, revision checks and lifecycle rules. */
export function applyWorkoutCommand(
  journal: WorkoutJournal,
  command: WorkoutCommand,
  now: Timestamp,
): Effect.Effect<WorkoutJournal, WorkoutRuleViolation> {
  if (command._tag === "start") return startSession(journal, command, now)
  if (command._tag === "approveReview") {
    if (journal.reviewedRevision === command.revision) return Effect.succeed(journal)
    if (journal.revision !== command.revision)
      return failure("This review is out of date. Generate a new review before accepting it.")
    if (!journal.sessions.some((session) => session.state._tag === "finished"))
      return failure("Finish a session before reviewing training.")
    return Effect.succeed({ ...journal, reviewedRevision: command.revision })
  }
  const session = journal.sessions.find((entry) => entry.id === command.sessionId)
  if (!session) return failure("This session could not be found.")
  if (now < session.startedAt)
    return failure("The device clock is earlier than the session start. Correct it before saving.")
  return updateSession(session, command, now).pipe(
    Effect.map((updated) =>
      updated === session
        ? journal
        : {
            ...journal,
            sessions: journal.sessions.map((entry) => (entry.id === updated.id ? updated : entry)),
          },
    ),
  )
}
