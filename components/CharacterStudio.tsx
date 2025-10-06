/* LEEWAY HEADER
TAG: FRONTEND.COMPONENT.CHARACTER_STUDIO
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: layout-dashboard
ICON_SIG: CD534113
5WH: WHAT=Character management & avatar generation UI; WHY=Enable consistent persona assets & editing; WHO=Leeway Core (model & system agnostic); WHERE=components/CharacterStudio.tsx; WHEN=2025-10-05; HOW=React 19 + responsive edge-first design
SPDX-License-Identifier: MIT
*/

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CharacterContext } from '../contexts/CharacterContext';
import * as geminiService from '../services/geminiService';
import type { GenOut } from '../src/engines/engine.types';
import { renderTo } from '../src/ui/RenderSinks';
import type { Character } from '../types';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';

interface CharacterStudioProps {
    imageResults?: GenOut[];
    imageLoading?: boolean;
    imageError?: string;
}

interface GalleryImageDisplayProps {
    imageResult: GenOut;
    key?: React.Key; // allow React key without triggering prop type error
}

function GalleryImageDisplay({ imageResult }: GalleryImageDisplayProps) {
    const imgRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (imageResult && imgRef.current && canvasRef.current) {
            renderTo(imgRef.current, canvasRef.current, imageResult);
        }
    }, [imageResult]);

    const showCanvas = imageResult?.type === 'rgba';
    const showImg = imageResult && (imageResult.type === 'base64' || imageResult.type === 'blob');

    return (
        <div className="gallery-image-wrapper">
            <img
                ref={imgRef}
                alt="Generated character visual"
                className={`gallery-image ${showImg ? 'visible' : 'hidden'}`}
            />
            <canvas
                ref={canvasRef}
                className={`gallery-canvas ${showCanvas ? 'visible' : 'hidden'}`}
            />
        </div>
    );
}

const CharacterStudio: React.FC<CharacterStudioProps> = ({
    imageResults = [],
    imageLoading = false,
    imageError = '',
}) => {
    const { characters, addCharacter, updateCharacter, deleteCharacter } = useContext(CharacterContext);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    
    // Form state
    const [name, setName] = useState('');
    const [appearance, setAppearance] = useState('');
    const [personality, setPersonality] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

    const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

    const galleryItems: GenOut[] = useMemo(() => imageResults ?? [], [imageResults]);

    useEffect(() => {
        if (selectedCharacter && !isCreatingNew) {
            setName(selectedCharacter.name);
            setAppearance(selectedCharacter.appearance);
            setPersonality(selectedCharacter.personality);
            setAvatarUrl(selectedCharacter.avatarUrl);
        } else {
            resetForm();
        }
    }, [selectedCharacter, isCreatingNew]);

    const resetForm = () => {
        setName('');
        setAppearance('');
        setPersonality('');
        setAvatarUrl(undefined);
    };

    const handleSelectCharacter = (character: Character) => {
        setIsCreatingNew(false);
        setSelectedCharacter(character);
    };

    const handleNewCharacter = () => {
        setSelectedCharacter(null);
        setIsCreatingNew(true);
        resetForm();
    };

    const handleSave = () => {
        if (!name.trim()) {
            alert('Character name is required.');
            return;
        }

        if (isCreatingNew) {
            const newChar = addCharacter({ name, appearance, personality, avatarUrl });
            setSelectedCharacter(newChar);
            setIsCreatingNew(false);
        } else if (selectedCharacter) {
            updateCharacter({
                ...selectedCharacter,
                name,
                appearance,
                personality,
                avatarUrl,
            });
        }
    };

    const handleDelete = () => {
        if (selectedCharacter) {
            deleteCharacter(selectedCharacter.id);
            setSelectedCharacter(null);
            setIsCreatingNew(false);
        }
    };
    
    const handleGenerateAvatar = async () => {
        if (!appearance.trim()) {
            alert('Please provide an appearance description to generate an avatar.');
            return;
        }
        setIsGeneratingAvatar(true);
        try {
            const prompt = `${appearance}, character portrait, digital art, high detail, headshot`;
            const imageUrl = await geminiService.generateImage(prompt);
            setAvatarUrl(imageUrl);

            // Also save it to the character profile immediately
             if (selectedCharacter && !isCreatingNew) {
                updateCharacter({ ...selectedCharacter, name, appearance, personality, avatarUrl: imageUrl });
             }
        } catch (error) {
            console.error("Avatar generation failed:", error);
            alert(`Failed to generate avatar: ${(error as Error).message}`);
        } finally {
            setIsGeneratingAvatar(false);
        }
    };
    
    const styles = `
    .character-studio-wrapper { display: flex; height: 100%; gap: 1.5rem; color: var(--text-primary); align-items: stretch; }
    .character-list-pane { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; background: #1E1E1E; border-radius: 1rem; padding: 1rem; border: 1px solid var(--border-color); }
    .character-detail-pane { flex: 1 1 auto; display: flex; flex-direction: column; background: var(--surface-bg); border-radius: 1rem; padding: 1.5rem; border: 1px solid var(--border-color); min-width: 0; }
    .character-gallery-pane { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; background: #1E1E1E; border-radius: 1rem; padding: 1rem; border: 1px solid var(--border-color); }
    .gallery-header { font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; font-size: 0.8rem; color: var(--text-secondary); }
    .gallery-body { flex-grow: 1; overflow-y: auto; margin-top: 0.75rem; padding-right: 0.25rem; }
    .gallery-image-wrapper { border: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.2); border-radius: 0.75rem; padding: 0.75rem; margin-bottom: 1rem; display: flex; justify-content: center; }
    .gallery-image, .gallery-canvas { max-width: 100%; border-radius: 0.5rem; }
    .gallery-image.hidden, .gallery-canvas.hidden { display: none; }
    .gallery-empty { color: #9ca3af; font-size: 0.85rem; text-align: center; margin-top: 1.5rem; }
    .character-list { flex-grow: 1; overflow-y: auto; margin-top: 1rem; }
    .character-list-item { display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border-radius: 0.5rem; cursor: pointer; transition: background-color 0.2s; border: 1px solid transparent; }
    .character-list-item:hover { background-color: rgba(255,255,255,0.05); }
    .character-list-item.selected { background-color: var(--accent-bg); color: var(--accent-text); border-color: var(--border-color); }
    .char-item-avatar { width: 40px; height: 40px; border-radius: 50%; background-color: #444; object-fit: cover; }
    .char-item-name { font-weight: 600; }
    .detail-form { flex-grow: 1; display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; }
    .form-group label { font-weight: 600; margin-bottom: 0.5rem; display: block; }
    .form-group input, .form-group textarea { width: 100%; background: #333; color: #fff; border: 1px solid #555; border-radius: 0.5rem; padding: 0.75rem; }
    .form-group textarea { min-height: 120px; resize: vertical; }
    .avatar-section { display: flex; gap: 1rem; align-items: center; }
    .avatar-preview { width: 100px; height: 100px; border-radius: 0.5rem; background: #333; object-fit: cover; border: 1px solid #555; }
    .detail-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: auto; padding-top: 1rem; border-top: 1px solid #444; }
    .action-btn { padding: 0.6rem 1rem; border-radius: 0.5rem; border: none; font-weight: 600; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; gap: 0.5rem; }
    .btn-primary { background-color: var(--accent-bg); color: var(--accent-text); }
    .btn-secondary { background-color: #495057; color: white; }
    .btn-danger { background-color: #dc3545; color: white; }
    @media (max-width: 1280px) {
        .character-studio-wrapper { flex-direction: column; }
        .character-list-pane, .character-gallery-pane { width: 100%; }
    }
    `;

    return (
        <div className="h-full">
            <style>{styles}</style>
            <div className="character-studio-wrapper">
                <div className="character-list-pane">
                    <button onClick={handleNewCharacter} className="action-btn btn-primary w-full justify-center">New Character</button>
                    <div className="character-list">
                        {characters.map((char: Character) => (
                            <div key={char.id} onClick={() => handleSelectCharacter(char)} className={`character-list-item ${selectedCharacter?.id === char.id ? 'selected' : ''}`}>
                                <img src={char.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(char.name)}&background=2a2a2a&color=d4af37`} alt={char.name} className="char-item-avatar" />
                                <span className="char-item-name">{char.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="character-detail-pane">
                    {selectedCharacter || isCreatingNew ? (
                        <>
                            <div className="detail-form">
                                <div className="avatar-section">
                                    {isGeneratingAvatar ? <LoadingSpinner message="Generating..."/> : <img src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=333&color=fff&size=100`} alt="Avatar Preview" className="avatar-preview" />}
                                    <div>
                                        <label>Character Avatar</label>
                                        <button onClick={handleGenerateAvatar} disabled={isGeneratingAvatar || !appearance} className="action-btn btn-secondary">Generate Avatar</button>
                                        <p className="text-xs text-gray-400 mt-2">Generates an avatar based on the appearance description.</p>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="char-name">Name</label>
                                    <input id="char-name" type="text" value={name} onChange={e => setName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="char-appearance">Appearance</label>
                                    <textarea id="char-appearance" value={appearance} onChange={e => setAppearance(e.target.value)} placeholder="e.g., A tall woman with short, silver hair, wearing a black trench coat. Has a cybernetic eye..." />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="char-personality">Personality & Backstory</label>
                                    <textarea id="char-personality" value={personality} onChange={e => setPersonality(e.target.value)} placeholder="e.g., Stoic, calculating, and cynical, but with a hidden sense of justice. Former special agent..." />
                                </div>
                            </div>
                            <div className="detail-actions">
                                {selectedCharacter && !isCreatingNew && <button onClick={handleDelete} className="action-btn btn-danger mr-auto">Delete</button>}
                                <button onClick={handleSave} className="action-btn btn-primary">{isCreatingNew ? 'Create Character' : 'Save Changes'}</button>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                            <p>Select a character or create a new one.</p>
                        </div>
                    )}
                </div>
                <div className="character-gallery-pane">
                    <h3 className="gallery-header">Character Gallery</h3>
                    <div className="gallery-body">
                        {imageLoading && <LoadingSpinner message="Generating consistent character visuals..." />}
                        {!imageLoading && imageError && <ErrorMessage message={imageError} />}
                        {!imageLoading && !imageError && galleryItems.length === 0 && (
                            <p className="gallery-empty">Generate imagery from the prompt input to build a consistent look for this character.</p>
                        )}
                        {galleryItems.map((imageResult: GenOut, idx: number) => (
                            <GalleryImageDisplay key={idx} imageResult={imageResult} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CharacterStudio;
