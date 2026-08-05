(() => {
  const root = window.BCParkTool = window.BCParkTool || {};
  const { PARKS, SELECTORS, DEFAULT_BOOKING_CONFIG, DEFAULT_SCHEDULE_CONFIG } = root.constants;
  const {
    wait,
    createElement,
    waitForElement,
    waitForVisibleElement,
    setNativeValue,
    dispatchFormEvents
  } = root.dom;
  const { normalizeBookingConfig, normalizeScheduleConfig, writeBookingConfig, writeScheduleConfig, readBookingConfig, readScheduleConfig } = root.storage;

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
      textContent: "Set the release time and lead seconds for the Next click."
    });
    const scheduleSectionBody = createElement("div", { className: "bc-park-tool-section-body" });
    const bookingGrid = createElement("div", { className: "bc-park-tool-grid" });
    const scheduleGrid = createElement("div", { className: "bc-park-tool-grid" });
    const bookingDateField = createElement("label", { className: "bc-park-tool-field" });
    const parkField = createElement("label", { className: "bc-park-tool-field" });
    const passField = createElement("label", { className: "bc-park-tool-field" });
    const visitField = createElement("label", { className: "bc-park-tool-field" });
    const releaseField = createElement("label", { className: "bc-park-tool-field" });
    const leadField = createElement("label", { className: "bc-park-tool-field" });
    const passCountWrapper = createElement("div", { className: "bc-park-tool-field" });
    const preview = createElement("div", { className: "bc-park-tool-preview" });
    const previewLabel = createElement("div", { className: "preview-label", textContent: "Estimated click time" });
    const previewTime = createElement("div", { className: "preview-time" });
    const previewError = createElement("div", { className: "preview-error" });
    const errorBanner = createElement("div", { className: "bc-park-tool-error-banner" });
    const warning = createElement("div", {
      className: "bc-park-tool-note warn",
      textContent: "Keep Safari visible and prevent the phone from locking."
    });
    const actions = createElement("div", { className: "bc-park-tool-modal-actions" });
    const primeOnlyButton = createElement("button", {
      className: "bc-park-tool-button secondary",
      attrs: { type: "button" },
      textContent: "Prime only"
    });
    const primeArmButton = createElement("button", {
      className: "bc-park-tool-button primary",
      attrs: { type: "button" },
      textContent: "Prime and arm"
    });

    const state = {
      booking: readBookingConfig(),
      schedule: readScheduleConfig(),
      open: false,
      busy: false
    };

    function freshBookingState() {
      return normalizeBookingConfig({
        ...readBookingConfig()
      });
    }

    function syncStateFromInputs() {
      const dateInput = bookingDateField.querySelector("input");
      const parkSelect = parkField.querySelector("select");
      const passSelect = passField.querySelector("select");
      const visitSelect = visitField.querySelector("select");
      const countSelect = passCountWrapper.querySelector("select");
      const releaseTimeInput = releaseField.querySelector('input[type="time"]');
      const releaseSecondsSelect = releaseField.querySelector('select[data-release-part="seconds"]');
      const leadInput = leadField.querySelector("input");

      const park = parkSelect?.value || DEFAULT_BOOKING_CONFIG.park;
      const pass = getPassByValue(park, passSelect?.value?.split(":")[0] || state.booking.passTypeNum);
      const visitTime = visitSelect?.value || pass?.times?.[0] || "DAY";
      const booking = normalizeBookingConfig({
        date: dateInput?.value || state.booking.date,
        park,
        passTypeNum: pass?.value || state.booking.passTypeNum,
        passLabel: pass?.label || state.booking.passLabel,
        visitTime,
        numberOfPasses: countSelect?.value || state.booking.numberOfPasses
      });
      const schedule = normalizeScheduleConfig({
        releaseTime: composeReleaseTime(releaseTimeInput?.value, releaseSecondsSelect?.value),
        leadSeconds: leadInput?.value || state.schedule.leadSeconds
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
      primeOnlyButton.disabled = state.busy;
      primeArmButton.disabled = state.busy;
      dismissButton.disabled = state.busy;
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

      const releaseTimeInput = buildReleaseTimeInput(releaseParts.timePart);
      const releaseSecondsSelect = buildReleaseSecondsSelect(releaseParts.secondsPart);
      const releaseTimeRow = createElement("div", { className: "bc-park-tool-inline" });

      const leadInput = createElement("input", {
        attrs: { type: "number", min: "0", step: "0.001", inputmode: "decimal" }
      });
      leadInput.value = state.schedule.leadSeconds;

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
        numberOfPasses: countSelect.value
      });
      state.schedule = normalizeScheduleConfig({
        releaseTime: composeReleaseTime(releaseTimeInput.value, releaseSecondsSelect.value),
        leadSeconds: leadInput.value
      });

      const inputs = [bookingDateInput, parkSelect, passSelect, visitTimeSelect, countSelect, releaseTimeInput, releaseSecondsSelect, leadInput];
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
        syncStateFromInputs();
        persistState();
        await primeBooking(state.booking, { requireNextButton: false });
      } catch (error) {
        const message = error.stack || error.message || String(error);
        console.error("[BCParkTool][primer] Prime Only failed", error);
        setError(message);
      } finally {
        setBusy(false);
      }
    }

    async function handlePrimeAndArm() {
      try {
        setError("");
        setBusy(true);
        syncStateFromInputs();
        persistState();
        await primeBooking(state.booking, { requireNextButton: true });
        if (typeof onArm === "function") {
          await onArm({
            booking: state.booking,
            schedule: state.schedule
          });
        }
        setModalVisible(false);
        hud.expand();
      } catch (error) {
        const message = error.stack || error.message || String(error);
        console.error("[BCParkTool][primer] Prime & Arm failed", error);
        setError(message);
      } finally {
        setBusy(false);
      }
    }

    function open() {
      state.booking = freshBookingState();
      state.schedule = normalizeScheduleConfig(readScheduleConfig());
      setModalVisible(true);
      renderBookingFields();
      renderPreview();
      setError("");
      setBusy(false);
      const initialInput = bookingDateField.querySelector("input") || leadField.querySelector("input");
      if (initialInput) {
        initialInput.focus();
      }
    }

    function close() {
      setModalVisible(false);
    }

    dismissButton.addEventListener("click", close);
    primeOnlyButton.addEventListener("click", handlePrimeOnly);
    primeArmButton.addEventListener("click", handlePrimeAndArm);

    titleWrap.append(title, subtitle);
    header.append(titleWrap, dismissButton);
    actions.append(primeOnlyButton, primeArmButton);

    preview.append(previewLabel, previewTime, previewError);

    bookingSectionHead.append(bookingSectionTitle, bookingSectionCopy);
    bookingSectionBody.append(bookingGrid);
    bookingSection.append(bookingSectionHead, bookingSectionBody);

    scheduleSectionHead.append(scheduleSectionTitle, scheduleSectionCopy);
    scheduleSectionBody.append(scheduleGrid);
    scheduleSection.append(scheduleSectionHead, scheduleSectionBody);

    body.append(
      form,
      errorBanner,
      preview,
      warning,
      actions
    );

    form.append(
      bookingSection,
      scheduleSection,
      createElement("div", {
        className: "bc-park-tool-note",
        textContent: "Scheduled click time is calculated as release time minus the lead seconds. Same-day only."
      })
    );

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
