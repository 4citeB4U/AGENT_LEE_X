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

import React, { useEffect } from 'react';
import './Spotlight.css';

const PADDING = 15;

interface SpotlightProps {
    targetRect: DOMRect | null;
    isActive: boolean;
}

const Spotlight: React.FC<SpotlightProps> = ({ targetRect, isActive }) => {
    useEffect(() => {
        const rootStyle = document.documentElement.style;

        if (!isActive || !targetRect) {
            rootStyle.removeProperty('--spotlight-top');
            rootStyle.removeProperty('--spotlight-left');
            rootStyle.removeProperty('--spotlight-width');
            rootStyle.removeProperty('--spotlight-height');
            return;
        }

        const { top, left, width, height } = targetRect;
        rootStyle.setProperty('--spotlight-top', `${top - PADDING}px`);
        rootStyle.setProperty('--spotlight-left', `${left - PADDING}px`);
        rootStyle.setProperty('--spotlight-width', `${width + PADDING * 2}px`);
        rootStyle.setProperty('--spotlight-height', `${height + PADDING * 2}px`);

        return () => {
            rootStyle.removeProperty('--spotlight-top');
            rootStyle.removeProperty('--spotlight-left');
            rootStyle.removeProperty('--spotlight-width');
            rootStyle.removeProperty('--spotlight-height');
        };
    }, [isActive, targetRect]);

    if (!isActive || !targetRect) {
        return null;
    }

    return <div className="spotlight-overlay" aria-hidden="true"></div>;
};

export default Spotlight;
