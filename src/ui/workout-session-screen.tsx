import { useEffect, useState, type JSX } from "react"
import { AppState, ScrollView, Text, View } from "react-native"
import type { SetId, WorkoutJournal, WorkoutSession } from "../domain/workout-model"
import { measurementFitsTarget } from "../domain/workout-model"
import { estimateWorkoutDuration, sessionBudget } from "../domain/workout-review"
import { WorkoutEntryForm } from "./workout-entry-form"
import { WorkoutSetHistory } from "./workout-history"
import { WorkoutButton, styles, workoutColors } from "./workout-theme"

function clock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(whole / 60)}:${`${whole % 60}`.padStart(2, "0")}`
}

/** A session keeps its main action above the keyboard and optional rest outside the set result. */
export function WorkoutSessionScreen({
  session,
  journal,
  busy,
  execute,
  onBack,
}: {
  readonly session: WorkoutSession
  readonly journal: WorkoutJournal
  readonly busy: boolean
  readonly execute: (command: unknown) => Promise<boolean>
  readonly onBack: () => void
}): JSX.Element {
  const [now, setNow] = useState(Date.now())
  const [showLog, setShowLog] = useState(false)
  const [confirm, setConfirm] = useState<
    { readonly _tag: "omit"; readonly setId: SetId } | { readonly _tag: "endEarly" } | undefined
  >()
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    const subscription = AppState.addEventListener("change", () => setNow(Date.now()))
    return () => {
      clearInterval(timer)
      subscription.remove()
    }
  }, [])
  const budget = sessionBudget(session, now)
  const current = session.sets.find((set) => set.outcome._tag === "pending")
  const performed = session.sets.filter((set) => set.outcome._tag === "performed")
  const last = performed.sort(
    (a, b) =>
      (b.outcome._tag === "performed" ? b.outcome.recordedAt : 0) -
      (a.outcome._tag === "performed" ? a.outcome.recordedAt : 0),
  )[0]
  const previousSet = current
    ? journal.sessions
        .flatMap((entry) => entry.sets)
        .filter(
          (set) =>
            set.prescription.exercise === current.prescription.exercise &&
            set.outcome._tag === "performed" &&
            measurementFitsTarget(current.prescription.target, set.outcome.measurement),
        )
        .sort(
          (a, b) =>
            (b.outcome._tag === "performed" ? b.outcome.recordedAt : 0) -
            (a.outcome._tag === "performed" ? a.outcome.recordedAt : 0),
        )[0]
    : undefined
  const previous =
    previousSet?.outcome._tag === "performed" ? previousSet.outcome.measurement : undefined
  async function endSession(): Promise<void> {
    if (current) {
      setConfirm({ _tag: "endEarly" })
      return
    }
    await execute({ _tag: "finish", sessionId: session.id })
  }
  async function endWithReason(reason: string) {
    if (!confirm) return
    const success = await execute({ ...confirm, sessionId: session.id, reason })
    if (success) setConfirm(undefined)
  }
  const omittedSet =
    confirm?._tag === "omit"
      ? session.sets.find((set) => set.prescription.id === confirm.setId)
      : undefined
  const cutSaving = omittedSet ? estimateWorkoutDuration([omittedSet.prescription]) : undefined
  if (confirm)
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.eyebrow}>Your call</Text>
        <Text style={styles.title}>
          {confirm._tag === "omit" ? "Leave this one out?" : "Finish here?"}
        </Text>
        <Text style={styles.body}>
          Choose a reason. Nothing will be marked as performed. You can undo an omission while the
          session is active.
        </Text>
        {cutSaving && (
          <Text style={styles.body}>
            Removes approximately {Math.ceil(cutSaving.min / 60)}–{Math.ceil(cutSaving.max / 60)}{" "}
            min from the remaining estimate, without shortening other sets' rest.
          </Text>
        )}
        {[
          "Time budget",
          "Quality declined",
          "Discomfort",
          "Equipment unavailable",
          "Planned volume choice",
        ].map((reason) => (
          <WorkoutButton
            key={reason}
            label={reason}
            disabled={busy}
            onPress={() => {
              void endWithReason(reason)
            }}
            variant="secondary"
          />
        ))}
        <WorkoutButton
          label="Keep training"
          onPress={() => setConfirm(undefined)}
          disabled={busy}
          variant="quiet"
        />
      </ScrollView>
    )
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8, gap: 8 }}>
        <View style={styles.row}>
          <WorkoutButton label="Back to week" variant="quiet" onPress={onBack} />
          <WorkoutButton
            label={showLog ? "Back to logging" : "Session log"}
            variant="quiet"
            onPress={() => setShowLog(!showLog)}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.eyebrow}>Session · {session.programmeId}</Text>
          <Text style={styles.mono}>{clock(budget.elapsedSeconds)} / 60:00</Text>
        </View>
        <View style={{ height: 3, backgroundColor: workoutColors.line }}>
          <View
            style={{
              height: 3,
              backgroundColor: budget.likelyOverBudget
                ? workoutColors.warning
                : workoutColors.green,
              width: `${Math.min(100, budget.elapsedSeconds / 36)}%`,
            }}
          />
        </View>
        {budget.likelyOverBudget && (
          <Text style={[styles.body, { color: workoutColors.warning }]}>
            {budget.remainingSeconds === 0
              ? "Hour reached. Finish here, do not rush more work."
              : budget.suggestedCuts.length > 0
                ? "Time is tight. Consider omitting remaining push-press / row work before bike or neck."
                : "Time is tight. Leave room for stretching. Keep prescribed rest."}
          </Text>
        )}
        {budget.remainingSeconds === 0 && (
          <WorkoutButton label="Finish here" onPress={endSession} disabled={busy} />
        )}
        {session.restDeadline !== undefined ? (
          <WorkoutButton
            label={
              session.restDeadline > now
                ? `Optional rest · ${clock((session.restDeadline - now) / 1000)} · stop`
                : "Rest timer ended · dismiss"
            }
            variant="secondary"
            disabled={busy}
            onPress={() => {
              void execute({ _tag: "clearRest", sessionId: session.id })
            }}
          />
        ) : (
          last &&
          last.prescription.rest.max > 0 &&
          last.prescription.group !== "rotation" && (
            <View style={styles.choices}>
              {[...new Set([last.prescription.rest.min, last.prescription.rest.max])].map(
                (seconds) => (
                  <WorkoutButton
                    key={seconds}
                    label={`Rest ${clock(seconds)}`}
                    variant="secondary"
                    disabled={busy}
                    onPress={() => {
                      void execute({
                        _tag: "rest",
                        sessionId: session.id,
                        setId: last.prescription.id,
                        seconds,
                      })
                    }}
                  />
                ),
              )}
            </View>
          )
        )}
      </View>
      {showLog ? (
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={styles.heading}>Recorded, not assumed.</Text>
          <WorkoutSetHistory
            session={session}
            busy={busy}
            onUndo={(setId) => {
              void execute({ _tag: "undo", sessionId: session.id, setId }).then((success) => {
                if (success) setShowLog(false)
              })
            }}
          />
          <Text style={styles.body}>
            Remaining estimate: {Math.ceil(budget.estimatedRemaining.min / 60)}–
            {Math.ceil(budget.estimatedRemaining.max / 60)} min. Includes prescribed work, rest,
            warm-up, stretching and time between stations.
          </Text>
          <WorkoutButton
            label="End session"
            variant="secondary"
            onPress={endSession}
            disabled={busy}
          />
        </ScrollView>
      ) : current ? (
        <WorkoutEntryForm
          key={current.prescription.id}
          set={current}
          previous={previous}
          busy={busy}
          onRecord={(measurement, quality, rir) => {
            void execute({
              _tag: "record",
              sessionId: session.id,
              setId: current.prescription.id,
              measurement,
              quality,
              ...(rir === undefined ? {} : { rir }),
            })
          }}
          onOmit={() => setConfirm({ _tag: "omit", setId: current.prescription.id })}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={styles.title}>That's your session.</Text>
          <Text style={styles.body}>
            All work is recorded or deliberately omitted. Finish to save the full session duration.
          </Text>
          <WorkoutButton label="End session" disabled={busy} onPress={endSession} />
          <WorkoutButton
            label="Review recorded sets"
            variant="secondary"
            onPress={() => setShowLog(true)}
          />
        </ScrollView>
      )}
    </View>
  )
}
