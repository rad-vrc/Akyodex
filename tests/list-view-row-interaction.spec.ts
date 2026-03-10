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

  test("closing a modal opened from a hidden row trigger restores focus to an accessible trigger", async ({
    page,
  }) => {
    await page.goto("/zukan");
    await page.waitForSelector(".akyo-card", { state: "attached" });

    await page.getByRole("button", { name: /リスト|List|목록/i }).click();

    const firstRow = page.locator(".list-view-table tbody tr").first();
    const numberCell = firstRow.locator("td").first();
    const nameCellTrigger = firstRow.locator("td").nth(2).locator("button");

    await expect(numberCell).toBeVisible();
    await numberCell.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(nameCellTrigger).toBeFocused();
  });

  test("closing a modal opened from the card detail button restores focus to the detail button", async ({
    page,
  }) => {
    await page.goto("/zukan");
    await page.waitForSelector(".akyo-card", { state: "attached" });

    const firstCard = page.locator("article.akyo-card").first();
    const detailButton = firstCard.locator(".detail-button");

    await expect(detailButton).toBeVisible();
    await expect(detailButton).toHaveAccessibleName(/くわしく見る|View Details|자세히 보기/i);
    await detailButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(detailButton).toBeFocused();
  });
});
