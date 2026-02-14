// TraveLM Standalone Landing Page Script

document.addEventListener("DOMContentLoaded", () => {
  // initThemeSwitcher removed
  initScrollAnimations();
  initFloatingIcons();
  initMobileMenu();
  initSearchInteractions();
  initAchievements();
});

/* ── Theme Switcher Removed ── */

/* ── Scroll Animations (Intersection Observer) ── */
function initScrollAnimations() {
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target); // Only animate once
      }
    });
  }, observerOptions);

  const fadeElements = document.querySelectorAll(".fade-in");
  fadeElements.forEach((el) => observer.observe(el));
}

/* ── Floating Icons Background ── */
function initFloatingIcons() {
  const container = document.querySelector(".floating-icons");
  if (!container) return; // Guard clause

  // Icon set (FontAwesome-like classes or Lucide chars if using a font, here using generic Unicode/Emoji for simplicity in standalone or classes if I link a library.
  // Wait, the plan implies using a library or SVG? The CSS uses .floating-icon.
  // I'll inject SVGs or use a font. For a standalone single file without dependencies,
  // best to use simple unicodes or inject SVG strings.
  // Let's use simple geometric shapes or travel-related unicode chars for lightweight implementation
  // or better yet, Lucide icons if I can load the script.
  // I will assume FontAwesome or Lucide CDN is included in HTML.
  // Let's use Lucide icons via library in HTML, so here we just create elements with classes.

  const icons = [
    "plane",
    "map-pin",
    "compass",
    "mountain",
    "palmtree",
    "anchor",
    "tent",
    "ship",
    "sunset",
    "camera",
    "globe",
  ];

  // Create 15 floating icons with random positions
  for (let i = 0; i < 15; i++) {
    const iconEl = document.createElement("i");
    const randomIcon = icons[Math.floor(Math.random() * icons.length)];

    // We will rely on Lucide's `data-lucide` attribute for replacements
    iconEl.setAttribute("data-lucide", randomIcon);
    iconEl.classList.add("floating-icon");

    // Random positioning
    const left = Math.random() * 100;
    const delay = Math.random() * 20; // 0-20s delay
    const duration = 15 + Math.random() * 20; // 15-35s duration
    const size = 16 + Math.random() * 24; // 16-40px size

    iconEl.style.left = `${left}%`;
    iconEl.style.animationDelay = `${delay}s`;
    iconEl.style.animationDuration = `${duration}s`;
    iconEl.style.fontSize = `${size}px`;
    // Start below the screen
    iconEl.style.top = "110vh";

    container.appendChild(iconEl);
  }

  // Initialize Lucide icons if the library is loaded
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/* ── Mobile Menu ── */
function initMobileMenu() {
  const btn = document.querySelector(".mobile-menu-btn");
  const menu = document.querySelector(".mobile-menu");
  const closeBtn = document.querySelector(".mobile-menu-close");

  if (btn && menu && closeBtn) {
    btn.addEventListener("click", () => {
      menu.classList.add("open");
      document.body.style.overflow = "hidden";
    });

    closeBtn.addEventListener("click", () => {
      menu.classList.remove("open");
      document.body.style.overflow = "";
    });

    // Close on link click
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menu.classList.remove("open");
        document.body.style.overflow = "";
      });
    });
  }
}

/* ── Search Mockup Interactions ── */
function initSearchInteractions() {
  const searchCapsule = document.querySelector(".search-capsule");
  if (searchCapsule) {
    searchCapsule.addEventListener("click", () => {
      // Visualize focus or expand interaction
      searchCapsule.style.transform = "scale(1.02)";
      setTimeout(() => {
        searchCapsule.style.transform = "";
      }, 200);
    });
  }
}

/* ── Achievements Interactions ── */
function initAchievements() {
  // Add hover effects or "unlock" demo on click
  const cards = document.querySelectorAll(".achievement-card");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      // Toggle locked state for demo purposes
      // card.classList.toggle('locked');
      // const icon = card.querySelector('.achievement-icon');
      // if (icon) icon.classList.toggle('locked-icon');
    });
  });
}
