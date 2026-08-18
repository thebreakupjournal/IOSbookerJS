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
    leadSeconds: "4.000",
    page2SubmitDelayMs: 10000
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
(() => {
  const root = window.BCParkTool = window.BCParkTool || {};

  const COUNTRY_OPTIONS = Object.freeze([
    "Afghanistan",
    "Albania",
    "Algeria",
    "Andorra",
    "Angola",
    "Antigua and Barbuda",
    "Argentina",
    "Armenia",
    "Australia",
    "Austria",
    "Azerbaijan",
    "Bahamas",
    "Bahrain",
    "Bangladesh",
    "Barbados",
    "Belarus",
    "Belgium",
    "Belize",
    "Benin",
    "Bhutan",
    "Bolivia",
    "Bosnia and Herzegovina",
    "Botswana",
    "Brazil",
    "Brunei",
    "Bulgaria",
    "Burkina Faso",
    "Burundi",
    "Cabo Verde",
    "Cambodia",
    "Cameroon",
    "Canada",
    "Central African Republic",
    "Chad",
    "Chile",
    "China",
    "Colombia",
    "Comoros",
    "Congo",
    "Congo (Democratic Republic)",
    "Costa Rica",
    "Cote d'Ivoire",
    "Croatia",
    "Cuba",
    "Cyprus",
    "Czechia",
    "Denmark",
    "Djibouti",
    "Dominica",
    "Dominican Republic",
    "Ecuador",
    "Egypt",
    "El Salvador",
    "Equatorial Guinea",
    "Eritrea",
    "Estonia",
    "Eswatini",
    "Ethiopia",
    "Fiji",
    "Finland",
    "France",
    "Gabon",
    "Gambia",
    "Georgia",
    "Germany",
    "Ghana",
    "Greece",
    "Grenada",
    "Guatemala",
    "Guinea",
    "Guinea-Bissau",
    "Guyana",
    "Haiti",
    "Honduras",
    "Hungary",
    "Iceland",
    "India",
    "Indonesia",
    "Iran",
    "Iraq",
    "Ireland",
    "Israel",
    "Italy",
    "Jamaica",
    "Japan",
    "Jordan",
    "Kazakhstan",
    "Kenya",
    "Kiribati",
    "Kosovo",
    "Kuwait",
    "Kyrgyzstan",
    "Laos",
    "Latvia",
    "Lebanon",
    "Lesotho",
    "Liberia",
    "Libya",
    "Liechtenstein",
    "Lithuania",
    "Luxembourg",
    "Madagascar",
    "Malawi",
    "Malaysia",
    "Maldives",
    "Mali",
    "Malta",
    "Marshall Islands",
    "Mauritania",
    "Mauritius",
    "Mexico",
    "Micronesia",
    "Moldova",
    "Monaco",
    "Mongolia",
    "Montenegro",
    "Morocco",
    "Mozambique",
    "Myanmar",
    "Namibia",
    "Nauru",
    "Nepal",
    "Netherlands",
    "New Zealand",
    "Nicaragua",
    "Niger",
    "Nigeria",
    "North Korea",
    "North Macedonia",
    "Norway",
    "Oman",
    "Pakistan",
    "Palau",
    "Palestine",
    "Panama",
    "Papua New Guinea",
    "Paraguay",
    "Peru",
    "Philippines",
    "Poland",
    "Portugal",
    "Qatar",
    "Romania",
    "Russia",
    "Rwanda",
    "Saint Kitts and Nevis",
    "Saint Lucia",
    "Saint Vincent and the Grenadines",
    "Samoa",
    "San Marino",
    "Sao Tome and Principe",
    "Saudi Arabia",
    "Senegal",
    "Serbia",
    "Seychelles",
    "Sierra Leone",
    "Singapore",
    "Slovakia",
    "Slovenia",
    "Solomon Islands",
    "Somalia",
    "South Africa",
    "South Korea",
    "South Sudan",
    "Spain",
    "Sri Lanka",
    "Sudan",
    "Suriname",
    "Sweden",
    "Switzerland",
    "Syria",
    "Taiwan",
    "Tajikistan",
    "Tanzania",
    "Thailand",
    "Timor-Leste",
    "Togo",
    "Tonga",
    "Trinidad and Tobago",
    "Tunisia",
    "Turkey",
    "Turkmenistan",
    "Tuvalu",
    "Uganda",
    "Ukraine",
    "United Arab Emirates",
    "United Kingdom",
    "United States",
    "Uruguay",
    "Uzbekistan",
    "Vanuatu",
    "Vatican City",
    "Venezuela",
    "Vietnam",
    "Yemen",
    "Zambia",
    "Zimbabwe"
  ]);

  root.countries = Object.freeze({
    COUNTRY_OPTIONS
  });
})();
(() => {
  const root = window.BCParkTool = window.BCParkTool || {};
  const { STORAGE_KEYS, DEFAULT_BOOKING_CONFIG, DEFAULT_SCHEDULE_CONFIG, PARKS } = root.constants;
  const COUNTRY_OPTIONS = root.countries?.COUNTRY_OPTIONS || [];

  const memoryFallback = new Map();

  function warn(...args) {
    console.warn("[BCParkTool][storage]", ...args);
  }

  function getStorageBackend() {
    try {
      const probeKey = "__bcParkToolProbe__";
      window.localStorage.setItem(probeKey, "1");
      window.localStorage.removeItem(probeKey);
      return {
        getItem(key) {
          return window.localStorage.getItem(key);
        },
        setItem(key, value) {
          window.localStorage.setItem(key, value);
        },
        removeItem(key) {
          window.localStorage.removeItem(key);
        }
      };
    } catch (error) {
      warn("localStorage unavailable, using memory fallback:", error);
      return {
        getItem(key) {
          return memoryFallback.has(key) ? memoryFallback.get(key) : null;
        },
        setItem(key, value) {
          memoryFallback.set(key, value);
        },
        removeItem(key) {
          memoryFallback.delete(key);
        }
      };
    }
  }

  const backend = getStorageBackend();

  function readJson(key, fallback) {
    try {
      const raw = backend.getItem(key);
      if (raw == null || raw === "") {
        return fallback;
      }
      return JSON.parse(raw);
    } catch (error) {
      warn(`Failed to read ${key}:`, error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      backend.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      warn(`Failed to write ${key}:`, error);
      return false;
    }
  }

  function todayPlusDaysIso(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function cloneDefaultBookingConfig() {
    return {
      ...DEFAULT_BOOKING_CONFIG,
      date: todayPlusDaysIso(2)
    };
  }

  function isKnownPark(park) {
    return Object.prototype.hasOwnProperty.call(PARKS, park);
  }

  function normalizeBookingConfig(input = {}) {
    const fallback = cloneDefaultBookingConfig();
    const park = isKnownPark(input.park) ? input.park : fallback.park;
    const parkDef = PARKS[park] || PARKS[DEFAULT_BOOKING_CONFIG.park];
    const requestedPass = String(input.passTypeNum || fallback.passTypeNum).trim();
    const pass = parkDef.passes.find((item) => item.value === requestedPass) || parkDef.passes[0];
    const allowedTimes = pass ? pass.times : ["DAY"];
    const requestedTime = String(input.visitTime || fallback.visitTime).trim();
    const visitTime = allowedTimes.includes(requestedTime) ? requestedTime : allowedTimes[0];
    const numberOfPasses = String(input.numberOfPasses || fallback.numberOfPasses || "4").trim() || "4";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(input.date || "")) ? String(input.date).trim() : fallback.date;
    const firstName = String(input.firstName ?? fallback.firstName ?? "").trim();
    const lastName = String(input.lastName ?? fallback.lastName ?? "").trim();
    const email = String(input.email ?? fallback.email ?? "").trim();
    const requestedCountry = String(input.countryOfResidence || input.country || fallback.countryOfResidence || "Canada").trim() || "Canada";
    const countryOfResidence = COUNTRY_OPTIONS.includes(requestedCountry) ? requestedCountry : fallback.countryOfResidence || "Canada";
    const testing = !!input.testing;

    return {
      ...fallback,
      ...input,
      date,
      park,
      passTypeNum: pass ? String(pass.value) : fallback.passTypeNum,
      passLabel: pass ? pass.label : fallback.passLabel,
      visitTime,
      numberOfPasses,
      firstName,
      lastName,
      email,
      countryOfResidence,
      testing
    };
  }

  function normalizeScheduleConfig(input = {}) {
    const rawDelay = input.page2SubmitDelayMs;
    const page2SubmitDelayMs = rawDelay === "" || rawDelay == null
      ? DEFAULT_SCHEDULE_CONFIG.page2SubmitDelayMs
      : Number.isFinite(Number(rawDelay))
        ? Math.max(0, Math.round(Number(rawDelay)))
        : DEFAULT_SCHEDULE_CONFIG.page2SubmitDelayMs;

    return {
      ...DEFAULT_SCHEDULE_CONFIG,
      ...input,
      releaseTime: String(input.releaseTime || DEFAULT_SCHEDULE_CONFIG.releaseTime).trim(),
      leadSeconds: String(input.leadSeconds ?? DEFAULT_SCHEDULE_CONFIG.leadSeconds).trim() || DEFAULT_SCHEDULE_CONFIG.leadSeconds,
      page2SubmitDelayMs
    };
  }

  function normalizeTurnstileRun(input = {}) {
    const ms = Number(input.ms);
    const ts = Number(input.ts);
    if (!Number.isFinite(ms) || ms < 0) {
      return null;
    }
    return {
      id: String(input.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      ms: Math.round(ms),
      ts: Number.isFinite(ts) ? Math.round(ts) : Date.now()
    };
  }

  function normalizeTurnstileRuns(input = []) {
    if (!Array.isArray(input)) {
      return [];
    }
    return input.map(normalizeTurnstileRun).filter(Boolean).slice(-100);
  }

  function normalizeClockState(input = {}) {
    const x = typeof input.x === "number" && Number.isFinite(input.x) ? input.x : null;
    const y = typeof input.y === "number" && Number.isFinite(input.y) ? input.y : null;
    return {
      x,
      y,
      minimized: !!input.minimized
    };
  }

  function readClockState() {
    return normalizeClockState(readJson(STORAGE_KEYS.clockState, {}));
  }

  function writeClockState(state) {
    return writeJson(STORAGE_KEYS.clockState, normalizeClockState(state));
  }

  function readBookingConfig() {
    return normalizeBookingConfig(readJson(STORAGE_KEYS.bookingConfig, {}));
  }

  function writeBookingConfig(config) {
    const normalized = normalizeBookingConfig(config);
    const storageValue = {
      date: normalized.date,
      park: normalized.park,
      passTypeNum: normalized.passTypeNum,
      passLabel: normalized.passLabel,
      visitTime: normalized.visitTime,
      numberOfPasses: normalized.numberOfPasses,
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      email: normalized.email,
      countryOfResidence: normalized.countryOfResidence,
      testing: normalized.testing
    };
    return writeJson(STORAGE_KEYS.bookingConfig, storageValue);
  }

  function readScheduleConfig() {
    return normalizeScheduleConfig(readJson(STORAGE_KEYS.scheduleConfig, {}));
  }

  function writeScheduleConfig(config) {
    return writeJson(STORAGE_KEYS.scheduleConfig, normalizeScheduleConfig(config));
  }

  function readTurnstileRuns() {
    return normalizeTurnstileRuns(readJson(STORAGE_KEYS.turnstileRuns, []));
  }

  function writeTurnstileRuns(runs) {
    return writeJson(STORAGE_KEYS.turnstileRuns, normalizeTurnstileRuns(runs));
  }

  function appendTurnstileRun(run) {
    const runs = readTurnstileRuns();
    runs.push(normalizeTurnstileRun(run));
    return writeTurnstileRuns(runs);
  }

  function clearTurnstileRuns() {
    return writeTurnstileRuns([]);
  }

  function resetScheduleConfig() {
    return writeScheduleConfig(DEFAULT_SCHEDULE_CONFIG);
  }

  root.storage = Object.freeze({
    readClockState,
    writeClockState,
    readBookingConfig,
    writeBookingConfig,
    readScheduleConfig,
    writeScheduleConfig,
    resetScheduleConfig,
    normalizeBookingConfig,
    normalizeScheduleConfig,
    normalizeClockState,
    readTurnstileRuns,
    writeTurnstileRuns,
    appendTurnstileRun,
    clearTurnstileRuns,
    normalizeTurnstileRun,
    normalizeTurnstileRuns
  });
})();
(() => {
  const root = window.BCParkTool = window.BCParkTool || {};

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function createElement(tagName, options = {}, children = []) {
    const el = document.createElement(tagName);
    const { className, textContent, html, attrs, dataset, style } = options;
    if (className) {
      el.className = className;
    }
    if (textContent != null) {
      el.textContent = textContent;
    }
    if (html != null) {
      el.innerHTML = html;
    }
    if (attrs) {
      for (const [name, value] of Object.entries(attrs)) {
        if (value != null) {
          el.setAttribute(name, String(value));
        }
      }
    }
    if (dataset) {
      for (const [name, value] of Object.entries(dataset)) {
        if (value != null) {
          el.dataset[name] = String(value);
        }
      }
    }
    if (style) {
      Object.assign(el.style, style);
    }
    for (const child of children) {
      if (child == null) {
        continue;
      }
      el.append(child.nodeType ? child : document.createTextNode(String(child)));
    }
    return el;
  }

  function isVisible(el) {
    if (!el) {
      return false;
    }
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function waitForElement(selector, timeoutMs = 5000, rootNode = document) {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve) => {
      const check = () => {
        const el = rootNode.querySelector(selector);
        if (el) {
          resolve(el);
          return;
        }
        if (Date.now() >= deadline) {
          resolve(null);
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }

  function waitForVisibleElement(selector, timeoutMs = 5000, rootNode = document) {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve) => {
      const check = () => {
        const el = rootNode.querySelector(selector);
        if (el && isVisible(el)) {
          resolve(el);
          return;
        }
        if (Date.now() >= deadline) {
          resolve(null);
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }

  function getValueSetter(element) {
    if (element instanceof HTMLSelectElement) {
      return Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    }
    if (element instanceof HTMLInputElement) {
      return Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    }
    return null;
  }

  function setNativeValue(element, value) {
    const setter = getValueSetter(element);
    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }
  }

  function dispatchFormEvents(element) {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function formatSignedMs(ms) {
    const rounded = Math.round(ms);
    return `${rounded >= 0 ? "+" : ""}${rounded} ms`;
  }

  function formatCountdownSeconds(ms, digits = 3) {
    return `${(ms / 1000).toFixed(digits)} s`;
  }

  function formatCompactCountdown(ms) {
    return `${Math.max(0, ms / 1000).toFixed(1)}s`;
  }

  function ensureRootRemoved(rootId) {
    const existing = document.getElementById(rootId);
    if (existing) {
      existing.remove();
    }
  }

  root.dom = Object.freeze({
    wait,
    clamp,
    createElement,
    isVisible,
    waitForElement,
    waitForVisibleElement,
    setNativeValue,
    dispatchFormEvents,
    formatSignedMs,
    formatCountdownSeconds,
    formatCompactCountdown,
    ensureRootRemoved
  });
})();
(() => {
  const root = window.BCParkTool = window.BCParkTool || {};
  const { CLOCK_CONSTANTS, TIME_ZONE } = root.constants;
  const { wait } = root.dom;

  function log(...args) {
    console.log("[BCParkTool][clock]", ...args);
  }

  function warn(...args) {
    console.warn("[BCParkTool][clock]", ...args);
  }

  function getDatePartsInZone(ms, timeZone = TIME_ZONE) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(new Date(ms));
    const map = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        map[part.type] = part.value;
      }
    }
    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      hour: Number(map.hour === "24" ? "0" : map.hour),
      minute: Number(map.minute),
      second: Number(map.second),
      millisecond: new Date(ms).getMilliseconds()
    };
  }

  function zonedDatePartsToUtcMs(parts, timeZone = TIME_ZONE) {
    let utcMs = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      parts.millisecond || 0
    );

    for (let i = 0; i < 4; i += 1) {
      const observed = getDatePartsInZone(utcMs, timeZone);
      const observedUtc = Date.UTC(
        observed.year,
        observed.month - 1,
        observed.day,
        observed.hour,
        observed.minute,
        observed.second,
        observed.millisecond
      );
      const desiredUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
        parts.millisecond || 0
      );
      const delta = desiredUtc - observedUtc;
      if (delta === 0) {
        return utcMs;
      }
      utcMs += delta;
    }

    return utcMs;
  }

  function formatClockTime(ms, timeZone = TIME_ZONE) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
    const parts = formatter.formatToParts(new Date(ms));
    const map = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        map[part.type] = part.value;
      }
    }
    const millis = String(new Date(ms).getMilliseconds()).padStart(3, "0");
    return `${map.hour}:${map.minute}:${map.second}.${millis} ${map.dayPeriod}`.trim();
  }

  function formatClockDate(ms, timeZone = TIME_ZONE) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date(ms));
  }

  function formatOffset(offsetMs) {
    const sign = offsetMs >= 0 ? "+" : "-";
    return `${sign}${Math.abs(Math.round(offsetMs))} ms`;
  }

  function formatSourceLine(snapshot) {
    if (!snapshot) {
      return "Clock unavailable";
    }
    if (snapshot.sourceKind === "http") {
      const rtt = snapshot.roundTripMs != null ? `${Math.round(snapshot.roundTripMs)} ms` : "n/a";
      return `BC Parks HTTP time | RTT ${rtt} | offset ${formatOffset(snapshot.offsetMs)}`;
    }
    return "Local fallback | using device clock";
  }

  function formatTimeZoneLabel(snapshot) {
    if (!snapshot) {
      return "BC Parks time";
    }
    return snapshot.sourceKind === "http" ? "BC Parks HTTP time" : "Local fallback";
  }

  function parseTimeString(timeString) {
    const match = /^\s*(\d{2}):(\d{2}):(\d{2})\s*$/.exec(String(timeString));
    if (!match) {
      return null;
    }
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = Number(match[3]);
    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      Number.isNaN(second) ||
      hour < 0 || hour > 23 ||
      minute < 0 || minute > 59 ||
      second < 0 || second > 59
    ) {
      return null;
    }
    return { hour, minute, second };
  }

  function buildZonedTimestampForToday(timeString, nowMs, timeZone = TIME_ZONE) {
    const parsed = parseTimeString(timeString);
    if (!parsed) {
      return null;
    }
    const currentParts = getDatePartsInZone(nowMs, timeZone);
    const targetParts = {
      year: currentParts.year,
      month: currentParts.month,
      day: currentParts.day,
      hour: parsed.hour,
      minute: parsed.minute,
      second: parsed.second,
      millisecond: 0
    };
    return zonedDatePartsToUtcMs(targetParts, timeZone);
  }

  function createClockService({ logger = console, timeZone = TIME_ZONE } = {}) {
    let offsetMs = 0;
    let roundTripMs = null;
    let sourceKind = "local";
    let lastSyncAtMs = null;
    let lastHttpDateMs = null;
    let syncTimerId = null;
    let tickTimerId = null;
    let syncInFlight = null;
    let destroyed = false;
    const listeners = new Set();

    function snapshot() {
      return {
        nowMs: Date.now() + offsetMs,
        offsetMs,
        roundTripMs,
        sourceKind,
        lastSyncAtMs,
        lastHttpDateMs,
        timeZone
      };
    }

    function notify() {
      const current = snapshot();
      for (const listener of listeners) {
        try {
          listener(current);
        } catch (error) {
          logger.error("[BCParkTool][clock] listener failed", error);
        }
      }
    }

    function getNowMs() {
      return Date.now() + offsetMs;
    }

    function subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => {
        listeners.delete(listener);
      };
    }

    async function syncOnce() {
      if (destroyed) {
        return snapshot();
      }
      if (syncInFlight) {
        return syncInFlight;
      }

      syncInFlight = (async () => {
        const requestStartMs = Date.now();
        const url = new URL(window.location.href);
        url.searchParams.set("_clock", String(Date.now()));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CLOCK_CONSTANTS.syncTimeoutMs);

        try {
          const response = await fetch(url.toString(), {
            method: "HEAD",
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const dateHeader = response.headers.get("date");
          if (!dateHeader) {
            throw new Error("Missing Date header");
          }

          const parsed = Date.parse(dateHeader);
          if (Number.isNaN(parsed)) {
            throw new Error(`Unable to parse Date header: ${dateHeader}`);
          }

          const responseEndMs = Date.now();
          const rtt = responseEndMs - requestStartMs;
          const computedOffset = parsed + rtt / 2 - responseEndMs;

          offsetMs = computedOffset;
          roundTripMs = rtt;
          sourceKind = "http";
          lastSyncAtMs = responseEndMs;
          lastHttpDateMs = parsed;

          log("Clock synchronized", {
            rttMs: Math.round(rtt),
            offsetMs: Math.round(computedOffset)
          });
        } catch (error) {
          offsetMs = 0;
          roundTripMs = null;
          sourceKind = "local";
          lastSyncAtMs = Date.now();
          lastHttpDateMs = null;
          warn("Clock sync failed; falling back to local time", error);
        } finally {
          clearTimeout(timeoutId);
          syncInFlight = null;
          notify();
        }

        return snapshot();
      })();

      return syncInFlight;
    }

    async function waitForSnapshot({ timeoutMs = 1200 } = {}) {
      const pending = syncInFlight || syncOnce();
      if (timeoutMs <= 0) {
        return pending;
      }
      return Promise.race([
        pending,
        wait(timeoutMs).then(() => snapshot())
      ]);
    }

    function start() {
      if (destroyed) {
        return;
      }
      if (!tickTimerId) {
        tickTimerId = setInterval(notify, CLOCK_CONSTANTS.tickIntervalMs);
      }
      if (!syncTimerId) {
        syncTimerId = setInterval(() => {
          syncOnce().catch((error) => warn("Clock resync failed", error));
        }, CLOCK_CONSTANTS.syncIntervalMs);
      }
      syncOnce().catch((error) => warn("Clock initial sync failed", error));
    }

    function stop() {
      if (tickTimerId) {
        clearInterval(tickTimerId);
        tickTimerId = null;
      }
      if (syncTimerId) {
        clearInterval(syncTimerId);
        syncTimerId = null;
      }
    }

    function destroy() {
      destroyed = true;
      stop();
      listeners.clear();
    }

    return {
      start,
      stop,
      destroy,
      syncOnce,
      waitForSnapshot,
      subscribe,
      getNowMs,
      snapshot,
      getDatePartsInZone: (ms) => getDatePartsInZone(ms, timeZone),
      buildZonedTimestampForToday: (timeString, nowMs) => buildZonedTimestampForToday(timeString, nowMs, timeZone),
      formatClockTime: (ms) => formatClockTime(ms, timeZone),
      formatClockDate: (ms) => formatClockDate(ms, timeZone),
      formatSourceLine,
      formatTimeZoneLabel,
      formatOffset,
      parseTimeString,
      get sourceKind() {
        return sourceKind;
      },
      get offsetMs() {
        return offsetMs;
      }
    };
  }

  root.clock = Object.freeze({
    createClockService,
    getDatePartsInZone,
    zonedDatePartsToUtcMs,
    formatClockTime,
    formatClockDate,
    formatOffset,
    formatSourceLine,
    formatTimeZoneLabel,
    parseTimeString,
    buildZonedTimestampForToday
  });
})();
(() => {
  const root = window.BCParkTool = window.BCParkTool || {};

  function injectStyles() {
    if (document.getElementById("bc-park-tool-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "bc-park-tool-styles";
    style.textContent = `
      :root {
        --bcpark-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
        --bcpark-bg: #ffffff;
        --bcpark-bg-strong: #f8fafc;
        --bcpark-surface: #ffffff;
        --bcpark-surface-strong: #f8fafc;
        --bcpark-border: #dbe3ec;
        --bcpark-border-strong: #c7d2de;
        --bcpark-text: #0f172a;
        --bcpark-muted: #64748b;
        --bcpark-accent: #2563eb;
        --bcpark-accent-soft: rgba(37, 99, 235, 0.12);
        --bcpark-accent-strong: #1d4ed8;
        --bcpark-error: #dc2626;
        --bcpark-warning: #475569;
        --bcpark-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
      }

      #bc-park-tool-root,
      #bc-park-tool-root * {
        box-sizing: border-box;
        -webkit-tap-highlight-color: transparent;
      }

      #bc-park-tool-root {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 2147483646;
        font-family: var(--bcpark-font);
        color: var(--bcpark-text);
      }

      #bc-park-tool-root .bc-park-tool-shell {
        position: absolute;
        left: 20px;
        top: 20px;
        pointer-events: auto;
        transform: translate3d(0, 0, 0);
      }

      #bc-park-tool-root .bc-park-tool-hud {
        width: 340px;
        border-radius: 24px;
        border: 1px solid var(--bcpark-border);
        background: #ffffff;
        box-shadow: var(--bcpark-shadow);
        overflow: hidden;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: width 180ms ease, height 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
      }

      #bc-park-tool-root .bc-park-tool-hud.is-minimized {
        width: 132px;
        height: 56px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        padding: 0 14px;
      }

      #bc-park-tool-root .bc-park-tool-hud.is-armed {
        border-color: rgba(37, 99, 235, 0.35);
        box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.08), var(--bcpark-shadow);
      }

      #bc-park-tool-root .bc-park-tool-hud.is-primed {
        border-color: rgba(37, 99, 235, 0.28);
        box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.06), var(--bcpark-shadow);
      }

      #bc-park-tool-root .bc-park-tool-hud.is-error {
        border-color: rgba(220, 38, 38, 0.42);
        box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.08), var(--bcpark-shadow);
      }

      #bc-park-tool-root .bc-park-tool-hud .bc-park-tool-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px 12px;
        border-bottom: 1px solid var(--bcpark-border);
      }

      #bc-park-tool-root .bc-park-tool-hud .bc-park-tool-title {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      #bc-park-tool-root .bc-park-tool-hud .bc-park-tool-title strong {
        font-size: 0.95rem;
        letter-spacing: -0.02em;
      }

      #bc-park-tool-root .bc-park-tool-hud .bc-park-tool-subtitle {
        font-size: 0.8rem;
        color: var(--bcpark-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      #bc-park-tool-root .bc-park-tool-hud .bc-park-tool-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 0 0 auto;
      }

      #bc-park-tool-root .bc-park-tool-hud .bc-park-tool-drag-handle {
        min-width: 0;
        flex: 1 1 auto;
        cursor: grab;
        touch-action: none;
      }

      #bc-park-tool-root .bc-park-tool-hud.is-dragging {
        user-select: none;
      }

      #bc-park-tool-root .bc-park-tool-hud.is-dragging .bc-park-tool-drag-handle {
        cursor: grabbing;
      }

      #bc-park-tool-root .bc-park-tool-content {
        padding: 14px;
        display: grid;
        gap: 12px;
      }

      #bc-park-tool-root .bc-park-tool-clock {
        display: grid;
        gap: 6px;
        padding: 14px 14px 12px;
        border-radius: 18px;
        background: #f8fafc;
        border: 1px solid var(--bcpark-border);
      }

      #bc-park-tool-root .bc-park-tool-clock .clock-label {
        font-size: 0.76rem;
        letter-spacing: 0;
        color: var(--bcpark-muted);
      }

      #bc-park-tool-root .bc-park-tool-clock .clock-time {
        font-size: 1.22rem;
        font-weight: 700;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }

      #bc-park-tool-root .bc-park-tool-clock .clock-meta {
        font-size: 0.8rem;
        color: var(--bcpark-muted);
        line-height: 1.35;
      }

      #bc-park-tool-root .bc-park-tool-status {
        display: grid;
        gap: 4px;
        padding: 12px 14px;
        border-radius: 18px;
        background: #f8fafc;
        border: 1px solid var(--bcpark-border);
      }

      #bc-park-tool-root .bc-park-tool-status .status-label {
        font-size: 0.74rem;
        letter-spacing: 0;
        color: var(--bcpark-muted);
      }

      #bc-park-tool-root .bc-park-tool-status .status-main {
        font-size: 0.98rem;
        font-weight: 650;
        letter-spacing: -0.01em;
      }

      #bc-park-tool-root .bc-park-tool-status .status-detail {
        font-size: 0.82rem;
        color: var(--bcpark-muted);
      }

      #bc-park-tool-root .bc-park-tool-hud.is-armed .status-main {
        color: #0f172a;
      }

      #bc-park-tool-root .bc-park-tool-hud.is-error .status-main {
        color: #0f172a;
      }

      #bc-park-tool-root .bc-park-tool-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        appearance: none;
        border: 1px solid var(--bcpark-border);
        border-radius: 14px;
        padding: 11px 14px;
        font: inherit;
        font-size: 0.9rem;
        font-weight: 650;
        color: #0f172a;
        background: #ffffff;
        box-shadow: 0 1px 0 rgba(15, 23, 42, 0.03);
      }

      #bc-park-tool-root .bc-park-tool-button .bc-park-tool-button-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        flex: 0 0 auto;
      }

      #bc-park-tool-root .bc-park-tool-button .bc-park-tool-button-icon svg {
        display: block;
        width: 14px;
        height: 14px;
      }

      #bc-park-tool-root .bc-park-tool-button.primary {
        color: #ffffff;
        background: var(--bcpark-accent);
        border-color: var(--bcpark-accent);
        box-shadow: 0 8px 18px rgba(37, 99, 235, 0.16);
      }

      #bc-park-tool-root .bc-park-tool-button.secondary {
        color: var(--bcpark-text);
        background: #ffffff;
        box-shadow: none;
      }

      #bc-park-tool-root .bc-park-tool-button.danger {
        color: var(--bcpark-error);
        background: #ffffff;
      }

      #bc-park-tool-root .bc-park-tool-button:disabled {
        opacity: 0.55;
      }

      #bc-park-tool-root .bc-park-tool-button.is-success {
        color: var(--bcpark-accent-strong);
        background: rgba(37, 99, 235, 0.08);
        border-color: rgba(37, 99, 235, 0.2);
      }

      #bc-park-tool-root .bc-park-tool-mini {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0;
        text-align: center;
        cursor: pointer;
        touch-action: none;
      }

      #bc-park-tool-root .bc-park-tool-mini .mini-icon {
        display: none;
        width: 24px;
        height: 24px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: var(--bcpark-accent);
        color: #ffffff;
        font-size: 0.78rem;
        font-weight: 800;
        line-height: 1;
      }

      #bc-park-tool-root .bc-park-tool-mini .mini-icon svg {
        display: block;
        width: 14px;
        height: 14px;
      }

      #bc-park-tool-root .bc-park-tool-hud.is-primed .mini-icon,
      #bc-park-tool-root .bc-park-tool-hud.is-armed .mini-icon {
        display: inline-flex;
      }

      #bc-park-tool-root .bc-park-tool-hud.is-primed .mini-icon {
        background: #0f172a;
      }

      #bc-park-tool-root .bc-park-tool-hud.is-armed .mini-icon {
        background: var(--bcpark-accent);
      }

      #bc-park-tool-root .bc-park-tool-mini .mini-state {
        display: none;
      }

      #bc-park-tool-root .bc-park-tool-mini .mini-value {
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
        color: #0f172a;
      }

      #bc-park-tool-root .bc-park-tool-mini .mini-time {
        display: none;
      }

      #bc-park-tool-root .bc-park-tool-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(248, 250, 252, 0.75);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: grid;
        place-items: center;
        pointer-events: auto;
        padding: 20px;
      }

      #bc-park-tool-root .bc-park-tool-modal {
        width: min(720px, 100%);
        max-height: min(88dvh, 920px);
        overflow: auto;
        border-radius: 28px;
        border: 1px solid var(--bcpark-border-strong);
        background: #ffffff;
        box-shadow: 0 28px 90px rgba(15, 23, 42, 0.14);
      }

      #bc-park-tool-root .bc-park-tool-modal-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
        padding: 22px 22px 0;
      }

      #bc-park-tool-root .bc-park-tool-modal-header h2 {
        margin: 0;
        font-size: clamp(1.5rem, 2.8vw, 2rem);
        letter-spacing: -0.04em;
      }

      #bc-park-tool-root .bc-park-tool-modal-body {
        padding: 20px 22px 22px;
        display: grid;
        gap: 16px;
      }

      #bc-park-tool-root .bc-park-tool-tabs {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      #bc-park-tool-root .bc-park-tool-tab {
        appearance: none;
        border: 1px solid var(--bcpark-border);
        border-radius: 14px;
        padding: 11px 14px;
        font: inherit;
        font-size: 0.9rem;
        font-weight: 650;
        color: var(--bcpark-muted);
        background: #f8fafc;
      }

      #bc-park-tool-root .bc-park-tool-tab.is-active {
        color: var(--bcpark-text);
        background: #ffffff;
        border-color: var(--bcpark-border-strong);
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
      }

      #bc-park-tool-root .bc-park-tool-tab-panel {
        display: grid;
        gap: 16px;
      }

      #bc-park-tool-root .bc-park-tool-tab-panel[hidden] {
        display: none;
      }

      #bc-park-tool-root .bc-park-tool-form {
        display: grid;
        gap: 14px;
      }

      #bc-park-tool-root .bc-park-tool-grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      #bc-park-tool-root .bc-park-tool-grid.one {
        grid-template-columns: 1fr;
      }

      @media (max-width: 640px) {
        #bc-park-tool-root .bc-park-tool-grid {
          grid-template-columns: 1fr;
        }
      }

      #bc-park-tool-root .bc-park-tool-field {
        display: grid;
        gap: 7px;
      }

      #bc-park-tool-root .bc-park-tool-field label {
        font-size: 0.76rem;
        font-weight: 650;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--bcpark-muted);
      }

      #bc-park-tool-root .bc-park-tool-field input,
      #bc-park-tool-root .bc-park-tool-field select {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        border-radius: 16px;
        border: 1px solid var(--bcpark-border);
        padding: 12px 14px;
        background: #ffffff;
        color: var(--bcpark-text);
        font: inherit;
        font-size: 16px;
        outline: none;
        min-height: 48px;
      }

      #bc-park-tool-root .bc-park-tool-field input:focus,
      #bc-park-tool-root .bc-park-tool-field select:focus {
        border-color: rgba(37, 99, 235, 0.65);
        box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
      }

      #bc-park-tool-root .bc-park-tool-field input[type="time"] {
        letter-spacing: 0.04em;
      }

      #bc-park-tool-root .bc-park-tool-field input[type="date"],
      #bc-park-tool-root .bc-park-tool-field input[type="time"] {
        -webkit-appearance: none;
        appearance: none;
      }

      #bc-park-tool-root .bc-park-tool-field input::-webkit-datetime-edit,
      #bc-park-tool-root .bc-park-tool-field input::-webkit-inner-spin-button,
      #bc-park-tool-root .bc-park-tool-field input::-webkit-clear-button {
        -webkit-appearance: none;
      }

      #bc-park-tool-root .bc-park-tool-preview {
        display: grid;
        gap: 6px;
        padding: 14px 16px;
        border-radius: 18px;
        border: 1px solid var(--bcpark-border);
        background: #f8fafc;
      }

      #bc-park-tool-root .bc-park-tool-preview .preview-label {
        font-size: 0.72rem;
        letter-spacing: 0;
        color: var(--bcpark-muted);
      }

      #bc-park-tool-root .bc-park-tool-preview .preview-time {
        font-size: 1.12rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      #bc-park-tool-root .bc-park-tool-preview .preview-error {
        color: var(--bcpark-error);
      }

      #bc-park-tool-root .bc-park-tool-note {
        font-size: 0.85rem;
        color: var(--bcpark-muted);
        line-height: 1.45;
      }

      #bc-park-tool-root .bc-park-tool-note.warn {
        color: var(--bcpark-warning);
      }

      #bc-park-tool-root .bc-park-tool-modal-actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      @media (max-width: 640px) {
        #bc-park-tool-root .bc-park-tool-modal-actions,
        #bc-park-tool-root .bc-park-tool-tabs,
        #bc-park-tool-root .bc-park-tool-timing-summary,
        #bc-park-tool-root .bc-park-tool-timing-actions {
          grid-template-columns: 1fr;
        }
      }

      #bc-park-tool-root .bc-park-tool-timing-summary {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      #bc-park-tool-root .bc-park-tool-metric {
        display: grid;
        gap: 4px;
        padding: 14px 16px;
        border-radius: 18px;
        border: 1px solid var(--bcpark-border);
        background: #f8fafc;
      }

      #bc-park-tool-root .bc-park-tool-metric-label {
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--bcpark-muted);
      }

      #bc-park-tool-root .bc-park-tool-metric-value {
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
      }

      #bc-park-tool-root .bc-park-tool-metric-meta {
        font-size: 0.8rem;
        color: var(--bcpark-muted);
      }

      #bc-park-tool-root .bc-park-tool-timing-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      #bc-park-tool-root .bc-park-tool-timing-list {
        display: grid;
        gap: 10px;
      }

      #bc-park-tool-root .bc-park-tool-timing-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 16px;
        border: 1px solid var(--bcpark-border);
        background: #ffffff;
      }

      #bc-park-tool-root .bc-park-tool-timing-row-main {
        min-width: 0;
      }

      #bc-park-tool-root .bc-park-tool-timing-row strong {
        display: block;
        font-size: 0.98rem;
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
      }

      #bc-park-tool-root .bc-park-tool-timing-row time {
        display: block;
        margin-top: 3px;
        font-size: 0.8rem;
        color: var(--bcpark-muted);
      }

      #bc-park-tool-root .bc-park-tool-timing-row button {
        padding-inline: 12px;
        white-space: nowrap;
      }

      #bc-park-tool-root .bc-park-tool-timing-empty {
        padding: 16px;
        border-radius: 16px;
        border: 1px dashed var(--bcpark-border);
        background: #f8fafc;
        color: var(--bcpark-muted);
        text-align: center;
      }

      #bc-park-tool-root .bc-park-tool-section {
        display: grid;
        gap: 12px;
        padding: 16px;
        border-radius: 20px;
        background: #ffffff;
        border: 1px solid var(--bcpark-border);
      }

      #bc-park-tool-root .bc-park-tool-section-head {
        display: grid;
        gap: 3px;
      }

      #bc-park-tool-root .bc-park-tool-section-title {
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      #bc-park-tool-root .bc-park-tool-section-copy {
        font-size: 0.83rem;
        color: var(--bcpark-muted);
        line-height: 1.4;
      }

      #bc-park-tool-root .bc-park-tool-section-body {
        display: grid;
        gap: 12px;
      }

      #bc-park-tool-root .bc-park-tool-inline {
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(82px, 0.6fr);
        gap: 12px;
        align-items: end;
      }

      #bc-park-tool-root .bc-park-tool-inline > * {
        min-width: 0;
      }

      #bc-park-tool-root .bc-park-tool-error-banner {
        display: none;
        padding: 12px 14px;
        border-radius: 16px;
        color: var(--bcpark-error);
        background: rgba(220, 38, 38, 0.06);
        border: 1px solid rgba(220, 38, 38, 0.2);
        line-height: 1.45;
      }

      #bc-park-tool-root .bc-park-tool-error-banner.is-visible {
        display: block;
      }
    `;
    document.head.appendChild(style);
  }

  root.styles = Object.freeze({
    injectStyles
  });
})();
(() => {
  const root = window.BCParkTool = window.BCParkTool || {};
  const { HUD_CONSTANTS } = root.constants;
  const { createElement, clamp } = root.dom;
  const { readClockState, writeClockState } = root.storage;

  function miniIconMarkup(kind) {
    if (kind === "primed") {
      return `
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="M10 1.75a8.25 8.25 0 1 0 8.25 8.25A8.26 8.26 0 0 0 10 1.75Zm3.36 6.06-3.98 5.17a1 1 0 0 1-1.49.11L6.65 10.5a1 1 0 1 1 1.41-1.42l.98.98 3.32-4.31a1 1 0 1 1 1.6 1.26Z" fill="currentColor"/>
        </svg>
      `;
    }

    if (kind === "armed") {
      return `
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="M10 1.75a8.25 8.25 0 1 0 8.25 8.25A8.26 8.26 0 0 0 10 1.75Zm1 8.1 2.5 1.45a1 1 0 1 1-1 1.73L9.5 11.24A1.5 1.5 0 0 1 8.75 10V5.9a1 1 0 0 1 2 0V10c0 .04.02.08.05.1Z" fill="currentColor"/>
        </svg>
      `;
    }

    return "";
  }

  function createClockHud({
    clockService,
    onConfigure,
    onCancelSchedule
  }) {
    const persisted = readClockState();
    const state = {
      minimized: !!persisted.minimized,
      x: typeof persisted.x === "number" ? persisted.x : null,
      y: typeof persisted.y === "number" ? persisted.y : null
    };

    const shell = createElement("div", { className: "bc-park-tool-shell" });
    const hud = createElement("div", { className: "bc-park-tool-hud" });
    const miniLayer = createElement("div", { className: "bc-park-tool-mini" });
    const expandedLayer = createElement("div", { className: "bc-park-tool-expanded" });
    const header = createElement("div", { className: "bc-park-tool-header" });
    const dragHandle = createElement("div", { className: "bc-park-tool-title bc-park-tool-drag-handle" });
    const titleText = createElement("strong", { textContent: "Reservation clock" });
    const subtitleText = createElement("div", { className: "bc-park-tool-subtitle" });
    subtitleText.hidden = true;
    const actions = createElement("div", { className: "bc-park-tool-actions" });
    const configureButton = createElement("button", {
      className: "bc-park-tool-button secondary",
      attrs: { type: "button" },
      textContent: "Prime booking"
    });
    const minimizeButton = createElement("button", {
      className: "bc-park-tool-button secondary",
      attrs: { type: "button" },
      textContent: "Minimize"
    });
    const clockCard = createElement("div", { className: "bc-park-tool-clock" });
    const clockLabel = createElement("div", { className: "clock-label", textContent: "Current time" });
    const clockTime = createElement("div", { className: "clock-time" });
    const clockMeta = createElement("div", { className: "clock-meta" });
    const statusCard = createElement("div", { className: "bc-park-tool-status" });
    const statusLabel = createElement("div", { className: "status-label" });
    const statusMain = createElement("div", { className: "status-main" });
    const statusDetail = createElement("div", { className: "status-detail" });
    const cancelButton = createElement("button", {
      className: "bc-park-tool-button danger",
      attrs: { type: "button" },
      textContent: "Cancel scheduled click"
    });
    const miniIcon = createElement("div", {
      className: "mini-icon",
      attrs: { "aria-hidden": "true" }
    });
    const miniValue = createElement("div", { className: "mini-value" });
    const miniState = createElement("div", { className: "mini-state" });
    const miniTime = createElement("div", { className: "mini-time" });

    let clockSnapshot = clockService.snapshot();
    let scheduleState = {
      status: "idle",
      nextClickMs: null,
      schedulerErrorMs: null,
      message: "Prime Page 1 to schedule the Next click.",
      detail: "The clock stays visible while the modal is open."
    };

    let position = {
      x: state.x,
      y: state.y
    };

    let dragPointerId = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartLeft = 0;
    let dragStartTop = 0;
    let dragMoved = false;
    let dragTapExpands = false;

    function defaultPosition() {
      const width = state.minimized ? 156 : 352;
      const height = state.minimized ? 56 : 260;
      return {
        x: Math.max(16, window.innerWidth - width - 18),
        y: 16
      };
    }

    function clampPosition(nextX, nextY) {
      const rect = hud.getBoundingClientRect();
      const width = rect.width || (state.minimized ? 156 : 352);
      const height = rect.height || (state.minimized ? 56 : 260);
      const maxX = Math.max(16, window.innerWidth - width - 12);
      const maxY = Math.max(16, window.innerHeight - height - 12);
      return {
        x: clamp(Math.round(nextX), 12, maxX),
        y: clamp(Math.round(nextY), 12, maxY)
      };
    }

    function persistState() {
      writeClockState({
        x: position.x,
        y: position.y,
        minimized: state.minimized
      });
    }

    function applyPosition() {
      const next = position.x == null || position.y == null ? defaultPosition() : clampPosition(position.x, position.y);
      position = next;
      shell.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
    }

    function setMinimized(nextMinimized) {
      state.minimized = !!nextMinimized;
      position = clampPosition(position.x ?? defaultPosition().x, position.y ?? defaultPosition().y);
      persistState();
      render();
    }

    function expand() {
      setMinimized(false);
    }

    function minimize() {
      setMinimized(true);
    }

    function setPosition(nextX, nextY, { persist = true } = {}) {
      position = clampPosition(nextX, nextY);
      applyPosition();
      if (persist) {
        persistState();
      }
    }

    function formatScheduleView(nowMs) {
      const compactNow = clockService.formatClockTime(nowMs).replace(/\.\d{3}(?=\s)/, "");

      if (scheduleState.status === "primed") {
        return {
          miniIconKind: "primed",
          miniValueText: compactNow,
          miniTimeText: "",
          statusLabelText: "Primed",
          statusMainText: "Page 1 is filled and ready.",
          statusDetailText: scheduleState.detail || "Prime only completed."
        };
      }

      if (scheduleState.status === "armed" && scheduleState.nextClickMs != null) {
        const nextClick = clockService.formatClockTime(scheduleState.nextClickMs);
        return {
          miniIconKind: "armed",
          miniValueText: compactNow,
          miniTimeText: "",
          statusLabelText: "Armed",
          statusMainText: `Next click: ${nextClick}`,
          statusDetailText: `T- ${root.dom.formatCountdownSeconds(scheduleState.nextClickMs - nowMs)}`
        };
      }

      if (scheduleState.status === "clicked") {
        return {
          miniIconKind: "",
          miniValueText: compactNow,
          miniTimeText: "",
          statusLabelText: "Clicked",
          statusMainText: "Next click completed",
          statusDetailText: scheduleState.schedulerErrorMs != null ? `Scheduler error: ${root.dom.formatSignedMs(scheduleState.schedulerErrorMs)}` : "Page 1 Next was clicked."
        };
      }

      if (scheduleState.status === "error") {
        return {
          miniIconKind: "",
          miniValueText: compactNow,
          miniTimeText: "",
          statusLabelText: "Error",
          statusMainText: "Schedule error",
          statusDetailText: scheduleState.message || "An unknown scheduling error occurred."
        };
      }

      if (scheduleState.status === "cancelled") {
        return {
          miniIconKind: "",
          miniValueText: compactNow,
          miniTimeText: "",
          statusLabelText: "Cancelled",
          statusMainText: "Schedule cleared",
          statusDetailText: scheduleState.detail || "Outstanding timers and animation frames were cleared."
        };
      }

      return {
        miniIconKind: "",
        miniValueText: compactNow,
        miniTimeText: "",
        statusLabelText: "Ready",
        statusMainText: "Set the release time, then prime Page 1 when you're ready.",
        statusDetailText: `Source: ${clockService.formatSourceLine(clockSnapshot)}`
      };
    }

    function render() {
      hud.classList.toggle("is-minimized", state.minimized);
      hud.classList.toggle("is-primed", scheduleState.status === "primed");
      hud.classList.toggle("is-armed", scheduleState.status === "armed");
      hud.classList.toggle("is-error", scheduleState.status === "error");

      miniLayer.hidden = !state.minimized;
      expandedLayer.hidden = state.minimized;

      const nowMs = clockSnapshot.nowMs || Date.now();
      const view = formatScheduleView(nowMs);

      miniIcon.hidden = !view.miniIconKind;
      miniIcon.className = `mini-icon${view.miniIconKind ? ` is-${view.miniIconKind}` : ""}`;
      miniIcon.innerHTML = miniIconMarkup(view.miniIconKind);
      miniTime.hidden = true;
      miniState.hidden = true;
      miniValue.textContent = view.miniValueText;
      miniTime.textContent = view.miniTimeText;

      titleText.textContent = "Reservation clock";
      subtitleText.textContent = clockService.formatSourceLine(clockSnapshot);
      subtitleText.hidden = true;

      clockLabel.textContent = "Current time";
      clockTime.textContent = clockService.formatClockTime(nowMs);
      clockMeta.textContent = clockService.formatSourceLine(clockSnapshot);

      statusLabel.textContent = view.statusLabelText;
      statusMain.textContent = view.statusMainText;
      statusDetail.textContent = view.statusDetailText;

      cancelButton.hidden = scheduleState.status !== "armed";

      position = clampPosition(position.x ?? defaultPosition().x, position.y ?? defaultPosition().y);
      applyPosition();
    }

    function setScheduleState(nextState) {
      scheduleState = {
        ...scheduleState,
        ...nextState
      };
      render();
    }

    function updateClock(snapshot) {
      clockSnapshot = snapshot;
      render();
    }

    function beginDrag(event, tapExpands) {
      if (event.button != null && event.button !== 0) {
        return;
      }
      dragPointerId = event.pointerId;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragStartLeft = position.x ?? defaultPosition().x;
      dragStartTop = position.y ?? defaultPosition().y;
      dragMoved = false;
      dragTapExpands = !!tapExpands;
      hud.classList.add("is-dragging");
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch (error) {
        void error;
      }
      event.preventDefault();
    }

    function moveDrag(event) {
      if (dragPointerId == null || event.pointerId !== dragPointerId) {
        return;
      }
      const dx = event.clientX - dragStartX;
      const dy = event.clientY - dragStartY;
      if (!dragMoved && Math.hypot(dx, dy) >= HUD_CONSTANTS.dragThresholdPx) {
        dragMoved = true;
      }
      if (dragMoved) {
        setPosition(dragStartLeft + dx, dragStartTop + dy, { persist: false });
      }
    }

    function endDrag(event) {
      if (dragPointerId == null || event.pointerId !== dragPointerId) {
        return;
      }
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch (error) {
        void error;
      }
      hud.classList.remove("is-dragging");
      if (dragTapExpands && state.minimized && !dragMoved) {
        expand();
      } else {
        persistState();
      }
      dragPointerId = null;
      dragMoved = false;
      dragTapExpands = false;
    }

    function attachDragHandlers() {
      miniLayer.addEventListener("pointerdown", (event) => {
        if (state.minimized) {
          beginDrag(event, true);
        }
      });
      miniLayer.addEventListener("pointermove", moveDrag);
      miniLayer.addEventListener("pointerup", endDrag);
      miniLayer.addEventListener("pointercancel", endDrag);

      dragHandle.addEventListener("pointerdown", (event) => {
        if (!state.minimized) {
          beginDrag(event, false);
        }
      });
      dragHandle.addEventListener("pointermove", moveDrag);
      dragHandle.addEventListener("pointerup", endDrag);
      dragHandle.addEventListener("pointercancel", endDrag);
    }

    function mount(parent = document.body) {
      if (!shell.parentNode) {
        parent.appendChild(shell);
      }
      render();
    }

    function destroy() {
      window.removeEventListener("resize", handleResize);
      shell.remove();
    }

    function handleResize() {
      position = clampPosition(position.x ?? defaultPosition().x, position.y ?? defaultPosition().y);
      persistState();
      render();
    }

    hud.append(miniLayer, expandedLayer);
    shell.appendChild(hud);

    miniLayer.replaceChildren(miniIcon, miniValue, miniState, miniTime);

    header.append(dragHandle, actions);
    dragHandle.append(titleText, subtitleText);
    actions.append(configureButton, minimizeButton);
    clockCard.append(clockLabel, clockTime, clockMeta);
    statusCard.append(statusLabel, statusMain, statusDetail);

    expandedLayer.append(
      header,
      createElement("div", { className: "bc-park-tool-content" }, [
        clockCard,
        statusCard,
        createElement("div", { className: "bc-park-tool-note warn", textContent: "Keep Safari visible and prevent the phone from locking." }),
        cancelButton
      ])
    );

    configureButton.addEventListener("click", () => {
      if (typeof onConfigure === "function") {
        onConfigure();
      }
    });

    minimizeButton.addEventListener("click", () => {
      minimize();
    });

    cancelButton.addEventListener("click", () => {
      if (typeof onCancelSchedule === "function") {
        onCancelSchedule();
      }
    });

    window.addEventListener("resize", handleResize);
    attachDragHandlers();
    applyPosition();
    render();

    return {
      shell,
      mount,
      destroy,
      expand,
      minimize,
      setMinimized,
      setPosition,
      setScheduleState,
      updateClock,
      getState() {
        return {
          ...state,
          ...position
        };
      }
    };
  }

  root.clockHud = Object.freeze({
    createClockHud
  });
})();
(() => {
  const root = window.BCParkTool = window.BCParkTool || {};
  const { SELECTORS, CLOCK_CONSTANTS } = root.constants;
  const { wait } = root.dom;

  function createScheduler({
    clockService,
    onStateChange = () => {}
  }) {
    let activeTimerId = null;
    let activeRafId = null;
    let armedTargetMs = null;
    let armedReleaseMs = null;
    let armedLeadSeconds = null;
    let armed = false;
    let destroyed = false;
    let state = {
      status: "idle",
      nextClickMs: null,
      releaseMs: null,
      leadSeconds: null,
      schedulerErrorMs: null,
      message: "Prime booking to prepare a timed click.",
      detail: "The scheduler is idle."
    };

    function emit(nextState) {
      state = {
        ...state,
        ...nextState
      };
      onStateChange(state);
      return state;
    }

    function clearHandles() {
      if (activeTimerId != null) {
        clearTimeout(activeTimerId);
        activeTimerId = null;
      }
      if (activeRafId != null) {
        cancelAnimationFrame(activeRafId);
        activeRafId = null;
      }
    }

    function resetArmedFields() {
      armed = false;
      armedTargetMs = null;
      armedReleaseMs = null;
      armedLeadSeconds = null;
    }

    function cancel() {
      clearHandles();
      resetArmedFields();
      emit({
        status: "cancelled",
        nextClickMs: null,
        releaseMs: null,
        leadSeconds: null,
        schedulerErrorMs: null,
        message: "Cancelled",
        detail: "Outstanding timers and animation frames were cleared."
      });
    }

    function fail(message) {
      clearHandles();
      resetArmedFields();
      emit({
        status: "error",
        schedulerErrorMs: null,
        message,
        detail: message
      });
    }

    function complete(schedulerErrorMs) {
      clearHandles();
      resetArmedFields();
      emit({
        status: "clicked",
        schedulerErrorMs,
        message: "NEXT CLICKED",
        detail: `Scheduler error: ${root.dom.formatSignedMs(schedulerErrorMs)}`
      });
    }

    function getClickTimeFromConfig(scheduleConfig, nowMs) {
      const releaseMs = clockService.buildZonedTimestampForToday(scheduleConfig.releaseTime, nowMs);
      if (releaseMs == null) {
        throw new Error('Release time must use HH:MM:SS.');
      }

      const leadSeconds = Number(scheduleConfig.leadSeconds);
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

      return {
        releaseMs,
        clickMs,
        leadSeconds
      };
    }

    function scheduleLoop() {
      if (destroyed || !armed || armedTargetMs == null) {
        return;
      }

      const nowMs = clockService.getNowMs();
      const remainingMs = armedTargetMs - nowMs;

      if (remainingMs <= 0) {
        fire();
        return;
      }

      if (remainingMs > CLOCK_CONSTANTS.rAFLeadMs) {
        clearHandles();
        activeTimerId = setTimeout(scheduleLoop, Math.max(0, remainingMs - CLOCK_CONSTANTS.rAFLeadMs));
        return;
      }

      clearHandles();
      activeRafId = requestAnimationFrame(scheduleLoop);
    }

    function fire() {
      clearHandles();
      if (!armed || armedTargetMs == null) {
        return;
      }

      const button = document.querySelector(SELECTORS.nextButton);
      if (!button) {
        fail("Next button not found.");
        return;
      }
      if (button.disabled) {
        fail("Next button was disabled.");
        return;
      }

      const actualEstimatedServerTime = clockService.getNowMs();
      const schedulerErrorMs = actualEstimatedServerTime - armedTargetMs;

      try {
        button.click();
      } catch (error) {
        fail(`Next button click failed: ${error.message || String(error)}`);
        return;
      }

      complete(schedulerErrorMs);
    }

    async function arm(scheduleConfig) {
      if (destroyed) {
        throw new Error("Clock/scheduler initialization failed.");
      }

      clearHandles();
      resetArmedFields();

      const snapshot = await clockService.waitForSnapshot({ timeoutMs: 1200 });
      const nowMs = snapshot?.nowMs ?? clockService.getNowMs();
      if (!Number.isFinite(nowMs)) {
        throw new Error("Clock/scheduler initialization failed.");
      }

      const { releaseMs, clickMs, leadSeconds } = getClickTimeFromConfig(scheduleConfig, nowMs);

      armed = true;
      armedTargetMs = clickMs;
      armedReleaseMs = releaseMs;
      armedLeadSeconds = leadSeconds;

      emit({
        status: "armed",
        nextClickMs: clickMs,
        releaseMs,
        leadSeconds,
        schedulerErrorMs: null,
        message: "ARMED",
        detail: `Next click at ${clockService.formatClockTime(clickMs)}`
      });

      scheduleLoop();
      return state;
    }

    function destroy() {
      destroyed = true;
      clearHandles();
      resetArmedFields();
    }

    function getState() {
      return state;
    }

    return {
      arm,
      cancel,
      destroy,
      getState
    };
  }

  root.scheduler = Object.freeze({
    createScheduler
  });
})();
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
      return Number.isFinite(value) ? `${Math.round(value)} ms` : "-";
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

    function getMissingPage2Fields() {
      const missing = [];
      if (!String(state.booking.firstName || "").trim()) {
        missing.push("first name");
      }
      if (!String(state.booking.lastName || "").trim()) {
        missing.push("last name");
      }
      if (!String(state.booking.email || "").trim()) {
        missing.push("email");
      }
      return missing;
    }

    function confirmPrimeAndArmWithoutPage2Details() {
      const missingFields = getMissingPage2Fields();
      if (missingFields.length === 0) {
        return true;
      }
      const fieldList = missingFields.join(", ");
      return window.confirm(`Page 2 details are incomplete (${fieldList}). Prime / arm will continue, but Page 2 autofill may stop later.\n\nContinue anyway?`);
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
        syncStateFromInputs();
        persistState();
        if (!confirmPrimeAndArmWithoutPage2Details()) {
          return;
        }
        setBusy(true);
        page2Automation.stop();
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
(() => {
  const root = window.BCParkTool = window.BCParkTool || {};
  const { injectStyles } = root.styles;
  const { ensureRootRemoved, createElement } = root.dom;
  const { createClockService } = root.clock;
  const { createClockHud } = root.clockHud;
  const { createScheduler } = root.scheduler;
  const { createPrimerModal } = root.primer;

  async function waitForBody() {
    if (document.body) {
      return document.body;
    }
    await new Promise((resolve) => {
      window.addEventListener("DOMContentLoaded", () => resolve(document.body), { once: true });
    });
    return document.body;
  }

  function reportFatal(error) {
    console.error("[BCParkTool] Fatal initialization error", error);
    alert("Park Pass failed:\n\n" + (error.stack || error.message || String(error)));
  }

  async function initializeApp() {
    if (window.__BCParkToolApp && typeof window.__BCParkToolApp.destroy === "function") {
      window.__BCParkToolApp.destroy();
    }

    injectStyles();
    ensureRootRemoved("bc-park-tool-root");
    const body = await waitForBody();

    const rootEl = createElement("div", { attrs: { id: "bc-park-tool-root" } });
    body.appendChild(rootEl);

    const clockService = createClockService({ logger: console });
    let scheduler;
    let primer;
    const hud = createClockHud({
      clockService,
      onConfigure: () => primer.open(),
      onCancelSchedule: () => scheduler.cancel()
    });

    scheduler = createScheduler({
      clockService,
      onStateChange: (state) => {
        hud.setScheduleState(state);
      }
    });

    primer = createPrimerModal({
      clockService,
      hud,
      scheduler,
      onArm: async ({ booking, schedule }) => {
        await scheduler.arm(schedule);
        console.log("[BCParkTool][main] Armed schedule", {
          park: booking.park,
          passTypeNum: booking.passTypeNum,
          visitTime: booking.visitTime,
          releaseTime: schedule.releaseTime,
          leadSeconds: schedule.leadSeconds
        });
      }
    });

    hud.mount(rootEl);
    clockService.subscribe((snapshot) => {
      hud.updateClock(snapshot);
    });
    clockService.start();
    primer.open();

    const app = {
      destroy() {
        scheduler.destroy();
        clockService.destroy();
        hud.destroy();
        primer.close();
        rootEl.remove();
        if (window.__BCParkToolApp === app) {
          window.__BCParkToolApp = null;
        }
      },
      clockService,
      hud,
      scheduler,
      primer
    };

    window.__BCParkToolApp = app;
    console.log("[BCParkTool] Initialized");
    return app;
  }

  (async () => {
    try {
      await initializeApp();
    } catch (error) {
      reportFatal(error);
    }
  })();
})();
