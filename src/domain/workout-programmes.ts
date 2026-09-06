import {
  SetId,
  Seconds,
  Metres,
  type ProgrammeId,
  type SetPrescription,
  type SetTarget,
} from "./workout-model"

/** A recurring driver-conditioning template, without invented working loads. */
export interface WorkoutProgramme {
  readonly id: ProgrammeId
  readonly day: string
  readonly title: string
  readonly subtitle: string
  readonly sets: ReadonlyArray<SetPrescription>
}

function timed(
  exercise: string,
  group: string,
  min: number,
  max: number,
  role: "preparation" | "cooldown",
  cue: string,
): SetPrescription {
  return {
    id: SetId.make(`${group}-1`),
    exercise,
    group,
    label: role === "preparation" ? "Warm-up" : "Stretch",
    role,
    target: { _tag: "duration", min: Seconds.make(min), max: Seconds.make(max) },
    rest: { min: 0, max: 0 },
    workEstimate: { min, max },
    transition: { min: 0, max: 0 },
    cue,
  }
}

function reps(
  exercise: string,
  options: {
    readonly group: string
    readonly count: number
    readonly min: number
    readonly max: number
    readonly load: "total" | "perHand" | "pullup" | "choose"
    readonly rest: readonly [number, number]
    readonly cue: string
  },
): ReadonlyArray<SetPrescription> {
  return Array.from({ length: options.count }, (_, index) => ({
    id: SetId.make(`${options.group}-${index + 1}`),
    exercise,
    group: options.group,
    label: `Set ${index + 1}`,
    role: "working",
    target: { _tag: "reps", min: options.min, max: options.max, load: options.load },
    rest: {
      min: index === options.count - 1 ? 0 : options.rest[0],
      max: index === options.count - 1 ? 0 : options.rest[1],
    },
    workEstimate: { min: 20, max: 45 },
    transition: {
      min: index === options.count - 1 ? 60 : 0,
      max: index === options.count - 1 ? 120 : 0,
    },
    cue: options.cue,
  }))
}

function alternate(
  first: ReadonlyArray<SetPrescription>,
  second: ReadonlyArray<SetPrescription>,
  rest: readonly [number, number],
): ReadonlyArray<SetPrescription> {
  return first.flatMap((a, index) => {
    const b = second[index]
    if (!b) return [a]
    return [
      { ...a, rest: { min: rest[0], max: rest[1] }, transition: { min: 60, max: 120 } },
      {
        ...b,
        rest: {
          min: index === first.length - 1 ? 0 : rest[0],
          max: index === first.length - 1 ? 0 : rest[1],
        },
        transition: { min: 60, max: 120 },
      },
    ]
  })
}

function neck(): ReadonlyArray<SetPrescription> {
  return ["Forward", "Backward", "Left", "Right"].map((direction, index) => ({
    id: SetId.make(`neck-${index + 1}`),
    exercise: "Neck isometrics",
    group: "neck",
    label: direction,
    role: "working",
    target: { _tag: "hold", min: Seconds.make(20), max: Seconds.make(30) },
    rest: { min: index === 3 ? 0 : 20, max: index === 3 ? 0 : 30 },
    workEstimate: { min: 20, max: 30 },
    transition: { min: index === 3 ? 60 : 0, max: index === 3 ? 120 : 0 },
    cue: "Controlled resistance. Stop for pain. No automatic resistance increases.",
  }))
}

const stretch = () =>
  timed("Light stretching", "stretch", 300, 300, "cooldown", "Leave time to finish gently.")
const pullups = (count: number) =>
  reps("Pull-ups", {
    group: "pullup",
    count,
    min: 6,
    max: 8,
    load: "pullup",
    rest: [75, 90],
    cue: "Choose body weight, added weight, or assistance. Keep reps controlled.",
  })

const monday: WorkoutProgramme = {
  id: "monday",
  day: "Monday",
  title: "Strength & stability",
  subtitle: "Deadlift · upper body · neck",
  sets: [
    timed(
      "Dynamic warm-up",
      "warmup",
      420,
      420,
      "preparation",
      "Easy bike, leg swings, lunges, hinges, shoulder mobility and progressive deadlift warm-up sets. Log the total warm-up here, not as working triples.",
    ),
    ...reps("Deadlift", {
      group: "deadlift",
      count: 4,
      min: 3,
      max: 3,
      load: "total",
      rest: [150, 180],
      cue: "Leave 1–2 good reps in reserve. No grinding. Total barbell load in pounds.",
    }),
    ...alternate(
      pullups(3),
      reps("Incline dumbbell press", {
        group: "incline",
        count: 3,
        min: 6,
        max: 8,
        load: "perHand",
        rest: [75, 90],
        cue: "Record each dumbbell's load, not the pair.",
      }),
      [60, 60],
    ),
    ...Array.from({ length: 3 }, (_, index): SetPrescription => ({
      id: SetId.make(`carry-${index + 1}`),
      exercise: "Farmer carry",
      group: "carry",
      label: `Carry ${index + 1}`,
      role: "working",
      target: { _tag: "carry", min: Metres.make(30), max: Metres.make(40) },
      rest: { min: index === 2 ? 0 : 60, max: index === 2 ? 0 : 90 },
      workEstimate: { min: 30, max: 60 },
      transition: { min: index === 2 ? 60 : 0, max: index === 2 ? 120 : 0 },
      cue: "Choose per-hand or total load. Walk tall and controlled.",
    })),
    ...neck(),
    stretch(),
  ],
}
const wednesday: WorkoutProgramme = {
  id: "wednesday",
  day: "Wednesday",
  title: "Power & endurance",
  subtitle: "Clean · upper body · bike intervals",
  sets: [
    timed(
      "Dynamic warm-up",
      "warmup",
      420,
      480,
      "preparation",
      "Easy bike, hinges, squat-to-stand, shoulder mobility and empty-bar clean progression.",
    ),
    ...reps("Hang power clean", {
      group: "clean",
      count: 5,
      min: 2,
      max: 2,
      load: "total",
      rest: [120, 120],
      cue: "Moderate load. Stop this exercise when speed or technique deteriorates.",
    }),
    ...alternate(
      reps("Push press", {
        group: "push-press",
        count: 3,
        min: 4,
        max: 5,
        load: "total",
        rest: [75, 90],
        cue: "Leave room for clean repetitions.",
      }),
      reps("Chest-supported row", {
        group: "row",
        count: 3,
        min: 8,
        max: 8,
        load: "choose",
        rest: [75, 90],
        cue: "Choose the load basis for your equipment: per hand for dumbbells, total for a bar or machine.",
      }),
      [60, 75],
    ),
    ...Array.from({ length: 6 }, (_, index): SetPrescription => ({
      id: SetId.make(`bike-${index + 1}`),
      exercise: "Bike intervals",
      group: "bike",
      label: `Round ${Math.floor(index / 2) + 1} · ${index % 2 === 0 ? "hard" : "easy"}`,
      role: "working",
      target: { _tag: "duration", min: Seconds.make(120), max: Seconds.make(120) },
      rest: { min: 0, max: 0 },
      workEstimate: { min: 120, max: 120 },
      transition: { min: index === 5 ? 60 : 0, max: index === 5 ? 120 : 0 },
      cue: "Stop strength recording on your Watch and use Indoor Cycling. Confirm actual phase time, not just elapsed timer time.",
    })),
    ...neck(),
    stretch(),
  ],
}
const friday: WorkoutProgramme = {
  id: "friday",
  day: "Friday",
  title: "Control & resilience",
  subtitle: "Front squat · upper body · trunk",
  sets: [
    timed(
      "Dynamic warm-up",
      "warmup",
      420,
      480,
      "preparation",
      "Easy bike, leg swings, lunges, bodyweight squats, shoulder mobility and progressive front squat warm-up sets.",
    ),
    ...reps("Front squat", {
      group: "squat",
      count: 4,
      min: 4,
      max: 4,
      load: "total",
      rest: [150, 180],
      cue: "Moderate-heavy, no grinders. Preserve rest between working sets.",
    }),
    ...alternate(
      pullups(3),
      reps("Dumbbell shoulder press", {
        group: "shoulder",
        count: 3,
        min: 6,
        max: 8,
        load: "perHand",
        rest: [75, 90],
        cue: "Two or three sets. Omit the third if choosing two today.",
      }),
      [60, 60],
    ),
    ...reps("Seated cable rotation", {
      group: "rotation",
      count: 2,
      min: 10,
      max: 10,
      load: "total",
      rest: [45, 60],
      cue: "Ten repetitions per side. Log each completed left/right pair. Rest scope must be confirmed before using a timer.",
    }),
    ...neck(),
    stretch(),
  ],
}
const weekend: WorkoutProgramme = {
  id: "weekend",
  day: "Weekend",
  title: "The aerobic foundation",
  subtitle: "Easy cycling · no intervals",
  sets: [
    timed(
      "Easy bike warm-up",
      "warmup",
      300,
      300,
      "preparation",
      "Settle into a comfortable rhythm.",
    ),
    {
      id: SetId.make("zone2-1"),
      exercise: "Zone 2 cycling",
      group: "zone2",
      label: "Steady ride",
      role: "working",
      target: { _tag: "duration", min: Seconds.make(2400), max: Seconds.make(3000) },
      rest: { min: 0, max: 0 },
      workEstimate: { min: 2400, max: 3000 },
      transition: { min: 60, max: 120 },
      cue: "Easy enough to speak in complete sentences. Fifty minutes leaves no setup allowance within the hour.",
    },
    timed(
      "Easy cooldown & stretch",
      "stretch",
      300,
      300,
      "cooldown",
      "Let your breathing settle. No intervals today.",
    ),
  ],
}

/** Four templates with no example weights mixed into real history. */
export const workoutProgrammes: ReadonlyArray<WorkoutProgramme> = [
  monday,
  wednesday,
  friday,
  weekend,
]

/** Find a programme without inventing a fallback for unknown identifiers. */
export function findWorkoutProgramme(id: ProgrammeId): WorkoutProgramme | undefined {
  return workoutProgrammes.find((programme) => programme.id === id)
}

/** Display target ranges with their original units. */
export function formatSetTarget(target: SetTarget): string {
  const range = target.min === target.max ? `${target.min}` : `${target.min}–${target.max}`
  switch (target._tag) {
    case "reps":
      return `${range} reps`
    case "carry":
      return `${range} m`
    case "hold":
      return `${range} sec / direction`
    case "duration":
      return target.min >= 60
        ? `${target.min / 60}${target.max !== target.min ? `–${target.max / 60}` : ""} min`
        : `${range} sec`
  }
}
