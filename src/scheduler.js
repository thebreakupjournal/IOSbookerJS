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
