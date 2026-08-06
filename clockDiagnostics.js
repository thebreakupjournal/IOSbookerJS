(() => {
  const SERVER_TIME_ENDPOINT = 'https://camping.bcparks.ca/api/transactionlocation/servertime';
  const SERVER_TIME_ZONE = 'America/Los_Angeles';
  const SERVER_TIME_TIMEOUT_MS = 1500;
  const SYNC_INTERVAL_MS = 15000;
  const TICK_INTERVAL_MS = 250;
  let waitForClockSnapshot = async () => null;

  function formatTime(ms, timeZone) {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      timeZone,
      timeZoneName: 'short'
    }).format(new Date(ms));
  }

  function formatLocalTime(ms) {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    }).format(new Date(ms));
  }

  function formatDrift(ms) {
    const sign = ms >= 0 ? '+' : '-';
    const abs = Math.abs(ms);

    if (abs < 1000) {
      return `${sign}${Math.round(abs)} ms`;
    }

    return `${sign}${(abs / 1000).toFixed(3)} s`;
  }

  async function readServerTime(timeoutMs = SERVER_TIME_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(SERVER_TIME_ENDPOINT, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Server time request failed with ${response.status}`);
      }

      const raw = (await response.text()).trim();
      const iso = raw.replace(/^"/, '').replace(/"$/, '');
      const serverMs = Date.parse(iso);

      if (Number.isNaN(serverMs)) {
        throw new Error(`Unable to parse server time payload: ${raw}`);
      }

      return serverMs;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function initClockDiagnostics({
    serverTimeId = 'bcParksServerTime',
    localTimeId = 'localClockTime',
    driftId = 'clockDrift',
    zoneId = 'bcParksTimeZone',
    syncId = 'clockLastSync'
  } = {}) {
    const serverEl = document.getElementById(serverTimeId);
    const localEl = document.getElementById(localTimeId);
    const driftEl = document.getElementById(driftId);
    const zoneEl = document.getElementById(zoneId);
    const syncEl = document.getElementById(syncId);

    if (!serverEl || !localEl || !driftEl) {
      return () => {};
    }

    let syncServerMs = null;
    let syncLocalMs = null;
    let syncStampMs = null;
    let syncing = false;
    let syncState = 'loading';
    let initialSyncPromise = null;

    function paintUnavailable(message) {
      if (syncServerMs == null || syncLocalMs == null) {
        syncState = 'error';
        serverEl.textContent = 'Unavailable';
        driftEl.textContent = message;
        if (zoneEl) zoneEl.textContent = 'BC Parks server time unavailable';
        if (syncEl) syncEl.textContent = 'Last sync: not available';
        return;
      }

      syncState = 'stale';
      updateUi();
      driftEl.textContent = `${message} (stale)`;
      if (zoneEl) zoneEl.textContent = 'BC Parks server time unavailable';
    }

    function paintLocalFallback() {
      syncState = 'fallback';
      syncServerMs = null;
      syncLocalMs = null;
      syncStampMs = Date.now();
      updateUi();
      if (zoneEl) zoneEl.textContent = 'Using local clock fallback';
      if (driftEl) driftEl.textContent = 'Drift: local fallback';
      if (syncEl) syncEl.textContent = `Last sync: ${new Date(syncStampMs).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
      })}`;
    }

    function updateUi() {
      const nowMs = Date.now();
      localEl.textContent = formatLocalTime(nowMs);

      if (syncState === 'error') {
        serverEl.textContent = 'Unavailable';
        driftEl.textContent = 'Drift: unavailable';
        if (zoneEl) zoneEl.textContent = 'BC Parks server time unavailable';
        return;
      }

      if (syncState === 'fallback') {
        serverEl.textContent = formatTime(nowMs, SERVER_TIME_ZONE);
        localEl.textContent = formatLocalTime(nowMs);
        if (zoneEl) zoneEl.textContent = 'Using local clock fallback';
        driftEl.textContent = 'Drift: local fallback';
        if (syncEl && syncStampMs != null) {
          syncEl.textContent = `Last sync: ${new Date(syncStampMs).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit'
          })}`;
        }
        return;
      }

      if (syncServerMs == null || syncLocalMs == null) {
        serverEl.textContent = 'Loading...';
        driftEl.textContent = 'Drift: --';
        if (zoneEl) zoneEl.textContent = 'Fetching BC Parks server time...';
        return;
      }

      const serverNowMs = syncServerMs + (nowMs - syncLocalMs);
      serverEl.textContent = formatTime(serverNowMs, SERVER_TIME_ZONE);
      const driftLabel = syncState === 'stale' ? 'Drift vs local clock (stale sync)' : 'Drift vs local clock';
      driftEl.textContent = `${driftLabel}: ${formatDrift(serverNowMs - nowMs)}`;
      if (zoneEl) zoneEl.textContent = syncState === 'stale'
        ? `Time zone: ${SERVER_TIME_ZONE.replace('_', ' ')} (stale)`
        : `Time zone: ${SERVER_TIME_ZONE.replace('_', ' ')}`;
      if (syncEl && syncStampMs != null) {
        syncEl.textContent = `Last sync: ${new Date(syncStampMs).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit'
        })}`;
      }
    }

    function getServerClockEstimateMs() {
      if (syncServerMs == null || syncLocalMs == null) {
        return null;
      }
      return syncServerMs + (Date.now() - syncLocalMs);
    }

    async function sync() {
      if (syncing) return;
      syncing = true;

      try {
        const serverMs = await readServerTime();
        syncServerMs = serverMs;
        syncLocalMs = Date.now();
        syncStampMs = syncLocalMs;
        syncState = 'ready';
        updateUi();
      } catch (err) {
        console.warn('[ClockDiagnostics] Failed to load BC Parks server time:', err);
        paintLocalFallback();
      } finally {
        syncing = false;
      }
    }

    updateUi();
    initialSyncPromise = sync();

    const tickTimer = setInterval(updateUi, TICK_INTERVAL_MS);
    const syncTimer = setInterval(sync, SYNC_INTERVAL_MS);

    waitForClockSnapshot = async function({ timeoutMs = 1200, fallbackToLocal = true } = {}) {
      const currentServerMs = getServerClockEstimateMs();
      if (currentServerMs != null) {
        return { source: 'server', ms: currentServerMs };
      }

      if (initialSyncPromise) {
        await Promise.race([
          initialSyncPromise,
          new Promise((resolve) => setTimeout(resolve, timeoutMs))
        ]);
      }

      const serverMs = getServerClockEstimateMs();
      if (serverMs != null) {
        return { source: 'server', ms: serverMs };
      }

      if (fallbackToLocal) {
        return { source: 'local', ms: Date.now() };
      }

      return null;
    };
    if (window.BCParksClockDiagnostics) {
      window.BCParksClockDiagnostics.waitForClockSnapshot = waitForClockSnapshot;
    }

    return () => {
      clearInterval(tickTimer);
      clearInterval(syncTimer);
    };
  }

  window.BCParksClockDiagnostics = {
    initClockDiagnostics,
    waitForClockSnapshot
  };
})();
