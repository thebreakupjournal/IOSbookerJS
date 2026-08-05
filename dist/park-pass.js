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
    scheduleConfig: "bcParkTool.scheduleConfig"
  });

  const SELECTORS = Object.freeze({
    visitDate: "#visitDate",
    passType: "#passType",
    visitTimePrefix: "input#visitTime",
    passCount: "select#passCount",
    nextButton: 'button[data-bs-target="#turnstileModal"]'
  });

  const TIME_ZONE = "America/Los_Angeles";

  const DEFAULT_BOOKING_CONFIG = Object.freeze({
    park: "garibaldi",
    passTypeNum: "1",
    passLabel: "Cheakamus - Parking",
    visitTime: "AM",
    numberOfPasses: "4"
  });

  const DEFAULT_SCHEDULE_CONFIG = Object.freeze({
    releaseTime: "07:00:00",
    leadSeconds: "4.000"
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
  const { STORAGE_KEYS, DEFAULT_BOOKING_CONFIG, DEFAULT_SCHEDULE_CONFIG, PARKS } = root.constants;

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

    return {
      ...fallback,
      ...input,
      date,
      park,
      passTypeNum: pass ? String(pass.value) : fallback.passTypeNum,
      passLabel: pass ? pass.label : fallback.passLabel,
      visitTime,
      numberOfPasses
    };
  }

  function normalizeScheduleConfig(input = {}) {
    return {
      ...DEFAULT_SCHEDULE_CONFIG,
      ...input,
      releaseTime: String(input.releaseTime || DEFAULT_SCHEDULE_CONFIG.releaseTime).trim(),
      leadSeconds: String(input.leadSeconds || DEFAULT_SCHEDULE_CONFIG.leadSeconds).trim()
    };
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
      numberOfPasses: normalized.numberOfPasses
    };
    return writeJson(STORAGE_KEYS.bookingConfig, storageValue);
  }

  function readScheduleConfig() {
    return normalizeScheduleConfig(readJson(STORAGE_KEYS.scheduleConfig, {}));
  }

  function writeScheduleConfig(config) {
    return writeJson(STORAGE_KEYS.scheduleConfig, normalizeScheduleConfig(config));
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
    normalizeClockState
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
      return `BC Parks HTTP time · RTT ${rtt} · offset ${formatOffset(snapshot.offsetMs)}`;
    }
    return "Local fallback · using device clock";
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

      #bc-park-tool-root .bc-park-tool-hud.is-primed .mini-icon,
      #bc-park-tool-root .bc-park-tool-hud.is-armed .mini-icon {
        display: inline-flex;
      }

      #bc-park-tool-root .bc-park-tool-hud.is-primed .mini-icon {
        background: #0f172a;
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
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 10px;
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
  const { HUD_CONSTANTS, STORAGE_KEYS } = root.constants;
  const { createElement, clamp } = root.dom;
  const { readClockState, writeClockState } = root.storage;

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
    const miniIcon = createElement("div", { className: "mini-icon" });
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
          miniIconText: "✓",
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
          miniIconText: "◷",
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
          miniIconText: "",
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
          miniIconText: "",
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
          miniIconText: "",
          miniIconKind: "",
          miniValueText: compactNow,
          miniTimeText: "",
          statusLabelText: "Cancelled",
          statusMainText: "Schedule cleared",
          statusDetailText: scheduleState.detail || "Outstanding timers and animation frames were cleared."
        };
      }

      return {
        miniIconText: "",
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

      miniIcon.hidden = !view.miniIconText;
      miniIcon.className = `mini-icon${view.miniIconKind ? ` is-${view.miniIconKind}` : ""}`;
      miniIcon.textContent = view.miniIconText || "";
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

    function resetActionButtons() {
      primeOnlyButton.textContent = "Prime only";
      primeOnlyButton.classList.remove("is-success");
      primeArmButton.textContent = "Prime and arm";
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
        hud.setScheduleState({
          status: "primed",
          nextClickMs: null,
          releaseMs: null,
          leadSeconds: null,
          schedulerErrorMs: null,
          message: "Primed",
          detail: "Page 1 is filled and ready."
        });
        primeOnlyButton.textContent = "✓ Primed";
        primeOnlyButton.classList.add("is-success");
        hud.minimize();
        await wait(450);
        setModalVisible(false);
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
        primeArmButton.textContent = "✓ Armed";
        primeArmButton.classList.add("is-success");
        hud.minimize();
        await wait(450);
        setModalVisible(false);
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
      resetActionButtons();
      hud.minimize();
      setModalVisible(true);
      renderBookingFields();
      renderPreview();
      setError("");
      setBusy(false);
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
