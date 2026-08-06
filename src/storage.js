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
