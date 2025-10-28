import { test, expect } from '@playwright/test';

/**
 * Dashboard Visual Regression Tests
 * 
 * These tests capture screenshots of the dashboard at various states
 * and compare them against baseline images to detect unintended visual changes.
 * 
 * To update baselines after intentional UI changes:
 * npm run test:e2e -- --update-snapshots
 */

test.describe('Dashboard Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In a real setup, you'd need authentication
    // For now, this assumes dev mode with mock auth
    await page.goto('/');
  });

  test('dashboard overview - desktop', async ({ page }) => {
    // Wait for navigation to dashboard (or login if needed)
    await page.waitForURL(/\/(dashboard|login)/);
    
    // If on login page, handle auth (implementation depends on your auth setup)
    if (page.url().includes('login')) {
      // In dev mode, there might be a skip or mock button
      // Adjust based on your actual dev setup
      test.skip(true, 'Authentication required - skipping until dev auth is configured');
    }
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard-overview"]', { timeout: 10000 });
    
    // Wait for loading states to complete
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await expect(page).toHaveScreenshot('dashboard-overview-desktop.png', {
      fullPage: true,
      maxDiffPixels: 100, // Allow minor anti-aliasing differences
    });
  });

  test('dashboard overview - tablet', async ({ page }) => {
    // Set viewport to tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.waitForURL(/\/(dashboard|login)/);
    
    if (page.url().includes('login')) {
      test.skip(true, 'Authentication required - skipping until dev auth is configured');
    }
    
    await page.waitForSelector('[data-testid="dashboard-overview"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('dashboard-overview-tablet.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('dashboard overview - mobile', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.waitForURL(/\/(dashboard|login)/);
    
    if (page.url().includes('login')) {
      test.skip(true, 'Authentication required - skipping until dev auth is configured');
    }
    
    await page.waitForSelector('[data-testid="dashboard-overview"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('dashboard-overview-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('dashboard navigation - expanded', async ({ page }) => {
    await page.waitForURL(/\/(dashboard|login)/);
    
    if (page.url().includes('login')) {
      test.skip(true, 'Authentication required - skipping until dev auth is configured');
    }
    
    // Wait for sidebar to be visible
    await page.waitForSelector('nav[aria-label="Dashboard navigation"]', { timeout: 10000 });
    
    // Take screenshot of just the navigation area
    const nav = page.locator('nav[aria-label="Dashboard navigation"]');
    await expect(nav).toHaveScreenshot('dashboard-nav-expanded.png', {
      maxDiffPixels: 50,
    });
  });

  test('dashboard navigation - collapsed', async ({ page }) => {
    await page.waitForURL(/\/(dashboard|login)/);
    
    if (page.url().includes('login')) {
      test.skip(true, 'Authentication required - skipping until dev auth is configured');
    }
    
    await page.waitForSelector('nav[aria-label="Dashboard navigation"]', { timeout: 10000 });
    
    // Click toggle button to collapse sidebar
    const toggleButton = page.getByRole('button', { name: /toggle.*nav/i });
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      await page.waitForTimeout(500); // Wait for animation
    }
    
    const nav = page.locator('nav[aria-label="Dashboard navigation"]');
    await expect(nav).toHaveScreenshot('dashboard-nav-collapsed.png', {
      maxDiffPixels: 50,
    });
  });

  test('dashboard accounts panel', async ({ page }) => {
    await page.goto('/dashboard/accounts');
    
    if (page.url().includes('login')) {
      test.skip(true, 'Authentication required - skipping until dev auth is configured');
    }
    
    // Wait for accounts content
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('dashboard-accounts.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('dashboard insights panel', async ({ page }) => {
    await page.goto('/dashboard/insights');
    
    if (page.url().includes('login')) {
      test.skip(true, 'Authentication required - skipping until dev auth is configured');
    }
    
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('dashboard-insights.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('dashboard tasks panel', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    
    if (page.url().includes('login')) {
      test.skip(true, 'Authentication required - skipping until dev auth is configured');
    }
    
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('dashboard-tasks.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('empty state - no accounts', async ({ page }) => {
    // This test would need a way to mock empty state
    // For now, we'll skip it as it requires backend integration
    test.skip(true, 'Requires backend mock data setup');
  });

  test('error state - network failure', async ({ page }) => {
    // This test would need offline mode or network mocking
    test.skip(true, 'Requires network mocking setup');
  });

  test('loading state', async ({ page }) => {
    await page.goto('/dashboard');
    
    if (page.url().includes('login')) {
      test.skip(true, 'Authentication required - skipping until dev auth is configured');
    }
    
    // Try to capture loading state (might be too fast in local dev)
    // This is more useful with slower network simulation
    const skeleton = page.locator('[role="progressbar"], .MuiSkeleton-root').first();
    if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(page).toHaveScreenshot('dashboard-loading.png', {
        maxDiffPixels: 100,
      });
    } else {
      test.skip(true, 'Loading state too fast to capture');
    }
  });
});
