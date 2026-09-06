import { Layer, ManagedRuntime } from "effect"
import { journalStorageLayer } from "../storage/journal-storage"
import { workoutServiceLayer, type WorkoutService } from "./workout-service"
import type { WorkoutStorageError } from "./journal-store"

/** The UI owns and disposes this local runtime. No network credentials are needed. */
export function createWorkoutRuntime(): ManagedRuntime.ManagedRuntime<
  WorkoutService,
  WorkoutStorageError
> {
  return ManagedRuntime.make(workoutServiceLayer.pipe(Layer.provide(journalStorageLayer)))
}
