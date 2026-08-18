(() => {
  "use strict";

  const menuButton = document.querySelector(".menu-button");
  const mobileNav = document.querySelector(".mobile-nav");
  const progressBar = document.querySelector(".progress-bar");
  const shareButton = document.getElementById("open-share-sheet");
  const toast = document.querySelector(".toast");

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => toast.classList.remove("visible"), 1800);
  }

  function readCopyText(target) {
    if (!target) {
      return "";
    }
    if ("value" in target) {
      return String(target.value || "").trim();
    }
    return String(target.textContent || "").trim();
  }

  async function copyText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const temp = document.createElement("textarea");
    temp.value = text;
    temp.setAttribute("readonly", "");
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    temp.style.pointerEvents = "none";
    temp.style.left = "-9999px";
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    temp.setSelectionRange(0, temp.value.length);
    const copied = document.execCommand("copy");
    temp.remove();
    return copied;
  }

  menuButton?.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
  });

  mobileNav?.addEventListener("click", (event) => {
    if (!event.target.closest("a")) {
      return;
    }
    mobileNav.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
  });

  function updateHeaderProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const progress = max > 0 ? Math.min(100, Math.max(0, (scrollY / max) * 100)) : 0;
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }

  addEventListener("scroll", updateHeaderProgress, { passive: true });
  addEventListener("resize", updateHeaderProgress);
  updateHeaderProgress();

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy]");
    if (!button) {
      return;
    }

    const literal = button.dataset.copyText;
    const target = literal ? null : document.querySelector(button.dataset.copy);
    if (!literal && !target) {
      return;
    }

    const text = literal || readCopyText(target);
    try {
      await copyText(text);
      showToast("Copied to clipboard");
    } catch {
      const range = document.createRange();
      const selection = getSelection();
      if (target.tagName === "TEXTAREA") {
        target.focus();
        target.select();
      } else {
        range.selectNodeContents(target);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      showToast("Select and copy the highlighted text");
    }
  });

  shareButton?.addEventListener("click", async () => {
    const shareData = {
      title: document.title,
      text: "BC Parks booking guide",
      url: window.location.href
    };

    try {
      if (navigator.share && typeof navigator.share === "function") {
        await navigator.share(shareData);
        showToast("Share sheet opened");
        return;
      }

      await copyText(window.location.href);
      showToast("Page link copied");
    } catch {
      window.prompt("Copy this page link", window.location.href);
    }
  });

  document.querySelectorAll(".check-row input").forEach((box, index) => {
    box.checked = localStorage.getItem(`guide-check-${index}`) === "true";
    box.addEventListener("change", () => {
      localStorage.setItem(`guide-check-${index}`, String(box.checked));
    });
  });
})();
