import { Pressable, StyleSheet, Text } from "react-native"

/** Shared colour roles keep contrast consistent across light screens. */
export const workoutColors = {
  background: "#F7F6F2",
  surface: "#FFFFFF",
  ink: "#242A26",
  muted: "#626B63",
  line: "#DCDDD5",
  green: "#344D3C",
  pale: "#E9EDE5",
  warning: "#865121",
  warningBackground: "#F8ECDC",
  error: "#943B36",
}

/** One accessible, minimum-height action treatment across the logger. */
export function WorkoutButton({
  label,
  onPress,
  disabled = false,
  variant = "primary",
}: {
  readonly label: string
  readonly onPress: () => void
  readonly disabled?: boolean
  readonly variant?: "primary" | "secondary" | "quiet"
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary"
          ? styles.primaryButton
          : variant === "secondary"
            ? styles.secondaryButton
            : styles.quietButton,
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, variant === "primary" && { color: "#FFFFFF" }]}>
        {label}
      </Text>
    </Pressable>
  )
}

/** Common layout primitives, with 48-point controls and readable labels. */
export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: workoutColors.background },
  page: { flexGrow: 1, padding: 24, gap: 20, width: "100%", maxWidth: 680, alignSelf: "center" },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: workoutColors.muted,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 38,
    lineHeight: 43,
    fontWeight: "500",
    letterSpacing: -1.5,
    color: workoutColors.ink,
  },
  heading: { fontSize: 25, fontWeight: "500", letterSpacing: -0.5, color: workoutColors.ink },
  body: { fontSize: 15, lineHeight: 23, color: workoutColors.muted },
  label: { fontSize: 13, fontWeight: "600", color: workoutColors.ink },
  card: {
    backgroundColor: workoutColors.surface,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: workoutColors.line,
    gap: 12,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: workoutColors.line,
    borderRadius: 14,
    justifyContent: "center",
    backgroundColor: workoutColors.surface,
  },
  choiceSelected: { borderColor: workoutColors.green, backgroundColor: workoutColors.pale },
  button: {
    minHeight: 54,
    borderRadius: 17,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: { backgroundColor: workoutColors.green },
  secondaryButton: {
    backgroundColor: workoutColors.pale,
    borderWidth: 1,
    borderColor: workoutColors.line,
  },
  quietButton: { backgroundColor: "transparent" },
  buttonText: { fontSize: 15, fontWeight: "600", color: workoutColors.ink },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: workoutColors.line,
    borderRadius: 14,
    backgroundColor: workoutColors.surface,
    padding: 14,
    fontSize: 22,
    color: workoutColors.ink,
    fontVariant: ["tabular-nums"],
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: workoutColors.line,
    backgroundColor: workoutColors.background,
    gap: 8,
  },
  warning: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: workoutColors.warningBackground,
    gap: 8,
  },
  notice: { padding: 16, borderRadius: 16, backgroundColor: workoutColors.pale, gap: 8 },
  error: { color: workoutColors.error, fontSize: 14, lineHeight: 21 },
  divider: { height: 1, backgroundColor: workoutColors.line },
  mono: { fontVariant: ["tabular-nums"], fontSize: 14, color: workoutColors.ink },
})
