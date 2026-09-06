import { Text, View } from "react-native"
import type { SetId, SetMeasurement, WorkoutSession } from "../domain/workout-model"
import { WorkoutButton, styles } from "./workout-theme"

function measurementSummary(measurement: SetMeasurement): string {
  switch (measurement._tag) {
    case "reps": {
      const { load } = measurement
      const loadText =
        load._tag === "bodyweight"
          ? "body weight"
          : load._tag === "assisted"
            ? `${load.pounds} lb assistance`
            : `${load.pounds} lb ${load.basis === "perHand" ? "per hand" : "total"}`
      return `${measurement.repetitions} reps · ${loadText}`
    }
    case "carry":
      return `${measurement.metres} m · ${measurement.pounds} lb ${measurement.basis === "perHand" ? "per hand" : "total"}`
    case "hold":
      return `${measurement.seconds} sec · ${measurement.resistance}`
    case "duration":
      return `${measurement.seconds} sec`
  }
}

/** History keeps omissions and preparation separate from performed working sets. */
export function WorkoutSetHistory({
  session,
  onUndo,
  busy = false,
}: {
  readonly session: WorkoutSession
  readonly onUndo?: (id: SetId) => void
  readonly busy?: boolean
}) {
  return (
    <View style={{ gap: 12 }}>
      {session.sets.map((set) => (
        <View key={set.prescription.id} style={styles.card}>
          <Text style={styles.eyebrow}>
            {set.prescription.role} · {set.prescription.label}
          </Text>
          <Text style={styles.label}>{set.prescription.exercise}</Text>
          <Text style={styles.body}>
            {set.outcome._tag === "performed"
              ? measurementSummary(set.outcome.measurement)
              : set.outcome._tag === "omitted"
                ? `Omitted · ${set.outcome.reason}`
                : "Not yet recorded"}
          </Text>
          {set.outcome._tag === "performed" && (
            <Text style={styles.body}>
              Quality: {set.outcome.quality}
              {set.outcome.rir === undefined ? "" : ` · ${set.outcome.rir} RIR`}
            </Text>
          )}
          {onUndo && set.outcome._tag !== "pending" && (
            <WorkoutButton
              label={`Undo ${set.prescription.exercise} ${set.prescription.label}`}
              onPress={() => onUndo(set.prescription.id)}
              disabled={busy}
              variant="secondary"
            />
          )}
        </View>
      ))}
    </View>
  )
}
