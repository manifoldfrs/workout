import { useState, type JSX } from "react"
import { ScrollView, Text, View } from "react-native"
import type { ProgrammeId, SetPrescription } from "../domain/workout-model"
import { formatSetTarget, type WorkoutProgramme } from "../domain/workout-programmes"
import { estimateWorkoutDuration } from "../domain/workout-review"
import { WorkoutButton, styles } from "./workout-theme"

/** Planning keeps Friday's volume undecided until the athlete chooses it. */
export function WorkoutPlanScreen({
  programme,
  busy,
  onBack,
  onStart,
}: {
  readonly programme: WorkoutProgramme
  readonly busy: boolean
  readonly onBack: () => void
  readonly onStart: (programmeId: ProgrammeId, upperBodySets: 2 | 3 | undefined) => void
}): JSX.Element {
  const [upperBodySets, setUpperBodySets] = useState<2 | 3 | undefined>()
  const groups = new Map<string, Array<SetPrescription>>()
  for (const set of programme.sets) {
    const group = groups.get(set.exercise)
    if (group) group.push(set)
    else groups.set(set.exercise, [set])
  }
  const estimate = estimateWorkoutDuration(programme.sets)
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page}>
        <WorkoutButton label="Back to week" variant="quiet" onPress={onBack} />
        <Text style={styles.eyebrow}>{programme.day} · one hour maximum</Text>
        <Text style={styles.title}>{programme.title}</Text>
        <View style={estimate.max > 3600 ? styles.warning : styles.notice}>
          <Text style={styles.label}>
            Estimated time: {Math.ceil(estimate.min / 60)}–{Math.ceil(estimate.max / 60)} minutes
          </Text>
          <Text style={styles.body}>
            {programme.id === "weekend"
              ? "Includes your warm-up, ride, cooldown and 1–2 minutes for setup."
              : "Includes warm-up, rest and stretching, with 20–45 seconds per lifting set and 1–2 minutes between stations."}
          </Text>
          {estimate.max > 3600 && (
            <Text style={styles.body}>
              This could take more than an hour.{" "}
              {programme.id === "weekend"
                ? "Choose a shorter ride within the 40–50 minute range to leave time for setup and cooldown."
                : programme.id === "wednesday"
                  ? "Keep your full rest. If needed, skip push-press or row sets before bike or neck work."
                  : "Keep your full rest and skip an accessory set if needed."}
            </Text>
          )}
        </View>
        {programme.id === "wednesday" && (
          <View style={styles.notice}>
            <Text style={styles.label}>Two Watch recordings, one session</Text>
            <Text style={styles.body}>
              Use Functional Strength Training, then Indoor Cycling. Watch imports are not connected
              in this local preview.
            </Text>
          </View>
        )}
        {[...groups.values()].map((sets) => {
          const set = sets[0]
          if (!set) return undefined
          const count =
            programme.id === "friday" && (set.group === "pullup" || set.group === "shoulder")
              ? "2–3"
              : sets.length
          return (
            <View key={set.id} style={styles.card}>
              <Text style={styles.label}>{set.exercise}</Text>
              <Text style={styles.body}>
                {count} × {formatSetTarget(set.target)}
                {set.rest.max > 0 ? ` · ${set.rest.min}–${set.rest.max} sec rest` : ""}
              </Text>
              {set.cue !== "" && <Text style={styles.body}>{set.cue}</Text>}
            </View>
          )
        })}
        {programme.id === "friday" && (
          <View style={{ gap: 12 }}>
            <Text style={styles.label}>Choose upper-body sets before starting</Text>
            <View style={styles.row}>
              <WorkoutButton
                label={upperBodySets === 2 ? "✓ Two sets" : "Two sets"}
                variant="secondary"
                onPress={() => setUpperBodySets(2)}
              />
              <WorkoutButton
                label={upperBodySets === 3 ? "✓ Three sets" : "Three sets"}
                variant="secondary"
                onPress={() => setUpperBodySets(3)}
              />
            </View>
          </View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <WorkoutButton
          label={`Start ${programme.day.toLowerCase()} session`}
          disabled={busy || (programme.id === "friday" && upperBodySets === undefined)}
          onPress={() => onStart(programme.id, upperBodySets)}
        />
        <Text style={[styles.body, { textAlign: "center" }]}>
          Start when setup begins. The hour includes everything.
        </Text>
      </View>
    </View>
  )
}
