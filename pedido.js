// ===== Cardápio + sacola + pedido pelo WhatsApp =====
(() => {
  const WHATSAPP = '5581987908900';
  const MENU = window.MENU || [];
  const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const store = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sem armazenamento */ } }
  };
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plusIcon = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>';

  // Nome curto do grupo para a sacola e a mensagem do WhatsApp
  function groupLabel(name) {
    const n = name.toLowerCase();
    if (n.includes('adicional')) return 'Adicionais';
    if (n.includes('turbine')) return 'Turbinar';
    if (n.includes('acompanhamento')) return 'Acompanhamento';
    if (n.includes('refrigerante') || n.includes('1l')) return 'Sabor';
    if (n.includes('tamanho')) return 'Tamanho';
    if (n.includes('bomba')) return 'Burger';
    return name.replace(/\s+\?/, '?');
  }
  const optLabel = name => name.replace(/\s*\(extra\)/i, '');

  const products = new Map();
  MENU.forEach(cat => cat.items.forEach(p => products.set(p.id, { ...p, cat: cat.id })));

  // ---------- Clube de pontos (mesmas regras do programa da Baldini) ----------
  // Ganha 1 ponto por R$ 1,00. Cada recompensa custa 20 pontos por R$ 1,00 do valor dela.
  const POINTS = { perReal: 1, signup: 5, rewardPerReal: 20 };
  const REWARDS = [
    { id: 'batata-frita', name: 'Batata Frita Média', value: 16.99, img: 'img/menu/batata-frita.jpeg' },
    { id: 'batata-cheddar-calabresa', name: 'Batata com Cheddar e Calabresa', value: 27.99, img: 'img/menu/batata-com-cheddar-e-calabresa.jpg' },
    { id: 'batata-cheddar-bacon', name: 'Batata com Cheddar e Bacon', value: 29.99, img: 'img/menu/batata-com-cheddar-e-bacon.jpg' },
    { id: 'entrega-gratis', name: 'Entrega grátis', value: null, img: null }
  ].map(r => ({ ...r, points: r.value ? Math.ceil(r.value * POINTS.rewardPerReal) : null }));
  const pointsFor = value => Math.floor(value * POINTS.perReal);
  const rewardCost = r => r.points ? `${r.points} pontos` : `${POINTS.rewardPerReal} pontos por R$ 1 da taxa`;

  function renderRewards() {
    const list = $('rewardsList');
    if (list) list.innerHTML = REWARDS.map(r => `
      <article class="reward">
        <div class="reward__img">${r.img ? `<img src="${r.img}" alt="" loading="lazy">` : '<span>🛵</span>'}</div>
        <div>
          <h4>${esc(r.name)}</h4>
          <strong>${r.points ? `${r.points} <small>pontos</small>` : `<small>${POINTS.rewardPerReal} pontos por R$ 1 da taxa</small>`}</strong>
        </div>
      </article>`).join('');
    const opts = $('rewardOptions');
    if (opts) opts.innerHTML =
      '<label><input type="radio" name="recompensa" value="" checked> Não, só juntar pontos</label>' +
      REWARDS.map(r => `<label><input type="radio" name="recompensa" value="${r.id}"> ${esc(r.name)} <small class="opt-cost">${rewardCost(r)}</small></label>`).join('');
  }
  renderRewards();

  // Menor preço possível (para itens que dependem de uma escolha obrigatória)
  function minPrice(p) {
    let total = p.price;
    (p.groups || []).forEach(g => {
      if (g.min > 0 && g.options.length) total += Math.min(...g.options.map(o => o.price)) * g.min;
    });
    return total;
  }
  const isFrom = p => (p.groups || []).some(g => g.min > 0 && new Set(g.options.map(o => o.price)).size > 1);

  // ---------- Cardápio ----------
  const tabsEl = $('menuTabs');
  const listEl = $('menuList');

  function renderMenu() {
    tabsEl.innerHTML = MENU.map((c, i) =>
      `<button type="button" class="tab${i === 0 ? ' is-active' : ''}" data-cat="${c.id}" role="tab">${esc(c.name)}</button>`).join('');
    listEl.innerHTML = MENU.map(c => `
      <section class="menu-cat" id="cat-${c.id}" data-cat="${c.id}">
        <h3 class="menu-cat__title">${esc(c.name)}</h3>
        ${c.note ? `<p class="menu-cat__note">${esc(c.note)}</p>` : ''}
        <div class="pgrid">
          ${c.items.map(p => `
            <article class="pcard" data-id="${p.id}" tabindex="0" role="button" aria-label="Escolher ${esc(p.name)}">
              <div class="pcard__img">${p.img ? `<img src="${p.img}" alt="" loading="lazy">` : '<span class="pcard__ph">🍔</span>'}
                ${p.badge ? `<em class="badge">${esc(p.badge)}</em>` : ''}</div>
              <div class="pcard__body">
                <h4>${esc(p.name)}</h4>
                <p>${esc(p.desc)}</p>
                <div class="pcard__foot">
                  <span class="pcard__price">${isFrom(p) ? '<small>a partir de</small>' : ''}${brl(minPrice(p))}</span>
                  <span class="add-btn" aria-hidden="true">${plusIcon}</span>
                </div>
              </div>
            </article>`).join('')}
        </div>
      </section>`).join('');

    listEl.querySelectorAll('.pcard').forEach(card => {
      const open = () => openProduct(card.dataset.id);
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    tabsEl.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => goToCategory(t.dataset.cat)));
  }

  function setActiveTab(id) {
    tabsEl.querySelectorAll('.tab').forEach(t => {
      const on = t.dataset.cat === id;
      t.classList.toggle('is-active', on);
      if (on) t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });
  }
  let scrollingTo = null;
  function goToCategory(id) {
    const sec = $(`cat-${id}`);
    if (!sec) return;
    setActiveTab(id);
    scrollingTo = id;
    const y = sec.getBoundingClientRect().top + window.scrollY - 150;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setTimeout(() => { scrollingTo = null; }, 800);
  }
  // Destaca a aba da categoria que está na tela
  function watchCategories() {
    const io = new IntersectionObserver(entries => {
      if (scrollingTo) return;
      entries.forEach(e => { if (e.isIntersecting) setActiveTab(e.target.dataset.cat); });
    }, { rootMargin: '-160px 0px -60% 0px' });
    listEl.querySelectorAll('.menu-cat').forEach(s => io.observe(s));
  }

  // ---------- Janela do produto ----------
  const modal = $('productModal');
  const modalBody = $('productBody');
  const modalAdd = $('productAdd');
  let current = null; // { product, sel: [Map(optionIndex -> qty)], qty }

  function openProduct(id) {
    const p = products.get(id);
    if (!p) return;
    current = { product: p, sel: (p.groups || []).map(() => new Map()), qty: 1 };
    // Escolha única com uma só opção já vem marcada
    (p.groups || []).forEach((g, gi) => { if (g.type === 'single' && g.options.length === 1) current.sel[gi].set(0, 1); });

    modalBody.innerHTML = `
      ${p.img ? `<img class="pm__img" src="${p.img}" alt="${esc(p.name)}">` : ''}
      <div class="pm__info">
        <h3>${esc(p.name)}</h3>
        ${p.desc ? `<p>${esc(p.desc)}</p>` : ''}
        ${p.price > 0 ? `<strong class="pm__price">${brl(p.price)}</strong>` : ''}
        ${p.deliveryOnly ? '<small class="pm__only">Apenas para delivery e retirada</small>' : ''}
      </div>
      ${(p.groups || []).map((g, gi) => groupHtml(g, gi)).join('')}
      <label class="pm__obs">Alguma observação?
        <textarea id="productObs" rows="2" maxlength="140" placeholder="Ex.: sem cebola, ponto da carne..."></textarea>
      </label>`;

    modalBody.querySelectorAll('[data-g]').forEach(el => el.addEventListener('click', onOptionClick));
    $('productQty').textContent = '1';
    updateModal();
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
    modalBody.scrollTop = 0;
    document.body.classList.add('no-scroll');
  }

  function groupHtml(g, gi) {
    const rule = g.type === 'single'
      ? (g.min > 0 ? 'Escolha 1 opção' : 'Opcional, escolha 1')
      : g.min > 0 ? `Escolha de ${g.min} até ${g.max}` : `Opcional, até ${g.max}`;
    return `
      <fieldset class="pg" data-group="${gi}">
        <legend class="pg__head">
          <span><b>${esc(g.name.replace(/\s+\?/, '?'))}</b><small>${rule}</small></span>
          ${g.min > 0 ? '<em class="pg__req">Obrigatório</em>' : ''}
        </legend>
        ${g.options.map((o, oi) => `
          <div class="po" data-opt="${oi}">
            <span class="po__name">${esc(optLabel(o.name))}${o.price > 0 ? `<small>+ ${brl(o.price)}</small>` : ''}</span>
            ${g.type === 'qty'
              ? `<span class="qty qty--sm"><button type="button" data-g="${gi}" data-o="${oi}" data-d="-1" aria-label="Menos">−</button><span>0</span><button type="button" data-g="${gi}" data-o="${oi}" data-d="1" aria-label="Mais">+</button></span>`
              : `<button type="button" class="po__pick po__pick--${g.type}" data-g="${gi}" data-o="${oi}" aria-label="Escolher ${esc(o.name)}"></button>`}
          </div>`).join('')}
      </fieldset>`;
  }

  function onOptionClick(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const gi = +btn.dataset.g, oi = +btn.dataset.o;
    const g = current.product.groups[gi];
    const sel = current.sel[gi];
    const count = [...sel.values()].reduce((s, q) => s + q, 0);
    if (g.type === 'single') {
      if (sel.has(oi) && g.min === 0) sel.clear();
      else { sel.clear(); sel.set(oi, 1); }
    } else if (g.type === 'multi') {
      if (sel.has(oi)) sel.delete(oi);
      else if (count < g.max) sel.set(oi, 1);
      else return toast(`Máximo de ${g.max} opções em "${g.name.replace(/\s+\?/, '?')}"`);
    } else {
      const d = +btn.dataset.d;
      const q = sel.get(oi) || 0;
      if (d > 0 && count >= g.max) return toast(`Máximo de ${g.max} em "${g.name.replace(/\s+\?/, '?')}"`);
      if (q + d <= 0) sel.delete(oi); else sel.set(oi, q + d);
    }
    updateModal();
  }

  function unitPrice() {
    const p = current.product;
    return p.price + p.groups.reduce((s, g, gi) =>
      s + [...current.sel[gi]].reduce((t, [oi, q]) => t + g.options[oi].price * q, 0), 0);
  }
  function missingGroup() {
    return current.product.groups.findIndex((g, gi) =>
      [...current.sel[gi].values()].reduce((s, q) => s + q, 0) < g.min);
  }

  function updateModal() {
    const p = current.product;
    p.groups.forEach((g, gi) => {
      const fs = modalBody.querySelector(`[data-group="${gi}"]`);
      const sel = current.sel[gi];
      const count = [...sel.values()].reduce((s, q) => s + q, 0);
      fs.classList.toggle('is-done', g.min > 0 && count >= g.min);
      fs.querySelectorAll('.po').forEach(row => {
        const oi = +row.dataset.opt;
        const q = sel.get(oi) || 0;
        row.classList.toggle('is-on', q > 0);
        if (g.type === 'qty') row.querySelector('.qty span').textContent = q;
        else row.classList.toggle('is-off', g.type === 'multi' && q === 0 && count >= g.max);
      });
    });
    const missing = missingGroup();
    modalAdd.classList.toggle('is-blocked', missing >= 0);
    $('productTotal').textContent = brl(unitPrice() * current.qty);
  }

  function closeProduct() {
    modal.classList.remove('is-open');
    document.body.classList.toggle('no-scroll', drawer.classList.contains('is-open'));
    setTimeout(() => { modal.hidden = true; }, 250);
  }

  $('productClose').addEventListener('click', closeProduct);
  modal.addEventListener('click', e => { if (e.target === modal) closeProduct(); });
  $('productMinus').addEventListener('click', () => {
    if (current.qty > 1) { current.qty--; $('productQty').textContent = current.qty; updateModal(); }
  });
  $('productPlus').addEventListener('click', () => {
    if (current.qty < 20) { current.qty++; $('productQty').textContent = current.qty; updateModal(); }
  });
  modalAdd.addEventListener('click', () => {
    const missing = missingGroup();
    if (missing >= 0) {
      const fs = modalBody.querySelector(`[data-group="${missing}"]`);
      fs.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fs.classList.remove('shake'); void fs.offsetWidth; fs.classList.add('shake');
      return toast(`Escolha: ${current.product.groups[missing].name.replace(/\s+\?/, '?')}`);
    }
    const p = current.product;
    const choices = p.groups.map((g, gi) => ({
      group: groupLabel(g.name),
      items: [...current.sel[gi]].sort((a, b) => a[0] - b[0]).map(([oi, q]) => ({ name: optLabel(g.options[oi].name), qty: q, price: g.options[oi].price }))
    })).filter(c => c.items.length);
    addLine({ id: p.id, name: p.name, img: p.img, unit: unitPrice(), qty: current.qty, choices, note: $('productObs').value.trim() });
    closeProduct();
  });

  // ---------- Sacola ----------
  let cart = store.get('baldini-sacola', []).filter(l => l && l.id && products.has(l.id));
  const lineKey = l => JSON.stringify([l.id, l.choices, l.note]);

  function addLine(line) {
    const same = cart.find(l => lineKey(l) === lineKey(line));
    if (same) same.qty += line.qty; else cart.push(line);
    saveCart();
    toast(`${line.qty}x ${line.name} na sacola 🍔`);
    const btn = $('cartBtn');
    btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
  }
  function saveCart() { store.set('baldini-sacola', cart); renderCart(); syncDraft(); }

  // ---------- Pedido ao vivo na gestão (aparece enquanto o cliente monta a sacola) ----------
  const Core = window.BaldiniCore;
  const DB = window.BaldiniDB;
  let draftId = store.get('baldini-rascunho', null);
  let draftTimer;
  function draftCliente() {
    const f = document.getElementById('stepCheckout')?.elements;
    const v = k => (f && f[k] ? f[k].value.trim() : '');
    return { nome: v('nome'), telefone: v('telefone') };
  }
  function syncDraft() {
    if (!Core || !DB) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      if (!cart.length && !draftId) return;
      if (!draftId) { draftId = Core.newOrderId(); store.set('baldini-rascunho', draftId); }
      const order = Core.sanitizeOrder({ id: draftId, origem: 'site', status: 'montando', itens: cart, cliente: draftCliente(), criadoEm: store.get('baldini-rascunho-em', 0) || Date.now() });
      if (!store.get('baldini-rascunho-em', 0)) store.set('baldini-rascunho-em', order.criadoEm);
      DB.saveOrder(order).catch(e => console.warn('Rascunho não salvo', e));
    }, 700);
  }
  window.BaldiniSite = {
    openProduct: id => openProduct(id),
    goToCategory: id => goToCategory(id),
    openCart: () => openCart()
  };
  const subtotal = () => cart.reduce((s, l) => s + l.unit * l.qty, 0);
  const totalQty = () => cart.reduce((s, l) => s + l.qty, 0);
  const choiceText = c => c.items.map(i => `${i.qty > 1 ? i.qty + 'x ' : ''}${i.name}`).join(', ');

  function renderCart() {
    const qty = totalQty();
    const total = brl(subtotal());
    $('cartCount').textContent = qty;
    $('cartCount').hidden = qty === 0;
    $('cartBarCount').textContent = qty;
    $('cartBarLabel').textContent = qty === 1 ? 'item' : 'itens';
    $('cartBarTotal').textContent = total;
    $('cartBar').hidden = qty === 0;
    document.body.classList.toggle('has-cart', qty > 0);
    $('cartSubtotal').textContent = total;
    $('checkoutTotal').textContent = total;
    $('cartEmpty').hidden = qty > 0;
    $('goCheckout').disabled = qty === 0;
    $('clearCart').hidden = qty === 0;
    const pts = pointsFor(subtotal());
    $('cartPoints').hidden = qty === 0;
    $('cartPoints').innerHTML = `⭐ Este pedido vale <b>${pts} pontos</b> no Clube Baldini`;
    $('checkoutPoints').innerHTML = `⭐ Você ganha <b>${pts} pontos</b> com este pedido`;

    const list = $('cartList');
    list.innerHTML = cart.map((l, i) => `
      <li class="cart-line" data-i="${i}">
        ${l.img ? `<img src="${l.img}" alt="" class="cart-line__img">` : ''}
        <div class="cart-line__main">
          <div class="cart-line__top">
            <strong>${esc(l.name)}</strong>
            <span class="cart-line__price">${brl(l.unit * l.qty)}</span>
          </div>
          ${l.choices.map(c => `<small class="cart-line__opt"><b>${esc(c.group)}:</b> ${esc(choiceText(c))}</small>`).join('')}
          ${l.note ? `<small class="cart-line__opt"><i>Obs: ${esc(l.note)}</i></small>` : ''}
          <div class="cart-line__bottom">
            <div class="qty qty--sm">
              <button type="button" data-act="minus" aria-label="Diminuir">${l.qty === 1 ? '🗑' : '−'}</button>
              <span>${l.qty}</span>
              <button type="button" data-act="plus" aria-label="Aumentar">+</button>
            </div>
            <small class="cart-line__each">${brl(l.unit)} cada</small>
          </div>
        </div>
      </li>`).join('');
    list.querySelectorAll('.cart-line').forEach(li => {
      const l = cart[+li.dataset.i];
      li.querySelector('[data-act=minus]').addEventListener('click', () => {
        l.qty--;
        if (l.qty <= 0) cart.splice(+li.dataset.i, 1);
        saveCart();
      });
      li.querySelector('[data-act=plus]').addEventListener('click', () => { l.qty++; saveCart(); });
    });
  }

  // Abrir / fechar a sacola
  const drawer = $('drawer');
  const overlay = $('drawerOverlay');
  function showStep(step) {
    $('stepCart').hidden = step !== 'cart';
    $('stepCheckout').hidden = step !== 'checkout';
    $('drawerTitle').textContent = step === 'cart' ? 'Sua sacola' : 'Finalizar pedido';
  }
  // iPhone: com o teclado aberto, a gaveta acompanha só a área visível da tela
  const vv = window.visualViewport;
  function fitViewport() {
    document.documentElement.style.setProperty('--vv-top', vv.offsetTop + 'px');
    document.documentElement.style.setProperty('--vv-h', vv.height + 'px');
  }
  if (vv) {
    vv.addEventListener('resize', fitViewport);
    vv.addEventListener('scroll', fitViewport);
    fitViewport();
  }
  let openFrame;
  function openCart() {
    showStep('cart');
    overlay.hidden = false;
    openFrame = requestAnimationFrame(() => { drawer.classList.add('is-open'); overlay.classList.add('is-open'); });
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }
  function closeCart() {
    cancelAnimationFrame(openFrame);
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { overlay.hidden = true; }, 300);
  }
  $('cartBtn').addEventListener('click', openCart);
  document.querySelectorAll('[data-open-cart]').forEach(el => el.addEventListener('click', openCart));
  $('drawerClose').addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) closeProduct(); else closeCart();
  });
  $('goCheckout').addEventListener('click', () => showStep('checkout'));
  $('backToCart').addEventListener('click', () => showStep('cart'));
  $('clearCart').addEventListener('click', () => {
    if (cart.length && confirm('Esvaziar a sacola?')) { cart = []; saveCart(); }
  });

  // Botões fora do cardápio: abrir produto ou ir para uma categoria
  document.querySelectorAll('[data-product]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault(); openProduct(el.dataset.product);
  }));
  document.querySelectorAll('[data-goto-cat]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault(); goToCategory(el.dataset.gotoCat);
  }));

  // ---------- Finalização ----------
  const form = $('stepCheckout');
  const saved = store.get('baldini-cliente', {});
  ['nome', 'telefone', 'endereco', 'bairro', 'referencia'].forEach(k => { if (saved[k]) form.elements[k].value = saved[k]; });
  if (window.BaldiniMask) BaldiniMask.apply(form); // telefone salvo antes também sai formatado

  function updateFormFields() {
    const delivery = form.elements.entrega.value === 'Delivery';
    $('addressFields').hidden = !delivery;
    $('feeNote').hidden = !delivery;
    $('trocoField').hidden = form.elements.pagamento.value !== 'Dinheiro';
  }
  form.addEventListener('change', updateFormFields);
  form.addEventListener('input', e => { if (['nome', 'telefone'].includes(e.target.name)) syncDraft(); });
  updateFormFields();

  // Pagamento online (InfinitePay) só aparece quando a loja ativou na gestão
  let loja = {};
  if (DB) DB.getConfig('loja').then(c => {
    loja = c || {};
    if (loja.infinitepayHandle && loja.pagamentoOnline) $('payOnlineOpt').hidden = false;
  }).catch(() => {});

  async function createPaymentLink(order) {
    const payload = Core.infinitepayPayload(order, {
      handle: loja.infinitepayHandle,
      redirectUrl: location.origin + location.pathname + '?pagamento=retorno',
      webhookUrl: loja.webhookUrl || undefined
    });
    const res = await fetch('https://api.checkout.infinitepay.io/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('InfinitePay respondeu ' + res.status);
    const data = await res.json();
    return data.url || data.link || data.checkout_url;
  }

  function showPayPanel(url) {
    const box = document.createElement('div');
    box.className = 'pay-panel';
    box.innerHTML = `<div class="pay-panel__box"><h3>Pedido enviado ✅</h3><p>Agora é só pagar com Pix ou cartão:</p>
      <a class="btn btn--yellow btn--block" href="${esc(url)}" rel="noopener">💳 Pagar agora</a>
      <button type="button" class="btn-link">Pagar depois</button></div>`;
    box.querySelector('button').addEventListener('click', () => box.remove());
    document.body.appendChild(box);
  }

  // Volta do pagamento: guarda os dados para a gestão conferir na InfinitePay
  const params = new URLSearchParams(location.search);
  if (params.get('pagamento') === 'retorno' && params.get('order_nsu') && DB) {
    DB.updateOrder(params.get('order_nsu'), {
      retornoPagamento: { slug: params.get('slug') || '', transaction_nsu: params.get('transaction_nsu') || '', capture_method: params.get('capture_method') || '', receipt_url: params.get('receipt_url') || '' }
    }).then(() => toast('Pagamento recebido! Obrigado 🍔')).catch(e => console.warn(e));
    history.replaceState(null, '', location.pathname);
  }

  const hour = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Recife' }).format(new Date()));
  if (!(hour >= 17 && hour < 23)) {
    const closed = document.createElement('p');
    closed.className = 'closed-note';
    closed.textContent = '⏰ Estamos fechados agora. Você pode mandar o pedido e ele será respondido a partir das 17h.';
    form.querySelector('.drawer__body').prepend(closed);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = form.elements;
    const val = k => f[k].value.trim();
    const delivery = f.entrega.value === 'Delivery';
    const missing = [];
    if (!val('nome')) missing.push(['nome', 'nome']);
    const phoneOk = window.BaldiniMask ? BaldiniMask.validPhone(val('telefone')) : val('telefone').replace(/\D/g, '').length >= 10;
    if (!phoneOk) missing.push(['telefone', 'WhatsApp com DDD']);
    if (delivery && !val('endereco')) missing.push(['endereco', 'endereço']);
    if (delivery && !val('bairro')) missing.push(['bairro', 'bairro']);
    if (val('cpf') && Core && !Core.validCpf(val('cpf'))) missing.push(['cpf', 'CPF válido (ou deixe em branco)']);
    if (missing.length) {
      $('formError').textContent = `Preencha: ${missing.map(m => m[1]).join(', ')}.`;
      $('formError').hidden = false;
      f[missing[0][0]].focus();
      return;
    }
    $('formError').hidden = true;
    store.set('baldini-cliente', { nome: val('nome'), telefone: val('telefone'), endereco: val('endereco'), bairro: val('bairro'), referencia: val('referencia') });

    const reward = REWARDS.find(r => r.id === f.recompensa.value);
    const orderId = draftId || (Core ? Core.newOrderId() : String(Date.now()));
    const order = Core ? Core.sanitizeOrder({
      id: orderId, origem: 'site', status: 'novo', itens: cart,
      cliente: { nome: val('nome'), telefone: val('telefone'), cpf: val('cpf') },
      entrega: { tipo: f.entrega.value, endereco: delivery ? val('endereco') : '', bairro: delivery ? val('bairro') : '', referencia: delivery ? val('referencia') : '' },
      pagamento: { forma: f.pagamento.value, troco: f.pagamento.value === 'Dinheiro' ? val('troco') : '' },
      recompensa: reward ? reward.name : '', obs: val('obs'),
      criadoEm: Date.now(), historico: [{ status: 'novo', em: Date.now() }]
    }) : null;

    const msg = [`*NOVO PEDIDO - BALDINI BURGUER* 🍔${Core ? ' ' + Core.shortCode(orderId) : ''}`, ''];
    msg.push(`👤 *Nome:* ${val('nome')}`);
    msg.push(`📞 *WhatsApp:* ${val('telefone')}`);
    if (val('cpf')) msg.push(`🧾 *CPF na nota:* ${val('cpf')}`);
    msg.push('', '*🛍️ Itens do pedido:*');
    cart.forEach(l => {
      msg.push('', `*${l.qty}x ${l.name}* — ${brl(l.unit * l.qty)}`);
      l.choices.forEach(c => msg.push(`   ▪ ${c.group}: ${choiceText(c)}`));
      if (l.note) msg.push(`   ▪ _Obs: ${l.note}_`);
    });
    msg.push('', '──────────', `💰 *Total dos itens: ${brl(subtotal())}*`);
    if (delivery) msg.push('_+ taxa de entrega (a confirmar)_');
    msg.push('');
    if (delivery) {
      msg.push('🛵 *Entrega:* Delivery');
      msg.push(`📍 *Endereço:* ${val('endereco')} - ${val('bairro')}`);
      if (val('referencia')) msg.push(`🔎 *Referência:* ${val('referencia')}`);
    } else {
      msg.push(`🏪 *Retirada:* ${f.entrega.value.replace(/^Retirada /, '')}`);
    }
    let pay = f.pagamento.value;
    if (pay === 'Dinheiro' && val('troco')) pay += ` (troco para ${val('troco')})`;
    msg.push(`💳 *Pagamento:* ${pay}`);
    if (val('obs')) msg.push('', `📝 *Observações:* ${val('obs')}`);

    msg.push('', `⭐ *Clube de pontos:* este pedido vale ${pointsFor(subtotal())} pontos (creditar no ${val('telefone')})`);
    if (reward) msg.push(`🎁 *Quero trocar pontos por:* ${reward.name} (${rewardCost(reward)}) — confirmar saldo`);

    window.open(`https://api.whatsapp.com/send?phone=${WHATSAPP}&text=${encodeURIComponent(msg.join('\n'))}`, '_blank', 'noopener');
    toast('Pedido montado! É só confirmar o envio no WhatsApp ✅');

    // Registra na gestão. Se o banco falhar, o pedido já foi pelo WhatsApp: nada se perde.
    if (order && DB) {
      clearTimeout(draftTimer);
      store.set('baldini-ultimo-pedido', orderId);
      DB.saveOrder(order).then(async () => {
        if (f.pagamento.value !== 'Online') return;
        const url = await createPaymentLink(order);
        if (url) { showPayPanel(url); DB.updateOrder(orderId, { 'pagamento.link': url }).catch(() => {}); }
      }).catch(e => { console.warn('Pedido não registrado na gestão', e); if (f.pagamento.value === 'Online') toast('Não deu para gerar o link agora. A loja envia pelo WhatsApp 👍'); });
    }
    draftId = null;
    store.set('baldini-rascunho', null);
    store.set('baldini-rascunho-em', 0);
    cart = [];
    f.obs.value = '';
    store.set('baldini-sacola', cart);
    renderCart();
    closeCart();
  });

  // ---------- Aviso rápido ----------
  const toastEl = $('toast');
  let toastTimer;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
  }

  renderMenu();
  watchCategories();
  renderCart();
})();
