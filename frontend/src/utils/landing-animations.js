// Utility functions for landing page animations

// Function to create a parallax effect on mouse move
export const createParallaxEffect = (element, strength = 20) => {
  if (!element) return;
  
  const handleMouseMove = (e) => {
    const { left, top, width, height } = element.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    
    element.style.transform = `perspective(1000px) rotateY(${x * strength}deg) rotateX(${-y * strength}deg)`;
  };
  
  const handleMouseLeave = () => {
    element.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
    element.style.transition = 'transform 0.5s ease';
  };
  
  element.addEventListener('mousemove', handleMouseMove);
  element.addEventListener('mouseleave', handleMouseLeave);
  
  // Return cleanup function
  return () => {
    element.removeEventListener('mousemove', handleMouseMove);
    element.removeEventListener('mouseleave', handleMouseLeave);
  };
};

// Function to create a smooth scroll effect
export const smoothScroll = (targetId) => {
  const target = document.getElementById(targetId);
  if (!target) return;
  
  window.scrollTo({
    top: target.offsetTop - 100, // Offset for header
    behavior: 'smooth'
  });
};

// Function to create a typing effect
export const typeEffect = (element, text, speed = 100) => {
  if (!element) return;
  
  let i = 0;
  element.textContent = '';
  
  const typing = setInterval(() => {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
    } else {
      clearInterval(typing);
    }
  }, speed);
  
  return () => clearInterval(typing);
};

// Function to check if element is in viewport
export const isInViewport = (element, offset = 0) => {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  return (
    rect.top <= (window.innerHeight - offset) &&
    rect.bottom >= offset
  );
};