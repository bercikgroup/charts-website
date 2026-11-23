// Hero: muted looping showcase → click play → full film with sound.
(() => {
  const hero = document.getElementById('hero');
  const video = document.getElementById('video');
  const playBtn = document.getElementById('play');
  const toggle = document.getElementById('toggle');
  const closeBtn = document.getElementById('close');
  const body = document.body;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let idleTimer;

  const setPaused = (paused) => toggle.toggleAttribute('data-paused', paused);
  toggle.setAttribute('aria-label', 'Pause');

  function wake() {
    hero.classList.remove('is-idle');
    body.classList.remove('is-idle');
    clearTimeout(idleTimer);
    if (hero.dataset.state === 'film' && !video.paused) {
      idleTimer = setTimeout(() => {
        hero.classList.add('is-idle');
        body.classList.add('is-idle');
      }, 2500);
    }
  }

  function enterFilm() {
    hero.dataset.state = 'film';
    body.classList.add('film-active');
    video.src = video.dataset.film;
    video.loop = false;
    video.muted = false;       // allowed: we're inside a user gesture
    video.currentTime = 0;
    video.play().catch(() => {});
    wake();
  }

  function exitFilm() {
    hero.dataset.state = 'showcase';
    body.classList.remove('film-active', 'is-idle');
    hero.classList.remove('is-idle');
    clearTimeout(idleTimer);
    video.src = video.dataset.showcase;
    video.muted = true;
    video.loop = true;
    setPaused(false);
    if (!reduceMotion) video.play().catch(() => {});
    playBtn.focus({ preventScroll: true });
  }

  playBtn.addEventListener('click', enterFilm);
  closeBtn.addEventListener('click', exitFilm);
  video.addEventListener('ended', () => { if (hero.dataset.state === 'film') exitFilm(); });
  video.addEventListener('play', () => { setPaused(false); toggle.setAttribute('aria-label', 'Pause'); wake(); });
  video.addEventListener('pause', () => {
    if (hero.dataset.state !== 'film') return;
    setPaused(true); toggle.setAttribute('aria-label', 'Play'); wake();
  });

  toggle.addEventListener('click', () => (video.paused ? video.play() : video.pause()));
  hero.addEventListener('click', (e) => {
    if (hero.dataset.state === 'film' && e.target === video) toggle.click();
  });

  ['mousemove', 'touchstart', 'keydown'].forEach((ev) =>
    addEventListener(ev, wake, { passive: true }));
  addEventListener('keydown', (e) => {
    if (hero.dataset.state !== 'film') return;
    if (e.key === 'Escape') exitFilm();
    if (e.key === ' ' && document.activeElement === document.body) { e.preventDefault(); toggle.click(); }
  });

  if (reduceMotion) video.pause();
})();

// Below the hero: fade-in on scroll, and mark screenshots that haven't been supplied yet.
(() => {
  document.documentElement.classList.add('js');

  const markMissing = (el) => { el.parentElement.setAttribute('data-missing', ''); el.remove(); };

  document.querySelectorAll('.shot img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0) markMissing(img);
    else img.addEventListener('error', () => markMissing(img), { once: true });
  });

  // Looping clips: play only while on screen, stay on the poster for reduced motion.
  const clips = document.querySelectorAll('.shot video');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vio = 'IntersectionObserver' in window && !still
    ? new IntersectionObserver((entries) => entries.forEach((e) => {
        const v = e.target;
        if (!e.isIntersecting) { v.pause(); return; }
        // If the clip isn't ready yet, start it as soon as it is (and still on screen).
        v.play().catch(() => v.addEventListener('canplay', () => { if (v.getBoundingClientRect().top < innerHeight && v.getBoundingClientRect().bottom > 0) v.play().catch(() => {}); }, { once: true }));
      }), { threshold: 0.25 })
    : null;
  clips.forEach((v) => {
    v.addEventListener('error', () => markMissing(v), { once: true });
    if (vio) vio.observe(v);
  });

  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => io.observe(el));
})();

// "Who it's for": each word lights up as the sentence scrolls through.
(() => {
  const el = document.getElementById('lit');
  if (!el) return;
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute('aria-label', words.join(' '));
  el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
  const spans = [...el.querySelectorAll('.w')];

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    spans.forEach((s) => { s.style.opacity = 1; });
    return;
  }

  let ticking = false;
  function update() {
    ticking = false;
    const r = el.getBoundingClientRect();
    const vh = innerHeight;
    // 0 when the block's top reaches 85% of the viewport, 1 when its bottom reaches 45%.
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.4)));
    const n = spans.length;
    spans.forEach((s, i) => {
      const t = Math.min(1, Math.max(0, p * n * 1.15 - i));
      s.style.opacity = (0.2 + 0.8 * t).toFixed(3);
    });
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();


// Cinematic: slow parallax on the film stills, and the laptop eases in as it arrives.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const bgs = [...document.querySelectorAll('[data-parallax]')];
  const laptop = document.querySelector('.device.desk .stage img');
  let ticking = false;
  function update() {
    ticking = false;
    const vh = innerHeight;
    bgs.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const off = (r.top + r.height / 2 - vh / 2) / vh;       // -1..1 around centre
      el.style.transform = `translate3d(0, ${(off * -6).toFixed(2)}%, 0) scale(${(1.08 - Math.abs(off) * 0.03).toFixed(3)})`;
    });
    if (laptop) {
      const r = laptop.parentElement.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9)));
      laptop.style.transform = `scale(${(0.88 + 0.12 * p).toFixed(3)})`;
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();


// Scroll cue: fades once the visitor has scrolled.
(() => {
  const set = () => document.body.classList.toggle('is-scrolled', scrollY > 40);
  addEventListener('scroll', set, { passive: true });
  set();
})();
