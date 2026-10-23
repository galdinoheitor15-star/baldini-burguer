// Header com fundo ao rolar
const header = document.querySelector('.header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Menu mobile
const toggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  toggle.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', open);
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('is-open');
  toggle.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', false);
}));

// Abas do cardápio
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.menu');
tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(t => t.classList.toggle('is-active', t === tab));
  panels.forEach(p => p.classList.toggle('is-active', p.dataset.panel === tab.dataset.tab));
}));

// Aberto agora? (todos os dias, 17h às 23h, horário de Recife)
const statusTag = document.getElementById('statusTag');
const hour = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Recife' }).format(new Date()));
if (hour >= 17 && hour < 23) {
  statusTag.textContent = '🟢 Aberto agora • até 23h';
  statusTag.classList.add('is-open');
} else {
  statusTag.textContent = '🔥 Abrimos todos os dias às 17h';
}

// Ano no rodapé
document.getElementById('year').textContent = new Date().getFullYear();

// Animação de entrada
const revealEls = document.querySelectorAll('.section__head, .hcard, .reel, .unit, .brasa__imgs, .brasa__text');
revealEls.forEach(el => el.classList.add('reveal'));
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
  });
}, { threshold: 0.12 });
revealEls.forEach(el => io.observe(el));

// ===== Sacola =====
const WHATSAPP = '5581987908900';
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const parsePrice = txt => Number(txt.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sem armazenamento */ } }
};

let cart = store.get('baldini-cart', []);

// Cria os botões "+" em cada item do cardápio e nos destaques
const plusIcon = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>';
function makeAddButton(product) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'add-btn';
  btn.innerHTML = plusIcon;
  btn.setAttribute('aria-label', `Adicionar ${product.name} à sacola`);
  btn.addEventListener('click', () => addToCart(product));
  return btn;
}
document.querySelectorAll('.menu .item').forEach(item => {
  const h4 = item.querySelector('h4').cloneNode(true);
  h4.querySelectorAll('.badge').forEach(b => b.remove());
  const priceEl = item.querySelector(':scope > span');
  const product = {
    name: h4.textContent.replace('*', '').trim(),
    price: parsePrice(priceEl.textContent),
    from: !!priceEl.querySelector('small')
  };
  const side = document.createElement('div');
  side.className = 'item__side';
  item.replaceChild(side, priceEl);
  side.append(priceEl, makeAddButton(product));
});
document.querySelectorAll('.hcard').forEach(card => {
  const product = {
    name: card.querySelector('h3').textContent.trim(),
    price: parsePrice(card.querySelector('.price').textContent),
    from: false
  };
  const btn = makeAddButton(product);
  btn.classList.add('add-btn--wide');
  btn.innerHTML = plusIcon + ' Adicionar';
  card.querySelector('.hcard__body').append(btn);
});

const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartBar = document.getElementById('cartBar');
const cartList = document.getElementById('cartList');
const cartEmpty = document.getElementById('cartEmpty');
const goCheckout = document.getElementById('goCheckout');

function addToCart(product) {
  const line = cart.find(l => l.name === product.name);
  if (line) line.qty++;
  else cart.push({ ...product, qty: 1, note: '' });
  saveCart();
  showToast(`${product.name} na sacola 🍔`);
  cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump');
}

function saveCart() {
  store.set('baldini-cart', cart);
  renderCart();
}

const subtotal = () => cart.reduce((s, l) => s + l.price * l.qty, 0);
const totalQty = () => cart.reduce((s, l) => s + l.qty, 0);

function renderCart() {
  const qty = totalQty();
  const total = brl(subtotal());
  cartCount.textContent = qty;
  cartCount.hidden = qty === 0;
  document.getElementById('cartBarCount').textContent = qty;
  document.getElementById('cartBarTotal').textContent = total;
  cartBar.hidden = qty === 0;
  document.body.classList.toggle('has-cart', qty > 0);
  document.getElementById('cartSubtotal').textContent = total;
  document.getElementById('checkoutTotal').textContent = total;
  document.getElementById('cartNote').hidden = !cart.some(l => l.from);
  cartEmpty.hidden = qty > 0;
  goCheckout.disabled = qty === 0;

  cartList.innerHTML = '';
  cart.forEach((line, i) => {
    const li = document.createElement('li');
    li.className = 'cart-line';
    li.innerHTML = `
      <div class="cart-line__top">
        <div>
          <strong></strong>
          <small>${line.from ? 'a partir de ' : ''}${brl(line.price)} cada</small>
        </div>
        <span class="cart-line__price">${brl(line.price * line.qty)}</span>
      </div>
      <div class="cart-line__bottom">
        <div class="qty">
          <button type="button" data-act="minus" aria-label="Diminuir">−</button>
          <span>${line.qty}</span>
          <button type="button" data-act="plus" aria-label="Aumentar">+</button>
        </div>
        <input type="text" class="cart-line__note">
      </div>`;
    li.querySelector('strong').textContent = line.name;
    const note = li.querySelector('.cart-line__note');
    note.placeholder = line.from ? 'Qual lanche/sabor? Ex.: Bomba Bacon' : 'Observação (ex.: sem cebola)';
    note.value = line.note;
    note.addEventListener('input', () => { line.note = note.value; store.set('baldini-cart', cart); });
    li.querySelector('[data-act=minus]').addEventListener('click', () => {
      line.qty--;
      if (line.qty <= 0) cart.splice(i, 1);
      saveCart();
    });
    li.querySelector('[data-act=plus]').addEventListener('click', () => { line.qty++; saveCart(); });
    cartList.append(li);
  });
}

// Abrir / fechar a sacola
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('drawerOverlay');
const stepCart = document.getElementById('stepCart');
const stepCheckout = document.getElementById('stepCheckout');
const drawerTitle = document.getElementById('drawerTitle');

function showStep(step) {
  stepCart.hidden = step !== 'cart';
  stepCheckout.hidden = step !== 'checkout';
  drawerTitle.textContent = step === 'cart' ? 'Sua sacola' : 'Finalizar pedido';
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
cartBtn.addEventListener('click', openCart);
document.querySelectorAll('[data-open-cart]').forEach(el => el.addEventListener('click', openCart));
document.getElementById('drawerClose').addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });
goCheckout.addEventListener('click', () => showStep('checkout'));
document.getElementById('backToCart').addEventListener('click', () => showStep('cart'));
document.getElementById('clearCart').addEventListener('click', () => {
  if (cart.length && confirm('Esvaziar a sacola?')) { cart = []; saveCart(); }
});

// Botões que levam a uma aba específica do cardápio
document.querySelectorAll('[data-goto-tab]').forEach(link => link.addEventListener('click', () => {
  document.querySelector(`.tab[data-tab="${link.dataset.gotoTab}"]`)?.click();
}));

// Formulário de finalização
const form = stepCheckout;
const addressFields = document.getElementById('addressFields');
const trocoField = document.getElementById('trocoField');
const feeNote = document.getElementById('feeNote');
const formError = document.getElementById('formError');

// Lembra os dados do cliente para o próximo pedido
const savedCustomer = store.get('baldini-cliente', {});
['nome', 'telefone', 'endereco', 'bairro', 'referencia'].forEach(k => {
  if (savedCustomer[k]) form.elements[k].value = savedCustomer[k];
});

function updateFormFields() {
  const delivery = form.elements.entrega.value === 'Delivery';
  addressFields.hidden = !delivery;
  feeNote.hidden = !delivery;
  trocoField.hidden = form.elements.pagamento.value !== 'Dinheiro';
}
form.addEventListener('change', updateFormFields);
updateFormFields();

if (!(hour >= 17 && hour < 23)) {
  const closed = document.createElement('p');
  closed.className = 'closed-note';
  closed.textContent = '⏰ Estamos fechados agora. Você pode enviar o pedido, e ele será respondido a partir das 17h.';
  form.querySelector('.drawer__body').prepend(closed);
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const f = form.elements;
  const delivery = f.entrega.value === 'Delivery';
  const missing = [];
  if (!f.nome.value.trim()) missing.push(['nome', 'nome']);
  if (delivery && !f.endereco.value.trim()) missing.push(['endereco', 'endereço']);
  if (delivery && !f.bairro.value.trim()) missing.push(['bairro', 'bairro']);
  if (missing.length) {
    formError.textContent = `Preencha: ${missing.map(m => m[1]).join(', ')}.`;
    formError.hidden = false;
    f[missing[0][0]].focus();
    return;
  }
  formError.hidden = true;

  store.set('baldini-cliente', {
    nome: f.nome.value.trim(), telefone: f.telefone.value.trim(),
    endereco: f.endereco.value.trim(), bairro: f.bairro.value.trim(), referencia: f.referencia.value.trim()
  });

  const lines = ['*NOVO PEDIDO - BALDINI BURGUER* 🍔', ''];
  lines.push(`👤 *Nome:* ${f.nome.value.trim()}`);
  if (f.telefone.value.trim()) lines.push(`📞 *Telefone:* ${f.telefone.value.trim()}`);
  lines.push('', '*Itens:*');
  cart.forEach(l => {
    lines.push(`• ${l.qty}x ${l.name} — ${l.from ? 'a partir de ' : ''}${brl(l.price * l.qty)}`);
    if (l.note.trim()) lines.push(`   _Obs: ${l.note.trim()}_`);
  });
  lines.push('', `💰 *Subtotal: ${brl(subtotal())}*`);
  if (cart.some(l => l.from)) lines.push('_(tem item "a partir de": valor final a confirmar)_');
  lines.push('');
  if (delivery) {
    lines.push('🛵 *Entrega:* Delivery');
    lines.push(`📍 *Endereço:* ${f.endereco.value.trim()} - ${f.bairro.value.trim()}`);
    if (f.referencia.value.trim()) lines.push(`🔎 *Referência:* ${f.referencia.value.trim()}`);
    lines.push('_Taxa de entrega a confirmar_');
  } else {
    lines.push(`🏪 *Entrega:* ${f.entrega.value}`);
  }
  let pay = f.pagamento.value;
  if (pay === 'Dinheiro' && f.troco.value.trim()) pay += ` (troco para R$ ${f.troco.value.trim()})`;
  lines.push(`💳 *Pagamento:* ${pay}`);
  if (f.obs.value.trim()) lines.push('', `📝 *Observações:* ${f.obs.value.trim()}`);

  const url = `https://api.whatsapp.com/send?phone=${WHATSAPP}&text=${encodeURIComponent(lines.join('\n'))}`;
  window.open(url, '_blank', 'noopener');

  showToast('Pedido montado! Confirme o envio no WhatsApp ✅');
  cart = [];
  f.obs.value = '';
  saveCart();
  closeCart();
});

// Aviso rápido
const toast = document.getElementById('toast');
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

renderCart();
