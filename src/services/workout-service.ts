import { Clock, Context, Effect, Layer, Schema } from "effect"
import {
  applyWorkoutCommand,
  parseWorkoutCommand,
  type WorkoutRuleViolation,
} from "../domain/workout-commands"
import {
  InvalidWorkoutData,
  Timestamp,
  parseWorkoutJournal,
  type WorkoutJournal,
} from "../domain/workout-model"
import { JournalStore, WorkoutConflict, type WorkoutStorageError } from "./journal-store"

/** Expected failures at the app boundary, without personal payloads. */
export type WorkoutServiceError =
  InvalidWorkoutData | WorkoutRuleViolation | WorkoutStorageError | WorkoutConflict
/** Owns logging and backup transactions through the same public entrypoints. */
export interface WorkoutServiceInterface {
  readonly load: () => Effect.Effect<WorkoutJournal, WorkoutServiceError>
  readonly execute: (input: unknown) => Effect.Effect<WorkoutJournal, WorkoutServiceError>
  readonly exportBackup: () => Effect.Effect<string, WorkoutServiceError>
  readonly restoreBackup: (
    input: string,
    expectedRevision: number,
  ) => Effect.Effect<WorkoutJournal, WorkoutServiceError>
}
/** Local workout operations do not depend on an AI or Health service. */
export class WorkoutService extends Context.Service<WorkoutService, WorkoutServiceInterface>()(
  "workout/WorkoutService",
) {}

/** Runtime construction keeps persistence and clocks out of the domain. */
export const workoutServiceLayer = Layer.effect(
  WorkoutService,
  Effect.gen(function* () {
    const store = yield* JournalStore
    const load = Effect.fn("WorkoutService.load")(function* () {
      return yield* store.load()
    })
    const execute = Effect.fn("WorkoutService.execute")(function* (input: unknown) {
      const command = yield* parseWorkoutCommand(input)
      const current = yield* store.load()
      const now = Timestamp.make(yield* Clock.currentTimeMillis)
      const changed = yield* applyWorkoutCommand(current, command, now)
      if (changed === current) return current
      const updated = yield* parseWorkoutJournal({ ...changed, revision: current.revision + 1 })
      yield* store.save(updated, current.revision)
      return updated
    })
    const exportBackup = Effect.fn("WorkoutService.exportBackup")(function* () {
      const journal = yield* store.load()
      return JSON.stringify(journal, null, 2)
    })
    const restoreBackup = Effect.fn("WorkoutService.restoreBackup")(function* (
      input: string,
      expectedRevision: number,
    ) {
      const raw = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown))(
        input,
      ).pipe(
        Effect.mapError(
          () =>
            new InvalidWorkoutData({
              message: "Workout backup is not valid JSON. The current log was not changed.",
            }),
        ),
      )
      const imported = yield* parseWorkoutJournal(raw)
      const current = yield* store.load()
      if (current.revision !== expectedRevision)
        return yield* new WorkoutConflict({
          message:
            "The local log changed after the restore preview. Reload and confirm replacement again.",
        })
      const { reviewedRevision: _, ...restorable } = imported
      const restored = { ...restorable, revision: current.revision + 1 }
      yield* store.save(restored, current.revision)
      return restored
    })
    return WorkoutService.of({ load, execute, exportBackup, restoreBackup })
  }),
)
