import { expect, test } from "@playwright/test";

test.describe("List view row interaction", () => {
  test("clicking a non-action cell opens the detail modal", async ({ page }) => {
    await page.goto("/zukan");
    await page.waitForSelector(".akyo-card", { state: "attached" });

    await page.getByRole("button", { name: /リスト|List|목록/i }).click();

    const firstRow = page.locator(".list-view-table tbody tr").first();
    const nameCell = firstRow.locator("td").nth(2);

    await expect(nameCell).toBeVisible();
    await nameCell.click();

    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
