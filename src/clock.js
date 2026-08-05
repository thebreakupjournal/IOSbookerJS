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
