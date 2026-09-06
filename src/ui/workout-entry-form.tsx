import { useState, type JSX } from "react"
import { Pressable, ScrollView, Text, TextInput, View } from "react-native"
import type { RepQuality, SessionSet, SetMeasurement } from "../domain/workout-model"
import { formatSetTarget } from "../domain/workout-programmes"
import { WorkoutButton, styles, workoutColors } from "./workout-theme"

function enteredNumber(text: string): number | undefined {
  return text.trim() === "" ? undefined : Number(text)
}
function Field({
  label,
  value,
  onChange,
  numeric = true,
}: {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly numeric?: boolean
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={styles.input}
        value={value}
        onChangeText={onChange}
        inputMode={numeric ? "decimal" : "text"}
        autoCorrect={false}
        returnKeyType="done"
        placeholder={numeric ? "Not entered" : "Describe resistance"}
        placeholderTextColor={workoutColors.muted}
      />
    </View>
  )
}
function Choice({
  label,
  selected,
  onPress,
}: {
  readonly label: string
  readonly selected: boolean
  readonly onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}

/** Editable prescriptions are only recorded after explicit confirmation and durable save. */
export function WorkoutEntryForm({
  set,
  previous,
  busy,
  onRecord,
  onOmit,
}: {
  readonly set: SessionSet
  readonly previous: SetMeasurement | undefined
  readonly busy: boolean
  readonly onRecord: (measurement: unknown, quality: RepQuality, rir: number | undefined) => void
  readonly onOmit: () => void
}): JSX.Element {
  const { target } = set.prescription
  const previousLoad = previous?._tag === "reps" ? previous.load : undefined
  const [quantity, setQuantity] = useState(
    target._tag === "duration" || target._tag === "hold" ? "0" : `${target.min}`,
  )
  const [weight, setWeight] = useState(
    previous?._tag === "carry"
      ? `${previous.pounds}`
      : previousLoad && previousLoad._tag !== "bodyweight"
        ? `${previousLoad.pounds}`
        : "",
  )
  const [loadMode, setLoadMode] = useState<"bodyweight" | "external" | "assisted" | undefined>(
    target._tag === "reps" && target.load === "pullup" ? previousLoad?._tag : "external",
  )
  const [basis, setBasis] = useState<"total" | "perHand" | undefined>(
    target._tag === "reps" && (target.load === "total" || target.load === "perHand")
      ? target.load
      : previous?._tag === "carry"
        ? previous.basis
        : previousLoad?._tag === "external"
          ? previousLoad.basis
          : target._tag === "reps" && target.load === "pullup"
            ? "total"
            : undefined,
  )
  const [resistance, setResistance] = useState(previous?._tag === "hold" ? previous.resistance : "")
  const [quality, setQuality] = useState<RepQuality>("unreported")
  const [rir, setRir] = useState("")
  function record() {
    const amount = enteredNumber(quantity)
    const pounds = enteredNumber(weight)
    let measurement: unknown
    switch (target._tag) {
      case "reps":
        measurement = {
          _tag: "reps",
          repetitions: amount,
          load:
            loadMode === "bodyweight"
              ? { _tag: "bodyweight" }
              : loadMode === "assisted"
                ? { _tag: "assisted", pounds }
                : { _tag: loadMode, pounds, basis },
        }
        break
      case "carry":
        measurement = { _tag: "carry", metres: amount, pounds, basis }
        break
      case "hold":
        measurement = { _tag: "hold", seconds: amount, resistance: resistance.trim() }
        break
      case "duration":
        measurement = { _tag: "duration", seconds: amount }
        break
    }
    onRecord(measurement, quality, enteredNumber(rir))
  }
  const showWeight =
    target._tag === "carry" || (target._tag === "reps" && loadMode !== "bodyweight")
  const chooseBasis =
    target._tag === "carry" || (target._tag === "reps" && target.load === "choose")
  return (
    <View style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
        <View style={{ gap: 8 }}>
          <Text style={styles.eyebrow}>
            {set.prescription.label} · {set.prescription.role}
          </Text>
          <Text style={styles.heading}>{set.prescription.exercise}</Text>
          <Text style={styles.body}>
            {formatSetTarget(target)}
            {set.prescription.rest.max > 0
              ? ` · rest ${set.prescription.rest.min}–${set.prescription.rest.max} sec`
              : ""}
          </Text>
          {set.prescription.cue !== "" && <Text style={styles.body}>{set.prescription.cue}</Text>}
        </View>
        <View style={styles.card}>
          <Field
            label={
              target._tag === "reps"
                ? "Repetitions"
                : target._tag === "carry"
                  ? "Actual distance (m)"
                  : "Actual duration (seconds)"
            }
            value={quantity}
            onChange={setQuantity}
          />
          {target._tag === "reps" && target.load === "pullup" && (
            <View style={styles.choices}>
              <Choice
                label="Body weight"
                selected={loadMode === "bodyweight"}
                onPress={() => setLoadMode("bodyweight")}
              />
              <Choice
                label="Added weight"
                selected={loadMode === "external"}
                onPress={() => setLoadMode("external")}
              />
              <Choice
                label="Assisted"
                selected={loadMode === "assisted"}
                onPress={() => setLoadMode("assisted")}
              />
            </View>
          )}
          {chooseBasis && (
            <View style={styles.choices}>
              <Choice
                label="Per hand"
                selected={basis === "perHand"}
                onPress={() => setBasis("perHand")}
              />
              <Choice
                label="Total load"
                selected={basis === "total"}
                onPress={() => setBasis("total")}
              />
            </View>
          )}
          {showWeight && (
            <Field
              label={
                loadMode === "assisted"
                  ? "Assistance (lb)"
                  : basis === "perHand"
                    ? "Load per hand (lb)"
                    : "Load (lb)"
              }
              value={weight}
              onChange={setWeight}
            />
          )}
          {target._tag === "hold" && (
            <Field
              label="Resistance or device setting"
              value={resistance}
              onChange={setResistance}
              numeric={false}
            />
          )}
        </View>
        {target._tag === "reps" && (
          <View style={{ gap: 12 }}>
            <Text style={styles.label}>Rep quality · optional</Text>
            <View style={styles.choices}>
              <Choice
                label="Clean"
                selected={quality === "clean"}
                onPress={() => setQuality(quality === "clean" ? "unreported" : "clean")}
              />
              <Choice
                label="Grindy"
                selected={quality === "grindy"}
                onPress={() => setQuality(quality === "grindy" ? "unreported" : "grindy")}
              />
              <Choice
                label="Technique slipped"
                selected={quality === "deteriorated"}
                onPress={() =>
                  setQuality(quality === "deteriorated" ? "unreported" : "deteriorated")
                }
              />
            </View>
            <Field label="Reps in reserve · optional" value={rir} onChange={setRir} />
          </View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <WorkoutButton
          label={busy ? "Saving…" : "Save completed work"}
          onPress={record}
          disabled={busy}
        />
        <WorkoutButton label="Omit this set" variant="quiet" onPress={onOmit} disabled={busy} />
      </View>
    </View>
  )
}
