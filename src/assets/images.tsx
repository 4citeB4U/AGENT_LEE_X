/* LEEWAY HEADER
TAG: FRONTEND.ASSETS.IMAGES_REGISTRY
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: layout-dashboard
ICON_SIG: CD534113
5WH: WHAT=Central image asset registry + typed fallback component; WHY=Provide single authoritative mapping + safe rendering; WHO=Leeway Core (agnostic); WHERE=src/assets/images.tsx; WHEN=2025-10-05; HOW=TypeScript const object + React functional wrapper
SPDX-License-Identifier: MIT
*/

// Centralized image configuration for Agent Lee Multi-Tool
// This file provides a single source of truth for all image assets
import React from 'react';

// Base path for images (using public directory for production builds)
const getImageUrl = (name: string) => `/images/${name}`;

// Image configuration object for easy access
export const images = {
  // Agent and Avatars
  agentLeeAvatar: getImageUrl('Agent-Lee-Avatar.png'),
  
  // Branding
  logo: getImageUrl('logo.png'),
  
  // Audio and Communication
  macMillionMic: getImageUrl('Mac-Million-Mic.png'),
  
  // Tab Icons - organized by functionality
  tabs: {
  research: getImageUrl('research.png'),
    text: getImageUrl('text.png'),
    image: getImageUrl('image.png'),
    analyze: getImageUrl('analyze.png'),
    documents: getImageUrl('documents.png'),
    call: getImageUrl('call.png'),
    email: getImageUrl('email.png'),
    notepad: getImageUrl('notepad.png'),
    settings: getImageUrl('settings.png'),
  },
  
  // Utility Icons
  icons: {
    general: getImageUrl('general.png'),
    wiki: getImageUrl('wiki.png'),
    download: getImageUrl('download.png'),
  academic: getImageUrl('academic.png'),
  }
} as const;

// Helper function to get tab icon by name
export const getTabIcon = (tabName: string): string => {
  const normalizedName = tabName.toLowerCase() as keyof typeof images.tabs;
  return images.tabs[normalizedName] || images.icons.general;
};

// Helper function for image preloading (optional performance optimization)
export const preloadImages = (): void => {
  const allImages = [
    ...Object.values(images.tabs),
    ...Object.values(images.icons),
    images.agentLeeAvatar,
    images.macMillionMic,
  ];
  
  allImages.forEach(src => {
    const img = new Image();
    img.src = src;
  });
};

// Image component with error handling
export interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  onError?: () => void;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fallback = images.icons.general,
  onError,
  ...props
}) => {
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = fallback;
    onError?.();
  };

  return (
    <img
      src={src}
      alt={alt}
      onError={handleError}
      {...props}
    />
  );
};

export default images;