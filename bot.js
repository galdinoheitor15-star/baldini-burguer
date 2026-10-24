// ===== Assistente de pedidos (bot do site) =====
(() => {
  const Core = window.BaldiniCore;
  if (!Core) return;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const WHATS = 'https://wa.me/5581987908900?text=' + encodeURIComponent('Olá, Baldini Burguer! Preciso de ajuda com um pedido.');

  const wrap = document.createElement('div');
  wrap.className = 'bot';
  wrap.innerHTML = `
    <button type="button" class="bot__fab" aria-label="Abrir assistente de pedidos" aria-expanded="false">🍔<span>Ajuda</span></button>
    <section class="bot__panel" hidden aria-label="Assistente Baldini">
      <header class="bot__head"><strong>Assistente Baldini</strong><button type="button" class="bot__close" aria-label="Fechar">✕</button></header>
      <div class="bot__log" role="log" aria-live="polite"></div>
      <form class="bot__form"><input type="text" name="q" maxlength="120" placeholder="Ex.: quero uma granada" autocomplete="off" aria-label="Mensagem"><button type="submit">Enviar</button></form>
    </section>`;
  document.body.appendChild(wrap);
  const fab = wrap.querySelector('.bot__fab');
  const panel = wrap.querySelector('.bot__panel');
  const log = wrap.querySelector('.bot__log');
  const input = wrap.querySelector('input');
  let started = false;

  function lastOrder() {
    try {
      const id = JSON.parse(localStorage.getItem('baldini-ultimo-pedido'));
      if (!id || !window.BaldiniDB) return Promise.resolve(null);
      // Com internet ruim o banco pode demorar: o bot responde em até 4s mesmo sem o status
      return Promise.race([window.BaldiniDB.getOrder(id), new Promise(ok => setTimeout(() => ok(null), 4000))]);
    } catch { return Promise.resolve(null); }
  }

  function say(who, text, actions = []) {
    const el = document.createElement('div');
    el.className = `bot__msg bot__msg--${who}`;
    el.innerHTML = `<p>${esc(text)}</p>${actions.length ? `<div class="bot__acts">${actions.map((a, i) => `<button type="button" data-i="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}`;
    el.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => act(actions[+b.dataset.i])));
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  function act(a) {
    const site = window.BaldiniSite || {};
    if (a.type === 'product' && site.openProduct) { close(); site.openProduct(a.id); }
    else if (a.type === 'cat' && site.goToCategory) { close(); site.goToCategory(a.id); }
    else if (a.type === 'cart' && site.openCart) { close(); site.openCart(); }
    else if (a.type === 'whats') window.open(WHATS, '_blank', 'noopener');
  }

  async function answer(text) {
    say('me', text);
    let order = null;
    try { order = await lastOrder(); } catch { /* sem banco */ }
    const r = Core.botReply(text, { menu: window.MENU || [], lastOrder: order });
    setTimeout(() => {
      say('bot', r.text, r.actions || []);
      if (r.intent === 'sacola' && window.BaldiniSite?.openCart) setTimeout(() => act({ type: 'cart' }), 600);
    }, 250);
  }

  function open() {
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    if (!started) { started = true; const r = Core.botReply('oi'); say('bot', r.text, r.actions); }
    setTimeout(() => input.focus(), 50);
  }
  function close() { panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); }
  fab.addEventListener('click', () => (panel.hidden ? open() : close()));
  wrap.querySelector('.bot__close').addEventListener('click', close);
  wrap.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const t = input.value.trim();
    if (!t) return;
    input.value = '';
    answer(t);
  });
})();
