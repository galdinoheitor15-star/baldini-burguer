// ===== Ajustes do cardápio feitos na gestão =====
// Preços novos, produtos novos e produtos escondidos ficam no banco (config/cardapio) e valem
// para o site e para a gestão. Sem internet, usa os últimos ajustes guardados no aparelho.
(function (root) {
  const KEY = 'baldini-ajustes-cardapio';
  const num = v => (typeof v === 'number' && isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : null);

  // Devolve uma cópia do cardápio com os ajustes. manterOcultos: a gestão ainda lista os escondidos.
  function aplicar(menu, aj, { manterOcultos = false } = {}) {
    const m = JSON.parse(JSON.stringify(menu || []));
    aj = aj || {};
    const precos = aj.precos || {}, opcoes = aj.opcoes || {};
    const ocultos = new Set(aj.ocultos || []);
    m.forEach(c => {
      c.items.forEach(p => {
        if (num(precos[p.id]) !== null) p.price = num(precos[p.id]);
        (p.groups || []).forEach(g => g.options.forEach(o => {
          const v = num(opcoes[p.id + '::' + o.name]);
          if (v !== null) o.price = v;
        }));
      });
      (aj.novos || []).filter(n => n && n.cat === c.id && n.id && n.name).forEach(n => {
        c.items.push({ id: String(n.id), name: String(n.name).slice(0, 80), desc: String(n.desc || '').slice(0, 300), price: num(n.price) || 0, img: n.img || null, badge: n.badge || null, deliveryOnly: false, groups: [], novo: true });
      });
      c.items.forEach(p => { if (ocultos.has(p.id)) p.oculto = true; });
      if (!manterOcultos) c.items = c.items.filter(p => !p.oculto);
    });
    return manterOcultos ? m : m.filter(c => c.items.length);
  }

  function guardado() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } }
  function guardar(aj) { try { localStorage.setItem(KEY, JSON.stringify(aj || {})); } catch { /* sem armazenamento */ } }

  // Busca os ajustes no banco sem carregar o Firebase inteiro (leitura pública)
  async function buscar(ms = 2500) {
    const cfg = root.BALDINI_FIREBASE || {};
    if (!cfg.projectId || !cfg.apiKey) return guardado();
    const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/config/cardapio?key=${cfg.apiKey}`;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), ms);
    try {
      const res = await fetch(url, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
      if (res.status === 404) { guardar({}); return {}; }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const doc = await res.json();
      const aj = JSON.parse(doc.fields?.dados?.stringValue || '{}');
      guardar(aj);
      return aj;
    } catch (e) {
      console.warn('[cardápio] ajustes não carregaram, usando os guardados', e);
      return guardado();
    } finally { clearTimeout(timer); }
  }

  // No site: aplica os ajustes e só depois carrega os scripts que montam o cardápio e a sacola
  function prepararSite(scripts) {
    const base = root.MENU || [];
    const carregar = () => scripts.forEach(src => {
      const s = document.createElement('script');
      s.src = src; s.async = false;
      document.body.appendChild(s);
    });
    buscar().then(aj => { root.MENU = aplicar(base, aj); }, () => {}).finally(carregar);
  }

  root.BaldiniCardapio = { aplicar, buscar, guardado, guardar, prepararSite };
})(typeof self !== 'undefined' ? self : this);
