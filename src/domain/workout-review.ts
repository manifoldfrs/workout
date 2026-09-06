import { Schema } from "effect"
import type { SetId, SetPrescription, WorkoutJournal, WorkoutSession } from "./workout-model"

/** Planning estimates are ranges, not a promise that the workout fits. */
export interface SessionBudget {
  readonly elapsedSeconds: number
  readonly remainingSeconds: number
  readonly estimatedRemaining: { readonly min: number; readonly max: number }
  readonly likelyOverBudget: boolean
  readonly suggestedCuts: ReadonlyArray<SetId>
}
/** Sum prescribed work, protected rest and explicit setup assumptions before the session starts. */
export function estimateWorkoutDuration(sets: ReadonlyArray<SetPrescription>): {
  readonly min: number
  readonly max: number
} {
  return sets.reduce(
    (sum, set) => ({
      min: sum.min + set.workEstimate.min + set.rest.min + set.transition.min,
      max: sum.max + set.workEstimate.max + set.rest.max + set.transition.max,
    }),
    { min: 0, max: 0 },
  )
}

/** Includes preparation, actual elapsed time, remaining work, rest and transitions. */
export function sessionBudget(session: WorkoutSession, now: number): SessionBudget {
  const end = session.state._tag === "finished" ? session.state.endedAt : now
  const elapsedSeconds = Math.max(0, (end - session.startedAt) / 1000)
  const pending = session.sets.filter((set) => set.outcome._tag === "pending")
  const timerRemaining =
    session.restDeadline === undefined ? 0 : Math.max(0, (session.restDeadline - now) / 1000)
  const lastPerformed = session.sets
    .filter((set) => set.outcome._tag === "performed")
    .sort(
      (a, b) =>
        (b.outcome._tag === "performed" ? b.outcome.recordedAt : 0) -
        (a.outcome._tag === "performed" ? a.outcome.recordedAt : 0),
    )[0]
  const sinceLastEntry =
    lastPerformed?.outcome._tag === "performed"
      ? Math.max(0, (now - lastPerformed.outcome.recordedAt) / 1000)
      : undefined
  const remaining = estimateWorkoutDuration(pending.map((set) => set.prescription))
  const recoveryMin =
    lastPerformed && sinceLastEntry !== undefined && pending.length > 0
      ? Math.max(
          0,
          lastPerformed.prescription.rest.min +
            lastPerformed.prescription.transition.min -
            sinceLastEntry,
        )
      : 0
  const recoveryMax =
    lastPerformed && sinceLastEntry !== undefined && pending.length > 0
      ? Math.max(
          0,
          lastPerformed.prescription.rest.max +
            lastPerformed.prescription.transition.max -
            sinceLastEntry,
        )
      : 0
  const estimatedRemaining = {
    min: remaining.min + Math.max(timerRemaining, recoveryMin),
    max: remaining.max + Math.max(timerRemaining, recoveryMax),
  }
  const remainingSeconds = Math.max(0, 3600 - elapsedSeconds)
  const likelyOverBudget = estimatedRemaining.max > remainingSeconds
  const suggestedCuts =
    likelyOverBudget && session.programmeId === "wednesday"
      ? pending
          .filter(
            (set) => set.prescription.group === "push-press" || set.prescription.group === "row",
          )
          .map((set) => set.prescription.id)
      : []
  return { elapsedSeconds, remainingSeconds, estimatedRemaining, likelyOverBudget, suggestedCuts }
}

/** The first review supports only a conservative hold, never load changes. */
export const WorkoutReview = Schema.Struct({
  source: Schema.Literal("simulation"),
  basedOnRevision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  recommendation: Schema.Literal("hold"),
  finishedSessions: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  performedWorkingSets: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  omittedSets: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  qualityWarnings: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
})
/** A review is versioned against the exact journal it analysed. */
export interface WorkoutReview extends Schema.Schema.Type<typeof WorkoutReview> {}
/** A deterministic local review needs no account and sends no data off-device. */
export function simulateWorkoutReview(journal: WorkoutJournal, now: number): WorkoutReview {
  const since = now - 7 * 24 * 60 * 60 * 1000
  const recent = journal.sessions.filter(
    (session) =>
      session.state._tag === "finished" &&
      session.state.endedAt >= since &&
      session.state.endedAt <= now,
  )
  const sets = recent.flatMap((session) => session.sets)
  return {
    source: "simulation",
    basedOnRevision: journal.revision,
    recommendation: "hold",
    finishedSessions: recent.length,
    performedWorkingSets: sets.filter(
      (set) => set.prescription.role === "working" && set.outcome._tag === "performed",
    ).length,
    omittedSets: sets.filter((set) => set.outcome._tag === "omitted").length,
    qualityWarnings: sets.filter(
      (set) =>
        set.outcome._tag === "performed" &&
        (set.outcome.quality === "grindy" || set.outcome.quality === "deteriorated"),
    ).length,
  }
}
