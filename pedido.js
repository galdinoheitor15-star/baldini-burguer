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
  function saveCart() { store.set('baldini-sacola', cart); renderCart(); }
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
  function openCart() {
    showStep('cart');
    overlay.hidden = false;
    requestAnimationFrame(() => { drawer.classList.add('is-open'); overlay.classList.add('is-open'); });
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }
  function closeCart() {
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

  function updateFormFields() {
    const delivery = form.elements.entrega.value === 'Delivery';
    $('addressFields').hidden = !delivery;
    $('feeNote').hidden = !delivery;
    $('trocoField').hidden = form.elements.pagamento.value !== 'Dinheiro';
  }
  form.addEventListener('change', updateFormFields);
  updateFormFields();

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
    if (delivery && !val('endereco')) missing.push(['endereco', 'endereço']);
    if (delivery && !val('bairro')) missing.push(['bairro', 'bairro']);
    if (missing.length) {
      $('formError').textContent = `Preencha: ${missing.map(m => m[1]).join(', ')}.`;
      $('formError').hidden = false;
      f[missing[0][0]].focus();
      return;
    }
    $('formError').hidden = true;
    store.set('baldini-cliente', { nome: val('nome'), telefone: val('telefone'), endereco: val('endereco'), bairro: val('bairro'), referencia: val('referencia') });

    const msg = ['*NOVO PEDIDO - BALDINI BURGUER* 🍔', ''];
    msg.push(`👤 *Nome:* ${val('nome')}`);
    if (val('telefone')) msg.push(`📞 *Telefone:* ${val('telefone')}`);
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
    if (pay === 'Dinheiro' && val('troco')) pay += ` (troco para R$ ${val('troco')})`;
    msg.push(`💳 *Pagamento:* ${pay}`);
    if (val('obs')) msg.push('', `📝 *Observações:* ${val('obs')}`);

    window.open(`https://api.whatsapp.com/send?phone=${WHATSAPP}&text=${encodeURIComponent(msg.join('\n'))}`, '_blank', 'noopener');
    toast('Pedido montado! É só confirmar o envio no WhatsApp ✅');
    cart = [];
    f.obs.value = '';
    saveCart();
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
