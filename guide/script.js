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

  function initCarousel(carousel) {
    const viewport = carousel.querySelector("[data-carousel-viewport]");
    const prevButton = carousel.querySelector("[data-carousel-prev]");
    const nextButton = carousel.querySelector("[data-carousel-next]");
    const dots = carousel.querySelector("[data-carousel-dots]");
    const slides = Array.from(carousel.querySelectorAll(".carousel-slide"));

    if (!viewport || slides.length <= 1) {
      prevButton?.remove();
      nextButton?.remove();
      dots?.remove();
      return;
    }

    let currentIndex = 0;
    const dotButtons = [];

    function slideWidth() {
      return Math.max(1, viewport.clientWidth);
    }

    function clampIndex(index) {
      return Math.max(0, Math.min(slides.length - 1, index));
    }

    function updateState(index) {
      const nextIndex = clampIndex(index);
      currentIndex = nextIndex;

      if (prevButton) {
        prevButton.disabled = nextIndex === 0;
      }
      if (nextButton) {
        nextButton.disabled = nextIndex === slides.length - 1;
      }

      dotButtons.forEach((dot, dotIndex) => {
        dot.classList.toggle("is-active", dotIndex === nextIndex);
        dot.setAttribute("aria-current", dotIndex === nextIndex ? "true" : "false");
      });
    }

    function scrollToIndex(index, behavior = "smooth") {
      const nextIndex = clampIndex(index);
      viewport.scrollTo({
        left: nextIndex * slideWidth(),
        behavior
      });
      updateState(nextIndex);
    }

    if (dots) {
      dots.innerHTML = "";
      slides.forEach((_, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot";
        dot.setAttribute("aria-label", `Show screenshot ${index + 1}`);
        dot.addEventListener("click", () => scrollToIndex(index));
        dots.appendChild(dot);
        dotButtons.push(dot);
      });
    }

    let rafId = 0;
    const syncFromScroll = () => {
      if (rafId) {
        return;
      }
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const nextIndex = clampIndex(Math.round(viewport.scrollLeft / slideWidth()));
        if (nextIndex !== currentIndex) {
          updateState(nextIndex);
        }
      });
    };

    prevButton?.addEventListener("click", () => scrollToIndex(currentIndex - 1));
    nextButton?.addEventListener("click", () => scrollToIndex(currentIndex + 1));

    viewport.addEventListener("scroll", syncFromScroll, { passive: true });
    viewport.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollToIndex(currentIndex - 1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollToIndex(currentIndex + 1);
      }
    });

    addEventListener("resize", () => scrollToIndex(currentIndex, "auto"));
    updateState(0);
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

  document.querySelectorAll("[data-carousel]").forEach(initCarousel);

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
