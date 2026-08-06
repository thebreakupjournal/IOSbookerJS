// options.js - refactored + Fast Mode + mutual exclusions

window.addEventListener('DOMContentLoaded', async () => {
  window.BCParksClockDiagnostics?.initClockDiagnostics();

  // ---------- DOM refs ----------
  const testingCheckbox          = document.getElementById('testingCheckbox');
  const testingTimingPanel       = document.getElementById('testingTimingPanel');
  const calcTimingBtn            = document.getElementById('calcTimingBtn');
  const clearTimingBtn           = document.getElementById('clearTimingBtn');
  const testingStatsEl           = document.getElementById('testingStats');
  const samplesTbody             = document.getElementById('samplesTbody');

  const autoNavigateCheckbox     = document.getElementById('autoNavigateCheckbox');
  const autoStartBookingCheckbox = document.getElementById('autoStartBookingCheckbox');
  const manualModeCheckbox       = document.getElementById('manualModeCheckbox');
  const retryEnabledCheckbox     = document.getElementById('retryEnabledCheckbox');
  const advancedDetails          = document.querySelector('details.advanced-section');
  const fastModeCheckbox   = document.getElementById('fastModeCheckbox');
  const fastLeadSecondsInp = document.getElementById('fastLeadSeconds');
  const fastLeadRow        = document.getElementById('fastLeadRow');
  const page2SubmitDelayInp = document.getElementById('page2SubmitDelayMs');

  // ---------- Helpers ----------
  function setTestingPanelVisible(show) {
    if (testingTimingPanel) testingTimingPanel.style.display = show ? 'block' : 'none';
  }
  function paintFastModePanel(on) {
    if (!fastLeadRow) return;
    fastLeadRow.style.display = on ? 'block' : 'none';
  }

  if (advancedDetails) {
    chrome.storage.local.get({ optionsAdvancedOpen: false }, ({ optionsAdvancedOpen }) => {
      advancedDetails.open = !!optionsAdvancedOpen;
    });
    advancedDetails.addEventListener('toggle', () => {
      chrome.storage.local.set({ optionsAdvancedOpen: advancedDetails.open });
    });
  }

  async function persistConfigPartial(partial) {
    const { bookingConfig = {} } = await chrome.storage.local.get('bookingConfig');
    const merged = { ...bookingConfig, ...partial };
    await chrome.storage.local.set({ bookingConfig: merged });
    // Let BG recompute timers/schedules if relevant.
    if (merged.testing) {
      chrome.runtime.sendMessage({ action: 'stopRefreshingManually' }, () => {});
    } else {
      chrome.runtime.sendMessage({ action: 'updateTimes' }, () => {});
    }
  }

  // Stats helpers for Testing panel
  function mean(a){ return a.reduce((x,y)=>x+y,0)/a.length; }
  function stdev(a){
    const m = mean(a);
    return Math.sqrt(a.reduce((s,v)=>s+(v-m)*(v-m),0)/(a.length-1));
  }
  const tLower = {
    2:{0.10:-1.886,0.05:-2.920,0.025:-4.303,0.01:-6.965},
    3:{0.10:-1.638,0.05:-2.353,0.025:-3.182,0.01:-4.541},
    4:{0.10:-1.533,0.05:-2.132,0.025:-2.776,0.01:-3.747},
    5:{0.10:-1.476,0.05:-2.015,0.025:-2.571,0.01:-3.365},
    6:{0.10:-1.440,0.05:-1.943,0.025:-2.447,0.01:-3.143},
    7:{0.10:-1.415,0.05:-1.895,0.025:-2.365,0.01:-2.998},
    8:{0.10:-1.397,0.05:-1.860,0.025:-2.306,0.01:-2.896},
    9:{0.10:-1.383,0.05:-1.833,0.025:-2.262,0.01:-2.821},
    10:{0.10:-1.372,0.05:-1.812,0.025:-2.228,0.01:-2.764}
  };
  function recommendLeadSeconds(samplesMs, alpha=0.05, jitterBuf=0.2){
    const n = samplesMs.length;
    if (n < 3) return 0;
    const df = Math.max(2, Math.min(10, n-1));
    const m = mean(samplesMs)/1000;
    const s = stdev(samplesMs)/1000;
    const predStd = s * Math.sqrt(1 + 1/n);
    const t = tLower[df]?.[alpha] ?? -1.64;
    const L = m + t * predStd;
    return Math.max(0, L - jitterBuf);
  }
  function floorLeadSeconds(samplesMs, jitterBuf=0.2){
    const minS = Math.min(...samplesMs)/1000;
    return Math.max(0, minS - jitterBuf);
  }
  function renderSamples(rows){
    if (!samplesTbody) return;
    samplesTbody.innerHTML = '';
    rows.forEach((s, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td style=\'padding:6px 4px; border-top:1px solid #eee;\'>' + (i + 1) + '</td>' +
        '<td style=\'padding:6px 4px; border-top:1px solid #eee;\'>' + (s.ms / 1000).toFixed(2) + '</td>' +
        '<td style=\'padding:6px 4px; border-top:1px solid #eee;\'>' + new Date(s.ts).toLocaleString() + '</td>' +
        '<td style=\'padding:6px 4px; border-top:1px solid #eee;\'>' +
          '<button type=\'button\' class=\'remove-sample-btn\' data-sample-index=\'' + i + '\' style=\'padding:4px 8px; font-size:12px; cursor:pointer;\'>Remove</button>' +
        '</td>';
      samplesTbody.appendChild(tr);
    });
  }

  async function removeTurnstileSample(index) {
    const { turnstileSamples = [] } = await chrome.storage.local.get(['turnstileSamples']);
    const next = turnstileSamples.filter((_, i) => i !== index);
    const payload = { turnstileSamples: next };
    if (next.length) {
      payload.lastTurnstileMs = next[next.length - 1].ms;
      payload.turnstileAvgMs = next.reduce((sum, sample) => sum + sample.ms, 0) / next.length;
    } else {
      payload.lastTurnstileMs = null;
      payload.turnstileAvgMs = null;
    }
    await chrome.storage.local.set(payload);
    await refreshTimingPanel(false);
  }

  async function refreshTimingPanel(calc=false){
    const { turnstileSamples = [] } = await chrome.storage.local.get(['turnstileSamples']);
    renderSamples(turnstileSamples);

    if (!testingStatsEl) return;
    if (!turnstileSamples.length) {
      testingStatsEl.textContent = 'No samples yet. Run in Testing Mode to collect timings.';
      return;
    }
    const xs = turnstileSamples.map(s => s.ms);
    const n  = xs.length;
    const mS = mean(xs)/1000;
    const sS = n > 1 ? stdev(xs)/1000 : 0;

    let line = `Samples: ${n} | avg = ${mS.toFixed(2)}s`;
    if (n > 1) line += ` | sd = ${sS.toFixed(2)}s`;

    if (calc && n >= 3) {
      const L5   = recommendLeadSeconds(xs, 0.05, 0.2);
      const L1   = recommendLeadSeconds(xs, 0.01, 0.2);
      const floor= floorLeadSeconds(xs, 0.2);
      const approx = '~'; // approx
      line += ` | recommended lead (${approx}5%): ${L5.toFixed(2)}s | (${approx}1%): ${L1.toFixed(2)}s | floor: ${floor.toFixed(2)}s`;
    }
    testingStatsEl.textContent = line;
  }

  // ---------- Load config & paint UI ----------  // ---------- Load config & paint UI ----------
  try {
    const storageKeys = ['bookingConfig', 'autoNavigate', 'autoStartBooking'];
    chrome.storage.local.get(storageKeys, async (result) => {
      let config = result.bookingConfig;
      if (!config) {
        const response = await fetch(chrome.runtime.getURL("config.json"));
        config = await response.json();
      }

      // Core fields
      document.getElementById("firstName").value = config.firstName || "";
      document.getElementById("lastName").value  = config.lastName  || "";
      document.getElementById("email").value     = config.email     || "";
      document.getElementById("countryOfResidence").value = config.countryOfResidence || config.country || "Canada";

      // Testing + Manual
      testingCheckbox.checked = !!config.testing;
      retryEnabledCheckbox.checked = typeof config.retryEnabled === 'boolean' ? config.retryEnabled : true;
      manualModeCheckbox.checked = !!config.manualMode;
      setTestingPanelVisible(testingCheckbox.checked); // initial paint
      testingCheckbox.addEventListener('change', () => setTestingPanelVisible(testingCheckbox.checked));
      retryEnabledCheckbox?.addEventListener('change', async (e) => {
        const val = !!e.target.checked;
        config.retryEnabled = val;
        await chrome.storage.local.set({ bookingConfig: { ...config, retryEnabled: val } });
        chrome.runtime.sendMessage({ action: 'setRetryEnabled', retryEnabled: val }, () => {});
      });


      // Passes/time
      document.getElementById("numberOfPasses").value = config.numberOfPasses || 1;
      document.getElementById("visitTime").value      = config.visitTime || "DAY";

      // Date
      const months = {
        January: "01", February: "02", March: "03", April: "04",
        May: "05", June: "06", July: "07", August: "08",
        September: "09", October: "10", November: "11", December: "12"
      };
      const mm = months[config.monthName] || "01";
      const dd = String(config.dateNum).padStart(2, "0");
      const yyyy = config.year;
      document.getElementById("datePicker").value = `${yyyy}-${mm}-${dd}`;

      // Misc toggles
      document.getElementById("SmsBool").checked = !!config.smsEnabled;

      // Auto toggles (use storage overrides if present)
      const autoNavigate      = (typeof result.autoNavigate === 'boolean') ? result.autoNavigate : !!config.autoNavigate;
      const autoStartBooking  = (typeof result.autoStartBooking === 'boolean') ? result.autoStartBooking : !!config.autoStartBooking;
      autoNavigateCheckbox.checked = !!autoNavigate;
      autoStartBookingCheckbox.checked = !!autoStartBooking;

      autoNavigateCheckbox.addEventListener('change', async (e) => {
        const val = e.target.checked;
        await chrome.storage.local.set({ autoNavigate: val });
      });
      autoStartBookingCheckbox.addEventListener('change', async (e) => {
        const val = e.target.checked;
        await chrome.storage.local.set({ autoStartBooking: val });
      });

      // Park/pass logic
      const parkSelect           = document.getElementById("parkSelect");
      const passTypeGroup        = document.getElementById("passTypeGroup");
      const passTypeSelect       = document.getElementById("passTypeSelect");
      const numberOfPassesGroup  = document.querySelector(".field-group #numberOfPasses").closest(".field-group");
      const numberOfPassesInput  = document.getElementById("numberOfPasses");

      const passTypes = {
        garibaldi: [
          { value: "1", label: "Cheakamus - Parking" },
          { value: "2", label: "Diamond Head - Parking" },
          { value: "3", label: "Rubble Creek - Parking" }
        ],
        golden_ears: [
          { value: "1", label: "Alouette Lake Boat Launch - Parking" },
          { value: "2", label: "Alouette Lake South Beach - Parking" },
          { value: "3", label: "Gold Creek - Parking" },
          { value: "4", label: "West Canyon Trailhead - Parking" }
        ],
        joffre_lakes: [
          { value: "1", label: "Joffre Lakes - Trail" }
        ]
      };

      const visitTimeOptions = {
        "garibaldi_1": [{ value: "AM", label: "AM" }, { value: "PM", label: "PM" }],
        "garibaldi_2": [{ value: "DAY", label: "DAY" }],
        "garibaldi_3": [{ value: "DAY", label: "DAY" }],
        "golden_ears_1": [{ value: "DAY", label: "DAY" }],
        "golden_ears_2": [{ value: "AM", label: "AM" }, { value: "PM", label: "PM" }],
        "golden_ears_3": [{ value: "AM", label: "AM" }, { value: "PM", label: "PM" }],
        "golden_ears_4": [{ value: "AM", label: "AM" }, { value: "PM", label: "PM" }],
        "joffre_lakes_1": [{ value: "DAY", label: "DAY" }]
      };

      function updatePassTypes() {
        const parkValue = parkSelect.value;
        const options = passTypes[parkValue] || [];

        passTypeGroup.style.display = "block";
        passTypeSelect.innerHTML = "";

        options.forEach(({ value, label }) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = label;
          passTypeSelect.appendChild(option);
        });

        if (options.length === 0) {
          const option = document.createElement("option");
          option.textContent = "No pass types available";
          option.disabled = true;
          option.selected = true;
          passTypeSelect.appendChild(option);
        }

        if (parkValue === "garibaldi" || parkValue === "golden_ears") {
          numberOfPassesGroup.style.display = "none";
          numberOfPassesInput.value = 1;
        } else if (parkValue === "joffre_lakes") {
          numberOfPassesGroup.style.display = "block";
          numberOfPassesInput.value = 4;
        }
      }
      window.updatePassTypesWrapper = () => updatePassTypes();

      function updateVisitTimeOptions() {
        const key = `${parkSelect.value}_${passTypeSelect.value}`;
        const visitTimeSelect = document.getElementById("visitTime");

        visitTimeSelect.innerHTML = "";
        const options = visitTimeOptions[key] || [];

        options.forEach(({ value, label }) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = label;
          visitTimeSelect.appendChild(option);
        });

        if (options.length > 0) {
          visitTimeSelect.value = options[0].value;
        }
      }
      if (config.park) parkSelect.value = config.park;
      updatePassTypes();
      if (config.passTypeNum) {
        passTypeSelect.value = config.passTypeNum;
      } else if (passTypeSelect.options.length > 0) {
        passTypeSelect.selectedIndex = 0;
      }
      updateVisitTimeOptions();
      window.updateVisitTimeOptionsWrapper = () => updateVisitTimeOptions();

      parkSelect.addEventListener("change", () => {
        updatePassTypes();
        updateVisitTimeOptions();
      });
      passTypeSelect.addEventListener("change", updateVisitTimeOptions);

      // Fast Mode - initial paint from config
      const initialFastMode = !!config.fastMode;
      let initialLead = 0;
      if (typeof config.fastLeadSeconds === 'number') {
        initialLead = config.fastLeadSeconds;
      } else if (typeof config.fastLeadMs === 'number') {
        initialLead = Math.max(0, Math.round(config.fastLeadMs) / 1000);
      }
      if (fastModeCheckbox) fastModeCheckbox.checked = initialFastMode;
      if (fastLeadSecondsInp) fastLeadSecondsInp.value = initialLead || '';
      const initialPage2Delay = Number.isFinite(config.page2SubmitDelayMs)
        ? Math.max(0, Math.round(config.page2SubmitDelayMs))
        : 10000;
      if (page2SubmitDelayInp) page2SubmitDelayInp.value = initialPage2Delay || '';
      paintFastModePanel(initialFastMode);

      // Mutual exclusion on initial paint:
      if (fastModeCheckbox?.checked) {
        // Fast mode disables manual
        manualModeCheckbox.disabled = true;
      } else {
        manualModeCheckbox.disabled = false;
        if (fastModeCheckbox) fastModeCheckbox.disabled = false;
      }

    });
  } catch (err) {
    console.error("Failed to load config or storage:", err);
  }

  // ---------- Fast Mode: live persistence ----------
  async function persistFastModeToConfig(partial) {
    const { bookingConfig = {} } = await chrome.storage.local.get('bookingConfig');
    const updated = { ...bookingConfig, ...partial };

    // ensure both seconds and ms present for BG convenience
    if (typeof updated.fastLeadSeconds === 'number') {
      updated.fastLeadMs = Math.max(0, Math.floor(updated.fastLeadSeconds * 1000));
    } else if (typeof updated.fastLeadMs === 'number' && updated.fastLeadMs > 0) {
      updated.fastLeadSeconds = updated.fastLeadMs / 1000;
    }

    await chrome.storage.local.set({ bookingConfig: updated });

    // Ask BG to re-schedule with the new settings
    if (updated.testing) {
      chrome.runtime.sendMessage({ action: 'stopRefreshingManually' }, () => {});
    } else {
      chrome.runtime.sendMessage({ action: 'updateTimes' }, () => {});
    }
  }

  fastModeCheckbox?.addEventListener('change', async (e) => {
    const on = !!e.target.checked;
    paintFastModePanel(on);
    const leadSec = parseFloat(fastLeadSecondsInp?.value) || 0;

    // Mutual exclusion: Fast ON disables Manual; Fast OFF re-enables Manual
    if (on) {
      manualModeCheckbox.checked = false;
      manualModeCheckbox.disabled = true;
      await persistConfigPartial({ manualMode: false }); // persist manual off
    } else {
      manualModeCheckbox.disabled = false;
    }

    await persistFastModeToConfig({ fastMode: on, fastLeadSeconds: leadSec });
  });

  fastLeadSecondsInp?.addEventListener('change', async (e) => {
    const raw = e.target.value.trim();
    const val = raw === '' ? 0 : Math.max(0, parseFloat(raw));
    e.target.value = (val || 0).toString();
    const on = !!fastModeCheckbox?.checked;
    await persistFastModeToConfig({ fastMode: on, fastLeadSeconds: val });
  });

  page2SubmitDelayInp?.addEventListener('change', async (e) => {
    const raw = e.target.value.trim();
    const val = raw === '' ? 10000 : Math.max(0, Math.round(parseFloat(raw) || 0));
    e.target.value = String(val);
    await persistConfigPartial({ page2SubmitDelayMs: val });
  });

  // Manual Mode toggle: if turned ON, force Fast Mode OFF (mutual exclusion both ways)
  manualModeCheckbox?.addEventListener('change', async (e) => {
    const manualOn = !!e.target.checked;
    if (manualOn && fastModeCheckbox) {
      fastModeCheckbox.checked = false;
      paintFastModePanel(false);
      // also re-enable the manual checkbox (it is the active one)
      fastModeCheckbox.disabled = false;
      await persistFastModeToConfig({ fastMode: false, fastLeadSeconds: 0 });
    }
    await persistConfigPartial({ manualMode: manualOn });
  });
  document.getElementById('updateBookingInfoBtn')?.addEventListener('click', async () => {
    const firstName       = document.getElementById('firstName').value;
    const lastName        = document.getElementById('lastName').value;
    const email           = document.getElementById('email').value;
    const countryOfResidence = (document.getElementById('countryOfResidence').value || 'Canada').trim() || 'Canada';
    const numberOfPasses  = parseInt(document.getElementById('numberOfPasses').value, 10);
    const visitTime       = document.getElementById('visitTime').value;
    const park            = document.getElementById('parkSelect').value;
      const passTypeNum     = document.getElementById('passTypeSelect').value;
      const passTypeText    = document.getElementById('passTypeSelect').selectedOptions[0]?.text || 'Unknown Pass Type';

    const dateString      = document.getElementById('datePicker').value;
    const testing         = testingCheckbox.checked;
    const smsEnabled      = document.getElementById('SmsBool').checked;
      const autoNavigate    = autoNavigateCheckbox.checked;
      const autoStartBooking= autoStartBookingCheckbox.checked;
      const manualMode      = manualModeCheckbox.checked;
      const retryEnabled     = !!retryEnabledCheckbox?.checked;

    // Fast Mode values from UI
    const fastMode        = !!fastModeCheckbox?.checked;
    const fastLeadSeconds = Math.max(0, parseFloat(fastLeadSecondsInp?.value || '0') || 0);
    const fastLeadMs      = Math.floor(fastLeadSeconds * 1000);
    const page2SubmitDelayMs = Math.max(0, Math.round(parseFloat(page2SubmitDelayInp?.value || '10000') || 10000));

    const [year, month, day] = dateString.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    const dayOfWeek = dateObj.toLocaleString('en-US', { weekday: 'long' });
    const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
    const dateNum   = dateObj.getDate();
    const yearNum   = dateObj.getFullYear();

    const parkNames = {
      garibaldi: 'Garibaldi Provincial Park',
      golden_ears: 'Golden Ears Provincial Park',
      joffre_lakes: 'Joffre Lakes Provincial Park'
    };
    const parkName = parkNames[park] || 'Unknown Park';

      const configData = {
      firstName,
      lastName,
      email,
      countryOfResidence,
      numberOfPasses,
      visitTime,
      park,
      passTypeNum,
      passTypeText,
      dayOfWeek,
      monthName,
      dateNum,
      year: yearNum,
      testing,
      smsEnabled,
      autoNavigate,
      autoStartBooking,
      manualMode,
      // Fast Mode
      fastMode,
      retryEnabled,
      fastLeadSeconds,
      fastLeadMs,
      page2SubmitDelayMs
    };

    try {
      await chrome.storage.local.set({ bookingConfig: configData });
      console.log("Booking info saved to chrome.storage.local.");
    } catch (err) {
      console.error("Failed to save to local storage:", err);
      alert("Error saving booking info locally.");
      return;
    }

    // Tell BG to reschedule now that config changed
    if (testing) {
      chrome.runtime.sendMessage({ action: 'stopRefreshingManually' }, () => {});
    } else {
      chrome.runtime.sendMessage({ action: 'updateTimes' }, () => {});
    }

    const message =
      `Booking ${numberOfPasses} pass(es) at ${parkName} for [ ${passTypeText}, (${visitTime}) ] ` +
      `for ${firstName} ${lastName} on ${dayOfWeek} ${monthName} ${dateNum} ${yearNum}, ` +
      `sending confirmation to ${email} [testing mode = ${testing}, SMS enabled = ${smsEnabled}, ` +
      `fast mode = ${fastMode ? `ON (lead ${fastLeadSeconds.toFixed(2)}s)` : 'OFF'}]`;

    const confirmationDiv = document.getElementById('confirmationMessage');
    if (confirmationDiv) confirmationDiv.innerText = message;
    else alert(message);
  });

  // ---------- Testing panel: buttons ----------  // ---------- Testing panel: buttons ----------
  calcTimingBtn?.addEventListener('click', () => refreshTimingPanel(true));
  clearTimingBtn?.addEventListener('click', async () => {
    await chrome.storage.local.set({ turnstileSamples: [], lastTurnstileMs: null, turnstileAvgMs: null });
    refreshTimingPanel(false);
  });

  samplesTbody?.addEventListener('click', async (event) => {
    const btn = event.target.closest?.('.remove-sample-btn');
    if (!btn) return;

    const index = Number(btn.dataset.sampleIndex);
    if (!Number.isInteger(index)) return;

    if (!confirm('Remove this sample from the testing stats?')) return;
    await removeTurnstileSample(index);
  });

  // Paint list (light) once on load; full stats only when user clicks
  refreshTimingPanel(false);
});


