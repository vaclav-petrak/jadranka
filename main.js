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
// Clicking a photo (or a homepage theme card) opens a fullscreen viewer with a
// caption (place name, description, distance), a thumbnail filmstrip, and
// prev/next navigation (arrows, keyboard, swipe). A video card plays inline.
const lb = document.getElementById('lightbox');
if (lb) {
  const lbImg = lb.querySelector('img');
  const lbStage = lb.querySelector('.lightbox-stage');
  const lbClose = lb.querySelector('.lightbox-close');
  const lbPrev = lb.querySelector('.lightbox-prev');
  const lbNext = lb.querySelector('.lightbox-next');
  const lbCounter = lb.querySelector('.lightbox-counter');
  const lbVideo = lb.querySelector('.lightbox-video');
  const lbHeader = lb.querySelector('.lightbox-header');
  const lbTitle = lb.querySelector('.lightbox-title');
  const lbDesc = lb.querySelector('.lightbox-desc');
  const lbMeta = lb.querySelector('.lightbox-meta');
  const lbFilm = lb.querySelector('.lightbox-film');

  let photos = [];   // <img> elements in the current scope
  let index = 0;

  const openLightbox = () => {
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    lb.classList.remove('active');
    // Clearing the iframe stops any playing video, and leaves photo mode clean.
    if (lbVideo) lbVideo.innerHTML = '';
    lb.classList.remove('lightbox--video');
    document.body.style.overflow = '';
  };

  // A single title above the image (place name, else section, else the photo's
  // own alt); a short description + distance below it.
  const setCaption = (img) => {
    const sub = img.closest('.gal-subtopic');
    const src = sub || img.closest('.gal-section');
    let title = '', desc = '', metaEl = null;
    if (src) {
      const t = src.querySelector(sub ? '.gal-subtopic-title' : '.gal-topic-title');
      const d = src.querySelector(sub ? '.gal-subtopic-desc' : '.gal-topic-desc');
      title = t ? t.textContent.trim() : '';
      desc = d ? d.textContent.trim() : '';
      metaEl = src.querySelector('.gal-meta');
    }
    if (!title) title = img.alt || '';   // detail pages have no section text
    if (lbTitle) lbTitle.textContent = title;
    if (lbHeader) lbHeader.hidden = !title;
    if (lbDesc) { lbDesc.textContent = desc; lbDesc.hidden = !desc; }
    if (lbMeta) { lbMeta.innerHTML = metaEl ? metaEl.innerHTML : ''; lbMeta.hidden = !metaEl; }
  };

  const buildFilm = () => {
    if (!lbFilm) return;
    lbFilm.innerHTML = '';
    photos.forEach((img, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lightbox-thumb';
      b.setAttribute('aria-label', img.alt || ('Fotka ' + (i + 1)));
      const t = document.createElement('img');
      t.src = img.src;
      t.alt = '';
      t.loading = 'lazy';
      b.appendChild(t);
      b.addEventListener('click', () => { index = i; show(); });
      lbFilm.appendChild(b);
    });
    lbFilm.hidden = photos.length < 2;
  };

  const show = () => {
    const img = photos[index];
    if (!img) return;
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    setCaption(img);
    if (lbCounter) lbCounter.textContent = `${index + 1} / ${photos.length}`;
    if (lbPrev) lbPrev.disabled = index === 0;
    if (lbNext) lbNext.disabled = index === photos.length - 1;
    if (lbFilm && !lbFilm.hidden) {
      [...lbFilm.children].forEach((thumb, i) => {
        const active = i === index;
        thumb.classList.toggle('active', active);
        if (active) thumb.scrollIntoView({ block: 'nearest', inline: 'center' });
      });
    }
  };

  const step = (delta) => {
    if (lb.classList.contains('lightbox--video')) return;
    index = Math.min(Math.max(index + delta, 0), photos.length - 1);
    show();
  };

  // Open the lightbox on a set of photos, scoped to a section/grid element.
  const openPhotos = (scope, startImg) => {
    photos = [...scope.querySelectorAll('.gal-photo img')];
    if (!photos.length) return;
    index = startImg ? Math.max(photos.indexOf(startImg), 0) : 0;
    lb.classList.remove('lightbox--video');
    if (lbVideo) lbVideo.innerHTML = '';
    buildFilm();
    show();
    openLightbox();
  };

  // Open the lightbox in video mode with an embedded (autoplaying) YouTube iframe.
  const openVideo = (url) => {
    if (!lbVideo) return;
    const src = url + (url.includes('?') ? '&' : '?') + 'autoplay=1';
    lbVideo.innerHTML =
      '<iframe src="' + src + '" title="Video" ' +
      'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
      'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
    lb.classList.add('lightbox--video');
    openLightbox();
  };

  // Direct photo clicks (detail pages): scope to the themed section,
  // else to the single photo grid on a detail page.
  document.querySelectorAll('.gal-photo img').forEach((img) => {
    img.addEventListener('click', () => {
      const scope = img.closest('.gal-section') || img.closest('.gal-photo-grid') || document;
      openPhotos(scope, img);
    });
  });

  // Card triggers (homepage): open a whole theme's hidden photo set.
  document.querySelectorAll('[data-gallery]').forEach((card) => {
    card.addEventListener('click', () => {
      const set = document.querySelector('[data-gallery-set="' + card.dataset.gallery + '"]');
      if (set) openPhotos(set);
    });
  });

  // Video card trigger (homepage).
  document.querySelectorAll('[data-gallery-video]').forEach((card) => {
    card.addEventListener('click', () => openVideo(card.dataset.galleryVideo));
  });

  if (lbPrev) lbPrev.addEventListener('click', () => step(-1));
  if (lbNext) lbNext.addEventListener('click', () => step(1));
  lbClose.addEventListener('click', closeLightbox);
  lb.addEventListener('click', (e) => {
    // Close when clicking the backdrop (the container or the empty stage area).
    if (e.target === lb || e.target === lbStage) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  // Touch swipe on the image area (mobile).
  let touchX = null;
  if (lbStage) {
    lbStage.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
    lbStage.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
      touchX = null;
    }, { passive: true });
  }
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
