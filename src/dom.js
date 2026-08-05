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
