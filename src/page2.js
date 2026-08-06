(() => {
  const root = window.BCParkTool = window.BCParkTool || {};
  const { SELECTORS } = root.constants;
  const {
    wait,
    waitForElement,
    setNativeValue,
    dispatchFormEvents
  } = root.dom;

  function findAgreeCheckbox() {
    return Array.from(document.querySelectorAll("label"))
      .find((label) => String(label.textContent || "").includes(SELECTORS.page2AgreeLabelText))
      ?.querySelector('input[type="checkbox"]');
  }

  async function clickAgreeCheckbox(timeoutMs = 10000) {
    console.log('[BCParkTool][page2] Waiting for "Read and Agree" checkbox to appear...');
    const deadline = Date.now() + timeoutMs;
    let checkbox = null;

    while (Date.now() < deadline) {
      checkbox = findAgreeCheckbox();
      if (checkbox) {
        break;
      }
      await wait(100);
    }

    if (!checkbox) {
      console.warn("[BCParkTool][page2] Read and Agree checkbox was not found.");
      return false;
    }

    if (!checkbox.checked) {
      console.log("[BCParkTool][page2] Read and Agree checkbox found, checking...");
      checkbox.click();
      await wait(50);
    }

    return true;
  }

  async function waitForSelectOption(selectElement, targetValue, timeout = 5000) {
    const normalizedTarget = String(targetValue || "").trim();
    if (!selectElement || !normalizedTarget) {
      return null;
    }

    const start = Date.now();
    while (Date.now() - start < timeout) {
      const liveSelect = document.querySelector(SELECTORS.page2Country) || selectElement;
      const options = Array.from(liveSelect.options || []);
      const match = options.find((opt) => {
        const value = String(opt.value || "").trim();
        const text = String(opt.textContent || "").trim();
        return value === normalizedTarget || text === normalizedTarget;
      });

      if (match) {
        return { select: liveSelect, option: match };
      }

      await wait(100);
    }

    return null;
  }

  async function selectCountryOfResidence(countrySelector, targetCountry, timeout = 10000) {
    const normalizedTarget = String(targetCountry || "").trim() || "Canada";
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
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
      if (typeof option.index === "number") {
        selectEl.selectedIndex = option.index;
      }

      selectEl.focus();
      selectEl.dispatchEvent(new Event("input", { bubbles: true }));
      selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      selectEl.dispatchEvent(new Event("blur", { bubbles: true }));

      await wait(250);

      const liveSelect = document.querySelector(countrySelector);
      if (liveSelect && liveSelect.value === finalValue) {
        return { ok: true, value: liveSelect.value, index: liveSelect.selectedIndex };
      }

      await wait(200);
    }

    const finalSelect = document.querySelector(countrySelector);
    return {
      ok: !!finalSelect && String(finalSelect.value || "").trim() === normalizedTarget,
      value: finalSelect?.value || "",
      index: finalSelect?.selectedIndex ?? -1
    };
  }

  async function clickNextButtonPage2(timeout = 5000) {
    console.log("[BCParkTool][page2] Waiting for Next button on Page 2 to appear...");
    const nextButton = await waitForElement(SELECTORS.page2SubmitButton, timeout);
    if (!nextButton) {
      return false;
    }

    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const liveButton = document.querySelector(SELECTORS.page2SubmitButton);
      if (liveButton && !liveButton.disabled) {
        try {
          console.log("[BCParkTool][page2] Next button found on Page 2, clicking...");
          liveButton.click();
          return true;
        } catch (error) {
          console.warn("[BCParkTool][page2] Page 2 Next click failed:", error);
          return false;
        }
      }

      await wait(75);
    }

    return false;
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

  function createPage2Automation({ logger = console } = {}) {
    let observer = null;
    let settleTimerId = null;
    let activeConfig = null;
    let handled = false;
    let processing = false;

    function log(...args) {
      logger.log(...args);
    }

    function warn(...args) {
      logger.warn(...args);
    }

    function clearPage2SubmitTimer() {
      if (settleTimerId) {
        clearTimeout(settleTimerId);
        settleTimerId = null;
      }
    }

    function clearObserver() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }

    function clearState() {
      clearPage2SubmitTimer();
      clearObserver();
      activeConfig = null;
      handled = false;
      processing = false;
    }

    function schedulePage2Submit(delayMs) {
      clearPage2SubmitTimer();
      const normalizedDelay = Number.isFinite(Number(delayMs)) ? Math.max(0, Math.round(Number(delayMs))) : 10000;
      log(`[BCParkTool][page2] Scheduling Page 2 Next click in ${normalizedDelay}ms to let the token settle...`);
      settleTimerId = setTimeout(async () => {
        settleTimerId = null;
        const clicked = await submitPage2AfterSettle();
        if (!clicked) {
          warn("[BCParkTool][page2] Page 2 Next was not clicked after settle attempts. The reservation may time out.");
        }
      }, normalizedDelay);
    }

    async function fillPage2Fields(booking = {}) {
      const firstName = String(booking.firstName || "").trim();
      const lastName = String(booking.lastName || "").trim();
      const email = String(booking.email || "").trim();
      const countryOfResidence = String(booking.countryOfResidence || booking.country || "Canada").trim() || "Canada";

      const firstNameElement = await waitForElement(SELECTORS.page2FirstName, 10000);
      const lastNameElement = await waitForElement(SELECTORS.page2LastName, 10000);
      const emailElement = await waitForElement(SELECTORS.page2Email, 10000);
      const emailCheckElement = await waitForElement(SELECTORS.page2EmailCheck, 10000);
      const countryElement = await waitForElement(SELECTORS.page2Country, 10000);

      if (firstNameElement && lastNameElement && emailElement && emailCheckElement) {
        log("[BCParkTool][page2] Form fields found on Page 2, filling in...");
        firstNameElement.value = firstName;
        lastNameElement.value = lastName;
        emailElement.value = email;
        emailCheckElement.value = email;

        firstNameElement.dispatchEvent(new Event("input", { bubbles: true }));
        lastNameElement.dispatchEvent(new Event("input", { bubbles: true }));
        emailElement.dispatchEvent(new Event("input", { bubbles: true }));
        emailCheckElement.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        warn("[BCParkTool][page2] One or more Page 2 text inputs were not found.");
      }

      if (countryElement) {
        const result = await selectCountryOfResidence(SELECTORS.page2Country, countryOfResidence, 10000);
        if (result.ok) {
          log(`[BCParkTool][page2] Country of residence selected: ${result.value || countryOfResidence}`);
        } else {
          warn(`[BCParkTool][page2] Country of residence selection may not have stuck. Current value="${result.value || "blank"}", expected="${countryOfResidence}"`);
        }
      } else {
        warn("[BCParkTool][page2] Country of residence select not found after waiting.");
      }
    }

    async function processPage2IfPresent() {
      if (!activeConfig || handled || processing) {
        return;
      }

      if (!document.querySelector(SELECTORS.page2FirstName)) {
        return;
      }

      processing = true;
      try {
        const booking = activeConfig.booking || {};
        const schedule = activeConfig.schedule || {};
        await fillPage2Fields(booking);
        await clickAgreeCheckbox();

        if (!booking.testing) {
          const settleDelay = Number.isFinite(schedule.page2SubmitDelayMs)
            ? Math.max(0, Math.round(schedule.page2SubmitDelayMs))
            : 10000;
          schedulePage2Submit(settleDelay);
        } else {
          log("[BCParkTool][page2] Testing mode enabled; skipping Submit click.");
        }

        handled = true;
      } catch (error) {
        warn("[BCParkTool][page2] Page 2 automation failed:", error);
        handled = true;
      } finally {
        processing = false;
      }
    }

    function start(config = {}) {
      clearState();
      activeConfig = {
        booking: { ...(config.booking || {}) },
        schedule: { ...(config.schedule || {}) }
      };

      observer = new MutationObserver(() => {
        void processPage2IfPresent();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      void processPage2IfPresent();
    }

    function stop() {
      clearState();
    }

    return Object.freeze({
      start,
      stop,
      processPage2IfPresent
    });
  }

  root.page2 = Object.freeze({
    createPage2Automation
  });
})();
