const { test, expect } = require('@playwright/test');

// Mock Wikipedia API responses
const ORANGE_ARTICLE = {
  parse: {
    title: 'Orange (fruit)',
    text: {
      '*': '<div class="mw-parser-output">' +
        '<p>The <b>orange</b> is the fruit of various <a href="/wiki/Citrus" title="Citrus">citrus</a> species.</p>' +
        '<p>Oranges originated in a region encompassing Southern <a href="/wiki/China" title="China">China</a>, ' +
        'Northeast <a href="/wiki/India" title="India">India</a>, and <a href="/wiki/Myanmar" title="Myanmar">Myanmar</a>.</p>' +
        '<h2><span class="mw-headline" id="References">References</span></h2>' +
        '<div class="reflist"></div>' +
        '</div>'
    },
    displaytitle: 'Orange (fruit)'
  }
};

const CITRUS_ARTICLE = {
  parse: {
    title: 'Citrus',
    text: {
      '*': '<div class="mw-parser-output">' +
        '<p><i><b>Citrus</b></i> is a genus of flowering plants in the family <a href="/wiki/Rutaceae" title="Rutaceae">Rutaceae</a>.</p>' +
        '<p>The genus <i>Citrus</i> is native to <a href="/wiki/Platypus" title="Platypus">Platypus</a> land (not really).</p>' +
        '</div>'
    },
    displaytitle: 'Citrus'
  }
};

const PLATYPUS_ARTICLE = {
  parse: {
    title: 'Platypus',
    text: {
      '*': '<div class="mw-parser-output">' +
        '<p>The <b>platypus</b> is a semiaquatic, egg-laying <a href="/wiki/Mammal" title="Mammal">mammal</a>.</p>' +
        '</div>'
    },
    displaytitle: 'Platypus'
  }
};

const SEARCH_ORANGE = [
  'orange',
  ['Orange (fruit)', 'Orange (colour)', 'Orange, New South Wales'],
  ['', '', ''],
  ['', '', '']
];

const SEARCH_PLATYPUS = [
  'platypus',
  ['Platypus', 'Platypus Bay'],
  ['', ''],
  ['', '']
];

// No longer needed: randomPair() now picks from a hardcoded WELL_KNOWN array.
// The "random challenge" test just needs the parse endpoint to serve the chosen articles.

function mockWikiAPI(page) {
  return page.route('https://en.wikipedia.org/w/api.php**', async (route) => {
    const url = new URL(route.request().url());
    const action = url.searchParams.get('action');

    if (action === 'opensearch') {
      const query = url.searchParams.get('search').toLowerCase();
      if (query.includes('orange')) {
        return route.fulfill({ json: SEARCH_ORANGE });
      } else if (query.includes('platypus')) {
        return route.fulfill({ json: SEARCH_PLATYPUS });
      }
      return route.fulfill({ json: [query, [], [], []] });
    }

    if (action === 'parse') {
      const title = url.searchParams.get('page');
      if (title === 'Orange (fruit)' || title === 'Orange%20(fruit)') {
        return route.fulfill({ json: ORANGE_ARTICLE });
      } else if (title === 'Citrus') {
        return route.fulfill({ json: CITRUS_ARTICLE });
      } else if (title === 'Platypus') {
        return route.fulfill({ json: PLATYPUS_ARTICLE });
      }
      // Generic stub for any other article (e.g. random challenge picks)
      return route.fulfill({ json: { parse: {
        title: decodeURIComponent(title),
        displaytitle: decodeURIComponent(title),
        text: { '*': '<div class="mw-parser-output"><p>Article about <b>' +
          decodeURIComponent(title) + '</b>. Contains <a href="/wiki/Earth" title="Earth">Earth</a>.</p></div>' }
      }}});
    }

    return route.continue();
  });
}

test.describe('Wiki Speedrun', () => {

  test('shows menu screen on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#menu-screen h1')).toHaveText('Wiki Speedrun');
    await expect(page.locator('#start-btn')).toBeDisabled();
  });

  test('search autocomplete shows results', async ({ page }) => {
    await mockWikiAPI(page);
    await page.goto('/');

    await page.fill('#start-input', 'orange');
    await expect(page.locator('#start-dropdown')).toHaveClass(/show/);
    await expect(page.locator('#start-dropdown .autocomplete-item')).toHaveCount(3);
  });

  test('selecting articles enables start button', async ({ page }) => {
    await mockWikiAPI(page);
    await page.goto('/');

    // Select start article
    await page.fill('#start-input', 'orange');
    await page.locator('#start-dropdown .autocomplete-item').first().click();
    await expect(page.locator('#start-selected')).toContainText('Orange (fruit)');

    // Select target article
    await page.fill('#end-input', 'platypus');
    await page.locator('#end-dropdown .autocomplete-item').first().click();
    await expect(page.locator('#end-selected')).toContainText('Platypus');

    // Start button should be enabled
    await expect(page.locator('#start-btn')).toBeEnabled();
  });

  test('random challenge starts a game', async ({ page }) => {
    await mockWikiAPI(page);
    await page.goto('/');

    await page.click('#random-btn');

    // Should show playing screen (target title is set before article loads)
    await expect(page.locator('#play-screen')).toHaveClass(/active/);
    await expect(page.locator('#target-title')).not.toBeEmpty();
    // The game is in playing state (timer is running)
    await page.waitForTimeout(200);
    await expect(page.locator('#timer')).not.toHaveText('0:00.0');
  });

  // Helper: manually select Orange (fruit) → Platypus and start
  async function startOrangeToPlatypus(page) {
    await page.fill('#start-input', 'orange');
    await page.locator('#start-dropdown .autocomplete-item').first().click();
    await page.fill('#end-input', 'platypus');
    await page.locator('#end-dropdown .autocomplete-item').first().click();
    await page.click('#start-btn');
    await expect(page.locator('#article-title')).toHaveText('Orange (fruit)');
  }

  test('clicking a wiki link navigates to new article', async ({ page }) => {
    await mockWikiAPI(page);
    await page.goto('/');
    await startOrangeToPlatypus(page);

    // Click "Citrus" link
    await page.locator('#article-content a[href="/wiki/Citrus"]').click();

    // Should navigate to Citrus article
    await expect(page.locator('#article-title')).toHaveText('Citrus');
    await expect(page.locator('#click-count')).toHaveText('1 click');
  });

  test('reaching target shows victory screen', async ({ page }) => {
    await mockWikiAPI(page);
    await page.goto('/');
    await startOrangeToPlatypus(page);

    // Navigate: Orange → Citrus → Platypus (target)
    await page.locator('#article-content a[href="/wiki/Citrus"]').click();
    await expect(page.locator('#article-title')).toHaveText('Citrus');

    await page.locator('#article-content a[href="/wiki/Platypus"]').click();

    // Should show victory screen
    await expect(page.locator('#victory-screen')).toHaveClass(/active/);
    await expect(page.locator('#v-clicks')).toHaveText('2');
    await expect(page.locator('#v-path-length')).toHaveText('3');
  });

  test('warmer indicator shows when target is linked', async ({ page }) => {
    await mockWikiAPI(page);
    await page.goto('/');
    await startOrangeToPlatypus(page);

    // Navigate to Citrus (which links to Platypus, the target)
    await page.locator('#article-content a[href="/wiki/Citrus"]').click();
    await expect(page.locator('#article-title')).toHaveText('Citrus');

    // Warmer indicator should be visible
    await expect(page.locator('#warmer')).toBeVisible();
  });

  test('breadcrumb backtracking works', async ({ page }) => {
    await mockWikiAPI(page);
    await page.goto('/');
    await startOrangeToPlatypus(page);

    await page.locator('#article-content a[href="/wiki/Citrus"]').click();
    await expect(page.locator('#article-title')).toHaveText('Citrus');
    await expect(page.locator('#click-count')).toHaveText('1 click');

    // Click breadcrumb to go back to Orange
    await page.locator('.breadcrumb[data-idx="0"]').click();
    await expect(page.locator('#article-title')).toHaveText('Orange (fruit)');
    // Backtracking counts as a click
    await expect(page.locator('#click-count')).toHaveText('2 clicks');
  });

  test('references section is stripped', async ({ page }) => {
    await mockWikiAPI(page);
    await page.goto('/');
    await startOrangeToPlatypus(page);

    // References section should not be visible
    await expect(page.locator('#article-content .reflist')).toHaveCount(0);
  });

  test('play again returns to menu', async ({ page }) => {
    await mockWikiAPI(page);
    await page.goto('/');
    await startOrangeToPlatypus(page);

    await page.locator('#article-content a[href="/wiki/Citrus"]').click();
    await page.locator('#article-content a[href="/wiki/Platypus"]').click();

    await expect(page.locator('#victory-screen')).toHaveClass(/active/);
    await page.click('#play-again-btn');
    await expect(page.locator('#menu-screen')).toHaveClass(/active/);
  });

  test('give up returns to menu', async ({ page }) => {
    await mockWikiAPI(page);
    await page.goto('/');
    await startOrangeToPlatypus(page);

    // Accept the confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    await page.click('#give-up-btn');

    await expect(page.locator('#menu-screen')).toHaveClass(/active/);
  });

  test('peek at target shows modal with target article', async ({ page }) => {
    await mockWikiAPI(page);
    await page.goto('/');
    await startOrangeToPlatypus(page);

    // Click peek button
    await page.click('#peek-btn');

    // Modal should appear with target article
    await expect(page.locator('#peek-modal')).toBeVisible();
    await expect(page.locator('#peek-title')).toHaveText('Platypus');

    // Links should be disabled (pointer-events: none)
    const linkStyle = await page.locator('#peek-body a').first().evaluate(
      el => getComputedStyle(el).pointerEvents
    );
    expect(linkStyle).toBe('none');

    // Close modal
    await page.click('#peek-close');
    await expect(page.locator('#peek-modal')).not.toBeVisible();
  });

});
