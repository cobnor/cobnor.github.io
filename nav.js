const nav = document.querySelector('.site-nav');
const toggles = nav.querySelectorAll('[data-menu]');

function closeAll() {
  toggles.forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
    nav.classList.remove(`submenu-open-${btn.dataset.menu}`);
  });
}

toggles.forEach(btn => {
  const menu = document.getElementById(btn.getAttribute('aria-controls'));

  btn.addEventListener('click', () => {
    const wasOpen = btn.getAttribute('aria-expanded') === 'true';
    closeAll();
    if (wasOpen) return;

    // Align submenu with the clicked item
    menu.style.top = `${btn.getBoundingClientRect().top - nav.getBoundingClientRect().top}px`;
    btn.setAttribute('aria-expanded', 'true');
    nav.classList.add(`submenu-open-${btn.dataset.menu}`);
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAll();
});

document.addEventListener('click', e => {
  if (!nav.contains(e.target)) closeAll();
});
