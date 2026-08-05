(() => {
  const bookmarklet = `javascript:(async()=>{try{const u="https://raw.githubusercontent.com/thebreakupjournal/IOSbookerJS/agent/bc-parks-bookmarklet/dist/park-pass.js?t="+Date.now();const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw new Error("HTTP "+r.status);const code=await r.text();(0,eval)(code)}catch(e){alert("Park Pass failed:\\n\\n"+(e.stack||e.message||String(e)))}})();`;

  const code = document.getElementById("bookmarklet-code");
  const copyButton = document.getElementById("copy-code");
  const copyStatus = document.getElementById("copy-status");
  const copyBookmarkletButton = document.getElementById("copy-bookmarklet");

  function setStatus(message) {
    copyStatus.textContent = message;
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
    selectCode();
    return document.execCommand("copy");
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

  code.value = bookmarklet;
  copyButton.addEventListener("click", handleCopy);
  copyBookmarkletButton.addEventListener("click", handleCopy);
})();
