// =============================================
//  I DIDN'T KNOW I WAS ME — Main JavaScript
// =============================================

// --- NAV SCROLL EFFECT ---
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });
}

// --- MOBILE MENU ---
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');
const menuClose = document.getElementById('menuClose');

if (burger && mobileMenu) {
  burger.addEventListener('click', () => {
    mobileMenu.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
}
if (menuClose && mobileMenu) {
  menuClose.addEventListener('click', closeMobileMenu);
}
function closeMobileMenu() {
  mobileMenu.classList.remove('open');
  document.body.style.overflow = '';
}
// Close on link click
if (mobileMenu) {
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });
}

// --- NEWSLETTER FORM ---
function handleSubscribe(e) {
  e.preventDefault();
  const input = e.target.querySelector('input[type="email"]');
  const btn = e.target.querySelector('button');
  const email = input.value;
  btn.textContent = 'Subscribed ✓';
  btn.style.background = '#2a7a4b';
  btn.style.borderColor = '#2a7a4b';
  btn.style.color = '#fff';
  input.value = '';
  input.placeholder = 'Thank you! Check your inbox.';
  setTimeout(() => {
    btn.textContent = 'Subscribe';
    btn.style.background = '';
    btn.style.borderColor = '';
    btn.style.color = '';
    input.placeholder = 'Your email address';
  }, 4000);
}

// --- SCROLL REVEAL ANIMATION ---
const revealElements = document.querySelectorAll(
  '.blog-card, .pillar, .stat, .why__body p, .founder-strip__quote'
);

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

revealElements.forEach(el => {
  el.classList.add('reveal-on-scroll');
  revealObserver.observe(el);
});

// Add the reveal CSS dynamically
const revealStyle = document.createElement('style');
revealStyle.textContent = `
  .reveal-on-scroll {
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.55s ease, transform 0.55s ease;
  }
  .reveal-on-scroll.revealed {
    opacity: 1;
    transform: translateY(0);
  }
`;
document.head.appendChild(revealStyle);

// --- ACTIVE NAV LINK (highlight current page) ---
const currentPath = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav__links a').forEach(link => {
  const href = link.getAttribute('href');
  if (href === currentPath) {
    link.style.color = 'var(--gold)';
  }
});
