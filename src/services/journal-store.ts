import { Context, Effect, Schema } from "effect"
import type { InvalidWorkoutData, WorkoutJournal } from "../domain/workout-model"

/** Storage errors never include the journal or raw native exception text. */
export class WorkoutStorageError extends Schema.TaggedError<WorkoutStorageError>()(
  "WorkoutStorageError",
  { message: Schema.String },
) {}
/** Concurrent writers must reload rather than overwrite newer history. */
export class WorkoutConflict extends Schema.TaggedError<WorkoutConflict>()("WorkoutConflict", {
  message: Schema.String,
}) {}
/** The journal store owns parsed history and atomic revision-checked persistence. */
export interface JournalStoreInterface {
  readonly load: () => Effect.Effect<WorkoutJournal, WorkoutStorageError | InvalidWorkoutData>
  readonly save: (
    journal: WorkoutJournal,
    expectedRevision: number,
  ) => Effect.Effect<void, WorkoutStorageError | WorkoutConflict>
}
/** Persistence capability shared by native SQLite and the browser preview. */
export class JournalStore extends Context.Service<JournalStore, JournalStoreInterface>()(
  "workout/JournalStore",
) {}
