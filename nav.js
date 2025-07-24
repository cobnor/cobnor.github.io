document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.site-nav');
  const projectsLink = document.getElementById('projects-link');
  const aboutLink = document.getElementById('about-link');
  const contactLink = document.getElementById('contact-link');

  const projectsMenu = document.getElementById('projects-menu');
  const aboutMenu = document.getElementById('about-menu');
  const contactMenu = document.getElementById('contact-menu');

  const menus = {
    projects: { link: projectsLink, menu: projectsMenu, className: 'submenu-open-projects' },
    about:    { link: aboutLink,    menu: aboutMenu,    className: 'submenu-open-about' },
    contact:  { link: contactLink,  menu: contactMenu,  className: 'submenu-open-contact' }
  };

  // Dummy project data
  const projects = [
    { name: 'Software Rasteriser', url: 'https://www.example.com' },
    { name: 'LLM Jailbreaking Defense Paper', url: 'https://www.researchgate.net/publication/388555790_Defense_Against_the_Dark_Prompts_Mitigating_Best-of-N_Jailbreaking_with_Prompt_Evaluation' },
    { name: 'micro:bit data visualisation', url: 'https://microbit-data-visualisation.pages.dev/' },
    { name: 'Verlet Physics', url: 'https://cobnor.github.io/verlet/' },
    { name: 'Boids', url: 'https://cobnor.github.io/verlet/' },
    { name: 'PDF QA Analyser', url: 'https://github.com/cobnor/gw-pdf-extractor' },
    { name: 'Cellular Physics Sandbox', url: 'https://github.com/cobnor/powder-sandbox' },
    { name: 'Raycaster', url: 'https://github.com/cobnor/Python-Raycasting-Engine' },
  ];

  // Populate project submenu
  const ul = document.createElement('ul');
  projects.forEach(p => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = p.url;
    a.target = '_blank';
    a.textContent = p.name;
    li.appendChild(a);
    ul.appendChild(li);
  });
  projectsMenu.appendChild(ul);

  // Attach click handlers
  Object.entries(menus).forEach(([key, { link, menu, className }]) => {
    link.addEventListener('click', e => {
      e.preventDefault();

      // Toggle submenu class
      const isOpen = nav.classList.contains(className);
      nav.classList.remove('submenu-open-projects', 'submenu-open-about', 'submenu-open-contact');
      if (!isOpen) nav.classList.add(className);

      // Align submenu with clicked item
      const linkRect = link.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      const offsetTop = linkRect.top - navRect.top;
      menu.style.top = `${offsetTop}px`;
    });
  });
});
