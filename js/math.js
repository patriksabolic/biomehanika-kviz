// Prikaz formula (spec, odjeljci 4 i 16): KaTeX + mhchem iz vendor/katex/.
// Klasična skripta (ne modul), da je isti kod mogu koristiti app i provjera u tools/validate.py.
// Matematika: $...$ u retku, $$...$$ zasebni redak; kemija: $\ce{...}$.
(function () {
  const OPTIONS = {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
    ],
    // Ne prikazuj formule u poljima za upis, kodu ni u SVG-u (grafovi statistike).
    ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option', 'svg', 'title'],
    ignoredClasses: ['no-math'],
    throwOnError: true, // neispravna formula ostaje kao običan tekst (i greška u konzoli)
    strict: 'ignore',   // č, ć, š, ž u \text{...} su u redu
  };

  // Prvi predak koji uopće ima širinu (span u retku ima clientWidth 0).
  function widthBox(node) {
    for (let p = node.parentElement; p; p = p.parentElement) {
      if (p.clientWidth > 0) return p;
    }
    return null;
  }

  // Duge formule u retku (npr. \ce jednadžbe) ne mogu se prelomiti, pa probiju okvir kartice.
  // Ako je okvir oko formule širi od svojeg vidljivog dijela, formulu stavljamo u kutiju koja
  // se može pomicati vodoravno (css: .math-scroll). Kratke formule ostaju netaknute.
  function fitWide(el) {
    const list = el.querySelectorAll ? el.querySelectorAll('.katex') : [];
    for (const k of list) {
      const parent = k.parentElement;
      if (!parent || parent.classList.contains('math-scroll')) continue;
      if (parent.classList.contains('katex-display')) continue; // već ima svoje klizanje
      const box = widthBox(k);
      if (!box || box.scrollWidth <= box.clientWidth) continue;
      const wrap = document.createElement('span');
      wrap.className = 'math-scroll';
      parent.insertBefore(wrap, k);
      wrap.appendChild(k);
    }
  }

  // Prikaži sve formule unutar elementa. errorCallback (opcionalno) prima poruke o greškama.
  function render(el, errorCallback) {
    if (!el || typeof window.renderMathInElement !== 'function') return;
    if (!el.textContent.includes('$')) return;
    const opts = errorCallback ? { ...OPTIONS, errorCallback } : OPTIONS;
    window.renderMathInElement(el, opts);
    fitWide(el);
  }

  // Automatski prikaz formula u svemu što aplikacija upiše u stranicu (svi ekrani).
  function observe(root) {
    let busy = false;
    const obs = new MutationObserver(() => {
      if (busy) return;
      busy = true;
      try { render(root); } finally { obs.takeRecords(); busy = false; }
    });
    obs.observe(root, { childList: true, subtree: true, characterData: true });
    render(root);
  }

  window.kvizMath = { render, observe, OPTIONS };
})();
