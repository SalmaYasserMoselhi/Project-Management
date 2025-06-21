"use client";

import { useEffect } from "react";

// Standardized animation utilities for all popups in the application
export function usePopupAnimation() {
  useEffect(() => {
    // No need to add styles here anymore since they'll be in index.css
    return () => {
      // Cleanup is handled by the global styles
    };
  }, []);
}

// Helper function to add popup animation classes
export function setupPopupAnimation(
  popupRef,
  backdropRef,
  isClosing,
  onAnimationEnd
) {
  if (!popupRef.current || !backdropRef.current) return;

  // Remove existing animation classes
  popupRef.current.classList.remove("popup-closing");
  backdropRef.current.classList.remove("popup-closing");

  // Add animation class based on state
  if (isClosing) {
    popupRef.current.classList.add("popup-closing");
    backdropRef.current.classList.add("popup-closing");
  }

  // Set up animation end listener
  const handleAnimEnd = (e) => {
    if (e.target === popupRef.current && isClosing && onAnimationEnd) {
      onAnimationEnd();
    }
  };

  popupRef.current.addEventListener("animationend", handleAnimEnd);

  // Return cleanup function
  return () => {
    if (popupRef.current) {
      popupRef.current.removeEventListener("animationend", handleAnimEnd);
    }
  };
}

// Helper function for workspace popup animations
export function setupWorkspaceAnimation(
  popupRef,
  backdropRef,
  transitionState,
  onAnimationEnd
) {
  if (!popupRef.current || !backdropRef.current) return;

  // Remove existing animation classes
  popupRef.current.classList.remove(
    "workspace-popup-entering",
    "workspace-popup-exiting"
  );
  backdropRef.current.classList.remove(
    "workspace-backdrop-entering",
    "workspace-backdrop-exiting"
  );

  // Add animation class based on state
  if (transitionState === "opening") {
    popupRef.current.classList.add("workspace-popup-entering");
    backdropRef.current.classList.add("workspace-backdrop-entering");
  } else if (transitionState === "closing") {
    popupRef.current.classList.add("workspace-popup-exiting");
    backdropRef.current.classList.add("workspace-backdrop-exiting");
  }

  // Set up animation end listener
  const handleAnimEnd = (e) => {
    if (e.target === popupRef.current && onAnimationEnd) {
      onAnimationEnd(transitionState);
    }
  };

  popupRef.current.addEventListener("animationend", handleAnimEnd);

  // Return cleanup function
  return () => {
    if (popupRef.current) {
      popupRef.current.removeEventListener("animationend", handleAnimEnd);
    }
  };
}

// Add a specific helper function for user popup animations
export function setupUserPopupAnimation(
  popupRef,
  isOpen,
  isClosing,
  onAnimationEnd
) {
  if (!popupRef.current) return;

  // Remove existing animation classes
  popupRef.current.classList.remove("user-popup-opening", "user-popup-closing");

  // Add animation class based on state
  if (isOpen && !isClosing) {
    popupRef.current.classList.add("user-popup-opening");
  } else if (isClosing) {
    popupRef.current.classList.add("user-popup-closing");
  }

  // Set up animation end listener
  const handleAnimEnd = (e) => {
    if (e.target === popupRef.current && isClosing && onAnimationEnd) {
      onAnimationEnd();
    }
  };

  popupRef.current.addEventListener("animationend", handleAnimEnd);

  // Return cleanup function
  return () => {
    if (popupRef.current) {
      popupRef.current.removeEventListener("animationend", handleAnimEnd);
    }
  };
}

// Add a specific helper function for archived popup animations (right-side)
export function setupArchivedPopupAnimation(
  popupRef,
  backdropRef,
  transitionState,
  onAnimationEnd
) {
  if (!popupRef.current || !backdropRef.current) return;

  // Remove existing animation classes
  popupRef.current.classList.remove(
    "archived-popup-entering",
    "archived-popup-exiting"
  );
  backdropRef.current.classList.remove(
    "workspace-backdrop-entering",
    "workspace-backdrop-exiting"
  );

  // Add animation class based on state
  if (transitionState === "opening") {
    popupRef.current.classList.add("archived-popup-entering");
    backdropRef.current.classList.add("workspace-backdrop-entering");
  } else if (transitionState === "closing") {
    popupRef.current.classList.add("archived-popup-exiting");
    backdropRef.current.classList.add("workspace-backdrop-exiting");
  }

  // Set up animation end listener
  const handleAnimEnd = (e) => {
    if (e.target === popupRef.current && onAnimationEnd) {
      onAnimationEnd(transitionState);
    }
  };

  popupRef.current.addEventListener("animationend", handleAnimEnd);

  // Return cleanup function
  return () => {
    if (popupRef.current) {
      popupRef.current.removeEventListener("animationend", handleAnimEnd);
    }
  };
}
