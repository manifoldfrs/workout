import { Effect } from "effect"
import { useEffect, useRef, useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native"
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import type { ProgrammeId, WorkoutJournal } from "../domain/workout-model"
import { findWorkoutProgramme } from "../domain/workout-programmes"
import { createWorkoutRuntime } from "../services/workout-runtime"
import { WorkoutService, type WorkoutServiceError } from "../services/workout-service"
import { WorkoutHistoryScreen } from "./workout-history-screen"
import { WorkoutPlanScreen } from "./workout-plan-screen"
import { WorkoutReviewScreen } from "./workout-review-screen"
import { WorkoutSessionScreen } from "./workout-session-screen"
import { WorkoutWeekScreen } from "./workout-week-screen"
import { WorkoutButton, styles, workoutColors } from "./workout-theme"

type LoadState =
  | { readonly _tag: "loading" }
  | { readonly _tag: "ready"; readonly journal: WorkoutJournal }
  | { readonly _tag: "unavailable" }

/** The app boundary owns the runtime lifetime and handles expected errors without exposing payloads. */
export function WorkoutApp() {
  const runtime = useRef<ReturnType<typeof createWorkoutRuntime> | undefined>(undefined)
  const locked = useRef(false)
  const [state, setState] = useState<LoadState>({ _tag: "loading" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [tab, setTab] = useState<"week" | "history" | "review">("week")
  const [selected, setSelected] = useState<ProgrammeId | undefined>()
  const [showSession, setShowSession] = useState(false)

  useEffect(() => {
    const localRuntime = createWorkoutRuntime()
    runtime.current = localRuntime
    void localRuntime
      .runPromise(Effect.result(Effect.flatMap(WorkoutService, (service) => service.load())))
      .then((result) => {
        if (runtime.current !== localRuntime) return
        if (result._tag === "Success") setState({ _tag: "ready", journal: result.success })
        else {
          setState({ _tag: "unavailable" })
          setError(result.failure.message)
        }
      })
      .catch(() => {
        if (runtime.current !== localRuntime) return
        setState({ _tag: "unavailable" })
        setError("The local workout log could not open. It has not been reset.")
      })
    return () => {
      runtime.current = undefined
      void localRuntime
        .dispose()
        .catch(() => console.warn("Workout runtime cleanup could not complete."))
    }
  }, [])

  async function run<A>(
    operation: Effect.Effect<A, WorkoutServiceError, WorkoutService>,
  ): Promise<A | undefined> {
    const localRuntime = runtime.current
    if (!localRuntime || locked.current) return undefined
    locked.current = true
    setBusy(true)
    setError(undefined)
    try {
      const result = await localRuntime.runPromise(Effect.result(operation))
      if (runtime.current !== localRuntime) return undefined
      if (result._tag === "Failure") {
        setError(result.failure.message)
        return undefined
      }
      return result.success
    } catch {
      if (runtime.current === localRuntime)
        setError("The operation could not be confirmed. Reload your log before trying again.")
      return undefined
    } finally {
      locked.current = false
      if (runtime.current === localRuntime) setBusy(false)
    }
  }
  async function reload() {
    const journal = await run(Effect.flatMap(WorkoutService, (service) => service.load()))
    if (journal) setState({ _tag: "ready", journal })
  }
  async function execute(command: unknown): Promise<boolean> {
    const journal = await run(Effect.flatMap(WorkoutService, (service) => service.execute(command)))
    if (!journal) return false
    setState({ _tag: "ready", journal })
    return true
  }
  async function start(programmeId: ProgrammeId, upperBodySets: 2 | 3 | undefined) {
    const success = await execute({
      _tag: "start",
      programmeId,
      sessionId: `${programmeId}-${Date.now()}`,
      ...(upperBodySets === undefined ? {} : { upperBodySets }),
    })
    if (success) {
      setSelected(undefined)
      setShowSession(true)
    }
  }
  async function restoreBackup(data: string): Promise<boolean> {
    if (state._tag !== "ready") return false
    const expectedRevision = state.journal.revision
    const journal = await run(
      Effect.flatMap(WorkoutService, (service) => service.restoreBackup(data, expectedRevision)),
    )
    if (!journal) return false
    setState({ _tag: "ready", journal })
    return true
  }
  const journal = state._tag === "ready" ? state.journal : undefined
  const active = journal?.sessions.find((session) => session.state._tag === "active")
  const programme = selected === undefined ? undefined : findWorkoutProgramme(selected)

  function content() {
    if (!journal)
      return (
        <View style={[styles.page, { justifyContent: "center" }]}>
          <Text style={styles.title}>
            {state._tag === "loading" ? "Opening your log…" : "Your log stays yours."}
          </Text>
          <Text style={styles.body}>
            {state._tag === "loading"
              ? "Stored on this device. No account needed."
              : "We couldn't read the saved log. We won't replace it with an empty one."}
          </Text>
          {state._tag === "unavailable" && (
            <WorkoutButton
              label="Try loading again"
              disabled={busy}
              onPress={() => {
                void reload()
              }}
            />
          )}
        </View>
      )
    if (active && showSession)
      return (
        <WorkoutSessionScreen
          session={active}
          journal={journal}
          busy={busy}
          execute={execute}
          onBack={() => setShowSession(false)}
        />
      )
    if (programme)
      return (
        <WorkoutPlanScreen
          key={programme.id}
          programme={programme}
          busy={busy}
          onBack={() => setSelected(undefined)}
          onStart={(id, count) => {
            void start(id, count)
          }}
        />
      )
    switch (tab) {
      case "history":
        return (
          <WorkoutHistoryScreen
            journal={journal}
            busy={busy}
            exportBackup={() =>
              run(Effect.flatMap(WorkoutService, (service) => service.exportBackup()))
            }
            restoreBackup={restoreBackup}
          />
        )
      case "review":
        return (
          <WorkoutReviewScreen
            journal={journal}
            busy={busy}
            onApprove={(revision) => {
              void execute({ _tag: "approveReview", revision })
            }}
          />
        )
      case "week":
        return (
          <WorkoutWeekScreen
            hasActiveSession={active !== undefined}
            onResume={() => setShowSession(true)}
            onSelect={setSelected}
          />
        )
    }
  }
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.root}
        >
          {error && (
            <View accessibilityRole="alert" style={[styles.warning, { marginHorizontal: 16 }]}>
              <Text style={styles.error}>{error}</Text>
              <WorkoutButton
                label="Reload saved log"
                variant="quiet"
                onPress={() => {
                  void reload()
                }}
                disabled={busy}
              />
            </View>
          )}
          {content()}
          {journal && !(active && showSession) && !programme && (
            <View style={[styles.footer, styles.row]}>
              {(["week", "history", "review"] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="tab"
                  accessibilityLabel={
                    value === "week" ? "Week" : value === "history" ? "History" : "Review"
                  }
                  accessibilityState={{ selected: tab === value }}
                  onPress={() => setTab(value)}
                  style={{
                    minHeight: 48,
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 16,
                    backgroundColor: tab === value ? workoutColors.pale : "transparent",
                  }}
                >
                  <Text style={[styles.label, { textTransform: "capitalize" }]}>{value}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}
