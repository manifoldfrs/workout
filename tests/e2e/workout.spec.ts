import { expect, test } from "@playwright/test"

test("the week screen keeps its wordmark without preview labels or filler copy", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 8, 6, 12))
  await page.goto("/")
  await expect(page.getByText("workout", { exact: true })).toBeVisible()
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

test("offline logging survives reload and supports undo, omissions, review and backup restore", async ({
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
  await expect(page.getByLabel("Actual duration (seconds)")).toHaveValue("420")
  await context.setOffline(true)
  await page.getByRole("button", { name: "Save completed work" }).click()
  await expect(page.getByLabel("Actual repetitions")).toHaveValue("3")
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
  await page.getByRole("button", { name: "End session early", exact: true }).click()
  await page.getByRole("button", { name: "Quality declined", exact: true }).click()
  await page.getByRole("tab", { name: "History", exact: true }).click()
  await expect(page.getByText(/0 working sets recorded/)).toBeVisible()
  await page.getByRole("button", { name: "Show local backup", exact: true }).click()
  const backup = await page.getByLabel("Local backup JSON", { exact: true }).inputValue()
  expect(backup).toContain('"formatVersion": 1')
  await page.getByLabel("Backup JSON to restore", { exact: true }).fill("invalid")
  await page.getByRole("button", { name: "Preview restore warning", exact: true }).click()
  await page.getByRole("button", { name: "Replace local log with backup", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("not valid JSON")
  await page.getByLabel("Backup JSON to restore", { exact: true }).fill(backup)
  await page.getByRole("button", { name: "Preview restore warning", exact: true }).click()
  await page.getByRole("button", { name: "Replace local log with backup", exact: true }).click()
  await expect(page.getByLabel("Backup JSON to restore", { exact: true })).toHaveValue("")
  await page.getByRole("tab", { name: "Review", exact: true }).click()
  await page.getByRole("button", { name: "Review the last seven days", exact: true }).click()
  await page.getByRole("button", { name: "Accept keep-steady review", exact: true }).click()
  await expect(
    page.getByText("Accepted and saved. Programme unchanged.", { exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test("Friday requires a volume choice and corrupt storage is never reset", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "View friday workout" }).click()
  await expect(page.getByRole("button", { name: "Start friday session" })).toBeDisabled()
  await page.getByRole("button", { name: "Two sets", exact: true }).click()
  await expect(page.getByRole("button", { name: "Start friday session" })).toBeEnabled()
  await page.evaluate(() => localStorage.setItem("workout.journal.v1", "broken"))
  await page.reload()
  await expect(page.getByRole("alert")).toContainText("saved browser log is invalid")
  expect(await page.evaluate(() => localStorage.getItem("workout.journal.v1"))).toBe("broken")
})
