import { expect, test } from "@playwright/test";

test.describe("Filter panel responsive defaults", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });

  test("mobile view keeps the filter panel closed on initial render", async ({ page }) => {
    await page.goto("/zukan");
    await page.waitForSelector(".akyo-card", { state: "attached" });

    const toggleButton = page.getByRole("button", { name: /絞り込みフィルタを開く|Open filters|필터 열기/i });
    const filterPanel = page.locator("#zukan-filter-panel");

    await expect(toggleButton).toBeVisible();
    await expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    await expect(filterPanel).toBeHidden();
  });
});
