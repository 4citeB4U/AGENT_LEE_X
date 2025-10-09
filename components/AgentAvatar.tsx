/* LEEWAY HEADER
TAG: FRONTEND.COMPONENT.AGENT_AVATAR
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: user-circle
ICON_SIG: CD534113
5WH: WHAT=Agent Lee avatar animation component; WHY=Visual representation of AI state; WHO=Leeway Core (agnostic); WHERE=components/AgentAvatar.tsx; WHEN=2025-10-05; HOW=React + canvas driven status glyphs
SPDX-License-Identifier: MIT
*/

import React from 'react';
import { images } from '../src/assets/images';
import type { AgentState } from '../types';

interface AgentAvatarProps {
    agentState: AgentState;
}

const statusMap: Record<AgentState, { text: string; className: string }> = {
    idle: { text: 'ONLINE', className: 'status-idle' },
    listening: { text: 'LISTENING', className: 'status-listening' },
    thinking: { text: 'PROCESSING', className: 'status-thinking' },
    speaking: { text: 'TRANSMITTING', className: 'status-speaking' },
};

const AgentAvatar: React.FC<AgentAvatarProps> = ({ agentState }) => {
    const currentStatus = statusMap[agentState];

    const styles = `
        .avatar-container {
            position: relative;
            display: block;
            width: 100%;
            aspect-ratio: 1 / 1;
            min-height: 280px;
            max-height: 360px;
            overflow: hidden;
            border-radius: 1rem;
            border: none;
            box-shadow: none;
            background-color: transparent;
            isolation: isolate;
        }
        @media (max-width: 768px) {
            .avatar-container {
                min-height: 240px;
            }
        }
        .avatar-image {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: fill;
            display: block;
            transform: none;
            filter: saturate(1.08);
        }
        .avatar-logo {
            position: absolute;
            top: 1rem;
            left: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(14, 14, 14, 0.4);
            border: 1px solid rgba(212, 175, 55, 0.85);
            border-radius: 0.85rem;
            padding: 0.35rem 0.75rem;
            box-shadow: 0 0 32px rgba(212, 175, 55, 0.55);
            opacity: 0.9;
            pointer-events: none;
            backdrop-filter: blur(4px);
        }
        .avatar-logo img {
            height: 64px;
            width: auto;
            display: block;
            filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.9));
        }
        .status-pill {
            position: absolute;
            bottom: 1.1rem;
            left: 50%;
            transform: translateX(-50%);
            padding: 0.6rem 1.5rem;
            border-radius: 9999px;
            font-size: 0.85rem;
            font-weight: 700;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            background: rgba(6, 6, 6, 0.7);
            display: inline-flex;
            align-items: center;
            gap: 0.55rem;
            z-index: 2;
            pointer-events: none;
        }
        .status-pill::before {
            content: '';
            width: 0.7rem;
            height: 0.7rem;
            border-radius: 9999px;
            background: currentColor;
            box-shadow: 0 0 14px currentColor;
        }
        .status-pill.status-idle {
            color: #00cc66;
            border: 1px solid #00cc66;
            box-shadow: 0 0 22px rgba(0, 204, 102, 0.35);
        }
        .status-pill.status-listening {
            color: #63b3ed;
            border: 1px solid #63b3ed;
            box-shadow: 0 0 22px rgba(99, 179, 237, 0.35);
        }
        .status-pill.status-thinking {
            color: #f472b6;
            border: 1px solid #f472b6;
            box-shadow: 0 0 22px rgba(244, 114, 182, 0.35);
        }
        .status-pill.status-speaking {
            color: #d4af37;
            border: 1px solid #d4af37;
            box-shadow: 0 0 22px rgba(212, 175, 55, 0.35);
        }
    `;

    return (
        <>
            <style>{styles}</style>
            <div className="avatar-container" aria-live="polite">
                <img src={images.agentLeeAvatar} alt="Agent Lee avatar" className="avatar-image" />
                <div className="avatar-logo" aria-hidden="true">
                    <img src={images.logo} alt="LeeWay Multi Tool logo" />
                </div>
                <span className={`status-pill ${currentStatus.className}`} aria-label={`Agent status: ${currentStatus.text}`}>
                    {currentStatus.text}
                </span>
            </div>
        </>
    );
};

export default AgentAvatar;