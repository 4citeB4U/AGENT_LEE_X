/* LEEWAY HEADER
TAG: FRONTEND.COMPONENT.CAMERA_FEED
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: camera
ICON_SIG: CD534113
5WH: WHAT=Live camera capture + frame extraction; WHY=Enable local visual analysis & future multimodal; WHO=Leeway Core (agnostic); WHERE=components/CameraFeed.tsx; WHEN=2025-10-05; HOW=React forwardRef + MediaStream API
SPDX-License-Identifier: MIT
*/

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface CameraFeedHandle {
    captureFrame: () => string | null;
    isReady: () => boolean;
}

interface CameraFeedProps {
    onCameraEnabled?: () => void;
}

const CameraFeed = forwardRef<CameraFeedHandle, CameraFeedProps>(({ onCameraEnabled }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameId = useRef<number | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const drawVideoToCanvas = () => {
        if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
            if (isCameraActive) { // Only continue animation if camera should be active
                 animationFrameId.current = requestAnimationFrame(drawVideoToCanvas);
            }
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }
            
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        animationFrameId.current = requestAnimationFrame(drawVideoToCanvas);
    };
    
    const enableCamera = async () => {
        setError(null); // Clear previous errors
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    setIsCameraActive(true);
                    onCameraEnabled?.(); // Notify parent that camera is ready
                    if (animationFrameId.current) {
                        cancelAnimationFrame(animationFrameId.current);
                    }
                    animationFrameId.current = requestAnimationFrame(drawVideoToCanvas);
                };
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setIsCameraActive(false);
            if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
                setError("Camera permission denied. Please grant permission in browser settings.");
            } else {
                setError("Could not access camera. It may be in use by another app.");
            }
        }
    };


    useEffect(() => {
        // This effect now only handles cleanup when the component unmounts.
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, []);

    useImperativeHandle(ref, () => ({
        captureFrame: () => {
            const canvas = canvasRef.current;
            if (!canvas || canvas.width === 0) {
                 console.error("Camera frame capture failed: Canvas not ready.");
                return null;
            }
            return canvas.toDataURL('image/jpeg', 0.9);
        },
        isReady: () => {
            return isCameraActive && !!streamRef.current && streamRef.current.active;
        }
    }));
    
    const styles = `
        .camera-feed-container {
            background-color: #111; border: 1px solid var(--border-color); border-radius: 0.75rem;
            padding: 1rem; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            flex-grow: 1.2;
            min-height: 0;
            flex-shrink: 0;
        }
        .camera-feed-header {
            color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
            font-size: 0.8rem; margin-bottom: 0.5rem; text-align: center;
        }
        .video-wrapper {
            flex-grow: 1; background-color: #000; border-radius: 0.5rem; overflow: hidden;
            position: relative;
            display: flex; align-items: center; justify-content: center;
            min-height: 0;
        }
        .video-feed-canvas { 
            width: 100%; height: 100%; object-fit: cover;
        }
        .video-hidden { display: none; }
        .canvas-hidden { visibility: hidden; }
        .canvas-visible { visibility: visible; }
        .camera-error-overlay, .camera-prompt-overlay {
            position: absolute; left: 0; right: 0;
            display: flex;
            text-align: center;
        }
        .camera-error-overlay {
             top: 0; bottom: 0; /* full overlay only for errors */
             flex-direction: column; align-items: center; justify-content: center;
             padding: 1rem;
             color: #f8d7da;
             background: rgba(220, 53, 69, 0.2);
        }
        .camera-prompt-overlay {
             /* Slim, top-aligned banner for prompt (non-error) */
             top: 0; height: 32px; bottom: auto;
             padding: 0.25rem 0.5rem;
             flex-direction: row; align-items: center; justify-content: center; gap: 0.5rem;
             color: #e2e8f0;
             background: rgba(0, 0, 0, 0.4);
             border-bottom: 1px solid rgba(212, 175, 55, 0.35);
        }
        .camera-error-overlay i {
            font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.7;
        }
        .camera-prompt-overlay i {
            font-size: 0.9rem; opacity: 0.7; margin: 0;
        }
        .camera-error-overlay p, .camera-prompt-overlay p {
            font-size: 0.875rem; font-family: 'Inter', sans-serif;
        }
        .camera-prompt-overlay p { font-size: 0.8rem; }
        .retry-btn, .prompt-btn {
            margin-top: 1rem; padding: 0.5rem 1rem;
            background: var(--accent-bg); color: var(--accent-text);
            border: none; border-radius: 0.5rem;
            font-weight: 600; cursor: pointer;
            transition: background-color 0.2s ease;
        }
        .camera-prompt-overlay .prompt-btn { margin-top: 0; padding: 0.25rem 0.5rem; font-size: 0.75rem; }
        .retry-btn:hover, .prompt-btn:hover {
            background: #b8860b;
        }
        
        @media (max-width: 1024px) {
            .camera-feed-container {
                flex-shrink: 1;
                min-height: 250px;
            }
        }
    `;

    return (
        <>
            <style>{styles}</style>
            <div className="camera-feed-container">
                <h3 className="camera-feed-header">Visual Feed</h3>
                <div className="video-wrapper">
                    {/* Keep the <video> element for stream source, but always hide it to avoid duplicate display */}
                    <video ref={videoRef} playsInline className="video-hidden" />
                    {/* Show only the processed canvas; toggle visibility without relying on Tailwind classes */}
                    <canvas ref={canvasRef} className={`video-feed-canvas ${isCameraActive ? 'canvas-visible' : 'canvas-hidden'}`} />
                    
                    {!isCameraActive && (
                        <>
                            {error ? (
                                <div className="camera-error-overlay">
                                    <i className="fas fa-exclamation-triangle"></i>
                                    <p>{error}</p>
                                    <button onClick={enableCamera} className="retry-btn">Retry</button>
                                </div>
                            ) : (
                                <div className="camera-prompt-overlay">
                                    <i className="fas fa-video"></i>
                                    <p>Camera is required for visual analysis.</p>
                                    <button onClick={enableCamera} className="prompt-btn">Enable Camera</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
});

export default CameraFeed;