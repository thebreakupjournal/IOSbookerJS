(() => {
  const bookmarklet = `javascript:(async()=>{try{const u="https://raw.githubusercontent.com/thebreakupjournal/IOSbookerJS/agent/bc-parks-bookmarklet/dist/park-pass.js?t="+Date.now();const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw new Error("HTTP "+r.status);const code=await r.text();(0,eval)(code)}catch(e){alert("Park Pass failed:\\n\\n"+(e.stack||e.message||String(e)))}})();`;

  const code = document.getElementById("bookmarklet-code");
  const copyButton = document.getElementById("copy-code");
  const copyBookmarkletButton = document.getElementById("copy-bookmarklet");
  const copyStatus = document.getElementById("copy-status");
  const bookmarkStatus = document.getElementById("bookmark-status");
  const shareButton = document.getElementById("open-share-sheet");
  const copyLinkButton = document.getElementById("copy-page-link");
  const progressFill = document.getElementById("progress-fill");
  const progressTitle = document.getElementById("progress-title");
  const progressMeta = document.getElementById("progress-meta");
  const stepStrip = document.getElementById("step-strip");
  const stepButtons = Array.from(document.querySelectorAll(".step-chip"));
  const stepSections = Array.from(document.querySelectorAll("[data-step-index]"));

  const steps = [
    {
      key: "bookmark",
      title: "Step 1 of 5",
      meta: "Bookmark the guide page.",
      progress: 20
    },
    {
      key: "loader",
      title: "Step 2 of 5",
      meta: "Copy the bookmarklet loader.",
      progress: 40
    },
    {
      key: "open",
      title: "Step 3 of 5",
      meta: "Open the BC Parks reservation page.",
      progress: 60
    },
    {
      key: "prime",
      title: "Step 4 of 5",
      meta: "Set release time and prime the booking.",
      progress: 80
    },
    {
      key: "test",
      title: "Step 5 of 5",
      meta: "Run tests and review timing results.",
      progress: 100
    }
  ];

  function setStatus(message) {
    copyStatus.textContent = message;
  }

  function setBookmarkStatus(message) {
    if (bookmarkStatus) {
      bookmarkStatus.textContent = message;
    }
  }

  function selectCode() {
    code.focus();
    code.select();
    code.setSelectionRange(0, code.value.length);
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

  async function handleCopy() {
    try {
      await copyText(bookmarklet);
      setStatus("Copied. Paste it into the bookmark you keep for BC Parks.");
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy code";
        setStatus("Ready to copy.");
      }, 1800);
    } catch (error) {
      setStatus("Copy failed. The code is selected for manual copy.");
      selectCode();
      window.prompt("Copy this bookmarklet", bookmarklet);
      console.warn("[BCParkGuide] Copy failed", error);
    }
  }

  async function handleShare() {
    const shareData = {
      title: document.title,
      text: "BC Parks setup guide",
      url: window.location.href
    };

    try {
      if (navigator.share && typeof navigator.share === "function") {
        await navigator.share(shareData);
        setBookmarkStatus("Share sheet opened. Use Safari's bookmark flow from there.");
        return;
      }

      await copyText(window.location.href);
      setBookmarkStatus("Share sheet unavailable here. Page link copied instead.");
      if (copyLinkButton) {
        copyLinkButton.textContent = "Link copied";
        window.setTimeout(() => {
          copyLinkButton.textContent = "Copy page link";
        }, 1600);
      }
    } catch (error) {
      console.warn("[BCParkGuide] Share failed", error);
      setBookmarkStatus("Share failed. Copy the page link and bookmark it from Safari.");
      window.prompt("Copy this page link", window.location.href);
    }
  }

  async function handleCopyLink() {
    try {
      await copyText(window.location.href);
      setBookmarkStatus("Page link copied. Paste it into Safari or share it from there.");
      copyLinkButton.textContent = "Link copied";
      window.setTimeout(() => {
        copyLinkButton.textContent = "Copy page link";
      }, 1600);
    } catch (error) {
      console.warn("[BCParkGuide] Copy link failed", error);
      setBookmarkStatus("Could not copy the link. The URL is selected in the prompt.");
      window.prompt("Copy this page link", window.location.href);
    }
  }

  function setActiveStep(index) {
    const clamped = Math.max(0, Math.min(steps.length - 1, index));
    const step = steps[clamped];

    progressFill.style.width = `${step.progress}%`;
    progressTitle.textContent = step.title;
    progressMeta.textContent = step.meta;

    stepButtons.forEach((button, i) => {
      const active = i === clamped;
      button.classList.toggle("is-active", active);
      if (active) {
        button.setAttribute("aria-current", "step");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }

  function scrollToStep(key) {
    const target = document.getElementById(key);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) {
      return;
    }

    const index = Number(visible.target.dataset.stepIndex);
    if (Number.isFinite(index)) {
      setActiveStep(index);
    }
  }, {
    rootMargin: "-20% 0px -55% 0px",
    threshold: [0.12, 0.24, 0.4, 0.6, 0.8]
  });

  code.value = bookmarklet;
  copyButton.addEventListener("click", handleCopy);
  copyBookmarkletButton.addEventListener("click", handleCopy);
  if (shareButton) {
    shareButton.addEventListener("click", handleShare);
  }
  if (copyLinkButton) {
    copyLinkButton.addEventListener("click", handleCopyLink);
  }

  stepButtons.forEach((button, index) => {
    button.addEventListener("click", () => scrollToStep(steps[index].key));
  });

  stepSections.forEach((section) => observer.observe(section));

  setActiveStep(0);

  if (stepStrip) {
    stepStrip.addEventListener("keydown", (event) => {
      const currentIndex = stepButtons.findIndex((button) => button.classList.contains("is-active"));
      if (event.key === "ArrowRight") {
        event.preventDefault();
        const next = Math.min(stepButtons.length - 1, currentIndex + 1);
        stepButtons[next].focus();
        scrollToStep(steps[next].key);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const prev = Math.max(0, currentIndex - 1);
        stepButtons[prev].focus();
        scrollToStep(steps[prev].key);
      }
    });
  }
})();
