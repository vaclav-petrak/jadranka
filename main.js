// Sticky nav style on scroll
function initStickyNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 50);
  window.addEventListener('scroll', onScroll);
  onScroll();
}
initStickyNav();

// Shared partials (nav + footer) live in nav.html / footer.html and are
// injected here so they're defined in one place. The <nav>/<footer> shells
// stay in each page as empty placeholders (so #nav and CSS work at parse time);
// only their inner markup is fetched. Requires serving over HTTP, not file://.
const navMount = document.querySelector('nav[data-nav]');
if (navMount) {
  fetch('nav.html')
    .then((r) => r.text())
    .then((html) => {
      navMount.innerHTML = html.replaceAll('__CTA__', navMount.dataset.cta || 'index.html#kalendar');
      bindSmoothScroll(navMount); // so an injected in-page "#kalendar" CTA smooth-scrolls
    });
}

const footerMount = document.getElementById('site-footer');
if (footerMount) {
  fetch('footer.html')
    .then((r) => r.text())
    .then((html) => { footerMount.innerHTML = html; });
}

// Fade-in on scroll via IntersectionObserver
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));

// Smooth scroll for anchor links
function bindSmoothScroll(root) {
  root.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
bindSmoothScroll(document);

// Lightbox (gallery pages only — no-ops where #lightbox is absent).
// Clicking a photo opens a fullscreen viewer; prev/next (arrows + keyboard)
// browse the photos of the section the clicked photo belongs to.
const lb = document.getElementById('lightbox');
if (lb) {
  const lbImg = lb.querySelector('img');
  const lbClose = lb.querySelector('.lightbox-close');
  const lbPrev = lb.querySelector('.lightbox-prev');
  const lbNext = lb.querySelector('.lightbox-next');
  const lbCounter = lb.querySelector('.lightbox-counter');

  let photos = [];   // <img> elements in the current scope
  let index = 0;
  let label = '';    // section title, when available

  const closeLightbox = () => {
    lb.classList.remove('active');
    document.body.style.overflow = '';
  };

  const show = () => {
    const img = photos[index];
    if (!img) return;
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    if (lbCounter) {
      const count = `${index + 1} / ${photos.length}`;
      lbCounter.textContent = label ? `${label} — ${count}` : count;
    }
    if (lbPrev) lbPrev.disabled = index === 0;
    if (lbNext) lbNext.disabled = index === photos.length - 1;
  };

  const step = (delta) => {
    index = Math.min(Math.max(index + delta, 0), photos.length - 1);
    show();
  };

  document.querySelectorAll('.gal-photo img').forEach((img) => {
    img.addEventListener('click', () => {
      // Scope to the themed section on the gallery page, else to the
      // single photo grid on a detail page.
      const scope = img.closest('.gal-section') || img.closest('.gal-photo-grid') || document;
      photos = [...scope.querySelectorAll('.gal-photo img')];
      index = Math.max(photos.indexOf(img), 0);
      const title = scope.querySelector && scope.querySelector('.gal-topic-title');
      label = title ? title.textContent.trim() : '';
      show();
      lb.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  if (lbPrev) lbPrev.addEventListener('click', () => step(-1));
  if (lbNext) lbNext.addEventListener('click', () => step(1));
  lbClose.addEventListener('click', closeLightbox);
  lb.addEventListener('click', (e) => {
    if (e.target === lb) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });
}

// Featured carousel (scroll-snap; arrows/dots are progressive enhancement)
document.querySelectorAll('[data-carousel]').forEach((root) => {
  const track = root.querySelector('.feat-track');
  const slides = track ? [...track.querySelectorAll('.feat-slide')] : [];
  const prev = root.querySelector('.feat-arrow--prev');
  const next = root.querySelector('.feat-arrow--next');
  const dotsWrap = root.querySelector('.feat-dots');
  if (!track || slides.length === 0) return;

  const index = () => Math.round(track.scrollLeft / track.clientWidth);
  const goTo = (i) => track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });

  const dots = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'feat-dot';
    dot.setAttribute('aria-label', `Fotka ${i + 1} z ${slides.length}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
    return dot;
  });

  const update = () => {
    const i = index();
    dots.forEach((dot, j) => dot.classList.toggle('active', j === i));
    prev.disabled = i === 0;
    next.disabled = i === slides.length - 1;
  };

  prev.addEventListener('click', () => goTo(index() - 1));
  next.addEventListener('click', () => goTo(index() + 1));
  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  update();
});
