const body = document.body;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Header and navigation */
const header = document.querySelector("[data-header]");
const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 40);
};
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

/* ============================================================
   PRZEWIJANIE — jedno miejsce dla calej strony.

   Wczesniej pozycja strony byla ruszana przez cztery niezalezne
   mechanizmy naraz: globalne scroll-behavior: smooth, petle
   trzymajWMiejscu, scrollIntoView w pakietach i w ofercie oraz
   przywracanie pozycji po zamknieciu galerii. Kazdy z nich mial
   wlasny czas trwania, wiec potrafily przesuwac strone jednoczesnie
   w dwie strony, a kolejne klikniecia dokladaly nowe petle. Stad
   "losowe przeskoki" i zjezdzanie strony po kilku klknieciach.
   Teraz wszystko przechodzi przez te trzy funkcje.
   ============================================================ */

/* Realna wysokosc przyklejonego naglowka — cel przewijania ma sie o nia oprzec. */
const wysokoscNaglowka = () => header?.getBoundingClientRect().height || 68;

/* Wykonaj skok bez animacji przegladarki.

   Nie ruszamy tu stylu inline documentElement.scrollBehavior, bo poprzednia
   wersja przy dwoch rownoleglych wywolaniach zapisywala "auto" na stale
   i plynne przewijanie kotwic gaslo do konca sesji. Licznik + atrybut
   w HTML jest odporny na zagniezdzenie. */
let glebokoscBlokadyPlynnosci = 0;
const bezPlynnego = akcja => {
  const korzen = document.documentElement;
  if (glebokoscBlokadyPlynnosci === 0) korzen.dataset.scrollNatychmiast = "1";
  glebokoscBlokadyPlynnosci += 1;
  try {
    akcja();
  } finally {
    glebokoscBlokadyPlynnosci -= 1;
    if (glebokoscBlokadyPlynnosci === 0) delete korzen.dataset.scrollNatychmiast;
  }
};

/* Jedno trzymanie naraz — nowe klikniecie przerywa poprzednie. */
let aktywneTrzymanie = null;

/* Przewin do elementu, zostawiajac miejsce na naglowek.
   Zastepuje scrollIntoView, ktore nie wiedzialo o przyklejonym naglowku
   i ladowalo tresc pod nim. */
const przewinDoElementu = (element, { odstep = 22, plynnie = false } = {}) => {
  if (!element) return;
  aktywneTrzymanie?.stop();
  const cel = Math.max(
    0,
    window.scrollY + element.getBoundingClientRect().top - wysokoscNaglowka() - odstep
  );
  if (plynnie && !reduceMotion) window.scrollTo({ top: cel, behavior: "smooth" });
  else bezPlynnego(() => window.scrollTo(0, cel));
};

/* Utrzymaj element w tym samym miejscu ekranu przez czas trwania animacji.
   Uzywane tam, gdzie rozwijanie jednego kafla zwija sasiedni i klikniety
   naglowek ucieklby spod kursora. */
const trzymajWMiejscu = (element, czas = 320) => {
  if (!element || reduceMotion) return;

  aktywneTrzymanie?.stop();

  const poczatek = element.getBoundingClientRect().top;
  const zdarzenia = ["wheel", "touchstart", "keydown"];
  let przerwane = false;
  let klatka = 0;

  const przerwij = () => { przerwane = true; };
  zdarzenia.forEach(z => window.addEventListener(z, przerwij, { passive: true }));

  const uchwyt = {
    stop() {
      if (aktywneTrzymanie === uchwyt) aktywneTrzymanie = null;
      cancelAnimationFrame(klatka);
      zdarzenia.forEach(z => window.removeEventListener(z, przerwij));
    }
  };
  aktywneTrzymanie = uchwyt;

  const koniec = performance.now() + czas;

  const krok = () => {
    if (przerwane || aktywneTrzymanie !== uchwyt) return uchwyt.stop();
    const roznica = element.getBoundingClientRect().top - poczatek;
    if (Math.abs(roznica) > 0.5) bezPlynnego(() => window.scrollBy(0, roznica));
    if (performance.now() < koniec) klatka = requestAnimationFrame(krok);
    else uchwyt.stop();
  };

  klatka = requestAnimationFrame(krok);
};

const menuButton = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const closeMenu = () => {
  menuButton?.classList.remove("is-open");
  menuButton?.setAttribute("aria-expanded", "false");
  mobileMenu?.classList.remove("is-open");
  mobileMenu?.setAttribute("aria-hidden", "true");
  header?.classList.remove("menu-open");
};
menuButton?.addEventListener("click", () => {
  const isOpen = !menuButton.classList.contains("is-open");
  menuButton.classList.toggle("is-open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
  mobileMenu?.classList.toggle("is-open", isOpen);
  mobileMenu?.setAttribute("aria-hidden", String(!isOpen));
  header?.classList.toggle("menu-open", isOpen);
});
mobileMenu?.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));

const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];
const navObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach(link => link.classList.toggle("is-active", link.getAttribute("href") === "#" + visible.target.id));
    }, { rootMargin: "-30% 0px -58%", threshold: [0, .2, .5] })
  : null;
navLinks.forEach(link => {
  const section = document.querySelector(link.getAttribute("href"));
  if (section) navObserver?.observe(section);
});

/* Hero rotating gold word */
const rotatingWord = document.querySelector("[data-rotating-word]");
const rotatingWords = ["działają.", "uspokajają.", "zostają.", "pasują."];
let rotatingIndex = 0;
if (rotatingWord && !reduceMotion) {
  window.setInterval(() => {
    rotatingWord.classList.add("is-changing");
    window.setTimeout(() => {
      rotatingIndex = (rotatingIndex + 1) % rotatingWords.length;
      rotatingWord.textContent = rotatingWords[rotatingIndex];
    }, 290);
    window.setTimeout(() => rotatingWord.classList.remove("is-changing"), 610);
  }, 3100);
}

/* Reveal */
const revealItems = document.querySelectorAll(".reveal");
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach(item => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: .01, rootMargin: "0px 0px 90px 0px" });
  revealItems.forEach(item => revealObserver.observe(item));
}

/* Cursor light — stable, pointer-only, never sticky */
const finePointerGlow = matchMedia("(hover: hover) and (pointer: fine)").matches;
const spotlightPanels = [...document.querySelectorAll(".spotlight")];

const clearSpotlight = panel => {
  panel.classList.remove("is-pointer-glow");
  panel.style.removeProperty("--mx");
  panel.style.removeProperty("--my");
};

const clearAllSpotlights = () => spotlightPanels.forEach(clearSpotlight);

if (finePointerGlow) {
  spotlightPanels.forEach(panel => {
    const updateGlow = event => {
      const rect = panel.getBoundingClientRect();
      panel.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      panel.style.setProperty("--my", `${event.clientY - rect.top}px`);
      panel.classList.add("is-pointer-glow");
    };

    panel.addEventListener("pointerenter", updateGlow, { passive: true });
    panel.addEventListener("pointermove", updateGlow, { passive: true });
    panel.addEventListener("pointerleave", () => clearSpotlight(panel), { passive: true });
    panel.addEventListener("pointercancel", () => clearSpotlight(panel), { passive: true });
  });

  /* Przy przewijaniu swiatlo gaslo, mimo ze kursor dalej stal na kaflu -
     wracalo dopiero po ruszeniu mysza, co dawalo efekt migotania.
     Zamiast gasic wszystko, przeliczamy pozycje wzgledem ostatnio znanego
     kursora: kafel pod kursorem zachowuje swiatlo we wlasciwym miejscu,
     pozostale je traca. Wyglad swiatla sie nie zmienia. */
  let ostatniKursor = null;
  let odswiezanieZaplanowane = false;

  window.addEventListener("pointermove", event => {
    ostatniKursor = { x: event.clientX, y: event.clientY };
  }, { passive: true });

  const przeliczSpotlighty = () => {
    odswiezanieZaplanowane = false;
    if (!ostatniKursor) return clearAllSpotlights();

    spotlightPanels.forEach(panel => {
      const rect = panel.getBoundingClientRect();
      const pod = ostatniKursor.x >= rect.left && ostatniKursor.x <= rect.right
               && ostatniKursor.y >= rect.top  && ostatniKursor.y <= rect.bottom;

      if (pod) {
        panel.style.setProperty("--mx", `${ostatniKursor.x - rect.left}px`);
        panel.style.setProperty("--my", `${ostatniKursor.y - rect.top}px`);
        panel.classList.add("is-pointer-glow");
      } else if (panel.classList.contains("is-pointer-glow")) {
        clearSpotlight(panel);
      }
    });
  };

  window.addEventListener("blur", clearAllSpotlights);
  window.addEventListener("scroll", () => {
    if (odswiezanieZaplanowane) return;
    odswiezanieZaplanowane = true;
    requestAnimationFrame(przeliczSpotlighty);
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearAllSpotlights();
  });
}

/* Project modal */
const modal = document.querySelector("[data-modal]");
const modalImage = modal?.querySelector("[data-modal-image]");
const modalTitle = modal?.querySelector("[data-modal-title]");
const modalCategory = modal?.querySelector("[data-modal-category]");
const modalThumbs = modal?.querySelector("[data-modal-thumbs]");
const modalDescription = modal?.querySelector("[data-modal-description]");
let modalImages = [];
let lastFocus = null;
let modalGalleryAlts = new Map();

const selectModalImage = source => {
  if (!modalImage || !modalThumbs) return;
  modalImage.src = source;
  modalImage.alt = modalGalleryAlts.get(source) || modalTitle?.textContent || "Zdjęcie realizacji";
  modalThumbs.querySelectorAll("button").forEach(button => {
    const active = button.dataset.source === source;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
};

const stepModalImage = direction => {
  if (!modalImages.length || !modalImage) return;
  const index = modalImages.indexOf(modalImage.getAttribute("src"));
  selectModalImage(modalImages[(index + direction + modalImages.length) % modalImages.length]);
};
modal?.querySelector("[data-image-prev]")?.addEventListener("click", () => stepModalImage(-1));
modal?.querySelector("[data-image-next]")?.addEventListener("click", () => stepModalImage(1));
modalImage?.addEventListener("click", event => {
  const bounds = modalImage.getBoundingClientRect();
  stepModalImage(event.clientX < bounds.left + bounds.width / 2 ? -1 : 1);
});

const packagesToggle = document.querySelector("[data-packages-toggle]");
const packageCards = [...document.querySelectorAll(".packages__grid .package-card")];
const packagesGrid = document.querySelector(".packages__grid");
packagesToggle?.addEventListener("click", () => {
  if (packagesToggle.disabled) return;
  const open = packagesToggle.getAttribute("aria-expanded") !== "true";
  packagesToggle.disabled = true;

  /* Przycisk zostaje dokladnie tam, gdzie jest.

     Wczesniej przy zwijaniu strona najpierw przewijala sie na poczatek
     pakietow, czekala 520 ms i dopiero potem zaczynala zwijac (razem
     1,3 s), a na koniec przewijala sie jeszcze raz. Stad wrazenie
     opoznienia i podwojnego skoku. Teraz nie przewijamy w ogole —
     trzymamy klikniety przycisk w tym samym miejscu ekranu, wiec
     zwijanie i rozwijanie dzieje sie od razu i pod kursorem. */
  trzymajWMiejscu(packagesToggle, 560);

  const from = packagesGrid.getBoundingClientRect().height;
  packagesGrid.style.height = "auto";
  packageCards.forEach(card => { card.open = open; });
  const to = packagesGrid.scrollHeight;
  /* Przy zamykaniu zachowaj zawartość do końca animacji; dopiero wtedy
     zamknij <details>. W przeciwnym razie tekst znika w jednej klatce. */
  if (!open) packageCards.forEach(card => { card.open = true; });
  packagesGrid.style.height = `${from}px`;
  packagesGrid.style.overflow = "hidden";

  /* Ten sam bezpiecznik co w harmonijkach: bez niego zgubione onfinish
     zostawia przycisk na stale w stanie disabled i pakietow nie da sie
     juz ani zwinac, ani rozwinac. */
  let bezpiecznikPakietow = 0;

  const finish = () => {
    window.clearTimeout(bezpiecznikPakietow);
    if (!packagesToggle.disabled) return;
    packageCards.forEach(card => { card.open = open; });
    packagesGrid.style.height = "";
    packagesGrid.style.overflow = "";
    packagesToggle.disabled = false;

    /* Po rozwinieciu gora kafli potrafi zostac schowana pod naglowkiem —
       opisy sa dlugie, wiec siatka rosnie w obie strony wzgledem widoku.
       Podciagamy strone tak, zeby poczatek pakietow byl widoczny. Robimy
       to tylko przy rozwijaniu i tylko wtedy, gdy gora faktycznie jest
       ucieta, wiec nie ma zbednego ruchu. */
    if (open && packagesGrid.getBoundingClientRect().top < wysokoscNaglowka() + 12) {
      przewinDoElementu(packagesGrid, { plynnie: true });
    }
  };

  if (!reduceMotion && packagesGrid.animate) {
    /* 780 ms bylo wyraznie za wolne jak na harmonijke — stad "srednia
       animacja". Skrocone i zrownane z reszta serwisu (FAQ ma 250/210 ms).
       Tekst pojawia sie razem z wysokoscia, bez opoznienia 140 ms, ktore
       dawalo efekt doklejania sie opisow po fakcie. */
    const czas = open ? 420 : 340;

    const animation = packagesGrid.animate(
      [{ height: `${from}px` }, { height: `${to}px` }],
      { duration: czas, easing: "cubic-bezier(.2,.75,.25,1)" }
    );
    packageCards.forEach(card => card.querySelector(".package-card__body")?.animate(
      open ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }],
      { duration: Math.round(czas * 0.8), fill: "none", easing: "ease-out" }
    ));
    animation.onfinish = finish;
    bezpiecznikPakietow = window.setTimeout(finish, czas + 200);
  } else {
    finish();
  }
  packagesToggle.setAttribute("aria-expanded", String(open));
  packagesToggle.querySelector("[data-packages-toggle-label]").textContent = open ? "Zwiń opisy pakietów" : "Rozwiń opisy pakietów";
});

/* Kalendarz jest aktywowany dopiero po ustawieniu rzeczywistego adresu wydarzenia. */
const consultationCalendar = document.querySelector("[data-calendly-url]");
if (consultationCalendar) {
  const url = consultationCalendar.dataset.calendlyUrl.trim();
  const widget = consultationCalendar.querySelector("[data-calendly-widget]");
  const pending = consultationCalendar.querySelector("[data-calendly-pending]");
  let valid = false;
  try { valid = new URL(url).hostname === "calendly.com"; } catch (_) { /* Brak linku wydarzenia. */ }
  if (valid && widget) {
    /* Kontener celowo NIE ma klasy "calendly-inline-widget".

       Skrypt Calendly po zaladowaniu sam skanuje strone w poszukiwaniu
       elementow z ta klasa i czyta z nich atrybut data-url. My podajemy
       adres programowo przez initInlineWidget, wiec atrybutu tam nie ma
       i ich kod wywracal sie na "Cannot read properties of null (reading
       'split')". Blad byl widoczny w konsoli na podstronie Kontakt. */
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    script.onload = () => {
      if (!window.Calendly?.initInlineWidget) return;
      widget.hidden = false;
      window.Calendly.initInlineWidget({ url, parentElement: widget });
      if (pending) pending.hidden = true;
    };
    document.head.append(script);
  }
}

/* Galeria na pełnym ekranie ma całkowicie zatrzymać stronę pod spodem.
   Samo overflow:hidden nie wystarcza na iOS, dlatego zapamiętujemy pozycję
   i przywracamy ją po zamknięciu. */
let lockedScrollY = 0;

const lockPageScroll = () => {
  lockedScrollY = window.scrollY || window.pageYOffset || 0;
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
  document.documentElement.classList.add("is-modal-open");
  body.classList.add("is-modal-open");
  body.style.top = `-${lockedScrollY}px`;
};

const unlockPageScroll = () => {
  if (!body.classList.contains("is-modal-open")) return;
  document.documentElement.classList.remove("is-modal-open");
  body.classList.remove("is-modal-open");
  body.style.top = "";
  body.style.paddingRight = "";
  /* Bez tego globalne scroll-behavior: smooth zamienialo powrot na animacje,
     ktora lapala sie z przywracaniem pozycji body — stad losowe przeskoki
     po zamknieciu galerii. */
  bezPlynnego(() => window.scrollTo(0, lockedScrollY));
};

/* Nad paskiem miniatur kółko myszy przewija sam pasek, nie stronę. */
modalThumbs?.addEventListener("wheel", event => {
  const strip = modalThumbs;
  if (strip.scrollWidth <= strip.clientWidth) return;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) return;
  event.preventDefault();
  strip.scrollLeft += delta;
}, { passive: false });

const openModal = card => {
  if (!modal || !card || !modalImage || !modalTitle || !modalThumbs) return;
  lastFocus = document.activeElement;
  const gallery = (card.dataset.gallery || card.dataset.image || "")
    .split(",")
    .map(source => source.trim())
    .filter(Boolean);
  modalImages = gallery;
  const galleryAltLabels = (card.dataset.galleryAlts || "")
    .split("|")
    .map(label => label.trim());
  const projectTitle = card.dataset.title || "";
  modalGalleryAlts = new Map(gallery.map((source, index) => [
    source,
    galleryAltLabels[index] ? `${projectTitle} - ${galleryAltLabels[index]}` : `${projectTitle} - zdjęcie ${index + 1}`
  ]));

  const firstImage = card.dataset.image || gallery[0] || "";
  modalImage.style.objectPosition = card.dataset.focus || "50% 50%";
  modalTitle.textContent = projectTitle;
  if (modalDescription) modalDescription.textContent = card.dataset.description || "";
  modalThumbs.replaceChildren();

  gallery.forEach((source, index) => {
    const tile = document.createElement("button");
    const image = document.createElement("img");
    tile.className = "modal__thumb";
    tile.type = "button";
    tile.dataset.source = source;
    tile.setAttribute("aria-label", `Pokaż zdjęcie ${index + 1} z realizacji ${projectTitle}`);
    tile.setAttribute("aria-pressed", "false");
    tile.addEventListener("click", () => selectModalImage(source));

    image.src = source;
    image.alt = modalGalleryAlts.get(source) || `${projectTitle} - zdjęcie ${index + 1}`;
    image.loading = "lazy";
    image.decoding = "async";
    tile.append(image);
    modalThumbs.append(tile);
  });

  selectModalImage(firstImage);
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  lockPageScroll();
  modal.querySelector(".modal__close")?.focus({ preventScroll: true });
};
const closeModal = () => {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  unlockPageScroll();
  if (modalImage) {
    modalImage.src = "";
    modalImage.alt = "";
  }
  modalThumbs?.replaceChildren();
  modalGalleryAlts = new Map();
  modalImages = [];
  lastFocus?.focus?.({ preventScroll: true });
};
document.addEventListener("click", event => {
  const trigger = event.target.closest("[data-project-card] > button");
  if (trigger) openModal(trigger.closest("[data-project-card]"));
});
modal?.querySelector(".modal__close")?.addEventListener("click", closeModal);
modal?.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && modal?.classList.contains("is-open")) closeModal();
  if (modal?.classList.contains("is-open") && event.key === "ArrowLeft") stepModalImage(-1);
  if (modal?.classList.contains("is-open") && event.key === "ArrowRight") stepModalImage(1);
});

/* Infinite, slow project carousel */
const viewport = document.querySelector("[data-project-viewport]");
const track = document.querySelector("[data-project-track]");
const projectPrev = document.querySelector("[data-project-prev]");
const projectNext = document.querySelector("[data-project-next]");
let sliderOffset = 0;
let sliderSetWidth = 0;
let sliderAnimating = false;
let sliderRaf = 0;
let sliderLast = 0;
let sliderDesktop = false;
const sliderSpeed = 14; // px / second — deliberately calm, but clearly moving

const originals = () => [...(track?.querySelectorAll("[data-project-card]:not([data-clone])") || [])];
const clearClones = () => track?.querySelectorAll("[data-clone]").forEach(clone => clone.remove());

const setTrackPosition = (value, animate = false) => {
  if (!track) return;
  track.style.transition = animate ? "transform .72s cubic-bezier(.2,.72,.2,1)" : "none";
  track.style.transform = `translate3d(${-value}px,0,0)`;
};

const measureSlider = () => {
  const cards = originals();
  if (!track || cards.length < 2) {
    sliderSetWidth = 0;
    return;
  }
  const styles = getComputedStyle(track);
  const gap = parseFloat(styles.columnGap || styles.gap) || 0;
  const first = cards[0];
  const last = cards[cards.length - 1];
  sliderSetWidth = last.offsetLeft + last.offsetWidth - first.offsetLeft + gap;
};

const normalizeSlider = () => {
  if (!sliderSetWidth) return;
  while (sliderOffset >= sliderSetWidth) sliderOffset -= sliderSetWidth;
  while (sliderOffset < 0) sliderOffset += sliderSetWidth;
};

const sliderFrame = time => {
  if (!sliderDesktop || !track) return;
  if (!sliderLast) sliderLast = time;
  const delta = Math.min(50, Math.max(0, time - sliderLast));
  sliderLast = time;

  if (!sliderAnimating && sliderSetWidth && !document.hidden) {
    sliderOffset += (delta / 1000) * sliderSpeed;
    normalizeSlider();
    setTrackPosition(sliderOffset);
  }
  sliderRaf = requestAnimationFrame(sliderFrame);
};

const setupSlider = () => {
  if (!track || !viewport) return;
  const shouldDesktop = window.innerWidth > 820;

  cancelAnimationFrame(sliderRaf);
  clearClones();
  track.style.transition = "none";
  track.style.transform = "none";
  sliderOffset = 0;
  sliderLast = 0;
  sliderDesktop = shouldDesktop;

  if (!shouldDesktop) return;

  /* Duplicate the complete set once, giving the transform a seamless loop. */
  originals().forEach(card => {
    const clone = card.cloneNode(true);
    clone.dataset.clone = "true";
    clone.setAttribute("aria-hidden", "true");
    track.append(clone);
  });

  requestAnimationFrame(() => {
    measureSlider();
    setTrackPosition(0);
    sliderRaf = requestAnimationFrame(sliderFrame);
  });
};

const nudgeSlider = direction => {
  if (!track || !viewport) return;
  const first = originals()[0];
  if (!first) return;

  if (!sliderDesktop) {
    viewport.scrollBy({ left: direction * (first.offsetWidth + 20) * 2, behavior: "smooth" });
    return;
  }

  const gap = parseFloat(getComputedStyle(track).gap) || 0;
  const distance = (first.offsetWidth + gap) * 2; // faster jump: exactly 2 cards

  if (direction < 0 && sliderOffset < distance) {
    sliderOffset += sliderSetWidth;
    setTrackPosition(sliderOffset);
  }

  sliderAnimating = true;
  sliderOffset += direction * distance;
  setTrackPosition(sliderOffset, true);

  window.setTimeout(() => {
    normalizeSlider();
    setTrackPosition(sliderOffset);
    sliderAnimating = false;
    sliderLast = performance.now();
  }, 740);
};

/* The carousel keeps moving even while the cursor is above it.
   Hover is reserved for the card overlay, as requested. */
projectPrev?.addEventListener("click", () => nudgeSlider(-1));
projectNext?.addEventListener("click", () => nudgeSlider(1));
document.addEventListener("visibilitychange", () => { sliderLast = performance.now(); });

if (document.readyState === "complete") setupSlider();
else window.addEventListener("load", setupSlider, { once: true });

let resizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(setupSlider, 180);
});

if ("ResizeObserver" in window && track) {
  const carouselResizeObserver = new ResizeObserver(() => {
    if (!sliderDesktop || sliderAnimating) return;
    measureSlider();
    normalizeSlider();
    setTrackPosition(sliderOffset);
  });
  carouselResizeObserver.observe(track);
}

/* Stable DETAILS animation — FAQ + packages */
const detailsAnimations = new WeakMap();
const detailsTargetOpen = new WeakMap();

const animateDetails = (item, willOpen) => {
  const summary = item.querySelector(":scope > summary");
  if (!summary) return;

  if (reduceMotion || !item.animate) {
    item.open = willOpen;
    detailsTargetOpen.set(item, willOpen);
    return;
  }

  const running = detailsAnimations.get(item);
  const currentHeight = item.getBoundingClientRect().height;

  if (running) {
    running.onfinish = null;
    running.oncancel = null;
    running.cancel();
  }

  if (willOpen && !item.open) item.open = true;

  item.style.height = "auto";
  item.style.overflow = "hidden";

  /* When closing, the resting height is not always the summary height: inside a
     stretched grid row the tile keeps the height of its neighbours. Measure that
     real closed height so the panel stops there instead of collapsing all the way
     down and springing back up. */
  let targetHeight;
  if (willOpen) {
    targetHeight = item.scrollHeight;
  } else {
    const wasOpen = item.open;
    item.open = false;
    targetHeight = Math.max(
      summary.getBoundingClientRect().height,
      item.getBoundingClientRect().height
    );
    item.open = wasOpen;
  }

  item.style.height = `${currentHeight}px`;
  item.getBoundingClientRect(); // force current frame

  detailsTargetOpen.set(item, willOpen);
  item.dataset.animating = "true";

  const animation = item.animate(
    [
      { height: `${currentHeight}px` },
      { height: `${targetHeight}px` }
    ],
    {
      duration: willOpen ? 250 : 210,
      easing: "cubic-bezier(.2,.75,.25,1)"
    }
  );

  detailsAnimations.set(item, animation);

  /* Bezpiecznik.

     Caly stan harmonijki wisial na zdarzeniu onfinish: to ono zdejmuje
     data-animating i domyka <details>. Jesli zdarzenie przepadnie —
     a przepada, gdy przegladarka przestanie rysowac klatki, np. przy
     przelaczeniu karty w trakcie animacji — atrybut zostaje na zawsze,
     getNextDetailsState zwraca ciagle te sama wartosc i kafel przestaje
     reagowac na klikniecia. Odtworzone w praktyce. Jesli animacja nie
     zamknie sie w swoim czasie, domykamy stan recznie. */
  let bezpiecznik = 0;

  const finish = () => {
    window.clearTimeout(bezpiecznik);
    if (detailsAnimations.get(item) !== animation) return;
    if (!detailsTargetOpen.get(item)) item.open = false;
    item.style.height = "";
    item.style.overflow = "";
    delete item.dataset.animating;
    detailsAnimations.delete(item);
  };

  bezpiecznik = window.setTimeout(finish, (willOpen ? 250 : 210) + 150);

  animation.onfinish = finish;
  animation.oncancel = () => {
    window.clearTimeout(bezpiecznik);
    if (detailsAnimations.get(item) !== animation) return;
    item.style.height = "";
    item.style.overflow = "";
    delete item.dataset.animating;
    detailsAnimations.delete(item);
  };
};

const getNextDetailsState = item => {
  if (detailsTargetOpen.has(item) && item.dataset.animating === "true") {
    return !detailsTargetOpen.get(item);
  }
  return !item.open;
};

/* FAQ — one question at a time */
const faqItems = [...document.querySelectorAll(".faq__list details")];

faqItems.forEach(item => {
  const summary = item.querySelector(":scope > summary");
  if (!summary) return;

  summary.addEventListener("click", event => {
    event.preventDefault();
    const willOpen = getNextDetailsState(item);
    trzymajWMiejscu(summary);

    if (willOpen) {
      faqItems.forEach(other => {
        if (other === item) return;
        if (other.open || detailsTargetOpen.get(other) === true) {
          animateDetails(other, false);
        }
      });
    }

    animateDetails(item, willOpen);
  });
});

/* Karty pakietów mają jeden wspólny przycisk. Dodatkowe usługi otwierają się osobno. */
document.querySelectorAll(".package-card").forEach(item => {
  item.querySelector(":scope > summary")?.addEventListener("click", event => {
    event.preventDefault();
    packagesToggle?.click();
  });
});
document.querySelectorAll(".extra-service").forEach(item => {
  const summary = item.querySelector(":scope > summary");
  if (!summary) return;

  summary.addEventListener("click", event => {
    event.preventDefault();
    animateDetails(item, getNextDetailsState(item));
  });
});

/* Polish typography: no hanging one-letter words and no single-word orphans.
   We leave headings with intentional <br> breaks alone and protect editorial copy only. */
const typographySelectors = [
  ".rich-copy p",
  ".section-quote",
  ".package-card summary p",
  ".package-card__body p",
  ".package-card__body li",
  ".process-item small",
  ".process-answer p",
  ".process-answer b",
  ".faq__list summary",
  ".faq__list details > div p",
  ".faq__cta p",
  ".contact__lead",
  ".contact__people em",
  ".footer p",
  ".footer__person em",
  /* Oferta — uwaga klienta nr 11 (22.09): "wiszace literki".
     Akapity pod tabela i opisy pakietow nie byly tu objete, wiec
     jednoliterowe spojniki zostawaly na koncu linii. */
  ".offer-matrix__note",
  ".offer-matrix__help p",
  ".offer-matrix__panel-inner p",
  ".offer-matrix__pdf-note",
  ".offer-consult__intro p",
  ".offer-consult__journey-row p"
];

const protectPolishTypography = node => {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach(textNode => {
    textNode.nodeValue = textNode.nodeValue.replace(/\b([aiouwz])\s+/gi, "$1\u00A0");
  });

  /* Join the final two words of the block. This prevents the last line from
     ending up with one lonely word after responsive reflow. */
  for (let index = textNodes.length - 1; index >= 0; index -= 1) {
    const textNode = textNodes[index];
    if (!textNode.nodeValue || !textNode.nodeValue.trim()) continue;
    textNode.nodeValue = textNode.nodeValue.replace(/(\S+)\s+(\S+)(\s*)$/, "$1\u00A0$2$3");
    break;
  }
};

document.querySelectorAll(typographySelectors.join(",")).forEach(protectPolishTypography);

/* Miekkie laczniki w tekscie justowanym.

   Przegladarka nie ma polskiego slownika dzielenia (sprawdzone: hyphens:
   auto nie zmienia lamania ani o piksel), wiec justowanie w waskich
   kolumnach robilo "rzeki" — biale przerwy miedzy slowami. dzielenie-pl.js
   dokleja niewidoczne laczniki na podstawie wzorcow TeX-owych i sam
   sprawdza, ktore akapity sa naprawde justowane. Musi isc po powyzszej
   typografii, zeby nie rozbijac wstawionych twardych spacji. */
window.dzielenieWyrazowPL?.([
  ".about__copy .rich-copy p",
  ".offer-matrix__note",
  ".offer-matrix__help p",
  ".offer-matrix__pdf-note",
  ".offer-matrix__panel-inner p",
  ".offer-consult__intro p",
  ".offer-consult__journey-row p",
  ".package-card__body p",
  ".faq__list details > div p",
  ".contact__lead"
].join(","));

/* Process accordion + progress */
const processItems = [...document.querySelectorAll("[data-process-item]")];
const processGhost = document.querySelector("[data-process-ghost]");
const processRange = document.querySelector(".process__range");

const setProcessProgress = step => {
  if (!processRange || !processItems.length) return;
  const safeStep = Math.max(0, Math.min(processItems.length, step));
  processRange.style.setProperty("--process-progress", `${(safeStep / processItems.length) * 100}%`);
};

setProcessProgress(0);

processItems.forEach((item, index) => {
  const button = item.querySelector("[data-process-toggle]");
  button?.addEventListener("click", () => {
    /* Kafle procesu animuje CSS (grid-template-rows, 550 ms), a nie Web
       Animations jak w FAQ. Domyslne 320 ms konczylo sie w polowie ruchu. */
    trzymajWMiejscu(button, 600);
    const willOpen = !item.classList.contains("is-open");
    processItems.forEach(other => {
      const open = willOpen && other === item;
      other.classList.toggle("is-open", open);
      other.querySelector("[data-process-toggle]")?.setAttribute("aria-expanded", String(open));
    });

    setProcessProgress(index + 1);

    if (processGhost) {
      processGhost.style.opacity = "0";
      processGhost.style.transform = "translateY(14px)";
      window.setTimeout(() => {
        processGhost.textContent = String(index + 1).padStart(2, "0");
        processGhost.style.opacity = "";
        processGhost.style.transform = "";
      }, 180);
    }
  });
});


/* Map pin: keep the Gliwice marker for the initial view, then remove it as soon
   as the user starts interacting with the embedded map. This prevents the
   marker from pretending to point at Gliwice after the map has been panned. */
const embeddedMap = document.querySelector('.map');
const embeddedMapFrame = embeddedMap?.querySelector('iframe');

if (embeddedMap && embeddedMapFrame) {
  let pointerOverMap = false;
  let mapInteractionWatcher = 0;

  const hideMapPin = () => {
    embeddedMap.classList.add('is-interacted');
    if (mapInteractionWatcher) {
      window.clearInterval(mapInteractionWatcher);
      mapInteractionWatcher = 0;
    }
  };

  embeddedMap.addEventListener('mouseenter', () => {
    pointerOverMap = true;
    if (!mapInteractionWatcher) {
      mapInteractionWatcher = window.setInterval(() => {
        if (document.activeElement === embeddedMapFrame) hideMapPin();
      }, 120);
    }
  });

  embeddedMap.addEventListener('mouseleave', () => {
    pointerOverMap = false;
    if (mapInteractionWatcher) {
      window.clearInterval(mapInteractionWatcher);
      mapInteractionWatcher = 0;
    }
  });

  window.addEventListener('blur', () => {
    if (pointerOverMap) hideMapPin();
  });

  /* On touch devices the iframe becomes the interaction target after a tap. */
  embeddedMap.addEventListener('touchstart', hideMapPin, { passive: true });
}

/* Success message */
document.querySelectorAll(".contact-form input[name='_next']").forEach(input => {
  const section = document.querySelector("#formularz") ? "formularz" : "kontakt";
  input.value = `${location.origin}${location.pathname}?wyslano=1#${section}`;
});
const params = new URLSearchParams(location.search);
/* Stan "wyslano" — jeden dla obu drog: wysylki w tle i powrotu z ?wyslano=1. */
const pokazPodziekowanie = () => {
  document.querySelectorAll(".contact__form-head").forEach(head => {
    head.classList.add("is-sent");
    head.querySelector("h3").textContent = "Dziękujemy za kontakt";
    head.querySelector(".section-label").textContent = "Zapraszamy do obejrzenia naszych projektów, a my przygotujemy odpowiedź.";
  });
  document.querySelector(".contact-form")?.setAttribute("hidden", "");
  const success = document.querySelector("[data-success]");
  if (success) {
    success.removeAttribute("hidden");
    success.classList.add("is-visible");
    success.closest(".contact__page--right")?.append(success);
  }
};

if (params.get("wyslano") === "1") pokazPodziekowanie();

/* Wysylka bez opuszczania strony.

   Zwykly POST szedl na formsubmit.co, ktory po przetworzeniu przerzucal
   uzytkownika z powrotem na kontakt.html?wyslano=1 — czyli wyjscie ze
   strony, mrugniecie i przeladowanie. FormSubmit ma koncowke /ajax/,
   ktora zwraca JSON zamiast przekierowania, wiec podziekowanie pokazujemy
   w miejscu formularza.

   Zwykla wysylka zostaje jako zapas: jesli skrypt sie nie wykona albo
   fetch padnie, formularz dziala po staremu. */
document.querySelectorAll(".contact-form").forEach(formularz => {
  const przycisk = formularz.querySelector("[type='submit']");

  const pokazBlad = tresc => {
    let blad = formularz.querySelector("[data-blad-wysylki]");
    if (!blad) {
      blad = document.createElement("p");
      blad.className = "form-error";
      blad.setAttribute("data-blad-wysylki", "");
      blad.setAttribute("role", "alert");
      formularz.append(blad);
    }
    blad.textContent = tresc;
  };

  formularz.addEventListener("submit", async event => {
    if (!window.fetch || !formularz.reportValidity()) return;
    event.preventDefault();

    const adres = formularz.getAttribute("action")
      .replace("formsubmit.co/", "formsubmit.co/ajax/");
    const dane = new FormData(formularz);
    dane.delete("_next"); /* przy wysylce w tle nie ma dokad wracac */

    formularz.querySelector("[data-blad-wysylki]")?.remove();
    if (przycisk) przycisk.disabled = true;

    try {
      const odpowiedz = await fetch(adres, {
        method: "POST",
        body: dane,
        headers: { Accept: "application/json" }
      });
      if (!odpowiedz.ok) throw new Error(odpowiedz.status);
      pokazPodziekowanie();
    } catch (_) {
      if (przycisk) przycisk.disabled = false;
      pokazBlad("Nie udało się wysłać wiadomości. Spróbuj ponownie lub napisz na tooniprojektuja@gmail.com.");
    }
  });
});

document.querySelector("[data-pdf-preview]")?.addEventListener("click", event => {
  const button = event.currentTarget;
  const note = document.querySelector("[data-pdf-note]");
  if (!note) return;
  note.hidden = !note.hidden;
  button.setAttribute("aria-expanded", String(!note.hidden));
});

window.addEventListener("beforeunload", () => cancelAnimationFrame(sliderRaf));


/* Oferta — opis pakietu rozwija się NAD tabelą po kliknięciu w nagłówek kolumny. */
const packToggles = [...document.querySelectorAll("[data-pack-toggle]")];
const packPanels = [...document.querySelectorAll("[data-pack-panel]")];

if (packToggles.length && packPanels.length) {
  const panelAnimations = new WeakMap();
  const kontenerPaneli = document.querySelector("[data-pack-panels]");

  const setPanel = (panel, open) => {
    const inner = panel.querySelector(".offer-matrix__panel-inner");
    if (!inner) return;
    const previous = panelAnimations.get(panel);
    if (previous) {
      previous.onfinish = null;
      previous.cancel();
    }
    const from = panel.getBoundingClientRect().height;
    panel.setAttribute("aria-hidden", String(!open));
    panel.classList.toggle("is-open", open);
    if (reduceMotion) {
      panel.style.height = open ? "auto" : "0px";
      return null;
    }
    const to = open ? inner.getBoundingClientRect().height : 0;
    panel.style.height = `${from}px`;
    panel.getBoundingClientRect();
    const animation = panel.animate(
      [{ height: `${from}px` }, { height: `${to}px` }],
      { duration: open ? 360 : 290, easing: "cubic-bezier(.2,.75,.25,1)" }
    );
    panelAnimations.set(panel, animation);

    /* Bezpiecznik jak w harmonijkach — bez niego zgubione onfinish
       zostawia panel z wysokoscia zamrozona w polowie animacji. */
    let bezpiecznikPanelu = 0;
    const domknij = () => {
      window.clearTimeout(bezpiecznikPanelu);
      if (panelAnimations.get(panel) !== animation) return;
      panel.style.height = open ? "auto" : "0px";
      panelAnimations.delete(panel);
    };

    bezpiecznikPanelu = window.setTimeout(domknij, (open ? 360 : 290) + 150);
    animation.onfinish = domknij;
    return animation;
  };

  packPanels.forEach(panel => {
    panel.style.height = "0px";
    panel.setAttribute("aria-hidden", "true");
  });

  packToggles.forEach(toggle => {
    toggle.addEventListener("click", () => {
      const id = toggle.dataset.packToggle;
      const willOpen = toggle.getAttribute("aria-expanded") !== "true";

      packToggles.forEach(other => {
        const open = willOpen && other === toggle;
        other.setAttribute("aria-expanded", String(open));
        other.classList.toggle("is-open", open);
      });

      /* Zadnego trzymania pozycji: skoro i tak przewijamy do opisu, kazdy
         dodatkowy mechanizm ruszajacy scrollem daje drugi ruch. Zmierzone:
         z trzymaniem strona szla do 297 px i wracala do 227 px — i to
         wlasnie widac bylo jako podwojny skok. */
      const animacje = [];
      packPanels.forEach(panel => {
        const open = willOpen && panel.dataset.packPanel === id;
        const wasOpen = panel.classList.contains("is-open");
        if (open !== wasOpen) {
          const animacja = setPanel(panel, open);
          if (animacja) animacje.push(animacja.finished.catch(() => {}));
        }
      });

      /* Po rozwinieciu opisu przewin do niego — jeden ruch, od razu.

         Wczesniej strona ruszala sie dwa razy: najpierw natywne kotwiczenie
         przesuwalo widok, bo rosnacy panel spycha tabele w dol, a potem,
         juz po animacji, startowalo nasze przewijanie do opisu. Teraz
         kotwiczenie w tej sekcji jest wylaczone (overflow-anchor w CSS),
         a przewijanie rusza razem z animacja.

         Celem jest kontener paneli, a nie pojedynczy panel: gorna krawedz
         kontenera nie zmienia polozenia, wiec cel jest znany od razu i nie
         trzeba czekac na koniec animacji. Przy przelaczaniu miedzy pakietami
         gorna krawedz samego panelu potrafi sie przesunac, bo sasiad wlasnie
         sie zwija. */
      /* Jedno przewiniecie, od razu, do kontenera paneli.

         Celem jest kontener, a nie pojedynczy panel: jego gorna krawedz nie
         zmienia polozenia, wiec cel jest poprawny juz w chwili klikniecia
         i nie trzeba czekac na koniec animacji. Panel rozwija sie ponizej
         punktu docelowego, wiec nie przesuwa go pod trwajacym przewijaniem. */
      if (willOpen) {
        przewinDoElementu(kontenerPaneli || packPanels[0], { plynnie: true });
      }
    });
  });
}

/* O NAS — rowne kolumny robi teraz sam CSS (grid + space-between).
   Wczesniejsza wersja liczyla wysokosc bloku w skrypcie i dzielila akapity
   miedzy kolumny; dawalo to rowna wysokosc, ale zostawialo na dole lewej
   kolumny pojedyncza wiszaca linie. Kod zostal usuniety zamiast rozbudowany. */

/* PAKIETY — "Otrzymujesz" na jednej linii we wszystkich kaflach
   (uwaga klienta nr 3, 22.09: "Wyrownaj rowniez linie Otrzymujesz:
   zeby lecialy od jednego poziomu").

   Opisy pakietow maja rozna dlugosc, wiec naglowek pod nimi startowal
   w kazdym kaflu na innej wysokosci. Wszystkie cztery kafle otwieraja
   sie jednym przyciskiem, wiec wystarczy zrownac wysokosc samych opisow
   do najwyzszego. Liczone z tresci, nie na sztywno. */
const siatkaPakietow = document.querySelector(".packages__grid");

if (siatkaPakietow) {
  const opisyPakietow = () => [...siatkaPakietow.querySelectorAll(".package-card__body > p")];

  const wyrownajOpisyPakietow = () => {
    const opisy = opisyPakietow();
    if (!opisy.length) return;

    opisy.forEach(opis => { opis.style.minHeight = ""; });

    /* Kafle zamkniete nie maja wymiarow — nie ma czego wyrownywac. */
    const wysokosci = opisy.map(opis => opis.getBoundingClientRect().height);
    if (!wysokosci.some(Boolean)) return;

    const najwyzszy = Math.max(...wysokosci);
    opisy.forEach(opis => { opis.style.minHeight = `${najwyzszy}px`; });
  };

  /* Kafle otwiera wspolny przycisk, a zamyka animacja — lapiemy obie
     zmiany zamiast wpinac sie w srodek tamtej logiki. */
  new MutationObserver(() => window.requestAnimationFrame(wyrownajOpisyPakietow))
    .observe(siatkaPakietow, { attributes: true, subtree: true, attributeFilter: ["open"] });

  /* Tak samo jak przy kolumnach "o nas": obserwujemy szerokosc rodzica,
     a nie zdarzenie resize okna. Ustawiamy min-height na kafle wewnatrz
     siatki, wiec obserwowanie samej siatki robiloby petle. */
  const ramaPakietow = siatkaPakietow.parentElement;
  let przeliczenieOpisow = 0;
  const zaplanujPrzeliczenie = () => {
    window.clearTimeout(przeliczenieOpisow);
    przeliczenieOpisow = window.setTimeout(wyrownajOpisyPakietow, 150);
  };

  if (ramaPakietow && "ResizeObserver" in window) {
    let ostatniaSzerokosc = 0;
    new ResizeObserver(wpisy => {
      const szerokosc = Math.round(wpisy[0].contentRect.width);
      if (szerokosc === ostatniaSzerokosc) return;
      ostatniaSzerokosc = szerokosc;
      zaplanujPrzeliczenie();
    }).observe(ramaPakietow);
  }

  window.addEventListener("resize", zaplanujPrzeliczenie);

  document.fonts?.ready.then(wyrownajOpisyPakietow);
}
