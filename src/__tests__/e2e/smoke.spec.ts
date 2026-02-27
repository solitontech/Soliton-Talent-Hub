import { test, expect } from "@playwright/test";

/**
 * E2E smoke test — verifies the app loads and basic pages are accessible.
 */
test.describe("App loads", () => {
    test("home page returns 200", async ({ page }) => {
        const response = await page.goto("/");
        expect(response?.status()).toBe(200);
    });

    test("admin login page loads", async ({ page }) => {
        await page.goto("/admin/login");
        await expect(page.locator("h1")).toContainText("Admin Login");
    });

    test("admin dashboard page loads", async ({ page }) => {
        await page.goto("/admin/dashboard");
        await expect(page.locator("h1")).toContainText("Dashboard");
    });
});
