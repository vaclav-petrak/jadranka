// Sticky nav style on scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 50);
});

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
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// Lightbox (gallery pages only — no-ops where #lightbox is absent)
const lb = document.getElementById('lightbox');
if (lb) {
  const lbImg = lb.querySelector('img');
  const lbClose = lb.querySelector('.lightbox-close');

  const closeLightbox = () => {
    lb.classList.remove('active');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('.gal-photo img').forEach((img) => {
    img.addEventListener('click', () => {
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      lb.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  lbClose.addEventListener('click', closeLightbox);
  lb.addEventListener('click', (e) => {
    if (e.target === lb) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
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
