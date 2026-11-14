const HOST_NAME = "com.graball.host";

const DEFAULT_PREFS = {
  globalEnabled: true,
  videoOverlayEnabled: true,
  thresholdMb: 5,
  disabledSites: {},
};

function getPrefs() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_PREFS, (res) => resolve(res));
  });
}

function hostnameOf(rawUrl) {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

const RECENT_ADD_URLS = new Map();
function isDuplicateAddUrl(payload) {
  if (!payload || payload.type !== "add_url" || !payload.url) return false;
  const now = Date.now();
  for (const [k, ts] of RECENT_ADD_URLS.entries()) {
    if (now - ts > 5000) RECENT_ADD_URLS.delete(k);
  }
  const dedupKey = `${payload.playlist ? "pl:" : ""}${payload.url}`;
  const prev = RECENT_ADD_URLS.get(dedupKey);
  if (prev && now - prev < 5000) return true;
  RECENT_ADD_URLS.set(dedupKey, now);
  return false;
}

async function exportCookiesTxtForUrl(rawUrl) {
  if (!chrome.cookies?.getAll || !rawUrl || !rawUrl.startsWith("http")) return null;
  try {
    const cookies = await chrome.cookies.getAll({ url: rawUrl });
    if (!cookies || cookies.length === 0) return null;
    const lines = ["# Netscape HTTP Cookie File"];
    for (const c of cookies) {
      const domain = c.domain || "";
      const includeSub = domain.startsWith(".") ? "TRUE" : "FALSE";
      const path = c.path || "/";
      const secure = c.secure ? "TRUE" : "FALSE";
      const expiry = c.expirationDate ? Math.floor(c.expirationDate) : 0;
      lines.push(`${domain}\t${includeSub}\t${path}\t${secure}\t${expiry}\t${c.name}\t${c.value}`);
    }
    return lines.join("\n");
  } catch {
    return null;
  }
}

async function sendToHost(payload) {
  if (isDuplicateAddUrl(payload)) {
    return { ok: true, deduplicated: true };
  }
  const enriched = { ...payload };
  if (enriched.type === "add_url" && enriched.url && !enriched.cookies_txt) {
    const cookiesTxt = await exportCookiesTxtForUrl(enriched.url);
    if (cookiesTxt) {
      enriched.cookies_txt = cookiesTxt;
    }
  }
  return new Promise((resolve) => {
    chrome.runtime.sendNativeMessage(HOST_NAME, enriched, (resp) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(resp || { ok: false });
      }
    });
  });
}

async function scanAndSendTabLinks(tabId) {
  if (!tabId) return { ok: false, error: "No active tab." };
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const urls = [];
        document
          .querySelectorAll("a[href], video[src], video source[src], audio[src], audio source[src]")
          .forEach((el) => {
            const val = el.href || el.src || el.getAttribute("src") || "";
            if (val.startsWith("http://") || val.startsWith("https://")) {
              urls.push(val);
            }
          });
        return Array.from(new Set(urls));
      },
    });
    const urls = results?.[0]?.result || [];
    if (urls.length === 0) {
      return { ok: false, error: "No downloadable links found on this page." };
    }
    const resp = await sendToHost({ type: "add_batch", urls });
    return { ...resp, count: urls.length };
  } catch (err) {
    return { ok: false, error: err?.message || "Cannot scan this page." };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "graball-link",
      title: "Download link with GrabAll",
      contexts: ["link"],
    });
    chrome.contextMenus.create({
      id: "graball-media",
      title: "Download video/audio with GrabAll",
      contexts: ["video", "audio"],
    });
    chrome.contextMenus.create({
      id: "graball-page-links",
      title: "Download all links on this page",
      contexts: ["page"],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "graball-link" && info.linkUrl) {
    await sendToHost({ type: "add_url", url: info.linkUrl });
    return;
  }
  if (info.menuItemId === "graball-media") {
    const targetUrl = info.srcUrl || info.pageUrl || tab?.url || "";
    if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
      await sendToHost({ type: "add_url", url: targetUrl, title: tab?.title, quick_start: true });
    }
    return;
  }
  if (info.menuItemId === "graball-page-links" && tab && tab.id) {
    await scanAndSendTabLinks(tab.id);
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return false;
  if (msg.type === "graball_page_action" && msg.payload) {
    sendToHost(msg.payload).then(sendResponse);
    return true;
  }
  if (msg.type === "graball_scan_page") {
    scanAndSendTabLinks(msg.tabId).then(sendResponse);
    return true;
  }
  return false;
});

chrome.downloads.onCreated.addListener(async (item) => {
  const prefs = await getPrefs();
  if (!prefs.globalEnabled) return;

  const url = item.finalUrl || item.url || "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) return;

  const host = hostnameOf(item.referrer || url);
  if (host && prefs.disabledSites && prefs.disabledSites[host]) {
    return;
  }

  const thresholdBytes = (Number(prefs.thresholdMb) || 0) * 1024 * 1024;
  if (thresholdBytes > 0 && item.fileSize > 0 && item.fileSize < thresholdBytes) {
    return;
  }

  const ping = await sendToHost({ type: "ping" });
  if (!ping.ok) return;

  chrome.downloads.cancel(item.id, () => {
    chrome.downloads.erase({ id: item.id });
  });
  await sendToHost({ type: "add_url", url, quick_start: true });
});
