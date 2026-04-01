import { expect, test } from "@playwright/test"

test("home page loads storefront shell", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("img", { name: "Nexora", exact: true })).toBeVisible()
  await expect(page.getByPlaceholder("Buscar por nombre o descripcion")).toBeVisible()
})
