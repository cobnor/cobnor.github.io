// Scroll to the top when the page loads
window.addEventListener("load", () => {
  window.scrollTo(0, 0);
});

document.addEventListener('DOMContentLoaded', () => {
  const projectItems = document.querySelectorAll('.project-item');
  const projectGrid = document.querySelector('.project-grid'); // Get the parent

  projectItems.forEach(item => {
      item.addEventListener('mouseenter', () => {
          // Add the blur-siblings class to the parent
          projectGrid.classList.add('blur-siblings');
          // Add the no-blur class to the HOVERED item
          item.classList.add('no-blur');
      });

      item.addEventListener('mouseleave', () => {
          // Remove the blur-siblings class from the parent
          projectGrid.classList.remove('blur-siblings');
          // Remove the no-blur class from the item that was hovered
          item.classList.remove('no-blur');
      });
  });
});


// Handle scroll events
document.addEventListener("scroll", () => {
  const projectsSection = document.getElementById("projects");
  const projectItems = document.querySelectorAll(".project-item");
  const rect = projectsSection.getBoundingClientRect();

  // Reveal the projects section when it enters the viewport
  if (rect.top <= window.innerHeight && rect.bottom >= 0) {
    projectsSection.classList.add("visible");
  }

  // Handle scroll indicator fade out
  const scrollIndicator = document.querySelector(".scroll-down");
  const maxScroll = window.innerHeight; // The height of the viewport
  const currentScroll = window.scrollY;

  // Adjust gradient shift based on scroll position
  const gradientShift = currentScroll / 2; 
  const name = document.querySelector('#intro h1 a');
  name.style.background = `linear-gradient(${90 + gradientShift}deg, 
    hsla(195, 86%, 50%, 1) 0%, 
    hsla(236, 93%, 65%, 1) 100%)`;
  name.style.backgroundClip = 'text';
  name.style.webkitBackgroundClip = 'text';
  name.style.color = 'transparent';  

  // Calculate opacity based on scroll position
  let opacity = Math.max(0, (1 - currentScroll / maxScroll));

  // Add parallax effect to project items
  const scrollY = window.scrollY;
  projectItems.forEach((item, index) => {
    const speed = 0.1 + (index % 4) * 0.05;
    let _opacity = Math.min(1 - opacity * 1.5,0.95) //force it to be a little transparent
    item.style.opacity = _opacity;
    if (window.innerWidth >= 800) {
      item.style.transform = `translateY(${scrollY * speed}px)`;
    }
  });

  // Adjust opacity of scroll indicator
  if (scrollIndicator) {
    scrollIndicator.style.opacity = opacity;
  }
});


/*if (/Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)) {
  document.querySelectorAll("#name span").forEach(span => {
    span.style.transition = "none";
    span.style.transform = "none";
    span.onmouseenter = null;
  });
}*/

// Name animation logic
const letters = document.querySelector("#name a");
var hovered = new Set();

// Trigger name animation
function triggerNameAnimation() {
  var index = 0;
  for (const child of letters.children) {
    setTimeout(() => {
      void child.offsetWidth;
      child.style.animation = "letterjump 1s forwards";
      child.style.animationDelay = `${0.075 * index}s`;
      index++;

      setTimeout(() => {
        child.style.animation = "none";
        child.style.transition = "transform 0.1s";
      }, 2175); // Match animation duration
    }, 300);
  }
}

// Hover animation for desktop
for (const child of letters.children) {
  child.style.animation = "none";
  void child.offsetWidth;

  child.addEventListener("mouseenter", () => {
    if (!hovered.has(child.id)) {
      hovered.add(child.id);

      // Trigger animation when all letters have been hovered
      if (hovered.size >= 14) {
        hovered.clear();
        triggerNameAnimation();
      }
    }
  });
}

// Mobile-specific tap animation
const introSection = document.getElementById('intro');
const nameLink = document.querySelector('#intro h1 a');
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Trigger animation on mobile when tapping outside the name link
if (isMobile) {
  introSection.addEventListener('click', (event) => {
    if (!nameLink.contains(event.target)) {
      triggerNameAnimation();
    }
  });
}