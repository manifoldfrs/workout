import { expect, test } from "@playwright/test"

test("ending a reviewed complete session does not ask for an early-finish reason", async ({
  page,
}) => {
  await page.goto("/")
  await page.getByRole("button", { name: "View weekend workout" }).click()
  await page.getByRole("button", { name: "Start weekend session" }).click()
  for (const seconds of [300, 2400, 300]) {
    if (seconds === 2400)
      await expect(page.getByText(/BPM range marked Zone 2 on your Apple Watch/)).toBeVisible()
    await expect(page.getByLabel("Actual duration (seconds)")).toHaveValue("0")
    await page.getByLabel("Actual duration (seconds)").fill(`${seconds}`)
    await page.getByRole("button", { name: "Save completed work" }).click()
  }
  await page.getByRole("button", { name: "Review recorded sets" }).click()
  await page.getByRole("button", { name: /^End session/ }).click()
  await expect(page.getByText("Finish here?", { exact: true })).toHaveCount(0)
  await page.getByRole("tab", { name: "History", exact: true }).click()
  await expect(page.getByText(/Finished · .* min wall-clock/)).toBeVisible()
})

test("neck holds start at zero and resistance is an empty, faded placeholder", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "View monday workout" }).click()
  await expect(page.getByText("Leave time to finish gently.", { exact: true })).toHaveCount(0)
  await expect(
    page.getByText("Use steady pressure and stop if it hurts.", { exact: true }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Start monday session" }).click()
  for (let index = 0; index < 14; index++) {
    await page.getByRole("button", { name: "Omit this set", exact: true }).click()
    await page.getByRole("button", { name: "Planned volume choice", exact: true }).click()
  }
  const resistance = page.getByLabel("Resistance or device setting", { exact: true })
  await expect(resistance).toHaveValue("")
  await expect(resistance).toHaveAttribute("placeholder", "Describe resistance")
  const colors = await resistance.evaluate((input) => ({
    text: getComputedStyle(input).color,
    placeholder: getComputedStyle(input, "::placeholder").color,
  }))
  expect(colors.placeholder).not.toBe(colors.text)
  await expect(page.getByLabel("Actual duration (seconds)")).toHaveValue("0")
  await expect(page.getByText(/Targets are prefilled|Last recorded load is prefilled/)).toHaveCount(
    0,
  )
  await page.screenshot({ path: "test-results/neck-entry-iphone.png", fullPage: true })
  await resistance.fill("Sample light manual resistance")
  await page.getByLabel("Actual duration (seconds)").fill("20")
  await page.getByRole("button", { name: "Save completed work" }).click()
  await expect(page.getByText("Backward · working", { exact: true })).toBeVisible()
  await expect(page.getByLabel("Actual duration (seconds)")).toHaveValue("0")
})

test("plan notes stay concise and relevant to each workout", async ({ page }) => {
  await page.goto("/")
  for (const { day, guidance } of [
    { day: "monday", guidance: "Keep your full rest and skip an accessory set if needed." },
    {
      day: "wednesday",
      guidance:
        "Keep your full rest. If needed, skip push-press or row sets before bike or neck work.",
    },
    {
      day: "weekend",
      guidance:
        "Choose a shorter ride within the 40–50 minute range to leave time for setup and cooldown.",
    },
  ]) {
    await page.getByRole("button", { name: `View ${day} workout` }).click()
    await expect(page.getByText(/^Estimated time:/)).toBeVisible()
    await expect(page.getByText(guidance, { exact: false })).toBeVisible()
    await expect(page.getByText(/Protect main-lift rest, not the number of exercises/)).toHaveCount(
      0,
    )
    await expect(
      page.getByText(/setup assumptions|protected rest|guaranteed finish time/),
    ).toHaveCount(0)
    await expect(page.getByText(/local preview|not connected|come later/i)).toHaveCount(0)
    if (day === "weekend") {
      await expect(page.getByText(/per lifting set/)).toHaveCount(0)
      await expect(page.getByText(/BPM range marked Zone 2 on your Apple Watch/)).toBeVisible()
      await expect(page.getByText(/Fifty minutes leaves no setup allowance/)).toHaveCount(0)
    }
    await page.getByRole("button", { name: "Back to week", exact: true }).click()
  }
})

test("the week screen keeps its wordmark without preview labels or filler copy", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 8, 6, 12))
  await page.goto("/")
  await expect(page.getByText("Exercise Your Demons", { exact: true })).toBeVisible()
  await expect(page.getByText("Motorsport Strength & Stamina", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: /^View .* workout$/ })).toHaveCount(4)
  for (const text of [
    "●",
    "Local preview",
    "Four purposeful sessions. Three real recovery days. One hour, including everything.",
    "One easy ride this weekend. Keep the other day for recovery.",
    "Small, repeatable work. A stronger foundation.",
  ]) {
    await expect(page.getByText(text, { exact: true })).toHaveCount(0)
  }
})

test("offline logging survives reload and supports undo, omissions and review", async ({
  page,
  context,
}) => {
  const errors: Array<string> = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/")
  await expect(page.getByRole("button", { name: "View monday workout" })).toBeVisible()
  await page.screenshot({ path: "test-results/week-iphone.png", fullPage: true })
  await page.getByRole("button", { name: "View monday workout" }).click()
  await page.getByRole("button", { name: "Start monday session" }).click()
  await expect(page.getByLabel("Actual duration (seconds)")).toHaveValue("0")
  await page.getByRole("button", { name: "Save completed work" }).click()
  await expect(page.getByRole("alert")).toContainText("Check the workout entry")
  await expect(page.getByLabel("Actual duration (seconds)")).toHaveValue("0")
  await page.getByLabel("Actual duration (seconds)").fill("420")
  await context.setOffline(true)
  await page.getByRole("button", { name: "Save completed work" }).click()
  await expect(page.getByLabel("Repetitions", { exact: true })).toHaveValue("3")
  await expect(page.getByText("Leave 1–2 good reps in reserve.", { exact: true })).toBeVisible()
  await expect(page.getByText(/Targets are prefilled|Total barbell load in pounds/)).toHaveCount(0)
  await page.getByRole("button", { name: "Save completed work" }).click()
  await expect(page.getByRole("alert")).toContainText("Check the workout entry")
  await page.getByLabel("Load (lb)", { exact: true }).fill("10")
  await page.getByRole("button", { name: "Clean", exact: true }).click()
  await page.getByRole("button", { name: "Save completed work" }).click()
  await expect(page.getByText("Set 2 · working", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Rest 2:30", exact: true }).click()
  await expect(page.getByRole("button", { name: /Optional rest/ })).toBeVisible()
  await context.setOffline(false)
  await page.reload()
  await page.getByRole("button", { name: "Resume session" }).click()
  await expect(page.getByText("Set 2 · working", { exact: true })).toBeVisible()
  await expect(page.getByLabel("Load (lb)", { exact: true })).toHaveValue("10")
  await page.screenshot({ path: "test-results/logger-iphone.png", fullPage: true })
  await page.getByRole("button", { name: "Session log", exact: true }).click()
  await page.getByRole("button", { name: "Undo Deadlift Set 1", exact: true }).click()
  await expect(page.getByText("Set 1 · working", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Omit this set", exact: true }).click()
  await page.getByRole("button", { name: "Time budget", exact: true }).click()
  await page.getByRole("button", { name: "Session log", exact: true }).click()
  await page.getByRole("button", { name: "End session", exact: true }).click()
  await page.getByRole("button", { name: "Quality declined", exact: true }).click()
  await page.getByRole("tab", { name: "History", exact: true }).click()
  await expect(page.getByText(/0 working sets recorded/)).toBeVisible()
  await expect(page.getByText(/preview|sample history|imported health data/i)).toHaveCount(0)
  await expect(page.getByText("Keep a copy.", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Restore a backup", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Show local backup", exact: true })).toHaveCount(0)
  await page.getByRole("tab", { name: "Review", exact: true }).click()
  await page.getByRole("button", { name: "Review the last seven days", exact: true }).click()
  await expect(page.getByText(/preview|simulation|come later|not connected/i)).toHaveCount(0)
  await page.getByRole("button", { name: "Accept keep-steady review", exact: true }).click()
  await expect(
    page.getByText("Accepted and saved. Programme unchanged.", { exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test("Friday starts with two upper-body sets without a volume choice", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "View friday workout" }).click()
  await expect(page.getByRole("button", { name: "Start friday session" })).toBeEnabled()
  await expect(page.getByText("Choose upper-body sets before starting")).toHaveCount(0)
  await expect(page.getByRole("button", { name: /Two sets|Three sets/ })).toHaveCount(0)
  await expect(page.getByText(/^2 × 6–8 reps/)).toHaveCount(2)
  await page.getByRole("button", { name: "Start friday session" }).click()
  await page.getByRole("button", { name: "Session log", exact: true }).click()
  await expect(page.getByText("Pull-ups", { exact: true })).toHaveCount(2)
  await expect(page.getByText("Dumbbell shoulder press", { exact: true })).toHaveCount(2)
  await page.reload()
  await page.getByRole("button", { name: "Resume session" }).click()
  await page.getByRole("button", { name: "Session log", exact: true }).click()
  await expect(page.getByText("Pull-ups", { exact: true })).toHaveCount(2)
  await expect(page.getByText("Dumbbell shoulder press", { exact: true })).toHaveCount(2)
})

test("corrupt storage is never reset", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("button", { name: "View friday workout" })).toBeVisible()
  await page.evaluate(() => localStorage.setItem("workout.journal.v1", "broken"))
  await page.reload()
  await expect(page.getByRole("alert")).toContainText("saved browser log is invalid")
  expect(await page.evaluate(() => localStorage.getItem("workout.journal.v1"))).toBe("broken")
})
