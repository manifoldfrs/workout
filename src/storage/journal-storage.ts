import { Effect, Layer } from "effect"
import { openDatabaseAsync } from "expo-sqlite"
import { JournalStore, WorkoutStorageError } from "../services/journal-store"
import { makeSqliteJournalStore } from "./sqlite-journal-store"

/** Native database lifetime belongs to the app runtime, not individual saves. */
export const journalStorageLayer = Layer.effect(
  JournalStore,
  Effect.gen(function* () {
    const database = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => openDatabaseAsync("workout.sqlite"),
        catch: () =>
          new WorkoutStorageError({
            message: "Could not open the local workout database. No data has been replaced.",
          }),
      }),
      (connection) =>
        Effect.promise(() => connection.closeAsync()).pipe(
          Effect.catchCause(() =>
            Effect.logWarning("Could not close the local workout database cleanly."),
          ),
        ),
    )
    return yield* makeSqliteJournalStore(database)
  }),
)
