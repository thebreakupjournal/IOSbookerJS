(() => {
  const root = window.BCParkTool = window.BCParkTool || {};

  const PARKS = Object.freeze({
    garibaldi: {
      label: "Garibaldi",
      passes: Object.freeze([
        { value: "1", label: "Cheakamus - Parking", times: Object.freeze(["AM", "PM"]) },
        { value: "2", label: "Diamond Head - Parking", times: Object.freeze(["DAY"]) },
        { value: "3", label: "Rubble Creek - Parking", times: Object.freeze(["DAY"]) }
      ])
    },
    golden_ears: {
      label: "Golden Ears",
      passes: Object.freeze([
        { value: "1", label: "Alouette Lake Boat Launch - Parking", times: Object.freeze(["DAY"]) },
        { value: "2", label: "Alouette Lake South Beach - Parking", times: Object.freeze(["AM", "PM"]) },
        { value: "3", label: "Gold Creek - Parking", times: Object.freeze(["AM", "PM"]) },
        { value: "4", label: "West Canyon Trailhead - Parking", times: Object.freeze(["AM", "PM"]) }
      ])
    },
    joffre_lakes: {
      label: "Joffre Lakes",
      passes: Object.freeze([
        { value: "1", label: "Joffre Lakes - Trail", times: Object.freeze(["DAY"]) }
      ])
    }
  });

  const STORAGE_KEYS = Object.freeze({
    clockState: "bcParkTool.clockState",
    bookingConfig: "bcParkTool.bookingConfig",
    scheduleConfig: "bcParkTool.scheduleConfig",
    turnstileRuns: "parkPassTurnstileRuns"
  });

  const SELECTORS = Object.freeze({
    visitDate: "#visitDate",
    passType: "#passType",
    visitTimePrefix: "input#visitTime",
    passCount: "select#passCount",
    nextButton: 'button[data-bs-target="#turnstileModal"]',
    turnstileComplete: "#firstName",
    page2FirstName: "#firstName",
    page2LastName: "#lastName",
    page2Email: "#email",
    page2EmailCheck: "#emailCheck",
    page2Country: 'select#country, select[formcontrolname="country"]',
    page2AgreeLabelText: "I have read and agree to the above notice",
    page2SubmitButton: "button.btn.btn-primary"
  });

  const TIME_ZONE = "America/Los_Angeles";

  const DEFAULT_BOOKING_CONFIG = Object.freeze({
    park: "garibaldi",
    passTypeNum: "1",
    passLabel: "Cheakamus - Parking",
    visitTime: "AM",
    numberOfPasses: "4",
    firstName: "",
    lastName: "",
    email: "",
    countryOfResidence: "Canada",
    testing: false
  });

  const DEFAULT_SCHEDULE_CONFIG = Object.freeze({
    releaseTime: "07:00:00",
    leadSeconds: "1.500",
    page2SubmitDelayMs: 30000
  });

  const CLOCK_CONSTANTS = Object.freeze({
    syncIntervalMs: 15000,
    tickIntervalMs: 33,
    syncTimeoutMs: 1800,
    rAFLeadMs: 150
  });

  const HUD_CONSTANTS = Object.freeze({
    dragThresholdPx: 10
  });

  root.constants = Object.freeze({
    PARKS,
    STORAGE_KEYS,
    SELECTORS,
    TIME_ZONE,
    DEFAULT_BOOKING_CONFIG,
    DEFAULT_SCHEDULE_CONFIG,
    CLOCK_CONSTANTS,
    HUD_CONSTANTS
  });
})();
