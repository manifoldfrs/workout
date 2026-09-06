import { useState, type JSX } from "react"
import { ScrollView, Text, View } from "react-native"
import type { WorkoutJournal } from "../domain/workout-model"
import { findWorkoutProgramme } from "../domain/workout-programmes"
import { WorkoutSetHistory } from "./workout-history"
import { WorkoutButton, styles } from "./workout-theme"

/** History shows finished sessions without changing their saved prescriptions or results. */
export function WorkoutHistoryScreen({
  journal,
}: {
  readonly journal: WorkoutJournal
}): JSX.Element {
  const [expanded, setExpanded] = useState<string | undefined>()
  const history = journal.sessions.filter((session) => session.state._tag === "finished").reverse()
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>Your log</Text>
      <Text style={styles.title}>Work that adds up.</Text>
      <Text style={styles.body}>
        Only work you record appears here. No estimated Watch sets or imported health data.
      </Text>
      {history.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.heading}>A clean start.</Text>
          <Text style={styles.body}>
            Your finished sessions will appear here. There is no sample history mixed into your log.
          </Text>
        </View>
      )}
      {history.map((session) => (
        <View key={session.id} style={{ gap: 12 }}>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>
              {new Date(session.startedAt).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </Text>
            <Text style={styles.heading}>
              {findWorkoutProgramme(session.programmeId)?.title ?? session.programmeId}
            </Text>
            <Text style={styles.body}>
              {
                session.sets.filter(
                  (set) => set.prescription.role === "working" && set.outcome._tag === "performed",
                ).length
              }{" "}
              working sets recorded ·{" "}
              {session.sets.filter((set) => set.outcome._tag === "omitted").length} omitted
            </Text>
            <Text style={styles.mono}>
              {session.state._tag === "finished"
                ? `${session.state.completion === "endedEarly" ? "Ended early" : "Finished"} · ${Math.ceil((session.state.endedAt - session.startedAt) / 60_000)}`
                : ""}{" "}
              min wall-clock
            </Text>
            <WorkoutButton
              label={expanded === session.id ? "Hide session details" : "View session details"}
              variant="secondary"
              onPress={() => setExpanded(expanded === session.id ? undefined : session.id)}
            />
          </View>
          {expanded === session.id && <WorkoutSetHistory session={session} />}
        </View>
      ))}
    </ScrollView>
  )
}
