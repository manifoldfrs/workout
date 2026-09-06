import type { JSX } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
import type { ProgrammeId } from "../domain/workout-model"
import { workoutProgrammes } from "../domain/workout-programmes"
import { WorkoutButton, styles, workoutColors } from "./workout-theme"

/** The week view separates recovery days from training and offers explicit session recovery. */
export function WorkoutWeekScreen({
  hasActiveSession,
  onResume,
  onSelect,
}: {
  readonly hasActiveSession: boolean
  readonly onResume: () => void
  readonly onSelect: (id: ProgrammeId) => void
}): JSX.Element {
  const today = new Date()
  const recoveryDay = [2, 4].includes(today.getDay())
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={[styles.heading, { fontSize: 20 }]}>Exercise Your Demons</Text>
      <View style={{ paddingVertical: 20, gap: 14 }}>
        <Text style={styles.eyebrow}>
          {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </Text>
        <Text style={styles.title}>
          Train well.{"\n"}Leave something{"\n"}in reserve.
        </Text>
      </View>
      {hasActiveSession ? (
        <View style={[styles.card, { backgroundColor: workoutColors.pale }]}>
          <Text style={styles.eyebrow}>Ready when you are</Text>
          <Text style={styles.heading}>Your session is still here.</Text>
          <Text style={styles.body}>Saved on this device. Resume without losing your place.</Text>
          <WorkoutButton label="Resume session" onPress={onResume} />
        </View>
      ) : recoveryDay ? (
        <View style={styles.notice}>
          <Text style={styles.label}>Today is a recovery day.</Text>
          <Text style={styles.body}>
            No extra workout to tick off. Rest is part of the programme.
          </Text>
        </View>
      ) : undefined}
      <View style={{ gap: 8 }}>
        <Text style={styles.eyebrow}>Motorsport Strength &amp; Stamina</Text>
        <Text style={styles.heading}>Your week</Text>
      </View>
      {workoutProgrammes.map((entry, index) => (
        <Pressable
          key={entry.id}
          accessibilityRole="button"
          accessibilityLabel={`View ${entry.day.toLowerCase()} workout`}
          onPress={() => onSelect(entry.id)}
          style={({ pressed }) => [styles.card, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={styles.row}>
            <Text style={styles.eyebrow}>{entry.day}</Text>
            <Text style={styles.mono}>0{index + 1}</Text>
          </View>
          <Text style={styles.heading}>{entry.title}</Text>
          <View style={styles.row}>
            <Text style={[styles.body, { flex: 1 }]}>{entry.subtitle}</Text>
            <Text style={styles.heading}>↗</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  )
}
