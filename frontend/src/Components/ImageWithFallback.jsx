import { useEffect, useState } from "react";
import { isValidImageUrl, getAvatarUrl } from "../utils/imageUtils";

const ImageWithFallback = ({ src, alt, className }) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setHasError(true);
      return;
    }

    const img = new Image();
    img.src = src;

    img.onload = () => {
      setIsLoading(false);
      setHasError(false);
      setCurrentSrc(src);
    };

    img.onerror = () => {
      setIsLoading(false);
      setHasError(true);
    };
  }, [src]);

  const getFallbackSrc = () => {
    if (isValidImageUrl(src)) {
      return getAvatarUrl(src);
    }
    return "/default-avatar.png";
  };

  return (
    <img
      src={hasError ? getFallbackSrc() : currentSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(e) => {
        e.target.onerror = null;
        setHasError(true);
      }}
      onErrorCapture={(e) => {
        console.error("Image loading failed:", e);
        setHasError(true);
      }}
    />
  );
};

export default ImageWithFallback;
