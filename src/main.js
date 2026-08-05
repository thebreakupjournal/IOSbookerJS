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
