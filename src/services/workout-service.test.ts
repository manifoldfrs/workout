import { DatabaseSync } from "node:sqlite"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import { TestClock } from "effect/testing"
import * as FastCheck from "effect/testing/FastCheck"
import { WorkoutService } from "./workout-service"
import { workoutServiceLayer } from "./workout-service"
import { JournalStore } from "./journal-store"
import { makeSqliteJournalStore } from "../storage/sqlite-journal-store"
import {
  Timestamp,
  emptyWorkoutJournal,
  parseWorkoutJournal,
  type SetTarget,
  type WorkoutJournal,
} from "../domain/workout-model"
import { applyWorkoutCommand, parseWorkoutCommand } from "../domain/workout-commands"
import { workoutProgrammes } from "../domain/workout-programmes"
import {
  estimateWorkoutDuration,
  sessionBudget,
  simulateWorkoutReview,
} from "../domain/workout-review"

function connect(database: DatabaseSync) {
  return makeSqliteJournalStore({
    execAsync: async (sql) => {
      database.exec(sql)
    },
    getFirstAsync: async (sql) => database.prepare(sql).get(),
    runAsync: async (sql, ...params) => database.prepare(sql).run(...params),
  })
}
const fixture = Effect.gen(function* () {
  const database = yield* Effect.acquireRelease(
    Effect.sync(() => new DatabaseSync(":memory:")),
    (connection) => Effect.sync(() => connection.close()),
  )
  const store = yield* connect(database)
  const service = yield* WorkoutService.pipe(
    Effect.provide(workoutServiceLayer.pipe(Layer.provide(Layer.succeed(JournalStore, store)))),
  )
  return { service, store, database }
})
function session(journal: WorkoutJournal) {
  const found = journal.sessions[0]
  if (!found) throw new Error("Test expected a session")
  return found
}
function measurement(target: SetTarget): unknown {
  switch (target._tag) {
    case "reps":
      return {
        _tag: "reps",
        repetitions: target.min,
        load:
          target.load === "pullup"
            ? { _tag: "bodyweight" }
            : {
                _tag: "external",
                pounds: 10,
                basis: target.load === "choose" ? "total" : target.load,
              },
      }
    case "carry":
      return { _tag: "carry", metres: target.min, pounds: 10, basis: "perHand" }
    case "hold":
      return { _tag: "hold", seconds: target.min, resistance: "Sample light manual resistance" }
    case "duration":
      return { _tag: "duration", seconds: target.min }
  }
}

describe("local workout service with real SQLite", () => {
  it.effect(
    "starts empty and logs, undoes, finishes, exports and restores through the public service",
    () =>
      Effect.gen(function* () {
        const { service } = yield* fixture
        expect(yield* service.load()).toEqual(emptyWorkoutJournal())
        yield* TestClock.setTime(1_000_000)
        const started = yield* service.execute({
          _tag: "start",
          sessionId: "sample-session",
          programmeId: "monday",
        })
        for (const set of session(started).sets) {
          yield* TestClock.adjust("10 seconds")
          yield* service.execute({
            _tag: "record",
            sessionId: "sample-session",
            setId: set.prescription.id,
            measurement: measurement(set.prescription.target),
            quality: "clean",
          })
        }
        const logged = yield* service.load()
        expect(session(logged).sets.every((set) => set.outcome._tag === "performed")).toBe(true)
        yield* service.execute({ _tag: "undo", sessionId: "sample-session", setId: "deadlift-1" })
        const incomplete = yield* Effect.result(
          service.execute({ _tag: "finish", sessionId: "sample-session" }),
        )
        expect(incomplete._tag).toBe("Failure")
        yield* service.execute({
          _tag: "omit",
          sessionId: "sample-session",
          setId: "deadlift-1",
          reason: "Sample equipment unavailable",
        })
        const finished = yield* service.execute({ _tag: "finish", sessionId: "sample-session" })
        expect(session(finished).state._tag).toBe("finished")
        expect(
          session(finished).sets.find((set) => set.prescription.id === "deadlift-1")?.outcome._tag,
        ).toBe("omitted")
        const backup = yield* service.exportBackup()
        const restored = yield* service.restoreBackup(backup, finished.revision)
        expect((yield* Effect.result(service.restoreBackup(backup, finished.revision)))._tag).toBe(
          "Failure",
        )
        expect(restored.sessions).toEqual(finished.sessions)
        expect(restored.revision).toBeGreaterThan(finished.revision)
      }),
  )

  it.effect("runs all four prescribed programmes through the same logger", () =>
    Effect.gen(function* () {
      const { service } = yield* fixture
      for (const programme of workoutProgrammes) {
        const sessionId = `sample-${programme.id}`
        const started = yield* service.execute({
          _tag: "start",
          sessionId,
          programmeId: programme.id,
          upperBodySets: 2,
        })
        const current = started.sessions.find((entry) => entry.id === sessionId)
        if (!current) throw new Error("Test expected the started session")
        for (const set of current.sets) {
          yield* service.execute({
            _tag: "record",
            sessionId,
            setId: set.prescription.id,
            measurement: measurement(set.prescription.target),
            quality: "unreported",
          })
        }
        yield* service.execute({ _tag: "finish", sessionId })
      }
      expect(
        (yield* service.load()).sessions.filter((entry) => entry.state._tag === "finished"),
      ).toHaveLength(4)
    }),
  )

  it.effect("a failed SQLite write leaves results pending and can be retried", () =>
    Effect.gen(function* () {
      const { service, database } = yield* fixture
      const started = yield* service.execute({
        _tag: "start",
        sessionId: "sample",
        programmeId: "monday",
      })
      database.exec("PRAGMA query_only = ON")
      const record = {
        _tag: "record",
        sessionId: "sample",
        setId: "warmup-1",
        measurement: { _tag: "duration", seconds: 420 },
        quality: "unreported",
      }
      expect((yield* Effect.result(service.execute(record)))._tag).toBe("Failure")
      expect(yield* service.load()).toEqual(started)
      database.exec("PRAGMA query_only = OFF")
      expect(session(yield* service.execute(record)).sets[0]?.outcome._tag).toBe("performed")
    }),
  )

  it.effect("includes outstanding prescribed rest without requiring a timer", () =>
    Effect.gen(function* () {
      const { service } = yield* fixture
      yield* service.execute({ _tag: "start", sessionId: "sample", programmeId: "monday" })
      const journal = yield* service.execute({
        _tag: "record",
        sessionId: "sample",
        setId: "deadlift-1",
        measurement: {
          _tag: "reps",
          repetitions: 3,
          load: { _tag: "external", pounds: 10, basis: "total" },
        },
        quality: "clean",
      })
      const current = session(journal)
      const remaining = estimateWorkoutDuration(
        current.sets.filter((set) => set.outcome._tag === "pending").map((set) => set.prescription),
      )
      const budget = sessionBudget(current, 0)
      expect(budget.estimatedRemaining.min).toBe(remaining.min + 150)
      expect(budget.estimatedRemaining.max).toBe(remaining.max + 180)
      expect(current.restDeadline).toBeUndefined()
    }),
  )

  it.effect("preserves per-hand pounds, bodyweight and assistance without inferred loads", () =>
    Effect.gen(function* () {
      const { service } = yield* fixture
      yield* service.execute({ _tag: "start", sessionId: "sample", programmeId: "monday" })
      const missing = yield* Effect.result(
        service.execute({
          _tag: "record",
          sessionId: "sample",
          setId: "incline-1",
          measurement: {
            _tag: "reps",
            repetitions: 6,
            load: { _tag: "external", basis: "perHand" },
          },
          quality: "unreported",
        }),
      )
      expect(missing._tag).toBe("Failure")
      const wrongBasis = yield* Effect.result(
        service.execute({
          _tag: "record",
          sessionId: "sample",
          setId: "incline-1",
          measurement: {
            _tag: "reps",
            repetitions: 6,
            load: { _tag: "external", pounds: 10, basis: "total" },
          },
          quality: "unreported",
        }),
      )
      expect(wrongBasis._tag).toBe("Failure")
      yield* service.execute({
        _tag: "record",
        sessionId: "sample",
        setId: "incline-1",
        measurement: {
          _tag: "reps",
          repetitions: 6,
          load: { _tag: "external", pounds: 10, basis: "perHand" },
        },
        quality: "unreported",
      })
      const loaded = yield* service.execute({
        _tag: "record",
        sessionId: "sample",
        setId: "pullup-1",
        measurement: { _tag: "reps", repetitions: 6, load: { _tag: "assisted", pounds: 10 } },
        quality: "unreported",
      })
      expect(
        session(loaded).sets.find((set) => set.prescription.id === "pullup-1")?.outcome,
      ).toMatchObject({
        _tag: "performed",
        measurement: { load: { _tag: "assisted", pounds: 10 } },
      })
    }),
  )

  it.effect("duplicate starts, records, finishes and review approvals do not add history", () =>
    Effect.gen(function* () {
      const { service } = yield* fixture
      const command = { _tag: "start", sessionId: "sample", programmeId: "monday" }
      const started = yield* service.execute(command)
      expect(yield* service.execute(command)).toEqual(started)
      const record = {
        _tag: "record",
        sessionId: "sample",
        setId: "deadlift-1",
        measurement: {
          _tag: "reps",
          repetitions: 3,
          load: { _tag: "external", pounds: 10, basis: "total" },
        },
        quality: "clean",
      }
      const logged = yield* service.execute(record)
      expect(yield* service.execute(record)).toEqual(logged)
      const finished = yield* service.execute({
        _tag: "endEarly",
        sessionId: "sample",
        reason: "Sample time budget",
      })
      expect(yield* service.execute({ _tag: "finish", sessionId: "sample" })).toEqual(finished)
      const approved = yield* service.execute({
        _tag: "approveReview",
        revision: finished.revision,
      })
      expect(
        yield* service.execute({ _tag: "approveReview", revision: finished.revision }),
      ).toEqual(approved)
      expect(approved.sessions).toEqual(finished.sessions)
    }),
  )

  it.effect("rejects stale reviews and requires an explicit Friday volume choice", () =>
    Effect.gen(function* () {
      const { service } = yield* fixture
      expect(
        (yield* Effect.result(
          service.execute({ _tag: "start", sessionId: "sample", programmeId: "friday" }),
        ))._tag,
      ).toBe("Failure")
      const started = yield* service.execute({
        _tag: "start",
        sessionId: "sample",
        programmeId: "friday",
        upperBodySets: 2,
      })
      expect(
        session(started).sets.filter((set) => set.prescription.group === "pullup"),
      ).toHaveLength(2)
      yield* service.execute({
        _tag: "endEarly",
        sessionId: "sample",
        reason: "Sample time budget",
      })
      expect(
        (yield* Effect.result(
          service.execute({ _tag: "approveReview", revision: started.revision }),
        ))._tag,
      ).toBe("Failure")
    }),
  )

  it.effect(
    "expired optional timers never record work, and heavy-lift rest cannot be shortened",
    () =>
      Effect.gen(function* () {
        const { service } = yield* fixture
        yield* service.execute({ _tag: "start", sessionId: "sample", programmeId: "monday" })
        yield* service.execute({
          _tag: "record",
          sessionId: "sample",
          setId: "deadlift-1",
          measurement: {
            _tag: "reps",
            repetitions: 3,
            load: { _tag: "external", pounds: 10, basis: "total" },
          },
          quality: "clean",
        })
        expect(
          (yield* Effect.result(
            service.execute({
              _tag: "rest",
              sessionId: "sample",
              setId: "deadlift-1",
              seconds: 60,
            }),
          ))._tag,
        ).toBe("Failure")
        const resting = yield* service.execute({
          _tag: "rest",
          sessionId: "sample",
          setId: "deadlift-1",
          seconds: 180,
        })
        yield* TestClock.adjust("4 minutes")
        const resumed = yield* service.load()
        expect(resumed).toEqual(resting)
        expect(
          session(resumed).sets.find((set) => set.prescription.id === "deadlift-2")?.outcome._tag,
        ).toBe("pending")
      }),
  )

  it.effect(
    "stops later cleans after reported deterioration and only suggests Wednesday accessory cuts",
    () =>
      Effect.gen(function* () {
        const { service } = yield* fixture
        yield* service.execute({ _tag: "start", sessionId: "sample", programmeId: "wednesday" })
        yield* service.execute({
          _tag: "record",
          sessionId: "sample",
          setId: "clean-1",
          measurement: {
            _tag: "reps",
            repetitions: 2,
            load: { _tag: "external", pounds: 10, basis: "total" },
          },
          quality: "deteriorated",
        })
        expect(
          (yield* Effect.result(
            service.execute({
              _tag: "record",
              sessionId: "sample",
              setId: "clean-2",
              measurement: {
                _tag: "reps",
                repetitions: 2,
                load: { _tag: "external", pounds: 10, basis: "total" },
              },
              quality: "clean",
            }),
          ))._tag,
        ).toBe("Failure")
        const journal = yield* service.load()
        const budget = sessionBudget(session(journal), 55 * 60 * 1000)
        expect(budget.likelyOverBudget).toBe(true)
        expect(budget.suggestedCuts).toHaveLength(6)
        expect(
          budget.suggestedCuts.every((id) => id.startsWith("push-press") || id.startsWith("row")),
        ).toBe(true)
        expect(yield* service.load()).toEqual(journal)
      }),
  )

  it.effect("rejects corrupt and incompatible backups without changing the current journal", () =>
    Effect.gen(function* () {
      const { service, database } = yield* fixture
      const current = yield* service.execute({
        _tag: "start",
        sessionId: "sample",
        programmeId: "weekend",
      })
      for (const backup of [
        "not JSON",
        JSON.stringify({ ...current, formatVersion: 99 }),
        JSON.stringify({ ...current, sessions: [...current.sessions, ...current.sessions] }),
      ]) {
        expect((yield* Effect.result(service.restoreBackup(backup, current.revision)))._tag).toBe(
          "Failure",
        )
        expect(yield* service.load()).toEqual(current)
      }
      database.prepare("UPDATE journal SET payload = ? WHERE id = 1").run("corrupt")
      expect((yield* Effect.result(service.load()))._tag).toBe("Failure")
      expect(database.prepare("SELECT payload FROM journal WHERE id = 1").get()).toMatchObject({
        payload: "corrupt",
      })
    }),
  )

  it.effect("does not reseed a missing saved row or downgrade a newer database", () =>
    Effect.gen(function* () {
      const { database } = yield* fixture
      database.exec("DELETE FROM journal")
      const reopened = yield* connect(database)
      expect((yield* Effect.result(reopened.load()))._tag).toBe("Failure")
      expect(database.prepare("SELECT COUNT(*) AS count FROM journal").get()).toMatchObject({
        count: 0,
      })
      database.exec("PRAGMA user_version = 99")
      expect((yield* Effect.result(connect(database)))._tag).toBe("Failure")
      expect(database.prepare("PRAGMA user_version").get()).toMatchObject({ user_version: 99 })
    }),
  )

  it.effect("competing SQLite saves preserve the first committed revision", () =>
    Effect.gen(function* () {
      const { store } = yield* fixture
      yield* store.save({ ...emptyWorkoutJournal(), revision: 1 }, 0)
      const conflict = yield* Effect.result(
        store.save({ ...emptyWorkoutJournal(), revision: 2 }, 0),
      )
      expect(conflict._tag).toBe("Failure")
      if (conflict._tag === "Failure") expect(conflict.failure._tag).toBe("WorkoutConflict")
      expect((yield* store.load()).revision).toBe(1)
    }),
  )

  it.effect("committed SQLite history survives closing and reopening the file", () =>
    Effect.gen(function* () {
      const directory = yield* Effect.acquireRelease(
        Effect.sync(() => mkdtempSync(join(tmpdir(), "workout-test-"))),
        (path) => Effect.sync(() => rmSync(path, { recursive: true, force: true })),
      )
      const path = join(directory, "journal.sqlite")
      yield* Effect.scoped(
        Effect.gen(function* () {
          const database = yield* Effect.acquireRelease(
            Effect.sync(() => new DatabaseSync(path)),
            (connection) => Effect.sync(() => connection.close()),
          )
          const store = yield* connect(database)
          yield* store.save({ ...emptyWorkoutJournal(), revision: 1 }, 0)
        }),
      )
      const database = yield* Effect.acquireRelease(
        Effect.sync(() => new DatabaseSync(path)),
        (connection) => Effect.sync(() => connection.close()),
      )
      expect((yield* (yield* connect(database)).load()).revision).toBe(1)
    }),
  )
})

describe("domain properties", () => {
  it("preserves parsed journals through JSON roundtrips for generated valid loads", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.integer({ min: 0, max: 2000 }),
        FastCheck.integer({ min: 0, max: 50 }),
        (pounds, repetitions) => {
          const logged = Effect.runSync(
            Effect.gen(function* () {
              const start = yield* parseWorkoutCommand({
                _tag: "start",
                sessionId: "generated",
                programmeId: "monday",
              })
              const started = yield* applyWorkoutCommand(
                emptyWorkoutJournal(),
                start,
                Timestamp.make(0),
              )
              const record = yield* parseWorkoutCommand({
                _tag: "record",
                sessionId: "generated",
                setId: "incline-1",
                measurement: {
                  _tag: "reps",
                  repetitions,
                  load: { _tag: "external", pounds, basis: "perHand" },
                },
                quality: "unreported",
              })
              const recorded = yield* applyWorkoutCommand(started, record, Timestamp.make(1))
              expect(yield* applyWorkoutCommand(recorded, record, Timestamp.make(2))).toEqual(
                recorded,
              )
              return recorded
            }),
          )
          const raw = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Unknown))(
            JSON.stringify(logged),
          )
          expect(Effect.runSync(parseWorkoutJournal(raw))).toEqual(logged)
          expect(
            session(logged).sets.find((set) => set.prescription.id === "incline-1")?.outcome,
          ).toMatchObject({ measurement: { repetitions, load: { pounds, basis: "perHand" } } })
        },
      ),
    )
  })
  it.effect(
    "simulated reviews count only recent performed working sets, not omissions or warm-ups",
    () =>
      Effect.gen(function* () {
        const { service } = yield* fixture
        yield* service.execute({ _tag: "start", sessionId: "sample", programmeId: "monday" })
        yield* service.execute({
          _tag: "record",
          sessionId: "sample",
          setId: "warmup-1",
          measurement: { _tag: "duration", seconds: 420 },
          quality: "unreported",
        })
        const finished = yield* service.execute({
          _tag: "endEarly",
          sessionId: "sample",
          reason: "Sample quality decision",
        })
        expect(simulateWorkoutReview(finished, 1)).toMatchObject({
          performedWorkingSets: 0,
          finishedSessions: 1,
        })
        expect(simulateWorkoutReview(finished, 8 * 24 * 60 * 60 * 1000).finishedSessions).toBe(0)
      }),
  )
})
