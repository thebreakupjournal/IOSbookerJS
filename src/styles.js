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
        --bcpark-font: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", sans-serif;
        --bcpark-bg: rgba(9, 14, 22, 0.92);
        --bcpark-bg-strong: rgba(7, 12, 18, 0.98);
        --bcpark-surface: rgba(255, 255, 255, 0.04);
        --bcpark-surface-strong: rgba(255, 255, 255, 0.07);
        --bcpark-border: rgba(255, 255, 255, 0.08);
        --bcpark-border-strong: rgba(255, 255, 255, 0.14);
        --bcpark-text: #f4f7fb;
        --bcpark-muted: #a6b0bc;
        --bcpark-accent: #14b8a6;
        --bcpark-accent-soft: rgba(20, 184, 166, 0.16);
        --bcpark-accent-strong: #2dd4bf;
        --bcpark-error: #ef7676;
        --bcpark-warning: #f5b84b;
        --bcpark-shadow: 0 28px 80px rgba(2, 8, 23, 0.42);
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
        background: linear-gradient(180deg, rgba(13, 19, 30, 0.96), rgba(7, 11, 17, 0.98));
        box-shadow: var(--bcpark-shadow);
        overflow: hidden;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        transition: width 180ms ease, height 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
      }

      #bc-park-tool-root .bc-park-tool-hud.is-minimized {
        width: 98px;
        height: 98px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        padding: 10px;
      }

      #bc-park-tool-root .bc-park-tool-hud.is-armed {
        border-color: rgba(20, 184, 166, 0.6);
        box-shadow: 0 0 0 1px rgba(20, 184, 166, 0.1), var(--bcpark-shadow);
      }

      #bc-park-tool-root .bc-park-tool-hud.is-error {
        border-color: rgba(239, 118, 118, 0.68);
        box-shadow: 0 0 0 1px rgba(239, 118, 118, 0.1), var(--bcpark-shadow);
      }

      #bc-park-tool-root .bc-park-tool-hud .bc-park-tool-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
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
        padding: 16px;
        display: grid;
        gap: 14px;
      }

      #bc-park-tool-root .bc-park-tool-clock {
        display: grid;
        gap: 6px;
        padding: 14px 14px 12px;
        border-radius: 18px;
        background: var(--bcpark-surface);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }

      #bc-park-tool-root .bc-park-tool-clock .clock-label {
        font-size: 0.76rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
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
        background: var(--bcpark-surface);
        border: 1px solid rgba(255, 255, 255, 0.05);
      }

      #bc-park-tool-root .bc-park-tool-status .status-label {
        font-size: 0.74rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
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
        color: #c3f6ea;
      }

      #bc-park-tool-root .bc-park-tool-hud.is-error .status-main {
        color: #ffd0d0;
      }

      #bc-park-tool-root .bc-park-tool-button {
        appearance: none;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 11px 14px;
        font: inherit;
        font-size: 0.9rem;
        font-weight: 650;
        color: #061018;
        background: linear-gradient(180deg, #67dccf, #14b8a6);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
      }

      #bc-park-tool-root .bc-park-tool-button.secondary {
        color: var(--bcpark-text);
        background: rgba(255, 255, 255, 0.035);
        box-shadow: none;
      }

      #bc-park-tool-root .bc-park-tool-button.danger {
        color: #fff;
        background: linear-gradient(180deg, #f08b8b, #ef7676);
      }

      #bc-park-tool-root .bc-park-tool-button:disabled {
        opacity: 0.55;
      }

      #bc-park-tool-root .bc-park-tool-mini {
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
        padding: 12px;
        text-align: center;
        cursor: pointer;
        touch-action: none;
      }

      #bc-park-tool-root .bc-park-tool-mini .mini-state {
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--bcpark-accent-strong);
      }

      #bc-park-tool-root .bc-park-tool-mini .mini-value {
        font-size: 1rem;
        font-weight: 700;
        margin-top: 2px;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }

      #bc-park-tool-root .bc-park-tool-mini .mini-time {
        font-size: 0.77rem;
        color: var(--bcpark-muted);
      }

      #bc-park-tool-root .bc-park-tool-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(2, 6, 10, 0.56);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
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
        background: linear-gradient(180deg, rgba(14, 20, 31, 0.98), rgba(8, 12, 18, 0.99));
        box-shadow: 0 36px 120px rgba(0, 0, 0, 0.48);
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
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 12px 14px;
        background: rgba(255, 255, 255, 0.04);
        color: var(--bcpark-text);
        font: inherit;
        outline: none;
        min-height: 48px;
      }

      #bc-park-tool-root .bc-park-tool-field input:focus,
      #bc-park-tool-root .bc-park-tool-field select:focus {
        border-color: rgba(20, 184, 166, 0.65);
        box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.14);
      }

      #bc-park-tool-root .bc-park-tool-field input[type="time"] {
        letter-spacing: 0.04em;
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
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: linear-gradient(180deg, rgba(20, 184, 166, 0.08), rgba(255, 255, 255, 0.03));
      }

      #bc-park-tool-root .bc-park-tool-preview .preview-label {
        font-size: 0.72rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--bcpark-muted);
      }

      #bc-park-tool-root .bc-park-tool-preview .preview-time {
        font-size: 1.12rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      #bc-park-tool-root .bc-park-tool-preview .preview-error {
        color: #ffd0d0;
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
        background: var(--bcpark-surface);
        border: 1px solid rgba(255, 255, 255, 0.06);
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
        grid-template-columns: minmax(0, 1.8fr) minmax(96px, 0.6fr);
        gap: 12px;
        align-items: end;
      }

      #bc-park-tool-root .bc-park-tool-error-banner {
        display: none;
        padding: 12px 14px;
        border-radius: 16px;
        color: #ffd0d0;
        background: rgba(255, 109, 109, 0.12);
        border: 1px solid rgba(255, 109, 109, 0.28);
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
