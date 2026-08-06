var cachedConfig = typeof cachedConfig !== 'undefined' ? cachedConfig : null;
window.__bookingComplete = false; // Global Guard Flag to prevent multiple bookings

async function loadConfig() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('bookingConfig', async (result) => {
      if (result.bookingConfig && Object.keys(result.bookingConfig).length > 0) {
        resolve(result.bookingConfig);
      } else {
        try {
          const response = await fetch(chrome.runtime.getURL('config.json'));
          const config = await response.json();
          resolve(config);
        } catch (err) {
          reject(err);
        }
      }
    });
  });
}

async function loadConfigOnce() {
  if (cachedConfig) return cachedConfig;

  cachedConfig = await new Promise(async (resolve, reject) => {
    chrome.storage.local.get('bookingConfig', async (result) => {
      if (result.bookingConfig && Object.keys(result.bookingConfig).length > 0) {
        console.log('[Config] Loaded from chrome.storage');
        resolve(result.bookingConfig);
      } else {
        try {
          const response = await fetch(chrome.runtime.getURL('config.json'));
          const fallbackConfig = await response.json();
          console.log('[Config] Loaded from bundled config.json');
          resolve(fallbackConfig);
        } catch (err) {
          console.error('[Config] Failed to load config:', err);
          reject(err);
        }
      }
    });
  });

  return cachedConfig;
}


(function () {
  document.body.style.backgroundColor = '#fbb816';
  chrome.runtime.sendMessage({ action: 'registerTab' });


  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const BOOKING_PHASES = Object.freeze({
    IDLE: 'idle',
    PRIMER: 'primer',
    FAST_PRIMER: 'fastPrimer',
    BOOKING: 'booking',
    RETRY: 'retry'
  });

  function normalizeBookingPhase(phase) {
    return Object.values(BOOKING_PHASES).includes(phase) ? phase : BOOKING_PHASES.IDLE;
  }

  function getBookingPhase() {
    return normalizeBookingPhase(window.__bookingPhase);
  }

  async function readBookingPhase() {
    const { bookingPhase: storedBookingPhase = BOOKING_PHASES.IDLE } = await new Promise((resolve) => {
      chrome.storage.local.get({ bookingPhase: BOOKING_PHASES.IDLE }, resolve);
    });
    return normalizeBookingPhase(storedBookingPhase);
  }

  function isBookingPhaseActive(phase = getBookingPhase()) {
    return phase === BOOKING_PHASES.BOOKING || phase === BOOKING_PHASES.RETRY;
  }

  function isPrimerPhase(phase = getBookingPhase()) {
    return phase === BOOKING_PHASES.PRIMER || phase === BOOKING_PHASES.FAST_PRIMER;
  }

  function getPage1ClickGate(force = false) {
    const phase = getBookingPhase();

    if (phase === BOOKING_PHASES.PRIMER) {
      return { allowed: false, reason: 'primer' };
    }
    if (phase === BOOKING_PHASES.FAST_PRIMER && !force) {
      return { allowed: false, reason: 'fastPrimer' };
    }

    return { allowed: true, phase };
  }

  function clearPage2SubmitTimer() {
    if (window.__page2SubmitTimerId) {
      clearTimeout(window.__page2SubmitTimerId);
      window.__page2SubmitTimerId = null;
    }
  }

  function schedulePage2Submit(delayMs) {
    window.__page2SubmitReady = false;
    clearPage2SubmitTimer();
    console.log(`[CS] Scheduling Page 2 Next click in ${delayMs}ms to let the token settle...`);
    window.__page2SubmitTimerId = setTimeout(async () => {
      window.__page2SubmitTimerId = null;
      window.__page2SubmitReady = true;
      const clicked = await submitPage2AfterSettle();
      if (!clicked) {
        console.warn('[CS] Page 2 Next was not clicked after settle attempts. The reservation may time out.');
      }
    }, delayMs);
  }

  async function submitPage2AfterSettle(attempts = 3, retryDelayMs = 500) {
    for (let i = 0; i < attempts; i += 1) {
      const clicked = await clickNextButtonPage2(5000);
      if (clicked) {
        return true;
      }
      if (i < attempts - 1) {
        await wait(retryDelayMs);
      }
    }
    return false;
  }
  async function waitForElement(selector, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await wait(100);
    }
    return null;
  }

  async function waitForSelectOption(selectElement, targetValue, timeout = 5000) {
    const normalizedTarget = String(targetValue || '').trim();
    if (!selectElement || !normalizedTarget) return null;

    const start = Date.now();
    while (Date.now() - start < timeout) {
      const liveSelect = document.querySelector('select#country, select[formcontrolname="country"]') || selectElement;
      const options = Array.from(liveSelect.options || []);
      const match = options.find((opt) => {
        const value = String(opt.value || '').trim();
        const text = String(opt.textContent || '').trim();
        return value === normalizedTarget || text === normalizedTarget;
      });

      if (match) return { select: liveSelect, option: match };
      await wait(100);
    }

    return null;
  }

  async function selectCountryOfResidence(countrySelector, targetCountry, timeout = 10000) {
    const normalizedTarget = String(targetCountry || '').trim() || 'Canada';
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const ready = await waitForSelectOption(document.querySelector(countrySelector) || null, normalizedTarget, 500);
      if (!ready) {
        await wait(100);
        continue;
      }

      const selectEl = ready.select;
      const option = ready.option;
      const finalValue = String(option.value || normalizedTarget).trim() || normalizedTarget;

      if (valueSetter) {
        valueSetter.call(selectEl, finalValue);
      } else {
        selectEl.value = finalValue;
      }

      option.selected = true;
      if (typeof option.index === 'number') {
        selectEl.selectedIndex = option.index;
      }

      selectEl.focus();
      selectEl.dispatchEvent(new Event('input', { bubbles: true }));
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      selectEl.dispatchEvent(new Event('blur', { bubbles: true }));

      await wait(250);

      const liveSelect = document.querySelector(countrySelector);
      if (liveSelect && liveSelect.value === finalValue) {
        return { ok: true, value: liveSelect.value, index: liveSelect.selectedIndex };
      }

      await wait(200);
    }

    const finalSelect = document.querySelector(countrySelector);
    return {
      ok: !!finalSelect && String(finalSelect.value || '').trim() === normalizedTarget,
      value: finalSelect?.value || '',
      index: finalSelect?.selectedIndex ?? -1
    };
  }

  function shiftIsoDateString(dateString, offsetDays) {
    const parsed = new Date(`${dateString}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setDate(parsed.getDate() + offsetDays);
    return parsed.toISOString().slice(0, 10);
  }

  async function applyDateValue(dateInput, value) {
    dateInput.value = value;
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(75);
    return document.querySelector('#visitDate')?.value === value;
  }

  async function setDateValue(dateString, options = {}) {
    const dateInput = await waitForElement('#visitDate');
    if (!dateInput) {
      return false;
    }

    const shouldNudge = options.nudge !== false;
    let sawHydrationError = false;
    const hydrationErrorHandler = (event) => {
      const message = String(event?.message || '');
      const stack = String(event?.error?.stack || '');
      if (message.includes('Cannot read properties of undefined') || stack.includes('setTimeArrays')) {
        sawHydrationError = true;
      }
    };

    if (shouldNudge) {
      window.addEventListener('error', hydrationErrorHandler, true);
    }

    try {
      const firstPassOk = await applyDateValue(dateInput, dateString);

      if (shouldNudge) {
        await wait(options.settleMs ?? 125);

        if (!firstPassOk || sawHydrationError) {
          const previousDate = shiftIsoDateString(dateString, -1);
          if (previousDate) {
            await applyDateValue(dateInput, previousDate);
            await wait(50);
            await applyDateValue(dateInput, dateString);
          }
        }
      }
    } finally {
      if (shouldNudge) {
        window.removeEventListener('error', hydrationErrorHandler, true);
      }
    }

    console.log(`Date input set to ${dateString}`);
    return true;
  }

  async function selectPassType() {
    console.log('[selectPassType] Starting pass type selection');
    const { passTypeNum } = await loadConfigOnce();
    const dropdown = await waitForElement('#passType');

    if (!dropdown) {
      return false;
    }

    const targetValue = `${passTypeNum}: Object`;
    console.log(`[selectPassType] Looking for option with value "${targetValue}"`);

    const targetOption = [...dropdown.options].find(o => o.value === targetValue);

    if (targetOption) {
      dropdown.value = targetValue;
      dropdown.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`[selectPassType] Selected pass type: "${targetOption.textContent.trim()}"`);
      return true;
    }

    return false;
  }

  function getBookingTimeContainer(radioButton) {
    return radioButton.closest('label, mat-radio-button, .mat-mdc-radio-button, .booking-time, .time-slot, [role="radio"]')
      || radioButton.parentElement
      || radioButton;
  }

  function bookingTimeLooksReady(container) {
    const text = String(container?.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;
    if (/^-+$/.test(text)) return false;
    if (text === '-') return false;
    return /Pass availability|Arrive and depart/i.test(text);
  }

  async function waitForBookingTimeReady(selector, timeout = 6000) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const radioButton = document.querySelector(selector);
      if (radioButton && !radioButton.disabled && radioButton.offsetParent !== null) {
        const container = getBookingTimeContainer(radioButton);
        if (bookingTimeLooksReady(container)) {
          return radioButton;
        }
      }

      await wait(100);
    }

    return null;
  }

  async function selectBookingTime() {
    const { visitTime } = await loadConfigOnce();
    const selector = `input#visitTime${visitTime}`;
    const radioButton = await waitForBookingTimeReady(selector, 6000);

    if (radioButton) {
      console.log('Booking time radio button found and ready, selecting...');
      radioButton.click();
      return true;
    }

    console.warn('[BookingTime] Radio button did not become ready in time.');
    return false;
  }
  async function selectNumberOfPasses(numberOfPasses) {
    const normalizedTarget = String(numberOfPasses || '').trim();
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    const deadline = Date.now() + 10000;

    while (Date.now() < deadline) {
      const numberOfPassesSelect = await waitForElement('select#passCount', 1000);
      if (!numberOfPassesSelect) {
        await wait(100);
        continue;
      }

      const options = Array.from(numberOfPassesSelect.options || []);
      const match = options.find((opt) => {
        const value = String(opt.value || '').trim();
        const text = String(opt.textContent || '').trim();
        return value === normalizedTarget || text === normalizedTarget;
      });

      if (!match) {
        await wait(100);
        continue;
      }

      const finalValue = String(match.value || normalizedTarget).trim() || normalizedTarget;

      console.log('Number of passes dropdown found, selecting value...');
      if (valueSetter) {
        valueSetter.call(numberOfPassesSelect, finalValue);
      } else {
        numberOfPassesSelect.value = finalValue;
      }

      match.selected = true;
      if (typeof match.index === 'number') {
        numberOfPassesSelect.selectedIndex = match.index;
      }

      numberOfPassesSelect.focus();
      numberOfPassesSelect.dispatchEvent(new Event('input', { bubbles: true }));
      numberOfPassesSelect.dispatchEvent(new Event('change', { bubbles: true }));
      numberOfPassesSelect.dispatchEvent(new Event('blur', { bubbles: true }));

      await wait(200);

      const liveSelect = document.querySelector('select#passCount');
      if (liveSelect && String(liveSelect.value || '').trim() === finalValue) {
        window.__lastAttemptedPassCount = parseInt(numberOfPasses, 10) || 1;
        return true;
      }

      await wait(150);
    }

    return false;
  }
  async function tryBookingWithRetry(originalDesired) {
    const select = document.querySelector('select#passCount');
    if (!select) {
      console.warn('[Retry] Pass count dropdown not found - possibly full. Aborting retry.');
      return false;
    }

    const availableCounts = [...select.options]
      .filter(opt => !opt.disabled && !isNaN(parseInt(opt.value)))
      .map(opt => parseInt(opt.value))
      .sort((a, b) => b - a);

    console.log('[Retry] Available pass counts (descending):', availableCounts);

    const attemptCounts = availableCounts.filter(c => c <= originalDesired);

    if (attemptCounts.length === 0) {
      console.warn('[Retry] No available passes less than or equal to desired.');
      return false;
    }

    for (const count of attemptCounts) {
      console.log(`[Retry] Attempting with ${count} pass(es)...`);
      await selectNumberOfPasses(String(count));

      const clicked = await clickNextButtonPage1();
      if (clicked) {
        console.log(`[Retry] Successfully advanced with ${count} pass(es).`);
        window.__lastAttemptedPassCount = count;
        return true;
      }

      console.log(`[Retry] Failed to click Next with ${count} pass(es) - trying lower.`);
    }

    console.warn('[Retry] Could not proceed with any available pass count.');
    return false;
  }

  function findAgreeCheckbox() {
    return Array.from(document.querySelectorAll('label'))
      .find(label => label.textContent.includes('I have read and agree to the above notice'))
      ?.querySelector('input[type="checkbox"]');
  }

  async function clickAgreeCheckbox() {
    console.log('Waiting for "Read and Agree" checkbox to appear...');
    let checkbox;
    while (!(checkbox = findAgreeCheckbox())) {
      await wait(100);
    }

    if (checkbox && !checkbox.checked) {
      console.log('Read and Agree checkbox found, checking...');
      checkbox.click();
    }
  }

  async function clickNextButtonPage1(force = false) {
    if (!force && (window.__manualMode || (window.__fastMode && !window.isRetryMode))) {
      console.log('[Guard] Not clicking Next on Page 1 (Manual/Fast Mode).');
      return false;
    }

    const selector = 'button[data-bs-target="#turnstileModal"]';
    let nextButton = await waitForElement(selector);
    if (!nextButton) {
      return false;
    }
    if (nextButton.disabled) {
      const enabled = await waitForButtonEnabled(selector, 5000);
      if (!enabled) {
        return false;
      }
      nextButton = document.querySelector(selector);
      if (!nextButton || nextButton.disabled) {
        return false;
      }
    }
    window.__turnstileStartTime = performance.now();
    nextButton.click();
    return true;
  }

  async function waitForButtonEnabled(selector, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const button = document.querySelector(selector);
      if (button && !button.disabled) {
        return true;
      }
      await wait(100);
    }
    return false;
  }

  async function clickNextButtonPage2() {
    console.log('Waiting for Next button on Page 2 to appear...');
    let nextButton;
    while (!(nextButton = await waitForElement('button.btn.btn-primary'))) {
      await wait(100);
    }

    if (nextButton) {
      console.log('Next button found on Page 2, clicking...');
      nextButton.click();
      const endTime = performance.now();
      const elapsed = (endTime - window.__bookingStartTime).toFixed(3);
      console.log(`Pass successfully booked in ${elapsed} ms.`);
      const successObserver = new MutationObserver(() => {
        const successHeader = document.querySelector('h1');
        if (successHeader && successHeader.textContent.includes('Success! Your reservation is complete.')) {
          console.log('[CS] Booking success detected.');
          chrome.runtime.sendMessage({
            action: 'updateNumberOfPassesBooked',
            value: window.__lastAttemptedPassCount || 1
          }, () => {
            chrome.runtime.sendMessage({ action: 'stopBookingProcess' });
          });
          successObserver.disconnect();
        }
      });
      successObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  async function fillFormValues() {
    const { firstName, lastName, email, countryOfResidence, country } = await loadConfigOnce();
    const firstNameElement = await waitForElement('#firstName');
    const lastNameElement = await waitForElement('#lastName');
    const emailElement = await waitForElement('#email');
    const emailCheckElement = await waitForElement('#emailCheck');
    const countrySelector = 'select#country, select[formcontrolname="country"]';
    const countryElement = await waitForElement(countrySelector, 10000);

    if (firstNameElement && lastNameElement && emailElement && emailCheckElement) {
      console.log('Form fields found on Page 2, filling in...');
      firstNameElement.value = firstName;
      lastNameElement.value = lastName;
      emailElement.value = email;
      emailCheckElement.value = email;

      firstNameElement.dispatchEvent(new Event('input', { bubbles: true }));
      lastNameElement.dispatchEvent(new Event('input', { bubbles: true }));
      emailElement.dispatchEvent(new Event('input', { bubbles: true }));
      emailCheckElement.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      console.warn('[Page2] One or more text inputs were not found.');
    }

    const selectedCountry = String(countryOfResidence || country || 'Canada').trim() || 'Canada';
    if (countryElement) {
      const nextValue = selectedCountry;
      const result = await selectCountryOfResidence(countrySelector, nextValue, 10000);

      if (result.ok) {
        console.log(`[Page2] Country of residence selected: ${result.value || nextValue}`);
      } else {
        console.warn(`[Page2] Country of residence selection may not have stuck. Current value="${result.value || 'blank'}", expected="${nextValue}"`);
      }
    } else {
      console.warn('[Page2] Country of residence select not found after waiting.');
    }
  }

  function observeChanges() {
    const observer = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && document.querySelector('#firstName') && !window.__bookingComplete) {
          window.__bookingComplete = true;
          console.log('Page 2 detected, filling in form...');

          if (typeof window.__turnstileStartTime === 'number') {
            const ms = performance.now() - window.__turnstileStartTime;
            window.__lastTurnstileMs = ms;
            console.log(`[Timer] Turnstile duration: ${ms.toFixed(0)} ms`);

            chrome.storage.local.get({ turnstileSamples: [] }, ({ turnstileSamples }) => {
              const sample = { ms, ts: Date.now() };
              const next = [...turnstileSamples, sample].slice(-20);
              const avg = next.reduce((a, s) => a + s.ms, 0) / next.length;
              chrome.storage.local.set({
                lastTurnstileMs: ms,
                turnstileSamples: next,
                turnstileAvgMs: avg
              });
            });

            chrome.runtime.sendMessage({ action: 'recordTurnstileTiming', ms });
          }

          await fillFormValues();
          await clickAgreeCheckbox();
          const config = await loadConfigOnce();
          if (!config.testing) {
            const settleDelay = Number.isFinite(config.page2SubmitDelayMs)
              ? Math.max(0, Math.round(config.page2SubmitDelayMs))
              : 10000;
            schedulePage2Submit(settleDelay);
          } else {
            console.log('[Page2] Testing mode enabled; skipping Submit click.');
          }
          observer.disconnect();
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function watchSoldOutToast() {
    // class/attrs change sometimes; rely on role="alert" + text content
    const MATCHES = [
      'Sorry, all passes',
      'all passes for this time and date have been reserved'
    ];
    let sent = false; // debounce per page-load

    function isSoldOutAlert(el) {
      if (!el || el.nodeType !== 1) return false;
      if (el.getAttribute('role') !== 'alert') return false;
      const text = (el.getAttribute('aria-label') || el.textContent || '').trim();
      if (!text) return false;
      // case-insensitive contains
      const lower = text.toLowerCase();
      return MATCHES.some(m => lower.includes(m.toLowerCase()));
    }

    function triggerPause(reason) {
      if (sent) return;
      sent = true;
      console.log('[CS] Sold-out toast detected ? sending pauseRefreshingForBooking (BG will retry in ~15s).', reason || '');
      chrome.runtime.sendMessage({
        action: 'pauseRefreshingForBooking',
        source: 'toast',
        reason
        // If you ever want a shorter/longer pause, add: pauseMs: 8000
      });
    }

    // Initial sweep (if toast already exists)
    document.querySelectorAll('[role="alert"]').forEach(el => {
      if (isSoldOutAlert(el)) triggerPause('initial_sweep');
    });

    // Observe dynamically-added toasts
    const mo = new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (isSoldOutAlert(n)) { triggerPause('observer_node'); return; }
          if (n.querySelectorAll) {
            for (const el of n.querySelectorAll('[role="alert"]')) {
              if (isSoldOutAlert(el)) { triggerPause('observer_descendant'); return; }
            }
          }
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Detect "Please refresh the page." / "You have experienced an issue." -> deep hard refresh
  function watchStaleAppToast() {
    const MATCHES = [
      'Please refresh the page.',
      'You have experienced an issue.'
    ];
    let sent = false;

    function isStale(el) {
      if (!el || el.nodeType !== 1) return false;
      const text = (el.getAttribute?.('aria-label') || el.textContent || '').trim();
      if (!text) return false;
      // catch both toast (role=alert) and inline banner text
      return MATCHES.some(m => text.includes(m));
    }

    function trigger(reason) {
      if (sent) return;
      sent = true;
      console.log('[CS] Stale shell detected ? requesting deepHardRefresh.', reason || '');
      chrome.runtime.sendMessage({ action: 'deepHardRefresh' });
    }

    // initial sweep
    document.querySelectorAll('[role="alert"], body *').forEach(el => { if (isStale(el)) trigger('initial'); });

    // observe future toasts/banners
    const mo = new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (isStale(n)) return trigger('node');
          if (n.querySelectorAll) {
            for (const el of n.querySelectorAll('[role="alert"], body *')) {
              if (isStale(el)) return trigger('desc');
            }
          }
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  function attachNextButtonTimer() {
    if (window.__nextBtnTimerAttached) return;
    window.__nextBtnTimerAttached = true;
    document.addEventListener(
      'click',
      (e) => {
        const btn = e.target && e.target.closest?.('button[data-bs-target="#turnstileModal"]');
        if (!btn) return;
        window.__turnstileStartTime = performance.now();
        console.log('[Timer] Page 1 Next clicked - starting Turnstile timer.');
      },
      { capture: true }
    );
  }

  async function getPassesLoadedStatus() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: 'getPassesLoadedStatus' }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, passesLoaded: false });
            return;
          }

          resolve(response || { ok: false, passesLoaded: false });
        });
      } catch (err) {
        resolve({ ok: false, passesLoaded: false, error: err?.message || String(err) });
      }
    });
  }

  async function getUpdateCheckStatus() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: 'getUpdateCheckStatus' }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, updateCheckComplete: false });
            return;
          }

          resolve(response || { ok: false, updateCheckComplete: false });
        });
      } catch (err) {
        resolve({ ok: false, updateCheckComplete: false, error: err?.message || String(err) });
      }
    });
  }

  async function waitForUpdateCheckComplete(timeout = 6000) {
    return new Promise((resolve) => {
      let resolved = false;

      function finish(payload) {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(payload);
      }

      function listener(message) {
        if (message.action === 'updateCheckComplete') {
          console.log('Update check complete message received', message);
          finish(message);
        }
      }

      chrome.runtime.onMessage.addListener(listener);

      const timeoutId = setTimeout(() => {
        console.warn('[CS] updateCheckComplete wait timed out; continuing page 1 fill.');
        finish({ ok: false, timedOut: true });
      }, timeout);

      getUpdateCheckStatus().then((status) => {
        if (status?.updateCheckComplete) {
          console.log('Update check state replayed from background', status);
          finish(status);
        }
      }).catch(() => {});
    });
  }

  async function waitForPassesLoaded(timeout = 6000) {
    return new Promise((resolve) => {
      let resolved = false;

      function finish(payload) {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(payload);
      }

      function listener(message) {
        if (message.action === 'passesLoaded') {
          console.log('Passes loaded message received', message);
          finish(message);
        }
      }

      chrome.runtime.onMessage.addListener(listener);

      const timeoutId = setTimeout(() => {
        console.warn('[CS] passesLoaded wait timed out; continuing page 1 fill.');
        finish({ ok: false, timedOut: true });
      }, timeout);

      getPassesLoadedStatus().then((status) => {
        if (status?.passesLoaded) {
          console.log('Passes loaded state replayed from background', status);
          finish(status);
        }
      }).catch(() => {});
    });
  }


  async function waitForPage1ControlsReady(config, timeout = 6000) {
    const targetPassTypeValue = `${config.passTypeNum}: Object`;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const dateInput = document.querySelector('#visitDate');
      const passTypeSelect = document.querySelector('#passType');

      const passTypeReady = !!passTypeSelect && Array.from(passTypeSelect.options || []).some((opt) => opt.value === targetPassTypeValue);
      const dateReady = !!dateInput && !dateInput.disabled;

      if (dateReady && passTypeReady) {
        return true;
      }

      await wait(100);
    }

    console.warn('[CS] Page 1 controls did not fully hydrate in time; continuing anyway.');
    return false;
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const kind = message.action || message.type; // normalize

    switch (kind) {
      case 'RETRY_MODE': {
        console.log('[Content] Received RETRY_MODE message - activating retry behavior');
        window.isRetryMode = true;
        if (typeof sendResponse === 'function') sendResponse({ ack: true });
        break;
      }

      case 'fastModeNext': {
        if (window.__manualMode) {
          console.log('[FastMode] Ignored: Manual Mode ON.');
          break;
        }
        if (window.__fastModeInProgress) {
          console.log('[FastMode] Click already in progress; ignoring duplicate.');
          break;
        }
        window.__fastModeInProgress = true;

        (async () => {
          try {
            const selector = 'button[data-bs-target="#turnstileModal"]';
            const btn = document.querySelector(selector);
            if (!btn) {
              console.warn('[FastMode] No Next button visible (Page 1).');
              return;
            }

            // Force the click in Fast Mode
            let ok = await clickNextButtonPage1(true);
            if (!ok) {
              const enabled = await waitForButtonEnabled(selector, 2500);
              if (enabled) ok = await clickNextButtonPage1(true);
            }

            if (ok) {
              chrome.runtime.sendMessage({ action: 'pauseRefreshingForBooking' });
              console.log('[CS] [FastMode] Clicked Next. Waiting for Page 2...');
              observeChanges();
            } else {
              console.warn('[FastMode] Click did not succeed; not pausing refresh/observing.');
            }
          } catch (e) {
            console.error('[FastMode] click error', e);
          } finally {
            setTimeout(() => { window.__fastModeInProgress = false; }, 1500);
          }
        })();
        break;
      }

      default:
        // no-op; keep room for future actions
        break;
    }
  });

  const parkFacilitiesMap = {
    garibaldi: ['Cheakamus', 'Diamond Head', 'Rubble Creek'],
    golden_ears: ['Alouette Lake Boat Launch Parking', 'Alouette Lake South Beach Day-Use Parking Lot', 'Gold Creek Parking Lot', 'West Canyon Trailhead Parking Lot'],
    joffre_lakes: ['Joffre Lakes']
  };

async function waitForNgswJson(config, parkKey, timeout = 10000) {
  const numPasses = parkFacilitiesMap[parkKey]?.length ?? 0;

  if (Number(config.passTypeNum) !== numPasses) {
    console.log('[CS] Skipping waitForNgswJson - passTypeNum ' + config.passTypeNum + ' !== number of passes ' + numPasses);
    return Promise.resolve();
  }

  console.log('[CS] ngsw.json observed but no longer blocks page 1.');
  return Promise.resolve();
}

const monthNamesToNum = {
    January: '01',
    February: '02',
    March: '03',
    April: '04',
    May: '05',
    June: '06',
    July: '07',
    August: '08',
    September: '09',
    October: '10',
    November: '11',
    December: '12'
  };

  async function runScript() {
    if (window.__bookingRunStarted) {
      console.log('[CS] runScript already started; skipping duplicate init.');
      return;
    }
    window.__bookingRunStarted = true;

    // Reset single-run latch on every run (important for SPA reloads)
    window.__bookingComplete = false;

    console.log('Waiting for page to load...');
    await new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve);
      }
    });

    window.__bookingStartTime = performance.now();
    console.log('Starting script...');

    attachNextButtonTimer();
    clearPage2SubmitTimer();
    window.__page2SubmitReady = false;

    const config = await loadConfigOnce();
    window.__manualMode = !!config.manualMode;
    window.__fastMode   = !!config.fastMode;

    const { bookingPhase: storedBookingPhase = BOOKING_PHASES.IDLE } = await new Promise((resolve) => {
      chrome.storage.local.get({ bookingPhase: BOOKING_PHASES.IDLE }, resolve);
    });
    window.__bookingPhase = normalizeBookingPhase(storedBookingPhase);

    const bookingPhase = getBookingPhase();
    const bookingPhaseActive = isBookingPhaseActive(bookingPhase);

    if (!window.__manualMode) {
      if (bookingPhaseActive) {
        watchSoldOutToast();
        watchStaleAppToast();
      } else {
        console.log(`[PrimerGate] Watchers skipped until booking phase (phase=${bookingPhase}).`);
      }
    } else {
      console.log('[ManualMode] Watchers disabled (no pause/refresh messages will be sent).');
    }

    window.__lastAttemptedPassCount = parseInt(config.numberOfPasses, 10) || 1;
    // await waitForUpdateCheckComplete(1000);  // disabled temporarily to remove the page-1 delay
    await waitForPage1ControlsReady(config, 6000);

    const monthNum = monthNamesToNum[config.monthName];
    if (!monthNum) {
      throw new Error(`Invalid month name in config: ${config.monthName}`);
    }

    await setDateValue(`${config.year}-${monthNum}-${String(config.dateNum).padStart(2, '0')}`, { nudge: true, settleMs: config.park === 'joffre_lakes' ? 125 : 100 });
    await selectPassType();
    await selectBookingTime();
    console.log(config.park);

    const latestBookingPhase = await readBookingPhase();
    window.__bookingPhase = latestBookingPhase;


    if (config.park === 'joffre_lakes') {
      const originalDesired = config.numberOfPasses;

      await selectNumberOfPasses(String(originalDesired));

      if (isPrimerPhase(latestBookingPhase)) {
        if (window.__fastMode && !window.isRetryMode) {
          chrome.runtime.sendMessage({ action: 'fastModePrimed' });
        }
        console.log(`[PrimerGate] Primer phase active; page prefilled but not clicking Next (phase=${latestBookingPhase}).`);
        return;
      }


      if (window.__manualMode || (window.__fastMode && !window.isRetryMode)) {
        console.log('[Guard] Joffre: prefilled Page 1. Not clicking Next (Manual/Fast).');
        chrome.runtime.sendMessage({ action: 'fastModePrimed' });
        return;
      }

      if (window.isRetryMode) {
        const success = await tryBookingWithRetry(originalDesired);
        if (!success) {
          console.log('Retry booking attempts failed.');
          return;
        }
        // If success, proceed to post-click logic below
      } else {
        const clicked = await clickNextButtonPage1();
        if (!clicked) {
          console.log('Failed to click Next button - it may still be disabled. Aborting run.');
          return;
        }
      }

      // Only now do the post-click logic
      if (window.isRetryMode || window.isAutoBookingMode) {
        chrome.runtime.sendMessage({ action: 'resetBookingComplete' });
      }

      chrome.runtime.sendMessage({ action: 'pauseRefreshingForBooking' });
      console.log('[CS] AClicked Next. On Page 2. Pausing refresh.');
      console.log('Waiting for Page 2 to load...');
      observeChanges();

    } else {
      // For other parks, just click next once and if clicked do post-click logic
      if (window.__manualMode || (window.__fastMode && !window.isRetryMode)) {
        console.log('[Guard] Other park: prefilled Page 1. Not clicking Next (Manual/Fast).');
        chrome.runtime.sendMessage({ action: 'fastModePrimed' });
        return;
      }

      const clicked = await clickNextButtonPage1();
      if (!clicked) {
        console.log('Failed to click Next button on Page 1 for other park - aborting.');
        return;
      }

      if (window.isRetryMode || window.isAutoBookingMode) {
        chrome.runtime.sendMessage({ action: 'resetBookingComplete' });
      }
      chrome.runtime.sendMessage({ action: 'pauseRefreshingForBooking' });
      console.log('[CS] BClicked Next. On Page 2. Pausing refresh.');
      console.log('Waiting for Page 2 to load...');
      observeChanges();
    }
  }
  runScript();
})();







