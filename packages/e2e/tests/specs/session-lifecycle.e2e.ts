import { $, browser, expect as wdioExpect } from '@wdio/globals';
import { createSession, deleteSession, type SessionFixture } from '../helpers/api.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';

const TICKET_URLS = [
  'https://github.com/example-org/repo/issues/1',
  'https://github.com/example-org/repo/issues/2',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Seeds the browser's localStorage so the host dashboard can load the
 * session without going through the create-session UI flow.
 */
async function seedHostLocalStorage(fixture: SessionFixture): Promise<void> {
  await browser.execute(
    (sessionId, hostKey, hostInviteKey, record) => {
      localStorage.setItem(`tabpilot_host_${sessionId}`, hostKey);
      localStorage.setItem(`tabpilot_host_invite_${sessionId}`, hostInviteKey);
      // Write the saved-sessions list so the store recognises this session
      const existing: unknown[] = JSON.parse(
        localStorage.getItem('tabpilot_saved_sessions') ?? '[]',
      );
      const withoutDupes = existing.filter(
        (s: unknown) => (s as { sessionId: string }).sessionId !== sessionId,
      );
      localStorage.setItem('tabpilot_saved_sessions', JSON.stringify([record, ...withoutDupes]));
    },
    fixture.sessionId,
    fixture.hostKey,
    fixture.hostInviteKey,
    {
      sessionId: fixture.sessionId,
      name: fixture.name,
      joinCode: fixture.joinCode,
      urlCount: fixture.urls.length,
      expiresAt: fixture.expiresAt,
      createdAt: fixture.createdAt,
      role: 'host',
    },
  );
}

/** Close every window except the one identified by `keepHandle`. */
async function closeExtraWindows(keepHandle: string): Promise<void> {
  let handles: string[] = [];
  try {
    handles = await browser.getWindowHandles();
  } catch {
    return;
  }
  for (const handle of handles) {
    if (handle !== keepHandle) {
      try {
        await browser.switchToWindow(handle);
        // Navigate away before closing to release any in-flight network
        // requests, which can cause BrowserStack to fail the DELETE /window call.
        await browser.url('about:blank');
        await browser.closeWindow();
      } catch {
        // window may already be gone — continue
      }
    }
  }
  try {
    await browser.switchToWindow(keepHandle);
  } catch {
    // ignore
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Create Session — UI flow', () => {
  it('fills the create-session form and lands on the success screen', async () => {
    await browser.url('/create');

    // Fill "Your info" section
    await $('#hostName').setValue('E2E Host');

    // Fill "Session details" section
    await $('#sessionName').setValue('Sprint E2E Grooming');

    // Fill ticket URLs
    await $('#urlsText').setValue(TICKET_URLS.join('\n'));

    // Submit
    await $('button[type="submit"]').click();

    // Success screen shows the "Open Host Dashboard" button
    const openBtn = await $('button=Open Host Dashboard');
    await openBtn.waitForDisplayed({ timeout: 15_000 });

    // Join code is rendered as 6 individual character divs inside JoinCodeDisplay.
    // Each char div has classes: font-bold font-mono — collect and concatenate.
    const charDivs = await $$('div.font-mono.font-bold');
    const chars = await Promise.all(charDivs.slice(0, 6).map((el) => el.getText()));
    const joinCode = chars.join('');
    wdioExpect(joinCode).toMatch(/^[A-Z0-9]{6}$/);
  });
});

describe('Session lifecycle', () => {
  let fixture: SessionFixture | null = null;
  let mainWindowHandle: string;

  beforeEach(async () => {
    // Create a fresh session via REST API for each test
    fixture = await createSession({
      name: 'E2E Lifecycle Test',
      hostName: 'E2E Host',
      urls: TICKET_URLS,
      votingEnabled: false,
      expiryDays: 1,
    });

    // Open the app, seed host localStorage, and clear any saved participant
    // name so auto-join can't silently fire in the join form.
    await browser.url('/');
    mainWindowHandle = await browser.getWindowHandle();
    await seedHostLocalStorage(fixture);
    await browser.execute(() => localStorage.removeItem('tabpilot_last_name'));
  });

  afterEach(async () => {
    await closeExtraWindows(mainWindowHandle);
    if (fixture) {
      await deleteSession(fixture.sessionId, fixture.hostKey).catch(() => {});
      fixture = null;
    }
  });

  it('host starts session and participant receives navigation events', async () => {
    if (!fixture) throw new Error('fixture not initialised');
    const { sessionId, joinCode } = fixture;

    // ── 1. Open host dashboard ──────────────────────────────────────────────
    await browser.url(`/host/${sessionId}`);

    // Wait for WebSocket connection (the "Connected" indicator in the header)
    await $('//span[text()="Connected"]').waitForDisplayed({ timeout: 20_000 });

    // Session is in 'waiting' state — the Start Session overlay is visible
    const startBtn = await $('button*=Start Session');
    await startBtn.waitForDisplayed({ timeout: 10_000 });

    // ── 2. Participant joins in a new window ────────────────────────────────
    await browser.newWindow(`${BASE_URL}/join?code=${joinCode}`);
    const participantHandle = await browser.getWindowHandle();

    // JoinCodeInput is pre-filled from ?code= URL param. The name input is
    // always visible, but the submit button stays disabled until the session
    // lookup resolves — wait for it to become clickable before submitting.
    await $('#name').waitForDisplayed({ timeout: 15_000 });
    await $('#name').setValue('Test Participant');

    const joinSubmitBtn = await $('button[type="submit"]');
    await joinSubmitBtn.waitForClickable({ timeout: 15_000 });
    await joinSubmitBtn.click();

    // Participant lands on /session/:id
    await browser.waitUntil(async () => (await browser.getUrl()).includes('/session/'), {
      timeout: 20_000,
      timeoutMsg: 'Participant view did not load after joining',
    });

    // ── 3. Host starts the session ──────────────────────────────────────────
    await browser.switchToWindow(mainWindowHandle);

    // Wait for the overlay to report ≥1 participant online.
    // The header spans render as "0\n/1" (newline between spans), so checking
    // the overlay text "N participant(s) online and waiting." is more reliable.
    await browser.waitUntil(
      async () => {
        const text = await $('body').getText();
        return /[1-9] participant/.test(text);
      },
      { timeout: 15_000, timeoutMsg: 'Participant did not appear in host dashboard' },
    );

    await startBtn.click();

    // ── 4. Participant sees the first ticket URL ─────────────────────────────
    await browser.switchToWindow(participantHandle);

    await browser.waitUntil(
      async () => {
        const text = await $('body').getText();
        return text.includes('issues/1');
      },
      { timeout: 20_000, timeoutMsg: 'Participant did not receive first NAVIGATE_TO event' },
    );

    // ── 5. Host navigates to the next ticket ────────────────────────────────
    await browser.switchToWindow(mainWindowHandle);

    const nextBtn = await $('button*=Next');
    await nextBtn.waitForClickable({ timeout: 10_000 });
    await nextBtn.click();

    // ── 6. Participant sees the second ticket URL ────────────────────────────
    await browser.switchToWindow(participantHandle);

    await browser.waitUntil(
      async () => {
        const text = await $('body').getText();
        return text.includes('issues/2');
      },
      { timeout: 20_000, timeoutMsg: 'Participant did not receive second NAVIGATE_TO event' },
    );

    // ── 7. Host ends the session ─────────────────────────────────────────────
    await browser.switchToWindow(mainWindowHandle);

    // Click "End" which opens the confirm modal, then confirm.
    const endBtn = await $('button*=End');
    await endBtn.waitForClickable({ timeout: 5_000 });
    await endBtn.click();
    await $('button=End Session').waitForClickable({ timeout: 5_000 });
    await $('button=End Session').click();
  });

  it('host can lock the session to prevent new participants from joining', async () => {
    if (!fixture) throw new Error('fixture not initialised');
    const { sessionId, joinCode } = fixture;

    await browser.url(`/host/${sessionId}`);
    await $('//span[text()="Connected"]').waitForDisplayed({ timeout: 20_000 });

    // The "Start Session" overlay (absolute inset-0) covers the entire viewport
    // including the header, making the Lock button unclickable while waiting.
    // Start the session first so the overlay dismisses, then lock.
    const startBtn = await $('button*=Start Session');
    await startBtn.waitForDisplayed({ timeout: 10_000 });
    await startBtn.click();
    await startBtn.waitForDisplayed({ timeout: 5_000, reverse: true });

    // Lock the session
    const lockBtn = await $('button*=Lock');
    await lockBtn.waitForClickable({ timeout: 10_000 });
    await lockBtn.click();

    // Participant navigates to the join page — the lookup should show the
    // session as locked and keep the submit button disabled.
    await browser.newWindow(`${BASE_URL}/join?code=${joinCode}`);

    // Wait for the join page to detect the locked session
    await browser.waitUntil(
      async () => {
        const text = await $('body').getText();
        return text.toLowerCase().includes('lock');
      },
      { timeout: 15_000, timeoutMsg: 'Expected locked session indicator on join page' },
    );

    // Submit button must be disabled — the host is not accepting new participants
    const joinSubmitBtn = await $('button[type="submit"]');
    await expect(joinSubmitBtn).not.toBeClickable();
  });
});

describe('Session lifecycle — voting flow', () => {
  let fixture: SessionFixture | null = null;
  let mainWindowHandle: string;

  beforeEach(async () => {
    fixture = await createSession({
      name: 'E2E Voting Test',
      hostName: 'E2E Host',
      urls: [TICKET_URLS[0]],
      votingEnabled: true,
      expiryDays: 1,
    });

    await browser.url('/');
    mainWindowHandle = await browser.getWindowHandle();
    await seedHostLocalStorage(fixture);
  });

  afterEach(async () => {
    await closeExtraWindows(mainWindowHandle);
    if (fixture) {
      await deleteSession(fixture.sessionId, fixture.hostKey).catch(() => {});
      fixture = null;
    }
  });

  it('participant can submit a vote and host can reveal it', async () => {
    if (!fixture) throw new Error('fixture not initialised');
    const { sessionId, joinCode } = fixture;

    // ── Host opens dashboard and starts session ──────────────────────────────
    await browser.url(`/host/${sessionId}`);
    await $('//span[text()="Connected"]').waitForDisplayed({ timeout: 20_000 });

    // Participant joins
    await browser.newWindow(`${BASE_URL}/join?code=${joinCode}`);
    const participantHandle = await browser.getWindowHandle();

    await $('#name').waitForDisplayed({ timeout: 15_000 });
    await $('#name').setValue('Voting Participant');

    const joinSubmitBtn = await $('button[type="submit"]');
    await joinSubmitBtn.waitForClickable({ timeout: 15_000 });
    await joinSubmitBtn.click();

    await browser.waitUntil(async () => (await browser.getUrl()).includes('/session/'), {
      timeout: 20_000,
      timeoutMsg: 'Participant view did not load',
    });

    // Start session from host window
    await browser.switchToWindow(mainWindowHandle);
    const startBtn = await $('button*=Start Session');
    await startBtn.waitForDisplayed({ timeout: 10_000 });
    await startBtn.click();

    // ── Participant submits a vote ────────────────────────────────────────────
    await browser.switchToWindow(participantHandle);

    // Voting buttons are rendered once the session is active and navigate_to arrives
    // Vote values: '1','2','3','5','8','13','21','?','☕'
    const voteBtn = await $('button=5');
    await voteBtn.waitForDisplayed({ timeout: 20_000 });
    await voteBtn.click();

    // ── Host sees "1 voted" indicator and reveals votes ──────────────────────
    await browser.switchToWindow(mainWindowHandle);

    // Reveal button shows once at least one participant has voted
    const revealBtn = await $('button*=Reveal');
    await revealBtn.waitForDisplayed({ timeout: 15_000 });
    await revealBtn.click();

    // ── Participant sees revealed vote result ────────────────────────────────
    await browser.switchToWindow(participantHandle);

    await browser.waitUntil(
      async () => {
        const text = await $('body').getText();
        // Votes are revealed — the participant's own vote "5" should be visible
        return text.includes('5');
      },
      { timeout: 15_000, timeoutMsg: 'Revealed votes did not appear on participant view' },
    );
  });
});
