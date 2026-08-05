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
        --bcpark-bg: rgba(8, 14, 22, 0.92);
        --bcpark-bg-strong: rgba(7, 12, 19, 0.98);
        --bcpark-border: rgba(129, 247, 201, 0.18);
        --bcpark-border-strong: rgba(129, 247, 201, 0.32);
        --bcpark-text: #ecf4fb;
        --bcpark-muted: #90a4b8;
        --bcpark-accent: #42d6a2;
        --bcpark-accent-strong: #1ed18c;
        --bcpark-error: #ff6d6d;
        --bcpark-warning: #ffbe57;
        --bcpark-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
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
        left: 24px;
        top: 24px;
        pointer-events: auto;
        transform: translate3d(0, 0, 0);
      }

      #bc-park-tool-root .bc-park-tool-hud {
        width: 352px;
        border-radius: 26px;
        border: 1px solid var(--bcpark-border);
        background: linear-gradient(180deg, rgba(10, 18, 28, 0.94), rgba(6, 11, 18, 0.98));
        box-shadow: var(--bcpark-shadow);
        overflow: hidden;
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        transition: width 160ms ease, height 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
      }

      #bc-park-tool-root .bc-park-tool-hud.is-minimized {
        width: 104px;
        height: 104px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        padding: 8px;
      }

      #bc-park-tool-root .bc-park-tool-hud.is-armed {
        border-color: rgba(45, 214, 123, 0.55);
        box-shadow: 0 0 0 2px rgba(45, 214, 123, 0.16), var(--bcpark-shadow);
      }

      #bc-park-tool-root .bc-park-tool-hud.is-error {
        border-color: rgba(255, 109, 109, 0.58);
        box-shadow: 0 0 0 2px rgba(255, 109, 109, 0.16), var(--bcpark-shadow);
      }

      #bc-park-tool-root .bc-park-tool-hud .bc-park-tool-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
      }

      #bc-park-tool-root .bc-park-tool-hud .bc-park-tool-title {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      #bc-park-tool-root .bc-park-tool-hud .bc-park-tool-title strong {
        font-size: 0.9rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      #bc-park-tool-root .bc-park-tool-hud .bc-park-tool-subtitle {
        font-size: 0.78rem;
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
        padding: 0 16px 16px;
        display: grid;
        gap: 12px;
      }

      #bc-park-tool-root .bc-park-tool-clock {
        display: grid;
        gap: 4px;
        padding: 14px 14px 12px;
        border-radius: 20px;
        background: linear-gradient(180deg, rgba(63, 87, 119, 0.1), rgba(18, 26, 35, 0.6));
        border: 1px solid rgba(255, 255, 255, 0.06);
      }

      #bc-park-tool-root .bc-park-tool-clock .clock-label {
        font-size: 0.74rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--bcpark-muted);
      }

      #bc-park-tool-root .bc-park-tool-clock .clock-time {
        font-size: 1.3rem;
        font-weight: 700;
        letter-spacing: -0.03em;
      }

      #bc-park-tool-root .bc-park-tool-clock .clock-meta {
        font-size: 0.78rem;
        color: var(--bcpark-muted);
        line-height: 1.35;
      }

      #bc-park-tool-root .bc-park-tool-status {
        display: grid;
        gap: 6px;
        padding: 12px 14px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
      }

      #bc-park-tool-root .bc-park-tool-status .status-label {
        font-size: 0.72rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--bcpark-muted);
      }

      #bc-park-tool-root .bc-park-tool-status .status-main {
        font-size: 1rem;
        font-weight: 650;
      }

      #bc-park-tool-root .bc-park-tool-status .status-detail {
        font-size: 0.84rem;
        color: var(--bcpark-muted);
      }

      #bc-park-tool-root .bc-park-tool-hud.is-armed .status-main {
        color: #a8f7cb;
      }

      #bc-park-tool-root .bc-park-tool-hud.is-error .status-main {
        color: #ffb5b5;
      }

      #bc-park-tool-root .bc-park-tool-button {
        appearance: none;
        border: 0;
        border-radius: 14px;
        padding: 10px 12px;
        font: inherit;
        font-size: 0.86rem;
        font-weight: 650;
        color: #061018;
        background: linear-gradient(180deg, #82f1c7, #42d6a2);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.32);
      }

      #bc-park-tool-root .bc-park-tool-button.secondary {
        color: var(--bcpark-text);
        background: rgba(255, 255, 255, 0.05);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
      }

      #bc-park-tool-root .bc-park-tool-button.danger {
        color: #fff;
        background: linear-gradient(180deg, #ff8a8a, #ff6464);
      }

      #bc-park-tool-root .bc-park-tool-button:disabled {
        opacity: 0.55;
      }

      #bc-park-tool-root .bc-park-tool-mini {
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
        padding: 10px;
        text-align: center;
        cursor: pointer;
        touch-action: none;
      }

      #bc-park-tool-root .bc-park-tool-mini .mini-state {
        font-size: 0.8rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--bcpark-accent);
      }

      #bc-park-tool-root .bc-park-tool-mini .mini-value {
        font-size: 1rem;
        font-weight: 700;
        margin-top: 2px;
        letter-spacing: -0.03em;
      }

      #bc-park-tool-root .bc-park-tool-mini .mini-time {
        font-size: 0.82rem;
        color: var(--bcpark-muted);
      }

      #bc-park-tool-root .bc-park-tool-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(2, 6, 10, 0.6);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        display: grid;
        place-items: center;
        pointer-events: auto;
        padding: 20px;
      }

      #bc-park-tool-root .bc-park-tool-modal {
        width: min(720px, 100%);
        max-height: min(92vh, 920px);
        overflow: auto;
        border-radius: 28px;
        border: 1px solid var(--bcpark-border-strong);
        background:
          radial-gradient(circle at top right, rgba(66, 214, 162, 0.14), transparent 20%),
          linear-gradient(180deg, rgba(12, 20, 32, 0.98), rgba(7, 11, 18, 0.99));
        box-shadow: 0 36px 120px rgba(0, 0, 0, 0.52);
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
        font-size: clamp(1.4rem, 2.8vw, 2rem);
        letter-spacing: -0.03em;
      }

      #bc-park-tool-root .bc-park-tool-modal-body {
        padding: 20px 22px 22px;
        display: grid;
        gap: 18px;
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
        gap: 8px;
      }

      #bc-park-tool-root .bc-park-tool-field label {
        font-size: 0.78rem;
        font-weight: 650;
        letter-spacing: 0.12em;
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
      }

      #bc-park-tool-root .bc-park-tool-field input:focus,
      #bc-park-tool-root .bc-park-tool-field select:focus {
        border-color: rgba(66, 214, 162, 0.6);
        box-shadow: 0 0 0 4px rgba(66, 214, 162, 0.14);
      }

      #bc-park-tool-root .bc-park-tool-preview {
        display: grid;
        gap: 6px;
        padding: 14px 16px;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
      }

      #bc-park-tool-root .bc-park-tool-preview .preview-label {
        font-size: 0.72rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--bcpark-muted);
      }

      #bc-park-tool-root .bc-park-tool-preview .preview-time {
        font-size: 1.1rem;
        font-weight: 700;
      }

      #bc-park-tool-root .bc-park-tool-preview .preview-error {
        color: #ffb5b5;
      }

      #bc-park-tool-root .bc-park-tool-note {
        font-size: 0.86rem;
        color: var(--bcpark-muted);
        line-height: 1.45;
      }

      #bc-park-tool-root .bc-park-tool-note.warn {
        color: #ffd899;
      }

      #bc-park-tool-root .bc-park-tool-modal-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 10px;
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
