import { useState } from "react"
import { ScrollView, Text, TextInput, View } from "react-native"
import type { WorkoutJournal } from "../domain/workout-model"
import { findWorkoutProgramme } from "../domain/workout-programmes"
import { WorkoutSetHistory } from "./workout-history"
import { WorkoutButton, styles } from "./workout-theme"

/** History and deliberate backup replacement share the same local journal service. */
export function WorkoutHistoryScreen({
  journal,
  busy,
  exportBackup,
  restoreBackup,
}: {
  readonly journal: WorkoutJournal
  readonly busy: boolean
  readonly exportBackup: () => Promise<string | undefined>
  readonly restoreBackup: (data: string) => Promise<boolean>
}) {
  const [expanded, setExpanded] = useState<string | undefined>()
  const [backup, setBackup] = useState("")
  const [restore, setRestore] = useState("")
  const [confirmRestore, setConfirmRestore] = useState(false)
  const history = journal.sessions.filter((session) => session.state._tag === "finished").reverse()
  async function showBackup() {
    const data = await exportBackup()
    if (data !== undefined) setBackup(data)
  }
  async function replaceBackup() {
    if (await restoreBackup(restore)) {
      setConfirmRestore(false)
      setRestore("")
      setBackup("")
    }
  }
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
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
      <View style={styles.divider} />
      <Text style={styles.heading}>Keep a copy.</Text>
      <Text style={styles.body}>
        Backups contain your manual training log. Keep them private, outside this public repository.
        Browser previews use browser storage, the iPhone app uses SQLite. Neither is a cloud backup.
      </Text>
      <WorkoutButton
        label="Show local backup"
        variant="secondary"
        onPress={() => {
          void showBackup()
        }}
        disabled={busy}
      />
      {backup !== "" && (
        <TextInput
          accessibilityLabel="Local backup JSON"
          multiline
          editable={false}
          selectTextOnFocus
          value={backup}
          style={[styles.input, { height: 180, fontSize: 12 }]}
        />
      )}
      <Text style={styles.label}>Restore a backup</Text>
      <TextInput
        accessibilityLabel="Backup JSON to restore"
        multiline
        value={restore}
        onChangeText={(value) => {
          setRestore(value)
          setConfirmRestore(false)
        }}
        placeholder="Paste your workout backup JSON"
        style={[styles.input, { minHeight: 100, fontSize: 14 }]}
      />
      <WorkoutButton
        label="Preview restore warning"
        variant="secondary"
        disabled={busy || restore.trim() === ""}
        onPress={() => setConfirmRestore(true)}
      />
      {confirmRestore && (
        <View style={styles.warning}>
          <Text style={styles.label}>Replace the entire local log?</Text>
          <Text style={styles.body}>
            This replaces current history and any active session. Export the current log first.
            Invalid backups will be rejected without changing it.
          </Text>
          <WorkoutButton
            label="Replace local log with backup"
            onPress={() => {
              void replaceBackup()
            }}
            disabled={busy}
          />
          <WorkoutButton
            label="Cancel restore"
            variant="quiet"
            onPress={() => setConfirmRestore(false)}
          />
        </View>
      )}
    </ScrollView>
  )
}
