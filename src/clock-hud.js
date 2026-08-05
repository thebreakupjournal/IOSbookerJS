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
    const miniState = createElement("div", { className: "mini-state" });
    const miniValue = createElement("div", { className: "mini-value" });
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
      const width = state.minimized ? 136 : 352;
      const height = state.minimized ? 56 : 260;
      return {
        x: Math.max(16, window.innerWidth - width - 18),
        y: 16
      };
    }

    function clampPosition(nextX, nextY) {
      const rect = hud.getBoundingClientRect();
      const width = rect.width || (state.minimized ? 136 : 352);
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
      if (scheduleState.status === "armed" && scheduleState.nextClickMs != null) {
        const nextClick = clockService.formatClockTime(scheduleState.nextClickMs);
        return {
          miniStateText: "",
          miniValueText: clockService.formatClockTime(nowMs).replace(/\.\d{3}(?=\s)/, ""),
          miniTimeText: "",
          statusLabelText: "Armed",
          statusMainText: `Next click: ${nextClick}`,
          statusDetailText: `T- ${root.dom.formatCountdownSeconds(scheduleState.nextClickMs - nowMs)}`
        };
      }

      if (scheduleState.status === "clicked") {
        return {
          miniStateText: "",
          miniValueText: clockService.formatClockTime(nowMs).replace(/\.\d{3}(?=\s)/, ""),
          miniTimeText: "",
          statusLabelText: "Clicked",
          statusMainText: "Next click completed",
          statusDetailText: scheduleState.schedulerErrorMs != null ? `Scheduler error: ${root.dom.formatSignedMs(scheduleState.schedulerErrorMs)}` : "Page 1 Next was clicked."
        };
      }

      if (scheduleState.status === "error") {
        return {
          miniStateText: "",
          miniValueText: clockService.formatClockTime(nowMs).replace(/\.\d{3}(?=\s)/, ""),
          miniTimeText: "",
          statusLabelText: "Error",
          statusMainText: "Schedule error",
          statusDetailText: scheduleState.message || "An unknown scheduling error occurred."
        };
      }

      if (scheduleState.status === "cancelled") {
        return {
          miniStateText: "",
          miniValueText: clockService.formatClockTime(nowMs).replace(/\.\d{3}(?=\s)/, ""),
          miniTimeText: "",
          statusLabelText: "Cancelled",
          statusMainText: "Schedule cleared",
          statusDetailText: scheduleState.detail || "Outstanding timers and animation frames were cleared."
        };
      }

      return {
        miniStateText: "",
        miniValueText: clockService.formatClockTime(nowMs).replace(/\.\d{3}(?=\s)/, ""),
        miniTimeText: "",
        statusLabelText: "Ready",
        statusMainText: "Set the release time, then prime Page 1 when you're ready.",
        statusDetailText: `Source: ${clockService.formatSourceLine(clockSnapshot)}`
      };
    }

    function render() {
      hud.classList.toggle("is-minimized", state.minimized);
      hud.classList.toggle("is-armed", scheduleState.status === "armed");
      hud.classList.toggle("is-error", scheduleState.status === "error");

      miniLayer.hidden = !state.minimized;
      expandedLayer.hidden = state.minimized;

      const nowMs = clockSnapshot.nowMs || Date.now();
      const view = formatScheduleView(nowMs);

      miniState.hidden = true;
      miniTime.hidden = true;
      miniState.textContent = view.miniStateText;
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

    miniLayer.append(
      createElement("div", { className: "mini-state" }, []),
      createElement("div", { className: "mini-value" }, []),
      createElement("div", { className: "mini-time" }, [])
    );

    miniLayer.replaceChildren(miniState, miniValue, miniTime);

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
