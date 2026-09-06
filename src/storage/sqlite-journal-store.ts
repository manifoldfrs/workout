import { Effect, Schema } from "effect"
import {
  InvalidWorkoutData,
  emptyWorkoutJournal,
  parseWorkoutJournal,
} from "../domain/workout-model"
import {
  JournalStore,
  WorkoutConflict,
  WorkoutStorageError,
  type JournalStoreInterface,
} from "../services/journal-store"

const StoredJournal = Schema.Struct({ payload: Schema.String, revision: Schema.Int })
const storageFailure = () =>
  new WorkoutStorageError({
    message: "Could not access the workout log. Your entry has not been marked saved. Try again.",
  })

/** Minimal SQLite mechanics accepted by this technology adapter, not by application callers. */
export interface WorkoutSqliteConnection {
  readonly execAsync: (sql: string) => Promise<void>
  readonly getFirstAsync: (sql: string) => Promise<unknown>
  readonly runAsync: (
    sql: string,
    ...params: Array<string | number>
  ) => Promise<{ readonly changes: number | bigint }>
}

/** Parse stored rows and commit the whole journal with one atomic conditional update. */
export function makeSqliteJournalStore(
  database: WorkoutSqliteConnection,
): Effect.Effect<JournalStoreInterface, WorkoutStorageError> {
  return Effect.gen(function* () {
    const rawVersion = yield* Effect.tryPromise({
      try: () => database.getFirstAsync("PRAGMA user_version"),
      catch: storageFailure,
    })
    const version = yield* Schema.decodeUnknownEffect(
      Schema.Struct({ user_version: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)) }),
    )(rawVersion).pipe(Effect.mapError(storageFailure))
    if (version.user_version > 1)
      return yield* new WorkoutStorageError({
        message: "This workout database needs a newer app version. It has not been changed.",
      })
    if (version.user_version === 0) {
      // Finish native setup before the runtime can release its connection.
      yield* Effect.tryPromise({
        try: async () => {
          await database.execAsync("PRAGMA journal_mode = WAL; BEGIN IMMEDIATE;")
          try {
            await database.execAsync(
              "CREATE TABLE IF NOT EXISTS journal (id INTEGER PRIMARY KEY CHECK (id = 1), revision INTEGER NOT NULL, payload TEXT NOT NULL)",
            )
            await database.runAsync(
              "INSERT OR IGNORE INTO journal (id, revision, payload) VALUES (1, 0, ?)",
              JSON.stringify(emptyWorkoutJournal()),
            )
            await database.execAsync("PRAGMA user_version = 1; COMMIT;")
          } catch (cause) {
            await database.execAsync("ROLLBACK")
            throw cause
          }
        },
        catch: storageFailure,
      }).pipe(Effect.uninterruptible)
    }
    return JournalStore.of({
      load: Effect.fn("SqliteJournalStore.load")(function* () {
        const raw = yield* Effect.tryPromise({
          try: () => database.getFirstAsync("SELECT revision, payload FROM journal WHERE id = 1"),
          catch: storageFailure,
        })
        const row = yield* Schema.decodeUnknownEffect(StoredJournal)(raw).pipe(
          Effect.mapError(
            () =>
              new InvalidWorkoutData({
                message: "The saved workout log could not be read. It has not been replaced.",
              }),
          ),
        )
        const data = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown))(
          row.payload,
        ).pipe(
          Effect.mapError(
            () =>
              new InvalidWorkoutData({
                message: "The saved workout log is not valid JSON. It has not been replaced.",
              }),
          ),
        )
        const journal = yield* parseWorkoutJournal(data)
        if (row.revision !== journal.revision)
          return yield* new InvalidWorkoutData({
            message: "The saved workout revision is inconsistent. It has not been replaced.",
          })
        return journal
      }),
      save: Effect.fn("SqliteJournalStore.save")(function* (journal, expectedRevision) {
        const result = yield* Effect.tryPromise({
          try: () =>
            database.runAsync(
              "UPDATE journal SET revision = ?, payload = ? WHERE id = 1 AND revision = ?",
              journal.revision,
              JSON.stringify(journal),
              expectedRevision,
            ),
          catch: storageFailure,
        })
        if (Number(result.changes) !== 1)
          return yield* new WorkoutConflict({
            message: "The workout log changed elsewhere. Reload before trying again.",
          })
      }),
    })
  })
}
