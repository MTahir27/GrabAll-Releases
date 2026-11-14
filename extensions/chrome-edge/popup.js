const HOST_NAME = "com.graball.host";

document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const statusTextEl = document.getElementById("statusText");
  const helpBox = document.getElementById("helpBox");
  const extIdCode = document.getElementById("extIdCode");
  const copyIdBtn = document.getElementById("copyIdBtn");

  const globalEl = document.getElementById("globalEnabled");
  const overlayEl = document.getElementById("videoOverlayEnabled");
  const siteRow = document.getElementById("siteRow");
  const siteLabel = document.getElementById("siteLabel");
  const siteEl = document.getElementById("siteEnabled");
  const thresholdEl = document.getElementById("thresholdMb");

  const quickQualityEl = document.getElementById("quickQuality");
  const dlCurrentBtn = document.getElementById("dlCurrentBtn");
  const dlPlaylistBtn = document.getElementById("dlPlaylistBtn");
  const scanLinksBtn = document.getElementById("scanLinksBtn");
  const openAppBtn = document.getElementById("openAppBtn");
  const actionMsg = document.getElementById("actionMsg");

  let activeTab = null;

  function showActionFeedback(msg, isError = false) {
    actionMsg.textContent = msg;
    actionMsg.classList.toggle("err", isError);
  }

  if (chrome.runtime && chrome.runtime.id) {
    extIdCode.textContent = chrome.runtime.id;
  }

  copyIdBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(chrome.runtime.id || "");
      copyIdBtn.textContent = "Copied!";
      setTimeout(() => {
        copyIdBtn.textContent = "Copy ID";
      }, 1600);
    } catch {
      copyIdBtn.textContent = "Select text";
    }
  });

  chrome.runtime.sendNativeMessage(HOST_NAME, { type: "ping" }, (resp) => {
    if (chrome.runtime.lastError || !resp || !resp.ok) {
      statusEl.classList.remove("ok");
      statusEl.classList.add("err");
      statusTextEl.textContent = "Not connected";
      helpBox.classList.add("visible");
    } else {
      statusEl.classList.remove("err");
      statusEl.classList.add("ok");
      statusTextEl.textContent = `Connected ${resp.version || ""}`.trim();
      helpBox.classList.remove("visible");
    }
  });

  chrome.storage.local.get(
    {
      globalEnabled: true,
      videoOverlayEnabled: true,
      thresholdMb: 5,
      preferredQuality: "1080p",
      disabledSites: {},
    },
    (prefs) => {
      globalEl.checked = Boolean(prefs.globalEnabled);
      overlayEl.checked = prefs.videoOverlayEnabled !== false;
      thresholdEl.value = String(prefs.thresholdMb ?? 5);
      quickQualityEl.value = prefs.preferredQuality || "1080p";

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        activeTab = tabs?.[0] || null;
        const url = activeTab?.url || "";
        const isHttp = url.startsWith("http://") || url.startsWith("https://");

        dlCurrentBtn.disabled = !isHttp;
        scanLinksBtn.disabled = !isHttp;

        if (!isHttp) {
          showActionFeedback("Open any webpage or video tab to download.", true);
          return;
        }

        try {
          const parsed = new URL(url);
          const host = parsed.hostname.toLowerCase();
          if (host) {
            siteRow.style.display = "flex";
            siteLabel.textContent = `Enabled on ${host}`;
            siteEl.checked = !(prefs.disabledSites && prefs.disabledSites[host]);
            siteEl.addEventListener("change", () => {
              const next = { ...(prefs.disabledSites || {}) };
              if (siteEl.checked) delete next[host];
              else next[host] = true;
              chrome.storage.local.set({ disabledSites: next });
            });
          }
          if (parsed.searchParams.has("list") || parsed.pathname.includes("/playlist")) {
            dlPlaylistBtn.style.display = "inline-flex";
          }
        } catch {
          // Ignore malformed URL
        }
      });
    }
  );

  globalEl.addEventListener("change", () => {
    chrome.storage.local.set({ globalEnabled: globalEl.checked });
  });

  overlayEl.addEventListener("change", () => {
    chrome.storage.local.set({ videoOverlayEnabled: overlayEl.checked });
  });

  thresholdEl.addEventListener("change", () => {
    chrome.storage.local.set({ thresholdMb: Number(thresholdEl.value) });
  });

  quickQualityEl.addEventListener("change", () => {
    chrome.storage.local.set({ preferredQuality: quickQualityEl.value });
  });

  dlCurrentBtn.addEventListener("click", () => {
    if (!activeTab?.url) return;
    showActionFeedback("Sending to GrabAll…");
    chrome.runtime.sendMessage(
      {
        type: "graball_page_action",
        payload: {
          type: "add_url",
          url: activeTab.url,
          quality: quickQualityEl.value,
          title: activeTab.title || "Download",
          quick_start: true,
        },
      },
      (resp) => {
        if (chrome.runtime.lastError || !resp || !resp.ok) {
          showActionFeedback("Could not reach GrabAll. Check Settings → Browser.", true);
        } else {
          showActionFeedback("Sent to GrabAll! Starting download.");
        }
      }
    );
  });

  dlPlaylistBtn.addEventListener("click", () => {
    if (!activeTab?.url) return;
    showActionFeedback("Opening playlist in GrabAll…");
    chrome.runtime.sendMessage(
      {
        type: "graball_page_action",
        payload: {
          type: "add_url",
          url: activeTab.url,
          quality: quickQualityEl.value,
          title: activeTab.title || "Playlist",
          quick_start: false,
        },
      },
      (resp) => {
        if (chrome.runtime.lastError || !resp || !resp.ok) {
          showActionFeedback("Could not reach GrabAll. Check Settings → Browser.", true);
        } else {
          showActionFeedback("Playlist review opened in GrabAll.");
        }
      }
    );
  });

  scanLinksBtn.addEventListener("click", () => {
    if (!activeTab?.id) return;
    showActionFeedback("Scanning page links…");
    chrome.runtime.sendMessage(
      { type: "graball_scan_page", tabId: activeTab.id },
      (resp) => {
        if (chrome.runtime.lastError || !resp || !resp.ok) {
          showActionFeedback(resp?.error || "Could not send links to GrabAll.", true);
        } else {
          showActionFeedback(`Sent ${resp.count || ""} links to GrabAll!`.trim());
        }
      }
    );
  });

  if (openAppBtn) {
    openAppBtn.addEventListener("click", () => {
      showActionFeedback("Opening GrabAll…");
      chrome.runtime.sendMessage(
        {
          type: "graball_page_action",
          payload: { type: "open_app" },
        },
        (resp) => {
          if (chrome.runtime.lastError || !resp || !resp.ok) {
            showActionFeedback("Could not reach GrabAll. Check Settings → Browser.", true);
          } else {
            showActionFeedback("GrabAll opened.");
          }
        }
      );
    });
  }
});
