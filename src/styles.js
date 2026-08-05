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
