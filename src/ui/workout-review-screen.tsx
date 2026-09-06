import { useState } from "react"
import { ScrollView, Text, View } from "react-native"
import type { WorkoutJournal } from "../domain/workout-model"
import { simulateWorkoutReview, type WorkoutReview } from "../domain/workout-review"
import { WorkoutButton, styles } from "./workout-theme"

/** Simulated reviews preview an unchanged programme and require explicit, versioned approval. */
export function WorkoutReviewScreen({
  journal,
  busy,
  onApprove,
}: {
  readonly journal: WorkoutJournal
  readonly busy: boolean
  readonly onApprove: (revision: number) => void
}) {
  const [review, setReview] = useState<WorkoutReview | undefined>()
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>Weekly reflection</Text>
      <Text style={styles.title}>Progress, with patience.</Text>
      <View style={styles.notice}>
        <Text style={styles.label}>Local simulation · not connected to AI</Text>
        <Text style={styles.body}>
          No training data leaves this device. This first review can only recommend keeping the
          current programme. Real AI, progression proposals and Watch imports come later.
        </Text>
      </View>
      <WorkoutButton
        label="Review the last seven days"
        onPress={() => setReview(simulateWorkoutReview(journal, Date.now()))}
      />
      {review && (
        <View style={styles.card}>
          <Text style={styles.heading}>Keep the programme steady.</Text>
          <Text style={styles.body}>
            {review.finishedSessions} finished sessions · {review.performedWorkingSets} working sets
            · {review.omittedSets} omissions · {review.qualityWarnings} reported quality warnings
          </Text>
          <Text style={styles.body}>
            There is not enough evidence here to prescribe a load increase. Recovery and available
            equipment increments remain unknown. Do not progress through deteriorating technique.
          </Text>
          <Text style={styles.label}>Preview: no load, rest, volume or schedule changes.</Text>
          {journal.reviewedRevision === review.basedOnRevision ? (
            <Text style={styles.body}>Accepted and saved. Programme unchanged.</Text>
          ) : (
            <WorkoutButton
              label={
                journal.revision !== review.basedOnRevision
                  ? "Review is out of date, regenerate above"
                  : "Accept keep-steady review"
              }
              disabled={
                busy || review.finishedSessions === 0 || journal.revision !== review.basedOnRevision
              }
              onPress={() => onApprove(review.basedOnRevision)}
            />
          )}
        </View>
      )}
    </ScrollView>
  )
}
