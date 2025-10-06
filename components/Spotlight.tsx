/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: Spotlight.tsx; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\components\Spotlight.tsx; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

import React from 'react';

interface SpotlightProps {
    targetRect: DOMRect | null;
    isActive: boolean;
}

const Spotlight: React.FC<SpotlightProps> = ({ targetRect, isActive }) => {
    if (!isActive || !targetRect) {
        return null;
    }

    const padding = 15;
    const { top, left, width, height } = targetRect;
    
    // This style creates a full-screen overlay with a "hole" cut out for the target element.
    // The box-shadow is cast from the hole, effectively creating an inverse fill.
    const spotlightStyle: React.CSSProperties = {
        position: 'fixed',
        top: `${top - padding}px`,
        left: `${left - padding}px`,
        width: `${width + padding * 2}px`,
        height: `${height + padding * 2}px`,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
        borderRadius: '8px',
        zIndex: 9998,
        pointerEvents: 'none', // Allows clicks to pass through to elements behind if needed
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth transition for position changes
    };

    return <div style={spotlightStyle}></div>;
};

export default Spotlight;
