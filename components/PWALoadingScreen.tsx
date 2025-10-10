/* LEEWAY HEADER
TAG: FRONTEND.COMPONENT.PWA_LOADING_SCREEN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: loader-circle
ICON_SIG: CD534113
5WH: WHAT=Professional PWA loading screen with Agent Lee branding; WHY=Provide polished startup experience for app store deployment; WHO=Leeway Core (mobile-first PWA); WHERE=components/PWALoadingScreen.tsx; WHEN=2025-10-09; HOW=React component with animations and Agent Lee theming
SPDX-License-Identifier: MIT
*/

import React, { useEffect, useState } from 'react';

interface PWALoadingScreenProps {
  isVisible: boolean;
  progress?: number;
  message?: string;
  onComplete?: () => void;
}

const PWALoadingScreen: React.FC<PWALoadingScreenProps> = ({ 
  isVisible, 
  progress = 0, 
  message = "Initializing Agent Lee...",
  onComplete 
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(message);

  const loadingMessages = [
    "Initializing Agent Lee...",
    "Loading AI systems...",
    "Preparing multi-tool interface...",
    "Establishing secure connections...",
    "Ready for deployment..."
  ];

  useEffect(() => {
    if (!isVisible) return;

    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      if (messageIndex < loadingMessages.length - 1) {
        messageIndex++;
        setCurrentMessage(loadingMessages[messageIndex]);
      } else {
        clearInterval(messageInterval);
      }
    }, 800);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setDisplayProgress(prev => {
        const newProgress = Math.min(prev + Math.random() * 15, 100);
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            onComplete?.();
          }, 500);
        }
        return newProgress;
      });
    }, 200);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="pwa-loading-screen">
      <div className="loading-content">
        {/* Agent Lee Logo */}
        <div className="logo-container">
          <div className="logo-glow">
            <svg 
              width="120" 
              height="120" 
              viewBox="0 0 120 120" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="agent-logo"
            >
              <circle 
                cx="60" 
                cy="60" 
                r="50" 
                stroke="#D4AF37" 
                strokeWidth="3" 
                fill="rgba(212, 175, 55, 0.1)"
                className="logo-circle"
              />
              <text 
                x="60" 
                y="40" 
                textAnchor="middle" 
                fill="#D4AF37" 
                fontSize="20" 
                fontWeight="bold"
                fontFamily="Inter, sans-serif"
              >
                AGENT
              </text>
              <text 
                x="60" 
                y="65" 
                textAnchor="middle" 
                fill="#D4AF37" 
                fontSize="24" 
                fontWeight="bold"
                fontFamily="Inter, sans-serif"
              >
                LEE
              </text>
              <text 
                x="60" 
                y="85" 
                textAnchor="middle" 
                fill="#D4AF37" 
                fontSize="12" 
                fontFamily="Inter, sans-serif"
              >
                MULTI-TOOL
              </text>
            </svg>
          </div>
        </div>

        {/* App Title */}
        <h1 className="app-title">Agent Lee X</h1>
        <p className="app-subtitle">Classified Intelligence Hub</p>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ '--progress': `${displayProgress}%` } as React.CSSProperties}
            />
          </div>
          <div className="progress-text">{Math.round(displayProgress)}%</div>
        </div>

        {/* Loading Message */}
        <p className="loading-message">{currentMessage}</p>

        {/* Animated Dots */}
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <style>{`
        .pwa-loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #121212 0%, #000000 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          color: #f0f0f0;
          font-family: 'Inter', sans-serif;
        }

        .loading-content {
          text-align: center;
          padding: 2rem;
          max-width: 400px;
          width: 100%;
        }

        .logo-container {
          margin-bottom: 2rem;
          display: flex;
          justify-content: center;
        }

        .logo-glow {
          position: relative;
          display: inline-block;
        }

        .agent-logo {
          animation: logoGlow 2s ease-in-out infinite alternate;
        }

        .logo-circle {
          animation: rotate 10s linear infinite;
          transform-origin: 60px 60px;
        }

        @keyframes logoGlow {
          0% {
            filter: drop-shadow(0 0 10px rgba(212, 175, 55, 0.5));
          }
          100% {
            filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.8));
          }
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .app-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .app-subtitle {
          font-size: 1.1rem;
          color: #D4AF37;
          margin: 0 0 3rem 0;
          font-weight: 500;
        }

        .progress-container {
          margin-bottom: 2rem;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(212, 175, 55, 0.2);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%);
          border-radius: 4px;
          transition: width 0.3s ease;
          animation: progressShine 2s linear infinite;
          width: var(--progress, 0%);
        }

        @keyframes progressShine {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .progress-text {
          font-size: 0.9rem;
          color: #D4AF37;
          font-weight: 600;
        }

        .loading-message {
          font-size: 1rem;
          color: #f0f0f0;
          margin: 1rem 0;
          min-height: 1.5rem;
          animation: messageSlide 0.5s ease-in-out;
        }

        @keyframes messageSlide {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .loading-dots span {
          width: 8px;
          height: 8px;
          background: #D4AF37;
          border-radius: 50%;
          animation: dotBounce 1.4s ease-in-out infinite both;
        }

        .loading-dots span:nth-child(1) {
          animation-delay: -0.32s;
        }

        .loading-dots span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes dotBounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .app-title {
            font-size: 2rem;
          }
          
          .app-subtitle {
            font-size: 1rem;
          }
          
          .loading-content {
            padding: 1rem;
          }
        }

        /* Small mobile optimizations */
        @media (max-width: 480px) {
          .app-title {
            font-size: 1.75rem;
          }
          
          .logo-container svg {
            width: 100px;
            height: 100px;
          }
        }
      `}</style>
    </div>
  );
};

export default PWALoadingScreen;