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

  // Prikaži sve formule unutar elementa. errorCallback (opcionalno) prima poruke o greškama.
  function render(el, errorCallback) {
    if (!el || typeof window.renderMathInElement !== 'function') return;
    if (!el.textContent.includes('$')) return;
    const opts = errorCallback ? { ...OPTIONS, errorCallback } : OPTIONS;
    window.renderMathInElement(el, opts);
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
