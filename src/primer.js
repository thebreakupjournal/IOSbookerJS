(() => {
  const root = window.BCParkTool = window.BCParkTool || {};
  const { PARKS, SELECTORS, DEFAULT_BOOKING_CONFIG, DEFAULT_SCHEDULE_CONFIG } = root.constants;
  const { COUNTRY_OPTIONS } = root.countries;
  const {
    wait,
    createElement,
    waitForElement,
    waitForVisibleElement,
    setNativeValue,
    dispatchFormEvents
  } = root.dom;
  const {
    normalizeBookingConfig,
    normalizeScheduleConfig,
    writeBookingConfig,
    writeScheduleConfig,
    readBookingConfig,
    readScheduleConfig,
    readTurnstileRuns,
    writeTurnstileRuns,
    appendTurnstileRun,
    clearTurnstileRuns
  } = root.storage;
  const { createPage2Automation } = root.page2;

  function getPassOptions(parkKey) {
    return PARKS[parkKey]?.passes || PARKS[DEFAULT_BOOKING_CONFIG.park].passes;
  }

  function getPassByValue(parkKey, passTypeNum) {
    const passes = getPassOptions(parkKey);
    const requested = String(passTypeNum || "").trim();
    return passes.find((pass) => pass.value === requested) || passes[0];
  }

  function getVisitTimeOptions(parkKey, passTypeNum) {
    const pass = getPassByValue(parkKey, passTypeNum);
    return pass?.times || ["DAY"];
  }

  async function setDateValue(dateString) {
    const dateInput = await waitForElement(SELECTORS.visitDate, 5000);
    if (!dateInput) {
      throw new Error("Booking date control not found.");
    }
    setNativeValue(dateInput, dateString);
    dispatchFormEvents(dateInput);
    await wait(50);
    if (dateInput.value !== dateString) {
      throw new Error("Unable to set the booking date.");
    }
    return true;
  }

  async function selectPassType(passTypeNum) {
    const dropdown = await waitForElement(SELECTORS.passType, 5000);
    if (!dropdown) {
      throw new Error("Pass type control not found.");
    }

    const targetValue = `${String(passTypeNum).trim()}: Object`;
    const targetOption = Array.from(dropdown.options || []).find((option) => String(option.value || "").trim() === targetValue);
    if (!targetOption) {
      throw new Error(`Pass type option not found: ${targetValue}`);
    }

    setNativeValue(dropdown, targetValue);
    if (typeof targetOption.index === "number") {
      dropdown.selectedIndex = targetOption.index;
    }
    dispatchFormEvents(dropdown);
    await wait(50);

    if (String(dropdown.value || "").trim() !== targetValue) {
      throw new Error("Unable to set the pass type.");
    }

    return targetOption;
  }

  async function selectVisitTime(visitTime) {
    const normalized = String(visitTime || "").trim();
    const selector = `${SELECTORS.visitTimePrefix}${normalized}`;
    const radio = await waitForVisibleElement(selector, 6000);
    if (!radio) {
      throw new Error(`Visit time control not found: ${selector}`);
    }
    if (radio.disabled) {
      throw new Error(`Visit time control is disabled: ${selector}`);
    }

    radio.click();
    await wait(25);

    const liveRadio = document.querySelector(selector);
    if (!liveRadio || !liveRadio.checked) {
      throw new Error(`Unable to select visit time: ${normalized}`);
    }

    return true;
  }

  async function selectPassCount(numberOfPasses) {
    const normalized = String(numberOfPasses || "").trim();
    const select = await waitForElement(SELECTORS.passCount, 6000);
    if (!select) {
      throw new Error("Number of passes control not found.");
    }

    const match = Array.from(select.options || []).find((option) => {
      const value = String(option.value || "").trim();
      const text = String(option.textContent || "").trim();
      return value === normalized || text === normalized;
    });

    if (!match) {
      throw new Error(`Number of passes option not found: ${normalized}`);
    }

    const finalValue = String(match.value || normalized).trim() || normalized;
    setNativeValue(select, finalValue);
    if (typeof match.index === "number") {
      select.selectedIndex = match.index;
    }
    dispatchFormEvents(select);
    await wait(100);

    const liveSelect = document.querySelector(SELECTORS.passCount);
    if (!liveSelect || String(liveSelect.value || "").trim() !== finalValue) {
      throw new Error("Unable to set number of passes.");
    }

    return true;
  }

  async function waitForBookingPageControls(config) {
    const timeoutMs = 6000;
    const deadline = Date.now() + timeoutMs;
    const targetPassValue = `${config.passTypeNum}: Object`;

    while (Date.now() < deadline) {
      const dateInput = document.querySelector(SELECTORS.visitDate);
      const passTypeSelect = document.querySelector(SELECTORS.passType);
      const dateReady = !!dateInput && !dateInput.disabled;
      const passTypeReady = !!passTypeSelect && Array.from(passTypeSelect.options || []).some((option) => String(option.value || "").trim() === targetPassValue);

      if (dateReady && passTypeReady) {
        return true;
      }

      await wait(75);
    }

    throw new Error("Booking page controls did not fully hydrate in time.");
  }

  async function waitForNextButtonReady(timeoutMs = 6000) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const nextButton = document.querySelector(SELECTORS.nextButton);
      if (nextButton && !nextButton.disabled) {
        return nextButton;
      }

      await wait(75);
    }

    throw new Error("Next button did not become ready in time.");
  }

  async function primeBooking(config, { requireNextButton = false } = {}) {
    const normalized = normalizeBookingConfig(config);
    console.log("[BCParkTool][primer] Priming booking", {
      park: normalized.park,
      passTypeNum: normalized.passTypeNum,
      visitTime: normalized.visitTime,
      numberOfPasses: normalized.numberOfPasses
    });

    await waitForBookingPageControls(normalized);
    await setDateValue(normalized.date);
    await selectPassType(normalized.passTypeNum);
    await selectVisitTime(normalized.visitTime);

    if (normalized.park === "joffre_lakes") {
      await selectPassCount(normalized.numberOfPasses);
    }

    if (requireNextButton) {
      await waitForNextButtonReady();
    }

    return normalized;
  }

  function createPrimerModal({
    clockService,
    hud,
    scheduler,
    onArm
  }) {
    const rootEl = document.getElementById("bc-park-tool-root");
    if (!rootEl) {
      throw new Error("App root not found.");
    }

    const backdrop = createElement("div", { className: "bc-park-tool-modal-backdrop" });
    const modal = createElement("div", { className: "bc-park-tool-modal" });
    const header = createElement("div", { className: "bc-park-tool-modal-header" });
    const titleWrap = createElement("div", {});
    const title = createElement("h2", { textContent: "Prime Booking" });
    const subtitle = createElement("div", {
      className: "bc-park-tool-note",
      textContent: "Fill Page 1 now, and optionally arm the Next click."
    });
    const dismissButton = createElement("button", {
      className: "bc-park-tool-button secondary",
      attrs: { type: "button" },
      textContent: "Dismiss"
    });
    const body = createElement("div", { className: "bc-park-tool-modal-body" });
    const tabs = createElement("div", { className: "bc-park-tool-tabs" });
    const bookingTabButton = createElement("button", {
      className: "bc-park-tool-tab",
      attrs: { type: "button" },
      textContent: "Booking"
    });
    const timingsTabButton = createElement("button", {
      className: "bc-park-tool-tab",
      attrs: { type: "button" },
      textContent: "Timings"
    });
    const bookingPanel = createElement("div", { className: "bc-park-tool-tab-panel" });
    const timingsPanel = createElement("div", { className: "bc-park-tool-tab-panel" });
    const form = createElement("div", { className: "bc-park-tool-form" });
    const bookingSection = createElement("section", { className: "bc-park-tool-section" });
    const bookingSectionHead = createElement("div", { className: "bc-park-tool-section-head" });
    const bookingSectionTitle = createElement("div", { className: "bc-park-tool-section-title", textContent: "Booking" });
    const bookingSectionCopy = createElement("div", {
      className: "bc-park-tool-section-copy",
      textContent: "Choose the booking date, park, pass and visit time."
    });
    const bookingSectionBody = createElement("div", { className: "bc-park-tool-section-body" });
    const scheduleSection = createElement("section", { className: "bc-park-tool-section" });
    const scheduleSectionHead = createElement("div", { className: "bc-park-tool-section-head" });
    const scheduleSectionTitle = createElement("div", { className: "bc-park-tool-section-title", textContent: "Schedule" });
    const scheduleSectionCopy = createElement("div", {
      className: "bc-park-tool-section-copy",
      textContent: "Set the release time, lead seconds, and Page 2 settle delay."
    });
    const scheduleSectionBody = createElement("div", { className: "bc-park-tool-section-body" });
    const bookingGrid = createElement("div", { className: "bc-park-tool-grid" });
    const scheduleGrid = createElement("div", { className: "bc-park-tool-grid" });
    const page2Section = createElement("section", { className: "bc-park-tool-section" });
    const page2SectionHead = createElement("div", { className: "bc-park-tool-section-head" });
    const page2SectionTitle = createElement("div", { className: "bc-park-tool-section-title", textContent: "Page 2" });
    const page2SectionCopy = createElement("div", {
      className: "bc-park-tool-section-copy",
      textContent: "Fill the traveler details after Next and wait for the token to settle."
    });
    const page2SectionBody = createElement("div", { className: "bc-park-tool-section-body" });
    const page2Grid = createElement("div", { className: "bc-park-tool-grid" });
    const bookingDateField = createElement("label", { className: "bc-park-tool-field" });
    const parkField = createElement("label", { className: "bc-park-tool-field" });
    const passField = createElement("label", { className: "bc-park-tool-field" });
    const visitField = createElement("label", { className: "bc-park-tool-field" });
    const firstNameField = createElement("label", { className: "bc-park-tool-field" });
    const lastNameField = createElement("label", { className: "bc-park-tool-field" });
    const emailField = createElement("label", { className: "bc-park-tool-field" });
    const countryField = createElement("label", { className: "bc-park-tool-field" });
    const releaseField = createElement("label", { className: "bc-park-tool-field" });
    const leadField = createElement("label", { className: "bc-park-tool-field" });
    const page2DelayField = createElement("label", { className: "bc-park-tool-field" });
    const passCountWrapper = createElement("div", { className: "bc-park-tool-field" });
    const preview = createElement("div", { className: "bc-park-tool-preview" });
    const previewLabel = createElement("div", { className: "preview-label", textContent: "Estimated click time" });
    const previewTime = createElement("div", { className: "preview-time" });
    const previewError = createElement("div", { className: "preview-error" });
    const timingSummary = createElement("div", { className: "bc-park-tool-timing-summary" });
    const timingNote = createElement("div", {
      className: "bc-park-tool-note",
      textContent: "Run Test to capture timing samples from Next click to the first booking field."
    });
    const timingActions = createElement("div", { className: "bc-park-tool-timing-actions" });
    const timingCopyButton = createElement("button", {
      className: "bc-park-tool-button secondary",
      attrs: { type: "button" },
      textContent: "Copy results"
    });
    const timingClearButton = createElement("button", {
      className: "bc-park-tool-button secondary",
      attrs: { type: "button" },
      textContent: "Clear all"
    });
    const timingList = createElement("div", { className: "bc-park-tool-timing-list" });
    const timingEmpty = createElement("div", {
      className: "bc-park-tool-timing-empty",
      textContent: "No runs saved yet."
    });
    const errorBanner = createElement("div", { className: "bc-park-tool-error-banner" });
    const warning = createElement("div", {
      className: "bc-park-tool-note warn",
      textContent: "Keep Safari visible and prevent the phone from locking."
    });
    const actions = createElement("div", { className: "bc-park-tool-modal-actions" });
    const testButton = createElement("button", {
      className: "bc-park-tool-button secondary",
      attrs: { type: "button" },
      textContent: "Test"
    });
    const primeOnlyButton = createElement("button", {
      className: "bc-park-tool-button secondary",
      attrs: { type: "button" },
      textContent: "Prime only"
    });
    const primeArmButton = createElement("button", {
      className: "bc-park-tool-button primary",
      attrs: { type: "button" },
      textContent: "Prime / arm"
    });

    const state = {
      booking: readBookingConfig(),
      schedule: readScheduleConfig(),
      activeTab: "booking",
      open: false,
      busy: false
    };
    const page2Automation = createPage2Automation({ logger: console });

    function freshBookingState() {
      return normalizeBookingConfig({
        ...readBookingConfig()
      });
    }

    function iconMarkup(kind) {
      if (kind === "check") {
        return `
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M6.6 10.5 3.9 7.8a1 1 0 1 1 1.4-1.4l1.3 1.3 4-4a1 1 0 1 1 1.4 1.4L8 11a1 1 0 0 1-1.4 0Z" fill="currentColor"/>
          </svg>
        `;
      }

      if (kind === "clock") {
        return `
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M8 1.5a6.5 6.5 0 1 0 6.5 6.5A6.51 6.51 0 0 0 8 1.5Zm.75 3.25a.75.75 0 0 0-1.5 0v3.03c0 .2.08.39.22.53l1.92 1.92a.75.75 0 1 0 1.06-1.06L8.75 8.47Z" fill="currentColor"/>
          </svg>
        `;
      }

      return "";
    }

    function setButtonContent(button, text, iconKind = "") {
      button.replaceChildren();
      if (iconKind) {
        button.append(
          createElement("span", {
            className: "bc-park-tool-button-icon",
            attrs: { "aria-hidden": "true" },
            html: iconMarkup(iconKind)
          })
        );
      }
      button.append(createElement("span", { className: "bc-park-tool-button-label", textContent: text }));
    }

    function setActiveTab(nextTab) {
      state.activeTab = nextTab === "timings" ? "timings" : "booking";
      bookingTabButton.classList.toggle("is-active", state.activeTab === "booking");
      timingsTabButton.classList.toggle("is-active", state.activeTab === "timings");
      bookingPanel.hidden = state.activeTab !== "booking";
      timingsPanel.hidden = state.activeTab !== "timings";
      if (state.activeTab === "timings") {
        renderTimingPanel();
      }
    }

    function summarizeTimingRuns(runs) {
      const values = runs.map((run) => run.ms).filter((value) => Number.isFinite(value));
      const average = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted.length
        ? (sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2))
        : null;
      const fastest = values.length ? Math.min(...values) : null;
      const slowest = values.length ? Math.max(...values) : null;

      return {
        count: runs.length,
        average,
        median,
        fastest,
        slowest
      };
    }

    function formatTimingValue(value) {
      return Number.isFinite(value) ? `${Math.round(value)} ms` : "—";
    }

    function formatTimingTimestamp(ts) {
      const date = new Date(ts);
      return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Unknown time";
    }

    function buildTimingReport(runs) {
      const summary = summarizeTimingRuns(runs);
      return [
        "Turnstile timing results",
        `Runs: ${summary.count}`,
        `Average: ${formatTimingValue(summary.average)}`,
        `Median: ${formatTimingValue(summary.median)}`,
        `Fastest: ${formatTimingValue(summary.fastest)}`,
        `Slowest: ${formatTimingValue(summary.slowest)}`,
        "",
        ...runs.map((run, index) => `${index + 1}. ${formatTimingValue(run.ms)} - ${formatTimingTimestamp(run.ts)}`)
      ].join("\n");
    }

    function renderTimingPanel() {
      const runs = readTurnstileRuns();
      const summary = summarizeTimingRuns(runs);
      const metrics = [
        ["Average", summary.average],
        ["Median", summary.median],
        ["Fastest", summary.fastest],
        ["Slowest", summary.slowest]
      ];

      timingSummary.replaceChildren(
        ...metrics.map(([label, value]) => createElement("div", { className: "bc-park-tool-metric" }, [
          createElement("div", { className: "bc-park-tool-metric-label", textContent: label }),
          createElement("div", { className: "bc-park-tool-metric-value", textContent: formatTimingValue(value) }),
          createElement("div", { className: "bc-park-tool-metric-meta", textContent: `${summary.count} saved run${summary.count === 1 ? "" : "s"}` })
        ]))
      );

      timingList.replaceChildren();
      if (!runs.length) {
        timingList.append(timingEmpty);
      } else {
        for (const run of [...runs].reverse()) {
          const deleteButton = createElement("button", {
            className: "bc-park-tool-button danger",
            attrs: { type: "button" },
            textContent: "Delete"
          });
          const row = createElement("div", { className: "bc-park-tool-timing-row" }, [
            createElement("div", { className: "bc-park-tool-timing-row-main" }, [
              createElement("strong", { textContent: formatTimingValue(run.ms) }),
              createElement("time", { textContent: formatTimingTimestamp(run.ts) })
            ]),
            deleteButton
          ]);

          deleteButton.addEventListener("click", () => {
            const nextRuns = readTurnstileRuns().filter((item) => item.id !== run.id);
            writeTurnstileRuns(nextRuns);
            renderTimingPanel();
          });

          timingList.append(row);
        }
      }

      timingCopyButton.disabled = state.busy || !runs.length;
      timingClearButton.disabled = state.busy || !runs.length;
    }

    function copyTimingResults() {
      const runs = readTurnstileRuns();
      const text = buildTimingReport(runs);
      if (!runs.length) {
        return Promise.resolve();
      }
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        return navigator.clipboard.writeText(text).then(() => {
          setButtonContent(timingCopyButton, "Copied");
          window.setTimeout(() => {
            setButtonContent(timingCopyButton, "Copy results");
          }, 1200);
        }).catch(() => {
          window.prompt("Copy results", text);
        });
      }
      window.prompt("Copy results", text);
      return Promise.resolve();
    }

    async function runTurnstileTimingTest(nextButton) {
      if (document.querySelector(SELECTORS.turnstileComplete)) {
        return { skipped: true };
      }
      if (!nextButton) {
        throw new Error("Next button not found.");
      }
      if (nextButton.disabled) {
        throw new Error("Next button is disabled.");
      }

      const completionSelector = SELECTORS.turnstileComplete;
      const start = performance.now();
      let done = false;

      return await new Promise((resolve, reject) => {
        const cleanup = () => {
          observer.disconnect();
          clearInterval(intervalId);
          clearTimeout(timeoutId);
        };

        const finish = () => {
          if (done || !document.querySelector(completionSelector)) {
            return;
          }
          done = true;
          cleanup();
          resolve({
            ms: Math.round(performance.now() - start)
          });
        };

        const observer = new MutationObserver(finish);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        const intervalId = setInterval(finish, 50);
        const timeoutId = setTimeout(() => {
          if (!done) {
            cleanup();
            reject(new Error("Timing test timed out."));
          }
        }, 30000);

        try {
          nextButton.click();
        } catch (error) {
          cleanup();
          reject(new Error(`Next button click failed: ${error.message || String(error)}`));
          return;
        }

        finish();
      });
    }

    function syncStateFromInputs() {
      const dateInput = bookingDateField.querySelector("input");
      const parkSelect = parkField.querySelector("select");
      const passSelect = passField.querySelector("select");
      const visitSelect = visitField.querySelector("select");
      const firstNameInput = page2Section.querySelector('input[data-field="firstName"]');
      const lastNameInput = page2Section.querySelector('input[data-field="lastName"]');
      const emailInput = page2Section.querySelector('input[data-field="email"]');
      const countrySelect = page2Section.querySelector('select[data-field="countryOfResidence"]');
      const countSelect = passCountWrapper.querySelector("select");
      const releaseTimeInput = releaseField.querySelector('input[type="time"]');
      const releaseSecondsSelect = releaseField.querySelector('select[data-release-part="seconds"]');
      const leadInput = leadField.querySelector("input");
      const page2DelayInput = page2DelayField.querySelector("input");

      const park = parkSelect?.value || DEFAULT_BOOKING_CONFIG.park;
      const pass = getPassByValue(park, passSelect?.value?.split(":")[0] || state.booking.passTypeNum);
      const visitTime = visitSelect?.value || pass?.times?.[0] || "DAY";
      const booking = normalizeBookingConfig({
        date: dateInput?.value || state.booking.date,
        park,
        passTypeNum: pass?.value || state.booking.passTypeNum,
        passLabel: pass?.label || state.booking.passLabel,
        visitTime,
        numberOfPasses: countSelect?.value || state.booking.numberOfPasses,
        firstName: firstNameInput?.value ?? state.booking.firstName,
        lastName: lastNameInput?.value ?? state.booking.lastName,
        email: emailInput?.value ?? state.booking.email,
        countryOfResidence: countrySelect?.value ?? state.booking.countryOfResidence,
        testing: state.booking.testing
      });
      const schedule = normalizeScheduleConfig({
        releaseTime: composeReleaseTime(releaseTimeInput?.value, releaseSecondsSelect?.value),
        leadSeconds: leadInput?.value || state.schedule.leadSeconds,
        page2SubmitDelayMs: page2DelayInput?.value ?? state.schedule.page2SubmitDelayMs
      });

      state.booking = booking;
      state.schedule = schedule;
      return { booking, schedule };
    }

    function persistState() {
      writeBookingConfig(state.booking);
      writeScheduleConfig(state.schedule);
    }

    function setBusy(nextBusy) {
      state.busy = !!nextBusy;
      testButton.disabled = state.busy;
      primeOnlyButton.disabled = state.busy;
      primeArmButton.disabled = state.busy;
      dismissButton.disabled = state.busy;
      bookingTabButton.disabled = state.busy;
      timingsTabButton.disabled = state.busy;
      timingCopyButton.disabled = state.busy || !readTurnstileRuns().length;
      timingClearButton.disabled = state.busy || !readTurnstileRuns().length;
    }

    function resetActionButtons() {
      setButtonContent(testButton, "Test");
      testButton.classList.remove("is-success");
      setButtonContent(primeOnlyButton, "Prime only");
      primeOnlyButton.classList.remove("is-success");
      setButtonContent(primeArmButton, "Prime / arm");
      primeArmButton.classList.remove("is-success");
    }

    function setError(message) {
      if (!message) {
        errorBanner.classList.remove("is-visible");
        errorBanner.textContent = "";
        return;
      }
      errorBanner.classList.add("is-visible");
      errorBanner.textContent = message;
    }

    function setModalVisible(nextVisible) {
      state.open = Boolean(nextVisible);
      backdrop.hidden = !state.open;
      document.body.style.overflow = state.open ? "hidden" : "";
    }

    function buildParkSelect() {
      const select = createElement("select");
      for (const [parkKey, parkDef] of Object.entries(PARKS)) {
        select.append(
          createElement("option", {
            attrs: { value: parkKey },
            textContent: parkDef.label
          })
        );
      }
      return select;
    }

    function buildPassSelect(parkKey, passTypeNum) {
      const select = createElement("select");
      for (const pass of getPassOptions(parkKey)) {
        select.append(
          createElement("option", {
            attrs: { value: pass.value },
            textContent: pass.label
          })
        );
      }
      const desired = getPassByValue(parkKey, passTypeNum);
      select.value = desired.value;
      return select;
    }

    function buildVisitTimeSelect(parkKey, passTypeNum, visitTime) {
      const select = createElement("select");
      const options = getVisitTimeOptions(parkKey, passTypeNum);
      for (const time of options) {
        select.append(
          createElement("option", {
            attrs: { value: time },
            textContent: time
          })
        );
      }
      select.value = options.includes(visitTime) ? visitTime : options[0];
      return select;
    }

    function buildCountSelect(numberOfPasses) {
      const select = createElement("select");
      for (const value of ["1", "2", "3", "4"]) {
        select.append(
          createElement("option", {
            attrs: { value },
            textContent: value
          })
        );
      }
      select.value = ["1", "2", "3", "4"].includes(numberOfPasses) ? numberOfPasses : "4";
      return select;
    }

    function buildCountrySelect(countryOfResidence) {
      const select = createElement("select", {
        attrs: { "data-field": "countryOfResidence" }
      });
      select.append(
        createElement("option", {
          attrs: { value: "", disabled: true },
          textContent: "Select a country"
        })
      );
      for (const country of COUNTRY_OPTIONS) {
        select.append(
          createElement("option", {
            attrs: { value: country },
            textContent: country
          })
        );
      }

      const normalized = COUNTRY_OPTIONS.includes(countryOfResidence) ? countryOfResidence : "Canada";
      select.value = normalized;
      return select;
    }

    function pad2(value) {
      return String(value).padStart(2, "0");
    }

    function splitReleaseTime(releaseTime) {
      const match = /^\s*(\d{2}):(\d{2}):(\d{2})\s*$/.exec(String(releaseTime || ""));
      if (!match) {
        return { timePart: "07:00", secondsPart: "00" };
      }

      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      if (
        !Number.isInteger(hours) ||
        !Number.isInteger(minutes) ||
        !Number.isInteger(seconds) ||
        hours < 0 || hours > 23 ||
        minutes < 0 || minutes > 59 ||
        seconds < 0 || seconds > 59
      ) {
        return { timePart: "07:00", secondsPart: "00" };
      }

      return {
        timePart: `${pad2(hours)}:${pad2(minutes)}`,
        secondsPart: pad2(seconds)
      };
    }

    function composeReleaseTime(timePart, secondsPart) {
      const timeMatch = /^\s*(\d{2}):(\d{2})(?::(\d{2}))?\s*$/.exec(String(timePart || ""));
      const secondsMatch = /^\s*(\d{2})\s*$/.exec(String(secondsPart || ""));
      if (!timeMatch || !secondsMatch) {
        return "07:00:00";
      }

      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);
      const seconds = Number.isInteger(Number(timeMatch[3])) ? Number(timeMatch[3]) : Number(secondsMatch[1]);
      if (
        !Number.isInteger(hours) ||
        !Number.isInteger(minutes) ||
        !Number.isInteger(seconds) ||
        hours < 0 || hours > 23 ||
        minutes < 0 || minutes > 59 ||
        seconds < 0 || seconds > 59
      ) {
        return "07:00:00";
      }

      return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
    }

    function buildReleaseTimeInput(timePart) {
      const input = createElement("input", {
        attrs: {
          type: "time",
          step: "60",
          autocomplete: "off",
          spellcheck: "false",
          inputmode: "numeric",
          title: "Choose the release time"
        }
      });
      input.value = /^\d{2}:\d{2}$/.test(timePart) ? timePart : "07:00";
      return input;
    }

    function buildReleaseSecondsSelect(secondsPart) {
      const select = createElement("select", { attrs: { "data-release-part": "seconds" } });
      for (let second = 0; second < 60; second += 1) {
        const value = pad2(second);
        select.append(
          createElement("option", {
            attrs: { value },
            textContent: value
          })
        );
      }
      select.value = /^\d{2}$/.test(secondsPart) ? secondsPart : "00";
      return select;
    }

    function renderPreview() {
      const { schedule } = syncStateFromInputs();
      try {
        const nowMs = clockService.getNowMs();
        const releaseMs = clockService.buildZonedTimestampForToday(schedule.releaseTime, nowMs);
        const leadSeconds = Number(schedule.leadSeconds);

        if (releaseMs == null) {
          throw new Error("Release time must use HH:MM:SS.");
        }
        if (!Number.isFinite(leadSeconds) || leadSeconds < 0) {
          throw new Error("Lead seconds must be a positive number.");
        }
        if (releaseMs <= nowMs) {
          throw new Error("Release time has already passed today.");
        }

        const clickMs = releaseMs - leadSeconds * 1000;
        if (clickMs <= nowMs) {
          throw new Error("The calculated click time has already passed.");
        }

        previewTime.textContent = clockService.formatClockTime(clickMs);
        previewError.textContent = "";
        preview.classList.remove("preview-error");
      } catch (error) {
        previewTime.textContent = "Unavailable";
        previewError.textContent = error.message || String(error);
        preview.classList.add("preview-error");
      }
    }

    function renderBookingFields() {
      const booking = freshBookingState();
      state.booking = booking;
      state.schedule = normalizeScheduleConfig(readScheduleConfig());
      const releaseParts = splitReleaseTime(state.schedule.releaseTime);

      const bookingDateInput = createElement("input", {
        attrs: { type: "date" }
      });
      bookingDateInput.value = booking.date;

      const parkSelect = buildParkSelect();
      parkSelect.value = booking.park;

      const passSelect = buildPassSelect(booking.park, booking.passTypeNum);
      const visitTimeSelect = buildVisitTimeSelect(booking.park, booking.passTypeNum, booking.visitTime);

      const countSelect = buildCountSelect(booking.numberOfPasses);
      const firstNameInput = createElement("input", {
        attrs: {
          type: "text",
          autocomplete: "given-name",
          spellcheck: "false",
          "data-field": "firstName"
        }
      });
      firstNameInput.value = booking.firstName || "";

      const lastNameInput = createElement("input", {
        attrs: {
          type: "text",
          autocomplete: "family-name",
          spellcheck: "false",
          "data-field": "lastName"
        }
      });
      lastNameInput.value = booking.lastName || "";

      const emailInput = createElement("input", {
        attrs: {
          type: "email",
          autocomplete: "email",
          spellcheck: "false",
          inputmode: "email",
          "data-field": "email"
        }
      });
      emailInput.value = booking.email || "";

      const countrySelect = buildCountrySelect(booking.countryOfResidence);

      const releaseTimeInput = buildReleaseTimeInput(releaseParts.timePart);
      const releaseSecondsSelect = buildReleaseSecondsSelect(releaseParts.secondsPart);
      const releaseTimeRow = createElement("div", { className: "bc-park-tool-inline" });

      const leadInput = createElement("input", {
        attrs: { type: "number", min: "0", step: "0.001", inputmode: "decimal" }
      });
      leadInput.value = state.schedule.leadSeconds;

      const page2DelayInput = createElement("input", {
        attrs: {
          type: "number",
          min: "0",
          step: "100",
          inputmode: "numeric",
          "data-field": "page2SubmitDelayMs"
        }
      });
      page2DelayInput.value = String(Number.isFinite(state.schedule.page2SubmitDelayMs) ? state.schedule.page2SubmitDelayMs : 10000);
      page2DelayField.replaceChildren(
        createElement("span", { textContent: "Page 2 settle delay (ms)" }),
        page2DelayInput
      );

      bookingDateField.replaceChildren(
        createElement("span", { textContent: "Booking date" }),
        bookingDateInput
      );
      parkField.replaceChildren(
        createElement("span", { textContent: "Park" }),
        parkSelect
      );
      passField.replaceChildren(
        createElement("span", { textContent: "Pass / trailhead" }),
        passSelect
      );
      visitField.replaceChildren(
        createElement("span", { textContent: "Visit time" }),
        visitTimeSelect
      );
      passCountWrapper.replaceChildren(
        createElement("span", { textContent: "Number of passes" }),
        countSelect
      );
      firstNameField.replaceChildren(
        createElement("span", { textContent: "First name" }),
        firstNameInput
      );
      lastNameField.replaceChildren(
        createElement("span", { textContent: "Last name" }),
        lastNameInput
      );
      emailField.replaceChildren(
        createElement("span", { textContent: "Email" }),
        emailInput
      );
      countryField.replaceChildren(
        createElement("span", { textContent: "Country of residence" }),
        countrySelect
      );
      releaseTimeRow.replaceChildren(releaseTimeInput, releaseSecondsSelect);
      releaseField.replaceChildren(
        createElement("span", { textContent: "Release time" }),
        releaseTimeRow
      );
      leadField.replaceChildren(
        createElement("span", { textContent: "Lead seconds" }),
        leadInput
      );

      bookingGrid.replaceChildren(
        bookingDateField,
        parkField,
        passField,
        visitField,
        passCountWrapper
      );

      page2Grid.replaceChildren(
        firstNameField,
        lastNameField,
        emailField,
        countryField
      );

      scheduleGrid.replaceChildren(
        releaseField,
        leadField
      );

      const passOptions = getPassOptions(booking.park);
      passSelect.replaceChildren(
        ...passOptions.map((pass) => createElement("option", {
          attrs: { value: pass.value },
          textContent: pass.label
        }))
      );
      passSelect.value = getPassByValue(booking.park, booking.passTypeNum).value;

      const visitOptions = getVisitTimeOptions(booking.park, passSelect.value);
      visitTimeSelect.replaceChildren(
        ...visitOptions.map((visitTime) => createElement("option", {
          attrs: { value: visitTime },
          textContent: visitTime
        }))
      );
      visitTimeSelect.value = visitOptions.includes(booking.visitTime) ? booking.visitTime : visitOptions[0];

      countSelect.value = booking.numberOfPasses;
      passCountWrapper.hidden = booking.park !== "joffre_lakes";

      state.booking = normalizeBookingConfig({
        ...state.booking,
        date: bookingDateInput.value,
        park: parkSelect.value,
        passTypeNum: passSelect.value,
        passLabel: getPassByValue(parkSelect.value, passSelect.value).label,
        visitTime: visitTimeSelect.value,
        numberOfPasses: countSelect.value,
        firstName: firstNameInput.value,
        lastName: lastNameInput.value,
        email: emailInput.value,
        countryOfResidence: countrySelect.value,
        testing: state.booking.testing
      });
      state.schedule = normalizeScheduleConfig({
        releaseTime: composeReleaseTime(releaseTimeInput.value, releaseSecondsSelect.value),
        leadSeconds: leadInput.value,
        page2SubmitDelayMs: page2DelayInput.value
      });

      const inputs = [
        bookingDateInput,
        parkSelect,
        passSelect,
        visitTimeSelect,
        countSelect,
        firstNameInput,
        lastNameInput,
        emailInput,
        countrySelect,
        releaseTimeInput,
        releaseSecondsSelect,
        leadInput,
        page2DelayInput
      ];
      for (const input of inputs) {
        input.addEventListener("input", onFieldChange);
        input.addEventListener("change", onFieldChange);
      }

      parkSelect.addEventListener("change", () => {
        const updatedPass = getPassByValue(parkSelect.value, passSelect.value);
        passSelect.replaceChildren(
          ...getPassOptions(parkSelect.value).map((pass) => createElement("option", {
            attrs: { value: pass.value },
            textContent: pass.label
          }))
        );
        passSelect.value = updatedPass.value;

        const visitOptionsNext = getVisitTimeOptions(parkSelect.value, passSelect.value);
        visitTimeSelect.replaceChildren(
          ...visitOptionsNext.map((visitTime) => createElement("option", {
            attrs: { value: visitTime },
            textContent: visitTime
          }))
        );
        visitTimeSelect.value = visitOptionsNext[0];
        passCountWrapper.hidden = parkSelect.value !== "joffre_lakes";
        if (parkSelect.value === "joffre_lakes") {
          countSelect.value = "4";
        }
        syncStateFromInputs();
        persistState();
        renderPreview();
      });

      passSelect.addEventListener("change", () => {
        const visitOptionsNext = getVisitTimeOptions(parkSelect.value, passSelect.value);
        visitTimeSelect.replaceChildren(
          ...visitOptionsNext.map((visitTime) => createElement("option", {
            attrs: { value: visitTime },
            textContent: visitTime
          }))
        );
        visitTimeSelect.value = visitOptionsNext.includes(visitTimeSelect.value) ? visitTimeSelect.value : visitOptionsNext[0];
        syncStateFromInputs();
        persistState();
        renderPreview();
      });

      visitTimeSelect.addEventListener("change", () => {
        syncStateFromInputs();
        persistState();
        renderPreview();
      });

      countSelect.addEventListener("change", () => {
        syncStateFromInputs();
        persistState();
        renderPreview();
      });

      bookingDateInput.addEventListener("change", () => {
        syncStateFromInputs();
        renderPreview();
      });

      releaseTimeInput.addEventListener("change", () => {
        syncStateFromInputs();
        persistState();
        renderPreview();
      });

      releaseSecondsSelect.addEventListener("change", () => {
        syncStateFromInputs();
        persistState();
        renderPreview();
      });

      leadInput.addEventListener("change", () => {
        syncStateFromInputs();
        persistState();
        renderPreview();
      });

    }

    function onFieldChange() {
      syncStateFromInputs();
      renderPreview();
    }

    async function handlePrimeOnly() {
      try {
        setError("");
        setBusy(true);
        page2Automation.stop();
        syncStateFromInputs();
        persistState();
        await primeBooking(state.booking, { requireNextButton: false });
        page2Automation.start({
          booking: state.booking,
          schedule: state.schedule
        });
        hud.setScheduleState({
          status: "primed",
          nextClickMs: null,
          releaseMs: null,
          leadSeconds: null,
          schedulerErrorMs: null,
          message: "Primed",
          detail: "Page 1 is filled and ready."
        });
        setButtonContent(primeOnlyButton, "Primed", "check");
        primeOnlyButton.classList.add("is-success");
        hud.minimize();
        await wait(450);
        setModalVisible(false);
      } catch (error) {
        page2Automation.stop();
        const message = error.stack || error.message || String(error);
        console.error("[BCParkTool][primer] Prime Only failed", error);
        setError(message);
      } finally {
        setBusy(false);
      }
    }

    async function handleTest() {
      try {
        setError("");
        setBusy(true);
        page2Automation.stop();
        syncStateFromInputs();
        persistState();
        await primeBooking(state.booking, { requireNextButton: true });
        setActiveTab("timings");

        const nextButton = document.querySelector(SELECTORS.nextButton);
        if (!nextButton) {
          throw new Error("Next button not found.");
        }

        hud.minimize();
        setModalVisible(false);

        const result = await runTurnstileTimingTest(nextButton);
        if (result.skipped) {
          setActiveTab("timings");
          renderTimingPanel();
          return;
        }

        appendTurnstileRun({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          ms: result.ms,
          ts: Date.now()
        });

        setButtonContent(testButton, "Tested", "check");
        testButton.classList.add("is-success");
        setActiveTab("timings");
        renderTimingPanel();
      } catch (error) {
        page2Automation.stop();
        const message = error.stack || error.message || String(error);
        console.error("[BCParkTool][primer] Test failed", error);
        setModalVisible(true);
        setActiveTab("timings");
        setError(message);
      } finally {
        setBusy(false);
      }
    }

    async function handlePrimeAndArm() {
      try {
        setError("");
        setBusy(true);
        page2Automation.stop();
        syncStateFromInputs();
        persistState();
        await primeBooking(state.booking, { requireNextButton: true });
        page2Automation.start({
          booking: state.booking,
          schedule: state.schedule
        });
        if (typeof onArm === "function") {
          await onArm({
            booking: state.booking,
            schedule: state.schedule
          });
        }
        setButtonContent(primeArmButton, "Armed", "clock");
        primeArmButton.classList.add("is-success");
        hud.minimize();
        await wait(450);
        setModalVisible(false);
      } catch (error) {
        page2Automation.stop();
        const message = error.stack || error.message || String(error);
        console.error("[BCParkTool][primer] Prime & Arm failed", error);
        setError(message);
      } finally {
        setBusy(false);
      }
    }

    function open() {
      page2Automation.stop();
      state.booking = freshBookingState();
      state.schedule = normalizeScheduleConfig(readScheduleConfig());
      resetActionButtons();
      hud.minimize();
      setModalVisible(true);
      renderBookingFields();
      renderPreview();
      renderTimingPanel();
      setActiveTab(state.activeTab);
      setError("");
      setBusy(false);
    }

    function close() {
      setModalVisible(false);
    }

    dismissButton.addEventListener("click", close);
    testButton.addEventListener("click", handleTest);
    primeOnlyButton.addEventListener("click", handlePrimeOnly);
    primeArmButton.addEventListener("click", handlePrimeAndArm);
    bookingTabButton.addEventListener("click", () => setActiveTab("booking"));
    timingsTabButton.addEventListener("click", () => setActiveTab("timings"));
    timingCopyButton.addEventListener("click", () => {
      copyTimingResults();
    });
    timingClearButton.addEventListener("click", () => {
      if (readTurnstileRuns().length === 0) {
        return;
      }
      if (window.confirm("Delete every saved timing run?")) {
        clearTurnstileRuns();
        renderTimingPanel();
      }
    });

    titleWrap.append(title, subtitle);
    header.append(titleWrap, dismissButton);
    tabs.append(bookingTabButton, timingsTabButton);
    actions.append(testButton, primeOnlyButton, primeArmButton);

    preview.append(previewLabel, previewTime, previewError);

    bookingSectionHead.append(bookingSectionTitle, bookingSectionCopy);
    bookingSectionBody.append(bookingGrid);
    bookingSection.append(bookingSectionHead, bookingSectionBody);

    page2SectionHead.append(page2SectionTitle, page2SectionCopy);
    page2SectionBody.append(page2Grid);
    page2Section.append(page2SectionHead, page2SectionBody);

    scheduleSectionHead.append(scheduleSectionTitle, scheduleSectionCopy);
    scheduleSectionBody.append(scheduleGrid, page2DelayField);
    scheduleSection.append(scheduleSectionHead, scheduleSectionBody);

    timingActions.append(timingCopyButton, timingClearButton);
    timingsPanel.append(timingSummary, timingNote, timingList, timingActions);

    bookingPanel.append(
      form,
      errorBanner,
      preview,
      warning,
      actions
    );

    form.append(
      bookingSection,
      page2Section,
      scheduleSection,
      createElement("div", {
        className: "bc-park-tool-note",
        textContent: "Scheduled click time is calculated as release time minus the lead seconds. Same-day only."
      })
    );

    body.append(tabs, bookingPanel, timingsPanel);

    modal.append(header, body);
    backdrop.appendChild(modal);
    backdrop.hidden = true;
    rootEl.appendChild(backdrop);

    clockService.subscribe(() => {
      if (state.open) {
        renderPreview();
      }
    });

    return {
      open,
      close,
      root: backdrop,
      primeBooking,
      getState() {
        return {
          booking: state.booking,
          schedule: state.schedule
        };
      }
    };
  }

  root.primer = Object.freeze({
    createPrimerModal,
    primeBooking,
    waitForElement,
    setNativeValue,
    selectPassType,
    selectVisitTime,
    selectPassCount
  });
})();
