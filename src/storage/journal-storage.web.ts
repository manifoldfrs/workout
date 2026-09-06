import { Effect, Layer, Schema } from "effect"
import {
  InvalidWorkoutData,
  emptyWorkoutJournal,
  parseWorkoutJournal,
} from "../domain/workout-model"
import { JournalStore, WorkoutConflict, WorkoutStorageError } from "../services/journal-store"

const key = "workout.journal.v1"
const storageFailure = () =>
  new WorkoutStorageError({
    message:
      "Browser storage is unavailable. Nothing was marked saved. Use a browser with local storage and Web Locks enabled.",
  })

/** Browser preview storage is separate from native SQLite and serialized across tabs. */
export const journalStorageLayer = Layer.effect(
  JournalStore,
  Effect.sync(() => {
    const load = Effect.fn("BrowserJournalStore.load")(function* () {
      const raw = yield* Effect.try({
        try: () => window.localStorage.getItem(key),
        catch: storageFailure,
      })
      if (raw === null) return emptyWorkoutJournal()
      const value = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown))(
        raw,
      ).pipe(
        Effect.mapError(
          () =>
            new InvalidWorkoutData({
              message: "The saved browser log is invalid. It has not been replaced.",
            }),
        ),
      )
      return yield* parseWorkoutJournal(value)
    })
    return JournalStore.of({
      load,
      save: Effect.fn("BrowserJournalStore.save")(function* (journal, expectedRevision) {
        const outcome = yield* Effect.tryPromise({
          try: () =>
            navigator.locks.request(key, async () => {
              const current = await Effect.runPromise(Effect.result(load()))
              if (current._tag === "Failure") return current
              if (current.success.revision !== expectedRevision)
                return {
                  _tag: "Failure" as const,
                  failure: new WorkoutConflict({
                    message: "The workout log changed in another tab. Reload before trying again.",
                  }),
                }
              window.localStorage.setItem(key, JSON.stringify(journal))
              return { _tag: "Success" as const, success: undefined }
            }),
          catch: storageFailure,
        })
        if (outcome._tag === "Failure") {
          if (outcome.failure._tag === "InvalidWorkoutData") return yield* storageFailure()
          return yield* outcome.failure
        }
      }),
    })
  }),
)
