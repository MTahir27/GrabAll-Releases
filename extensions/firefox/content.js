(() => {
  if (window.__graballOverlayInjected) return;
  window.__graballOverlayInjected = true;

  const HOST_ID = "graball-video-overlay-root";
  const MIN_W = 220;
  const MIN_H = 120;

  let prefs = {
    videoOverlayEnabled: true,
    preferredQuality: "1080p",
    disabledSites: {},
  };

  let hostEl = null;
  let shadow = null;
  let pillEl = null;
  let mainBtnEl = null;
  let dropBtnEl = null;
  let menuEl = null;
  let playlistItemEl = null;
  let currentVideo = null;
  let menuOpen = false;
  let pillHovered = false;
  let statusResetTimer = null;
  let hideTimer = null;
  let rafScheduled = false;
  let lastMouseX = -1;
  let lastMouseY = -1;

  function hostnameNow() {
    try {
      return window.location.hostname.toLowerCase();
    } catch {
      return "";
    }
  }

  function isDisabledHere() {
    if (prefs.videoOverlayEnabled === false) return true;
    const host = hostnameNow();
    return Boolean(host && prefs.disabledSites && prefs.disabledSites[host]);
  }

  function loadPrefs() {
    try {
      chrome.storage.local.get(
        { videoOverlayEnabled: true, preferredQuality: "1080p", disabledSites: {} },
        (res) => {
          if (res) {
            prefs = {
              videoOverlayEnabled: res.videoOverlayEnabled !== false,
              preferredQuality: res.preferredQuality || "1080p",
              disabledSites: res.disabledSites || {},
            };
            if (isDisabledHere()) hideOverlay(true);
          }
        }
      );
    } catch {
      // Ignore if extension context invalidated
    }
  }

  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.videoOverlayEnabled) {
        prefs.videoOverlayEnabled = changes.videoOverlayEnabled.newValue !== false;
      }
      if (changes.preferredQuality) {
        prefs.preferredQuality = changes.preferredQuality.newValue || "1080p";
      }
      if (changes.disabledSites) {
        prefs.disabledSites = changes.disabledSites.newValue || {};
      }
      if (isDisabledHere()) hideOverlay(true);
    });
  } catch {
    // Ignore
  }

  function permalinkPatternForHost(host) {
    if (host.includes("tiktok.com")) {
      return /\/@[^/]+\/video\/\d+|\/t\/[A-Za-z0-9]+/i;
    }
    if (host.includes("instagram.com") || host.includes("instagr.am")) {
      return /\/(reel|reels|p|tv)\/[A-Za-z0-9_-]+/i;
    }
    if (host.includes("facebook.com") || host.includes("fb.watch")) {
      return /\/(reel|reels|videos|posts)\/[A-Za-z0-9._-]+|\/watch\/?\?(?:.*&)?v=\d+|\/share\/(?:r|v|p)\/[A-Za-z0-9._-]+|\/video\.php\?(?:.*&)?v=\d+|\/(?:permalink|story)\.php/i;
    }
    if (host.includes("x.com") || host.includes("twitter.com")) {
      return /\/status\/\d+/i;
    }
    return null;
  }

  function findFeedVideoPermalink(video, host) {
    const pattern = permalinkPatternForHost(host);
    if (!pattern) return null;
    if (pattern.test(window.location.href)) return window.location.href;
    let tiktokVideoId = null;
    let tiktokAuthor = null;
    let el = video;
    for (let depth = 0; depth < 20 && el; depth += 1) {
      if (host.includes("tiktok.com") && !tiktokVideoId) {
        const selfId = el.id || "";
        const m = selfId.match(/(?:xgwrapper-\d+-|^)(\d{15,22})\b/);
        if (m) tiktokVideoId = m[1];
        if (!tiktokVideoId && typeof el.querySelector === "function") {
          const xg = el.querySelector('[id*="xgwrapper-"]');
          const xm = xg && xg.id && xg.id.match(/xgwrapper-\d+-(\d{15,22})/);
          if (xm) tiktokVideoId = xm[1];
        }
      }
      if (typeof el.querySelectorAll === "function") {
        const links = el.querySelectorAll("a[href]");
        for (const link of links) {
          const href = link.getAttribute("href");
          if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
          try {
            const abs = new URL(href, window.location.origin).href;
            if (pattern.test(abs)) return abs;
            if (host.includes("tiktok.com") && !tiktokAuthor) {
              const am = href.match(/^\/@([A-Za-z0-9._-]+)(?:\/|\?|$)/);
              if (am) tiktokAuthor = am[1];
            }
          } catch {
            // ignore malformed href
          }
        }
      }
      if (host.includes("tiktok.com") && tiktokVideoId && tiktokAuthor) {
        return `https://www.tiktok.com/@${tiktokAuthor}/video/${tiktokVideoId}`;
      }
      el = el.parentElement;
    }
    if (host.includes("tiktok.com") && tiktokVideoId) {
      return `https://www.tiktok.com/@${tiktokAuthor || "_"}/video/${tiktokVideoId}`;
    }
    const article =
      video && typeof video.closest === "function"
        ? video.closest('[role="article"], article')
        : null;
    if (article && typeof article.querySelectorAll === "function") {
      const links = article.querySelectorAll("a[href]");
      for (const link of links) {
        const href = link.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
        try {
          const abs = new URL(href, window.location.origin).href;
          if (pattern.test(abs)) return abs;
        } catch {
          // ignore
        }
      }
    }
    return null;
  }

  function resolveDownloadUrl(video, forPlaylist) {
    const pageUrl = window.location.href;
    if (forPlaylist) return pageUrl;
    const host = hostnameNow();
    const isExtractorSite =
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("facebook.com") ||
      host.includes("fb.watch") ||
      host.includes("instagram.com") ||
      host.includes("instagr.am") ||
      host.includes("tiktok.com") ||
      host.includes("x.com") ||
      host.includes("twitter.com") ||
      host.includes("vimeo.com") ||
      host.includes("dailymotion.com") ||
      host.includes("twitch.tv") ||
      host.includes("reddit.com") ||
      host.includes("linkedin.com");
    if (isExtractorSite) {
      return findFeedVideoPermalink(video, host) || pageUrl;
    }
    const src = (video && (video.currentSrc || video.src)) || "";
    if (
      (src.startsWith("http://") || src.startsWith("https://")) &&
      /\.(mp4|webm|mkv|mov|m4v)(\?|#|$)/i.test(src)
    ) {
      return src;
    }
    return pageUrl;
  }

  function resolveVideoTitle() {
    const ytTitle = document.querySelector("h1.ytd-watch-metadata yt-formatted-string, h1.title yt-formatted-string");
    const raw = (ytTitle && ytTitle.textContent) || document.title || "Video";
    const cleaned = raw
      .replace(/^\(\d+\+?\)\s*/, "")
      .replace(/\s*-\s*YouTube$/i, "")
      .trim();
    return cleaned || "Video";
  }

  function hasPlaylistInUrl() {
    try {
      const u = new URL(window.location.href);
      return u.searchParams.has("list") || u.pathname.includes("/playlist");
    } catch {
      return false;
    }
  }

  function ensureShadowUi() {
    if (hostEl && document.documentElement.contains(hostEl)) return;
    hostEl = document.createElement("div");
    hostEl.id = HOST_ID;
    hostEl.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;";

    shadow = hostEl.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .wrap {
          position: fixed;
          display: none;
          pointer-events: auto;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          user-select: none;
          z-index: 2147483647;
        }
        .wrap.visible {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .bar {
          display: inline-flex;
          align-items: stretch;
          background: rgba(17, 22, 20, 0.92);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 9px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.34);
          overflow: hidden;
          transition: transform 120ms ease, opacity 120ms ease;
        }
        .btn-main {
          all: unset;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 11px;
          font-size: 12px;
          font-weight: 600;
          color: #f4f7f5;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn-main:hover {
          background: rgba(29, 138, 78, 0.32);
        }
        .logo-dot {
          width: 15px;
          height: 15px;
          border-radius: 4px;
          background: linear-gradient(135deg, #27b96a, #157740);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .btn-drop {
          all: unset;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 8px;
          border-left: 1px solid rgba(255, 255, 255, 0.14);
          color: #cbd5cf;
          cursor: pointer;
          font-size: 11px;
        }
        .btn-drop:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
        .menu {
          display: none;
          flex-direction: column;
          min-width: 205px;
          margin-top: 6px;
          padding: 5px;
          background: #161b18;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 10px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
        }
        .menu.open {
          display: flex;
        }
        .menu-item {
          all: unset;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 7px 10px;
          border-radius: 6px;
          font-size: 12px;
          color: #e9eeeb;
          cursor: pointer;
        }
        .menu-item:hover {
          background: rgba(39, 185, 106, 0.22);
          color: #ffffff;
        }
        .tag {
          font-size: 10px;
          color: #8ee0b0;
          background: rgba(39, 185, 106, 0.16);
          padding: 1px 6px;
          border-radius: 99px;
          font-weight: 600;
        }
        .sep {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 4px 6px;
        }
      </style>
      <div class="wrap" id="wrap">
        <div class="bar">
          <button class="btn-main" id="mainBtn" type="button" title="Download this video with GrabAll">
            <span class="logo-dot">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v8M4.5 7L8 10.5 11.5 7M3 13.5h10" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span id="btnText">Download with GrabAll</span>
          </button>
          <button class="btn-drop" id="dropBtn" type="button" title="Choose quality">&#9662;</button>
        </div>
        <div class="menu" id="menu">
          <button class="menu-item" data-quality="best" data-quick="1" type="button">
            <span>Best Quality (up to 4K)</span><span class="tag">MP4</span>
          </button>
          <button class="menu-item" data-quality="1080p" data-quick="1" type="button">
            <span>1080p Full HD</span><span class="tag">MP4</span>
          </button>
          <button class="menu-item" data-quality="720p" data-quick="1" type="button">
            <span>720p HD</span><span class="tag">MP4</span>
          </button>
          <button class="menu-item" data-quality="480p" data-quick="1" type="button">
            <span>480p Standard</span><span class="tag">MP4</span>
          </button>
          <button class="menu-item" data-quality="mp3" data-quick="1" type="button">
            <span>Audio Only</span><span class="tag">MP3</span>
          </button>
          <div class="sep"></div>
          <button class="menu-item" id="playlistItem" data-playlist="1" type="button" style="display:none">
            <span>Download Full Playlist…</span><span class="tag">LIST</span>
          </button>
          <button class="menu-item" data-quality="1080p" data-quick="0" type="button">
            <span>Open in GrabAll Dialog…</span>
          </button>
        </div>
      </div>
    `;

    (document.body || document.documentElement).appendChild(hostEl);

    pillEl = shadow.getElementById("wrap");
    mainBtnEl = shadow.getElementById("mainBtn");
    dropBtnEl = shadow.getElementById("dropBtn");
    menuEl = shadow.getElementById("menu");
    playlistItemEl = shadow.getElementById("playlistItem");

    pillEl.addEventListener("mouseenter", () => {
      pillHovered = true;
      clearTimeout(hideTimer);
    });
    pillEl.addEventListener("mouseleave", () => {
      pillHovered = false;
      scheduleHide();
    });

    mainBtnEl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerDownload({
        quality: prefs.preferredQuality || "1080p",
        quickStart: true,
        playlist: false,
      });
    });

    dropBtnEl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      menuOpen = !menuOpen;
      playlistItemEl.style.display = hasPlaylistInUrl() ? "flex" : "none";
      menuEl.classList.toggle("open", menuOpen);
    });

    menuEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".menu-item");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const isPlaylist = btn.dataset.playlist === "1";
      const quality = btn.dataset.quality || "1080p";
      const quickStart = !isPlaylist && btn.dataset.quick === "1";
      menuOpen = false;
      menuEl.classList.remove("open");
      triggerDownload({ quality, quickStart, playlist: isPlaylist });
    });
  }

  function setButtonLabel(text) {
    if (!shadow) return;
    const lbl = shadow.getElementById("btnText");
    if (lbl) lbl.textContent = text;
  }

  let sendingDownload = false;
  function triggerDownload({ quality, quickStart, playlist }) {
    if (sendingDownload) return;
    sendingDownload = true;
    const url = resolveDownloadUrl(currentVideo, playlist);
    const title = resolveVideoTitle();
    setButtonLabel("Sending…");
    clearTimeout(statusResetTimer);

    try {
      chrome.runtime.sendMessage(
        {
          type: "graball_page_action",
          payload: {
            type: "add_url",
            url,
            quality,
            title,
            quick_start: Boolean(quickStart),
            playlist: Boolean(playlist),
          },
        },
        (resp) => {
          sendingDownload = false;
          if (chrome.runtime.lastError || !resp || !resp.ok) {
            setButtonLabel("Open GrabAll App");
          } else {
            setButtonLabel(quickStart ? "✓ Downloading in GrabAll" : "✓ Opened in GrabAll");
          }
          statusResetTimer = setTimeout(() => {
            setButtonLabel("Download with GrabAll");
          }, 2600);
        }
      );
    } catch {
      sendingDownload = false;
      setButtonLabel("Reload page");
    }
  }

  function findQualifyingVideoAtPoint(x, y) {
    const videos = document.querySelectorAll("video");
    let best = null;
    let bestArea = 0;
    for (const v of videos) {
      const rect = v.getBoundingClientRect();
      if (rect.width < MIN_W || rect.height < MIN_H) continue;
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        const area = rect.width * rect.height;
        if (area > bestArea) {
          best = v;
          bestArea = area;
        }
      }
    }
    return best;
  }

  function positionOverlayOverVideo(video) {
    if (!video || !pillEl) return;
    const rect = video.getBoundingClientRect();
    if (rect.width < MIN_W || rect.height < MIN_H) {
      hideOverlay(true);
      return;
    }
    const right = Math.max(12, window.innerWidth - rect.right + 12);
    const top = Math.max(10, rect.top + 10);
    pillEl.style.top = `${top}px`;
    pillEl.style.right = `${right}px`;
    pillEl.classList.add("visible");
  }

  function hideOverlay(force) {
    if (!pillEl) return;
    if (!force && (menuOpen || pillHovered)) return;
    menuOpen = false;
    if (menuEl) menuEl.classList.remove("open");
    pillEl.classList.remove("visible");
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!menuOpen && !pillHovered) {
        const hoveredVideo = findQualifyingVideoAtPoint(lastMouseX, lastMouseY);
        if (!hoveredVideo) hideOverlay(false);
      }
    }, 900);
  }

  function handleMouseMove(e) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    if (rafScheduled || isDisabledHere()) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      if (pillHovered || menuOpen) return;
      const vid = findQualifyingVideoAtPoint(lastMouseX, lastMouseY);
      if (vid) {
        clearTimeout(hideTimer);
        currentVideo = vid;
        ensureShadowUi();
        positionOverlayOverVideo(vid);
      } else {
        scheduleHide();
      }
    });
  }

  // Briefly reveal the overlay when a main video starts playing so users notice it immediately
  function handlePlay(e) {
    if (isDisabledHere()) return;
    const target = e.target;
    if (!(target instanceof HTMLVideoElement)) return;
    const rect = target.getBoundingClientRect();
    if (rect.width < MIN_W || rect.height < MIN_H) return;
    currentVideo = target;
    ensureShadowUi();
    positionOverlayOverVideo(target);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!menuOpen && !pillHovered) {
        const hovered = findQualifyingVideoAtPoint(lastMouseX, lastMouseY);
        if (!hovered) hideOverlay(false);
      }
    }, 3500);
  }

  document.addEventListener("mousemove", handleMouseMove, { passive: true });
  document.addEventListener("play", handlePlay, true);
  window.addEventListener(
    "scroll",
    () => {
      if (currentVideo && pillEl && pillEl.classList.contains("visible")) {
        positionOverlayOverVideo(currentVideo);
      }
    },
    { passive: true }
  );
  document.addEventListener("click", (e) => {
    if (menuOpen && hostEl && !hostEl.contains(e.target)) {
      menuOpen = false;
      if (menuEl) menuEl.classList.remove("open");
    }
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.type !== "graball_resolve_active_video") return false;
    const videos = Array.from(document.querySelectorAll("video"));
    let best = currentVideo;
    let bestScore = -1;
    for (const v of videos) {
      const r = v.getBoundingClientRect();
      const visW = Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0));
      const visH = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
      const area = visW * visH;
      if (area <= 0) continue;
      const score = area + (!v.paused ? 1000000 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    sendResponse({
      url: resolveDownloadUrl(best, false),
      title: resolveVideoTitle(),
    });
    return true;
  });

  loadPrefs();
})();
