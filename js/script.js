/* ==========================================================================
   Timeline Studio — Portfolio scripts
   Vanilla JS, no dependencies.
   ========================================================================== */

/* --------------------------------------------------------------------------
   CONFIGURATION
   --------------------------------------------------------------------------
   FORM_ENDPOINT
   The contact form is FRONT-END ONLY until this is set. To receive inquiries,
   paste the POST URL of a form service or your own backend here, e.g.:
     Formspree: "https://formspree.io/f/your-form-id"
     Getform:   "https://getform.io/f/your-form-id"
   The form is sent as FormData with an "Accept: application/json" header,
   which these services support. Leave it empty to use the email fallback.
   -------------------------------------------------------------------------- */
const FORM_ENDPOINT = "";
const CONTACT_EMAIL = "timelinestudio.eg@gmail.com";
const THEME_KEY = "timeline-studio-theme";

/* --------------------------------------------------------------------------
   Pre-paint setup (runs immediately, before the body is parsed)
   -------------------------------------------------------------------------- */
const root = document.documentElement;
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (error) {
    return null;
  }
}

// Dark is the default; light only if the visitor chose it before.
root.dataset.theme = readStoredTheme() === "light" ? "light" : "dark";

// Hide reveal elements only when JS runs and motion is allowed,
// so content is always visible without JS or with reduced motion.
if ("IntersectionObserver" in window && !reduceMotionQuery.matches) {
  root.classList.add("js-reveal");
}

/* --------------------------------------------------------------------------
   DOM-ready setup
   -------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initMobileNav();
  initHeaderState();
  initActiveNav();
  initReveal();
  initTimecode();
  initProjectLinks();
  initPlaceholderLinks();
  initContactForm();
  setCurrentYear();
});

/* --------------------------------------------------------------------------
   Theme toggle
   -------------------------------------------------------------------------- */
function initThemeToggle() {
  const toggle = document.querySelector(".theme-toggle");
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!toggle) return;

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    const isLight = theme === "light";
    toggle.setAttribute("aria-pressed", String(isLight));
    toggle.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
    if (metaTheme) metaTheme.setAttribute("content", isLight ? "#F4F7F9" : "#080F14");
  };

  applyTheme(root.dataset.theme);

  toggle.addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (error) {
      /* storage unavailable — theme still applies for this visit */
    }
  });
}

/* --------------------------------------------------------------------------
   Mobile navigation
   -------------------------------------------------------------------------- */
function initMobileNav() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;

  const desktopQuery = window.matchMedia("(min-width: 1121px)");

  const setOpen = (open, { returnFocus = false } = {}) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);

    if (open) {
      const firstLink = nav.querySelector("a");
      if (firstLink) firstLink.focus();
    } else if (returnFocus) {
      toggle.focus();
    }
  };

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  // Close after choosing a destination
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a") && nav.classList.contains("is-open")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false, { returnFocus: true });
    }
  });

  // Reset when resizing up to the desktop layout
  desktopQuery.addEventListener("change", (event) => {
    if (event.matches) setOpen(false);
  });
}

/* --------------------------------------------------------------------------
   Header background after scrolling past the top
   -------------------------------------------------------------------------- */
function initHeaderState() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  let ticking = false;
  const update = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
    ticking = false;
  };

  update();
  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });
}

/* --------------------------------------------------------------------------
   Active navigation link + animated indicator
   -------------------------------------------------------------------------- */
function initActiveNav() {
  const nav = document.getElementById("site-nav");
  const indicator = nav && nav.querySelector(".nav-indicator");
  const links = nav ? Array.from(nav.querySelectorAll(".nav-link")) : [];
  if (!links.length || !("IntersectionObserver" in window)) return;

  const linkById = new Map(links.map((link) => [link.getAttribute("href").slice(1), link]));
  const sections = Array.from(document.querySelectorAll("main section[id]"));
  let activeLink = null;

  const moveIndicator = () => {
    if (!indicator) return;
    if (!activeLink || activeLink.offsetParent === null) {
      indicator.classList.remove("is-visible");
      return;
    }
    const inset = 14; // matches link horizontal padding
    indicator.style.width = `${activeLink.offsetWidth - inset * 2}px`;
    indicator.style.setProperty("--indicator-x", `${activeLink.offsetLeft + inset}px`);
    indicator.classList.add("is-visible");
  };

  const setActive = (id) => {
    const link = linkById.get(id) || null;
    if (link === activeLink) return;
    if (activeLink) {
      activeLink.classList.remove("is-active");
      activeLink.removeAttribute("aria-current");
    }
    activeLink = link;
    if (activeLink) {
      activeLink.classList.add("is-active");
      activeLink.setAttribute("aria-current", "true");
    }
    moveIndicator();
  };

  // A section is "current" when it crosses the middle band of the viewport.
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { rootMargin: "-45% 0px -50% 0px" });

  sections.forEach((section) => observer.observe(section));

  // Fonts loading or resizing changes link widths.
  window.addEventListener("resize", moveIndicator, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);
}

/* --------------------------------------------------------------------------
   Scroll-triggered reveal animations
   -------------------------------------------------------------------------- */
function initReveal() {
  if (!root.classList.contains("js-reveal")) return;

  const items = Array.from(document.querySelectorAll(".reveal"));

  // Gentle stagger for siblings that reveal together
  items.forEach((item) => {
    const siblings = Array.from(item.parentElement.children).filter((el) => el.classList.contains("reveal"));
    const index = siblings.indexOf(item);
    item.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 80}ms`);
  });

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

  items.forEach((item) => observer.observe(item));

  // If the visitor switches on reduced motion mid-visit, show everything.
  reduceMotionQuery.addEventListener("change", (event) => {
    if (event.matches) {
      items.forEach((item) => item.classList.add("is-visible"));
      observer.disconnect();
    }
  });
}

/* --------------------------------------------------------------------------
   Hero timecode — synced with the CSS playhead animation (25 fps)
   -------------------------------------------------------------------------- */
function initTimecode() {
  const display = document.querySelector("[data-timecode]");
  const playhead = document.querySelector(".playhead");
  const hero = document.querySelector(".hero");
  if (!display || !playhead || reduceMotionQuery.matches) return;

  const FPS = 25;
  const LOOP_MS = 12000; // keep in sync with the .playhead animation duration
  const pad = (n) => String(n).padStart(2, "0");
  let frameId = null;
  let lastFrame = -1;

  const getTime = () => {
    const animation = playhead.getAnimations ? playhead.getAnimations()[0] : null;
    const t = animation && typeof animation.currentTime === "number" ? animation.currentTime : performance.now();
    return t % LOOP_MS;
  };

  const tick = () => {
    const ms = getTime();
    const totalFrames = Math.floor((ms / 1000) * FPS);
    if (totalFrames !== lastFrame) {
      lastFrame = totalFrames;
      const seconds = Math.floor(totalFrames / FPS);
      display.textContent = `00:00:${pad(seconds)}:${pad(totalFrames % FPS)}`;
    }
    frameId = window.requestAnimationFrame(tick);
  };

  const start = () => { if (frameId === null) frameId = window.requestAnimationFrame(tick); };
  const stop = () => {
    if (frameId !== null) window.cancelAnimationFrame(frameId);
    frameId = null;
  };

  // Only run (and only animate the hero) while it's on screen.
  if ("IntersectionObserver" in window && hero) {
    new IntersectionObserver(([entry]) => {
      hero.classList.toggle("is-paused", !entry.isIntersecting);
      if (entry.isIntersecting) start(); else stop();
    }).observe(hero);
  } else {
    start();
  }
}

/* --------------------------------------------------------------------------
   Project links & video modal
   --------------------------------------------------------------------------
   Set data-video-url on a .project-link (YouTube, Vimeo or a direct .mp4/.webm
   URL). Links without a real URL keep pointing to #contact as "Request Samples".
   -------------------------------------------------------------------------- */
function initProjectLinks() {
  const links = document.querySelectorAll(".project-link[data-video-url]");
  const modal = document.getElementById("video-modal");
  const frame = modal && modal.querySelector(".video-frame");
  const title = modal && modal.querySelector(".video-modal-title");
  const closeBtn = modal && modal.querySelector(".video-modal-close");
  const supportsDialog = modal && typeof modal.showModal === "function";

  links.forEach((link) => {
    const url = (link.dataset.videoUrl || "").trim();
    if (!url || url.startsWith("YOUR_")) return; // still a placeholder

    const card = link.closest(".project-card");
    const badge = card && card.querySelector(".project-badge");
    const label = link.querySelector(".project-link-label");
    const projectTitle = link.dataset.projectTitle || "Project";

    if (badge) badge.remove();
    if (label) label.textContent = "Watch Video";
    link.href = url;
    link.setAttribute("aria-label", `Watch video: ${projectTitle}`);

    const embed = getEmbed(url);
    if (!embed || !supportsDialog) {
      // Unknown host or no <dialog> support: open the video in a new tab.
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      return;
    }

    link.setAttribute("aria-haspopup", "dialog");
    link.addEventListener("click", (event) => {
      event.preventDefault();
      title.textContent = projectTitle;
      frame.replaceChildren(embed());
      // YouTube Shorts are vertical — use a 9:16 player
      modal.classList.toggle("video-modal--vertical", /youtube\.com\/shorts\//i.test(url));
      modal.showModal();
    });
  });

  if (!supportsDialog) return;

  closeBtn.addEventListener("click", () => modal.close());

  // Click on the backdrop (the dialog element itself) closes it.
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });

  // Remove the player on close so playback stops.
  modal.addEventListener("close", () => frame.replaceChildren());
}

/* Returns a factory that builds the right player element, or null. */
function getEmbed(url) {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (youtube) return () => makeIframe(`https://www.youtube-nocookie.com/embed/${youtube[1]}?rel=0`);

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return () => makeIframe(`https://player.vimeo.com/video/${vimeo[1]}`);

  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url)) {
    return () => {
      const video = document.createElement("video");
      video.src = url;
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata"; // no autoplay
      return video;
    };
  }
  return null;
}

function makeIframe(src) {
  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = "Project video player";
  iframe.loading = "lazy";
  iframe.allow = "encrypted-media; picture-in-picture; fullscreen";
  iframe.allowFullscreen = true;
  return iframe;
}

/* --------------------------------------------------------------------------
   Placeholder links (social profiles not yet provided)
   Any link whose href still starts with "YOUR_" is disabled so visitors
   never land on a broken URL. Replace the href in index.html to enable it.
   -------------------------------------------------------------------------- */
function initPlaceholderLinks() {
  document.querySelectorAll('a[href^="YOUR_"]').forEach((link) => {
    link.classList.add("is-placeholder");
    link.removeAttribute("href");
    link.removeAttribute("target");
    link.removeAttribute("rel");
    link.setAttribute("aria-disabled", "true");
    link.setAttribute("title", "Profile link coming soon");

    const note = document.createElement("span");
    note.className = "visually-hidden";
    note.textContent = " (profile link coming soon)";
    link.append(note);
  });
}

/* --------------------------------------------------------------------------
   Contact form
   -------------------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const status = form.querySelector(".form-status");
  const submitBtn = form.querySelector('button[type="submit"]');
  const fields = {
    name: form.elements.name,
    email: form.elements.email,
    project_type: form.elements.project_type,
    details: form.elements.details,
  };
  let attempted = false;

  const messages = {
    name: "Please enter your name.",
    email: "Please enter a valid email address.",
    project_type: "Please choose a project type.",
    details: "Please share a few details about your project.",
  };

  const validateField = (key) => {
    const field = fields[key];
    const errorEl = document.getElementById(`${field.id}-error`);
    const value = field.value.trim();
    let valid = value.length > 0;
    if (key === "email") valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    if (key === "details") valid = value.length >= 10;

    field.setAttribute("aria-invalid", String(!valid));
    if (errorEl) {
      errorEl.textContent = valid ? "" : messages[key];
      if (valid) field.removeAttribute("aria-describedby");
      else field.setAttribute("aria-describedby", errorEl.id);
    }
    return valid;
  };

  // Live re-validation only after the first submit attempt
  form.addEventListener("input", (event) => {
    if (!attempted) return;
    const key = Object.keys(fields).find((k) => fields[k] === event.target);
    if (key) validateField(key);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    attempted = true;

    const results = Object.keys(fields).map((key) => [key, validateField(key)]);
    const firstInvalid = results.find(([, ok]) => !ok);
    if (firstInvalid) {
      fields[firstInvalid[0]].focus();
      return;
    }

    const data = new FormData(form);

    if (FORM_ENDPOINT) {
      await sendToEndpoint(data);
    } else {
      openEmailFallback(data);
    }
  });

  async function sendToEndpoint(data) {
    submitBtn.disabled = true;
    setStatus("", "<p>Sending your inquiry…</p>");
    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      form.reset();
      attempted = false;
      setStatus("is-success", "<p><strong>Thank you — your inquiry has been sent.</strong> I'll get back to you by email as soon as possible.</p>");
    } catch (error) {
      setStatus("is-error", `<p>Sorry, your inquiry couldn't be sent right now. Please email me directly at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>`);
    } finally {
      submitBtn.disabled = false;
    }
  }

  // No backend configured: hand the inquiry to the visitor's email app.
  // Nothing is sent by this website.
  function openEmailFallback(data) {
    const subject = `Project Inquiry — ${data.get("project_type")}`;
    const body = [
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `Project type: ${data.get("project_type")}`,
      `Estimated budget: ${data.get("budget") || "Not specified"}`,
      "",
      "Project details:",
      data.get("details"),
    ].join("\n");

    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    setStatus("", `
      <p><strong>Your email app should now open with this inquiry pre-filled.</strong> It is only sent once you press send there — this website doesn't deliver messages on its own yet.</p>
      <p class="form-status-actions">
        <a class="btn btn--ghost btn--small" href="${mailto}">Open email again</a>
        <a class="btn btn--ghost btn--small" href="mailto:${CONTACT_EMAIL}">Email ${CONTACT_EMAIL}</a>
      </p>
    `);

    window.location.href = mailto;
  }

  function setStatus(state, html) {
    status.className = `form-status ${state}`.trim();
    status.innerHTML = html;
  }
}

/* --------------------------------------------------------------------------
   Footer year
   -------------------------------------------------------------------------- */
function setCurrentYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
}
