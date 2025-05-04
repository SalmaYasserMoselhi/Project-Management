"use client"

import { useEffect } from "react"

// Animation utilities for the Nexus application
export function useSlideInAnimation(direction = "left") {
  useEffect(() => {
    // Add the slide-in class to the form container after a small delay
    const timer = setTimeout(() => {
      const formContainer = document.querySelector(".form-container")
      if (formContainer) {
        formContainer.classList.add(`slide-in-active-${direction}`)
      }
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [direction])
}

// Add animation styles to the document
export function addAnimationStyles() {
  // Check if styles are already added to avoid duplicates
  if (document.getElementById("nexus-animation-styles")) return

  const style = document.createElement("style")
  style.id = "nexus-animation-styles"
  style.textContent = `
    @keyframes slideInFromLeft {
      0% {
        transform: translateX(-50px);
        opacity: 0;
      }
      100% {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideInFromTop {
      0% {
        transform: translateY(-30px);
        opacity: 0;
      }
      100% {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes float {
      0% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-10px);
      }
      100% {
        transform: translateY(0px);
      }
    }
    
    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 0.8;
      }
      50% {
        transform: scale(1.05);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 0.8;
      }
    }
    
    @keyframes logoFadeIn {
      0% {
        opacity: 0;
        transform: translateY(-10px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .form-container {
      opacity: 0;
    }
    
    .form-container.slide-in-active-left {
      transform: translateX(-50px);
      animation: slideInFromLeft 0.6s ease forwards;
    }
    
    .form-container.slide-in-active-top {
      transform: translateY(-30px);
      animation: slideInFromTop 0.6s ease forwards;
    }
    
    .animated-bg-element {
      position: relative;
      overflow: hidden;
      height: 100%;
      width: 100%;
      background: linear-gradient(135deg, #4d2d61 0%, #7b4397 100%);
      border-radius: 0 !important;
    }
    
    .animated-circle {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      animation: pulse 3s infinite ease-in-out;
    }
    
    .animated-circle:nth-child(1) {
      width: 80px;
      height: 80px;
      top: 8%;
      left: 8%;
      animation-delay: 0s;
    }
    
    .animated-circle:nth-child(2) {
      width: 60px;
      height: 60px;
      top: 40%;
      left: 60%;
      animation-delay: 0.5s;
    }
    
    .animated-circle:nth-child(3) {
      width: 40px;
      height: 40px;
      bottom: 12%;
      right: 12%;
      animation-delay: 1s;
    }
    
    .feature-card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(5px);
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 8px;
      animation: float 4s infinite ease-in-out;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .feature-card:nth-child(2) {
      animation-delay: 0.5s;
    }
    
    .feature-card:nth-child(3) {
      animation-delay: 1s;
    }
    
    .feature-card:nth-child(4) {
      animation-delay: 1.5s;
    }
    
    .input-animated {
      transition: all 0.3s ease;
      border: 1px solid #e2e8f0;
    }
    
    .input-animated:focus {
      border-color: #4d2d61;
      box-shadow: 0 0 0 3px #eae3f7, 0 0 0 2px #725483;
      outline: none;
    }
    
    .card-shadow {
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
    
    .logo-fade-in {
      animation: logoFadeIn 1.2s ease-out forwards;
      opacity: 0;
    }
  `
  document.head.appendChild(style)
}
