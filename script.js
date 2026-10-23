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
