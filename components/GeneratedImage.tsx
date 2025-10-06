/*
LEEWAY HEADER — DO NOT REMOVE
TAG: COMPONENT_GeneratedImage
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: image
ICON_SIG: GI001
5WH: WHAT=Render generated image tokens in research/output streams; WHY=Allow inline placeholder [IMAGE: prompt] expansion; WHO=RapidWebDevelop; WHERE=f:/4leeway-multitool/components/GeneratedImage.tsx; WHEN=2025-10-05; HOW=React functional component with accessibility; 
SPDX-License-Identifier: MIT
*/

import React from 'react';

export interface GeneratedImageProps {
  /** Raw prompt captured between placeholder tokens */
  prompt: string;
  /** Optionally pass a resolved URL once image generation completes */
  url?: string;
  /** Optional click handler (e.g., open lightbox) */
  onClick?: () => void;
  /** Loading indicator if image still being generated */
  loading?: boolean;
  /** Error message if generation failed */
  error?: string;
}

/*
Contract:
Input: prompt token (string) + optional url|loading|error
Behavior: If url provided render image; else render skeleton; if error show fallback text
Accessibility: Provide alt text derived from prompt; interactive container is button only if onClick present
*/

const GeneratedImage: React.FC<GeneratedImageProps> = ({ prompt, url, onClick, loading, error }) => {
  if (!prompt) return null;

  const content = () => {
    if (error) return (
      <div className="text-red-600 text-sm font-medium" role="alert" aria-live="polite">Image generation failed: {error}</div>
    );
    if (loading && !url) return (
      <div className="w-full max-w-xs aspect-square rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex items-center justify-center text-gray-500 text-xs" aria-busy="true">Generating image…</div>
    );
    if (url) return (
      <img
        src={url}
        alt={prompt}
        loading="lazy"
        className="max-w-xs rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
      />
    );
    return (
      <div className="w-full max-w-xs aspect-square rounded-xl border border-dashed border-gray-400 flex items-center justify-center text-gray-500 text-xs">
        Awaiting image…
      </div>
    );
  };

  const Wrapper: React.ElementType = onClick ? 'button' : 'div';

  return (
    <div className="my-4 flex flex-col items-center">
      <Wrapper
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={onClick ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg' : undefined}
        aria-label={onClick ? `Open generated image for prompt: ${prompt}` : undefined}
      >
        {content()}
      </Wrapper>
      <p className="mt-2 max-w-xs text-center text-[11px] text-gray-500 leading-snug select-text break-words">
        {prompt}
      </p>
    </div>
  );
};

export default GeneratedImage;
