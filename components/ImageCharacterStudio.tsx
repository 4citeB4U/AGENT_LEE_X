/* LEEWAY HEADER
TAG: FRONTEND.COMPONENT.IMAGE_CHARACTER_STUDIO
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: image-plus
ICON_SIG: CD534113
5WH: WHAT=Unified image + character creation studio; WHY=Consistent persona asset pipeline; WHO=Leeway Core (model/system agnostic); WHERE=components/ImageCharacterStudio.tsx; WHEN=2025-10-05; HOW=React 19 + prompt-driven render sinks
SPDX-License-Identifier: MIT
*/

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CharacterContext } from '../contexts/CharacterContext';
import * as geminiService from '../services/geminiService';
import type { GenOut } from '../src/engines/engine.types';
import { renderTo } from '../src/ui/RenderSinks';
import type { Character } from '../types';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';

/**
 * ---------------------------------------------------------------------------
 * Image + Character Studio (Unified)
 * - Replaces CharacterStudio + ImageGenerator with a single tab/workflow
 * - Create images, save a character, and reuse for consistent poses/movements
 * ---------------------------------------------------------------------------
 */

type ImgKind = 'base64' | 'blob' | 'rgba';

// Extended character optional fields (not yet in core Character type but used locally)
interface CharacterOptionalFields {
  seed?: string;
  signaturePrompt?: string;
  referenceImageUrl?: string;
}

// Local representation we manipulate in this studio
type CharacterExtended = Character & CharacterOptionalFields;

// Helper type for creation/updating operations
type CharacterCreateInput = Omit<Character, 'id' | 'createdAt'> & CharacterOptionalFields;

interface ImageResultLike {
  type: ImgKind;
  data: any; // your GenOut-compatible payload
  url?: string; // when available, for quick display/save
}

interface SingleImageDisplayProps { imageResult: GenOut; prompt?: string; key?: React.Key }
const SingleImageDisplay: React.FC<SingleImageDisplayProps> = ({ imageResult, prompt }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (imageResult && imgRef.current && canvasRef.current) {
      renderTo(imgRef.current, canvasRef.current, imageResult);
    }
  }, [imageResult]);

  const showCanvas = imageResult?.type === 'rgba';
  const showImg = imageResult && (imageResult.type === 'base64' || imageResult.type === 'blob');

  const downloadImage = () => {
    try {
      let dataUrl: string;
      let filename: string;

      // Generate filename from prompt or use timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const promptPrefix = prompt ? prompt.slice(0, 30).replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') : 'generated_image';
      filename = `${promptPrefix}_${timestamp}.png`;

      if (imageResult.type === 'base64') {
        // Handle base64 data
        dataUrl = imageResult.data.startsWith('data:') ? imageResult.data : `data:image/png;base64,${imageResult.data}`;
      } else if (imageResult.type === 'blob') {
        // Convert blob to data URL
        const reader = new FileReader();
        reader.onload = () => {
          const link = document.createElement('a');
          link.href = reader.result as string;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };
        reader.readAsDataURL(imageResult.data);
        return;
      } else if (imageResult.type === 'rgba' && canvasRef.current) {
        // Convert canvas to data URL
        dataUrl = canvasRef.current.toDataURL('image/png');
      } else {
        throw new Error('Unsupported image format for download');
      }

      // Create download link
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  return (
    <div className="p-4 border border-border/20 rounded-lg bg-surface/50 mb-4">
      <div className="relative group">
        <img
          ref={imgRef}
          alt="Generated AI"
          className={`max-w-full max-h-[60vh] rounded-md mx-auto ${showImg ? 'block' : 'hidden'}`}
        />
        <canvas
          ref={canvasRef}
          className={`max-w-full max-h-[60vh] rounded-md mx-auto ${showCanvas ? 'block' : 'hidden'}`}
        />
        
        {/* Download button overlay */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={downloadImage}
            className="btn-secondary text-xs px-2 py-1 bg-black/70 text-white hover:bg-black/90 backdrop-blur-sm"
            title="Download Image"
          >
            📥 Download
          </button>
        </div>
      </div>
    </div>
  );
};

const ImageCharacterStudio: React.FC = () => {
  const { characters, addCharacter, updateCharacter, deleteCharacter } = useContext(CharacterContext);

  // ---- CHARACTER STATE (unified, inspired by CharacterStudio) ----
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const selectedCharacter: CharacterExtended | null = useMemo(
    () => (characters.find((c) => c.id === selectedCharacterId) as CharacterExtended | undefined) ?? null,
    [characters, selectedCharacterId]
  );

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [name, setName] = useState('');
  const [appearance, setAppearance] = useState('');
  const [personality, setPersonality] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // Optional extras for consistency
  const [seed, setSeed] = useState<string>('');
  const [signaturePrompt, setSignaturePrompt] = useState<string>('');
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('');

  // ---- IMAGE GEN STATE (unified, inspired by ImageGenerator) ----
  const [prompt, setPrompt] = useState('');
  const [imageResults, setImageResults] = useState<GenOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ---- TOGGLES ----
  const [consistencyLock, setConsistencyLock] = useState(false); // default off for general image generation

  // ---- IMAGE UPLOAD STATE ----
  interface UploadedImageData {
    url: string;
    file: File;
    name: string;
  }
  const [uploadedImage, setUploadedImage] = useState<UploadedImageData | null>(null);

  // hydrate editor fields when selection changes
  useEffect(() => {
    if (selectedCharacter && !isCreatingNew) {
      setName(selectedCharacter.name);
      setAppearance(selectedCharacter.appearance);
      setPersonality(selectedCharacter.personality);
      setAvatarUrl(selectedCharacter.avatarUrl);
  setSeed(selectedCharacter.seed ?? '');
  setSignaturePrompt(selectedCharacter.signaturePrompt ?? '');
  setReferenceImageUrl(selectedCharacter.referenceImageUrl ?? '');
    } else {
      resetCharacterForm();
    }
  }, [selectedCharacter, isCreatingNew]);

  const resetCharacterForm = () => {
    setName('');
    setAppearance('');
    setPersonality('');
    setAvatarUrl(undefined);
    setSeed('');
    setSignaturePrompt('');
    setReferenceImageUrl('');
  };

  const handleSelectCharacter = (id: number) => {
    setIsCreatingNew(false);
    setSelectedCharacterId(id);
  };

  const handleNewCharacter = () => {
    setSelectedCharacterId(null);
    setIsCreatingNew(true);
    resetCharacterForm();
  };

  const handleSaveCharacter = () => {
    if (!name.trim()) {
      alert('Character name is required.');
      return;
    }

    const basePayload: CharacterCreateInput = {
      name,
      appearance,
      personality,
      avatarUrl,
      // Only include optional fields when defined (avoid undefined serialization noise)
      ...(seed ? { seed } : {}),
      ...(signaturePrompt ? { signaturePrompt } : {}),
      ...(referenceImageUrl ? { referenceImageUrl } : {}),
    };

    if (isCreatingNew) {
      // CharacterContext.addCharacter expects Omit<Character,'id'|'createdAt'>
      // We pass only the core Character fields; optional extension fields are dropped unless upstream is expanded.
      const { seed: _s, signaturePrompt: _sp, referenceImageUrl: _r, ...core } = basePayload;
      const newChar = addCharacter(core);
      // Persist optional fields locally by merging into selectedCharacter stateful editing (not stored globally yet)
      setSelectedCharacterId(newChar.id);
      setIsCreatingNew(false);
    } else if (selectedCharacter) {
      const updated: CharacterExtended = {
        ...selectedCharacter,
        ...basePayload,
      };
      // Strip extended props before sending to context update (which expects Character shape)
      const { seed: _s, signaturePrompt: _sp, referenceImageUrl: _r, ...characterCore } = updated;
      updateCharacter(characterCore);
    }
  };

  const handleDeleteCharacter = () => {
    if (selectedCharacter) {
      deleteCharacter(selectedCharacter.id);
      setSelectedCharacterId(null);
      setIsCreatingNew(false);
      resetCharacterForm();
    }
  };

  // quick "avatar only" generation (headshot), mirrors your CharacterStudio flow
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const generateAvatar = async () => {
    if (!appearance.trim()) {
      alert('Provide an appearance description to generate an avatar.');
      return;
    }
    setIsGeneratingAvatar(true);
    try {
      const avatarPrompt = `${appearance}, character portrait, digital art, high detail, headshot`;
      const url = await geminiService.generateImage(avatarPrompt);
      setAvatarUrl(url);
      setReferenceImageUrl(url); // capture as a useful future reference
      if (selectedCharacter && !isCreatingNew) {
        // preserve extended fields locally
        const updated: CharacterExtended = { ...selectedCharacter, name, appearance, personality, avatarUrl: url, referenceImageUrl: url };
        const { seed: _s, signaturePrompt: _sp, referenceImageUrl: _r, ...core } = updated;
        updateCharacter(core);
      }
    } catch (e: any) {
      console.error('Avatar generation failed:', e);
      alert(`Failed to generate avatar: ${e.message}`);
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  // ------------------------------------------------------------------
  // IMAGE GENERATION (with optional character consistency)
  // ------------------------------------------------------------------
  const buildSignaturePrompt = () => {
    // If user typed a custom signaturePrompt, prefer it; else synthesize a clean DNA line
    if (signaturePrompt?.trim()) return signaturePrompt.trim();
    const dna = [
      `Character "${name || 'Unnamed'}"`,
      appearance ? `Appearance: ${appearance}` : '',
      personality ? `Personality: ${personality}` : '',
      'Keep the same face, traits, and style across images.',
    ]
      .filter(Boolean)
      .join(' | ');
    return dna;
  };

  const mergedPrompt = useMemo(() => {
    const core = prompt.trim();
    if (!core) return 'high quality digital illustration';
    
    // Only apply character enhancement if:
    // 1. A character is selected
    // 2. Consistency lock is enabled
    // 3. Character has useful data
    if (consistencyLock && selectedCharacter && name.trim()) {
      const dna = buildSignaturePrompt();
      const ref = referenceImageUrl ? ` [Reference: ${referenceImageUrl}]` : '';
      const seedHint = seed ? ` [seed:${seed}]` : '';
      return `${core}. Character enhancement: ${dna}.${ref}${seedHint}`;
    }
    
    // For general image generation, just use the user's prompt
    return core;
  }, [prompt, consistencyLock, selectedCharacter, name, appearance, personality, referenceImageUrl, seed, signaturePrompt]);

  const createImage = async () => {
    setLoading(true);
    setError('');
    try {
      // Using your existing service — accepts a prompt string.
      const imageUrlOrGenOut = await geminiService.generateImage(mergedPrompt);

      // If your geminiService returns just a URL, wrap into a GenOut-like structure.
      const asGenOut: GenOut =
        typeof imageUrlOrGenOut === 'string'
          ? { type: 'base64', data: imageUrlOrGenOut }
          : imageUrlOrGenOut as GenOut;

      setImageResults((prev) => [asGenOut, ...prev]);

      // Always capture the first successful image as a potential reference
      // This enables "Save as Character" for any image
      if (!referenceImageUrl && typeof imageUrlOrGenOut === 'string') {
        setReferenceImageUrl(imageUrlOrGenOut);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to create image.');
    } finally {
      setLoading(false);
    }
  };

  // Save Character button right below the main "Create Image"
  const saveCharacterFromImage = () => {
    // If we don't have a name, try to suggest one from the prompt or uploaded image
    let characterName = name.trim();
    if (!characterName && prompt.trim()) {
      // Try to extract a character name or generate a descriptive one from the prompt
      const promptWords = prompt.trim().split(' ').slice(0, 3).join(' ');
      characterName = `Character from "${promptWords}"`;
    } else if (!characterName && uploadedImage) {
      // Use uploaded image name as fallback
      const imageName = uploadedImage.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      characterName = imageName || 'Imported Character';
    }
    
    if (!characterName) {
      alert('Please enter a character name, or the system will generate one from your prompt/image.');
      return;
    }
    
    // Check if we have either generated images or uploaded image
    const hasImages = imageResults.length > 0 || uploadedImage;
    if (!hasImages) {
      alert('Create an image or upload one first so we can store a reference.');
      return;
    }

    // Determine the best reference image URL
    let bestReferenceUrl = referenceImageUrl;
    if (!bestReferenceUrl && uploadedImage) {
      bestReferenceUrl = uploadedImage.url;
    }
    if (!bestReferenceUrl && imageResults.length > 0) {
      // Try to extract URL from the most recent generated image
      const latestImage = imageResults[0];
      if (latestImage.type === 'base64') {
        bestReferenceUrl = latestImage.data.startsWith('data:') ? latestImage.data : `data:image/png;base64,${latestImage.data}`;
      }
    }

    // Extract character info from the prompt or use smart defaults
    let characterAppearance = appearance.trim();
    if (!characterAppearance && prompt.trim()) {
      characterAppearance = `Character from prompt: ${prompt.trim()}`;
    } else if (!characterAppearance && uploadedImage) {
      characterAppearance = `Character imported from ${uploadedImage.name} - appearance details to be refined`;
    } else if (!characterAppearance) {
      characterAppearance = 'Appearance details to be defined';
    }

    const characterPersonality = personality.trim() || 'Personality traits to be defined';

    const extendedPayload: CharacterExtended = {
      // Core Character fields (id/createdAt are assigned internally by context for new chars)
      id: selectedCharacter?.id ?? -1, // placeholder if new
      createdAt: selectedCharacter?.createdAt || new Date().toISOString(),
      name: characterName,
      appearance: characterAppearance,
      personality: characterPersonality,
      avatarUrl: avatarUrl || bestReferenceUrl,
      referenceImageUrl: bestReferenceUrl,
      seed: seed || (Date.now() % 100000).toString(),
      signaturePrompt: signaturePrompt || buildSignaturePrompt(),
    };

    if (isCreatingNew || !selectedCharacter) {
      // remove extended-only fields for persistence
      const { seed: _s, signaturePrompt: _sp, referenceImageUrl: _r, id: _id, createdAt: _ca, ...core } = extendedPayload;
      const newChar = addCharacter(core);
      setSelectedCharacterId(newChar.id);
      setIsCreatingNew(false);
      setName(characterName);
      setAppearance(characterAppearance);
      setPersonality(characterPersonality);
      setUploadedImage(null);
      alert(`Character "${characterName}" created successfully!`);
    } else {
      const { seed: _s, signaturePrompt: _sp, referenceImageUrl: _r, ...core } = extendedPayload;
      updateCharacter(core);
      alert(`Character "${characterName}" updated successfully!`);
    }
  };

  // ---- IMAGE UPLOAD FUNCTIONS ----
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    // Validate file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file is too large. Please select a file smaller than 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setUploadedImage({
        url,
        file,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const downloadUploadedImage = (imageData: UploadedImageData) => {
    const link = document.createElement('a');
    link.href = imageData.url;
    link.download = imageData.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const useUploadedAsReference = () => {
    if (!uploadedImage) return;
    
    setReferenceImageUrl(uploadedImage.url);
    setAvatarUrl(uploadedImage.url);
    
    // Auto-fill some basic character info if empty
    if (!name.trim()) {
      const baseName = uploadedImage.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setName(baseName || 'Imported Character');
    }
    
    if (!appearance.trim()) {
      setAppearance('Character imported from uploaded image - appearance to be described');
    }
    
    alert('Image set as character reference! You can now edit the character details.');
  };

  const analyzeUploadedImage = async () => {
    if (!uploadedImage) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Use Gemini to analyze the image and generate a description
      const analysisPrompt = 'Analyze this image and provide a detailed description suitable for character creation. Include physical appearance, clothing, setting, mood, and any notable features. Be descriptive but concise.';
      
      // Convert the image to base64 for analysis
      const response = await geminiService.generateImage(`${analysisPrompt} Based on this uploaded image.`);
      
      // For now, we'll just set some basic info - in a real implementation,
      // you'd use Gemini's vision API to analyze the actual image
      const imageName = uploadedImage.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      
      if (!appearance.trim()) {
        setAppearance(`Character based on ${imageName} - detailed appearance analysis needed`);
      }
      
      if (!name.trim()) {
        setName(imageName || 'Analyzed Character');
      }
      
      alert('Image analyzed! Check the character fields for generated descriptions.');
      
    } catch (e: any) {
      console.error('Image analysis failed:', e);
      setError(`Failed to analyze image: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ---- CHARACTER EXPORT/IMPORT FUNCTIONS ----
  const exportCharacter = (character: Character) => {
    const exportData = {
      version: '1.0',
      character: character,
      exportedAt: new Date().toISOString(),
      exportedFrom: 'Agent Lee Multi-Tool'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${character.name.replace(/[^a-zA-Z0-9]/g, '_')}_character.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(link.href);
  };

  const exportAllCharacters = () => {
    if (characters.length === 0) {
      alert('No characters to export.');
      return;
    }
    
    const exportData = {
      version: '1.0',
      characters: characters,
      exportedAt: new Date().toISOString(),
      exportedFrom: 'Agent Lee Multi-Tool'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `all_characters_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(link.href);
  };

  const importCharacters = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        
        if (importData.character) {
          // Single character import
          const character = importData.character;
          // Remove the ID to let the system assign a new one
          delete character.id;
          character.createdAt = new Date().toISOString();
          
          const newChar = addCharacter(character);
          setSelectedCharacterId(newChar.id);
          alert(`Character "${character.name}" imported successfully!`);
        } else if (importData.characters && Array.isArray(importData.characters)) {
          // Multiple characters import
          let importedCount = 0;
          importData.characters.forEach((character: any) => {
            try {
              delete character.id;
              character.createdAt = new Date().toISOString();
              addCharacter(character);
              importedCount++;
            } catch (err) {
              console.warn('Failed to import character:', character.name, err);
            }
          });
          alert(`Successfully imported ${importedCount} characters!`);
        } else {
          throw new Error('Invalid character file format');
        }
        
        // Clear the input
        event.target.value = '';
      } catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import characters. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full w-full flex gap-4">
      {/* MAIN: Image Creation (takes priority) */}
      <main className="flex-1 space-y-4">
        {/* Primary Image Generation Panel */}
        <section className="card">
          <h2 className="section-header">Image Generator</h2>
          <p className="text-muted text-sm mb-4">Create any image using AI - landscapes, objects, scenes, characters, or anything you can imagine.</p>

          <label className="text-sm font-semibold text-fg">Image Prompt</label>
          <textarea
            className="textarea mt-2"
            placeholder="Describe what you want to create: a sunset over mountains, a futuristic cityscape, a cozy coffee shop, a dragon in flight, etc."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
          />

          {/* Optional Character Enhancement */}
          <details className="mt-4 border border-border/20 rounded-lg p-3">
            <summary className="font-semibold text-fg cursor-pointer">
              🎭 Character Enhancement (Optional)
            </summary>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-fg">Use Saved Character</label>
                  <select
                    className="input mt-1"
                    value={selectedCharacterId ?? ''}
                    onChange={(e) => setSelectedCharacterId(e.target.value ? Number(e.target.value) : null)}
                    aria-label="Select character for image enhancement"
                  >
                    <option value="">— No Character Enhancement —</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={consistencyLock}
                      onChange={(e) => setConsistencyLock(e.target.checked)}
                      className="accent-primary"
                    />
                    <span className="text-sm font-semibold text-fg">Apply Character Consistency</span>
                  </label>
                </div>
              </div>
              {selectedCharacter && consistencyLock && (
                <div className="text-xs text-muted bg-surface/30 p-2 rounded">
                  <strong>Enhancement:</strong> {buildSignaturePrompt()}
                </div>
              )}
            </div>
          </details>

          <div className="mt-4 flex gap-3">
            <button
              onClick={createImage}
              className="btn btn-primary flex-1"
              disabled={loading}
              aria-label="Generate image"
            >
              {loading ? 'Creating Image...' : 'Generate Image'}
            </button>
            {(imageResults.length > 0 || uploadedImage) && (
              <button
                onClick={saveCharacterFromImage}
                className="btn btn-secondary bg-emerald-600 hover:bg-emerald-700 text-white"
                aria-label="Save character from image"
              >
                Save as Character
              </button>
            )}
          </div>

          {loading && <div className="mt-4"><LoadingSpinner message="Creating your image..." /></div>}
          {error && <div className="mt-3"><ErrorMessage message={error} /></div>}

          {imageResults.length === 0 && !loading && !error && (
            <div className="text-muted mt-6 text-center">
              <p>Enter any prompt above to generate an image.</p>
              <p className="text-xs mt-1">Examples: "mountain landscape", "cyberpunk street", "cute cartoon cat", "abstract art"</p>
            </div>
          )}
        </section>

        {/* Image Upload Section */}
        <section className="card">
          <h3 className="section-header">📁 Import Existing Image</h3>
          <p className="text-muted text-sm mb-4">Upload an image to use as a character reference or for analysis.</p>
          
          <div className="border-2 border-dashed border-border/30 rounded-lg p-6 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="cursor-pointer">
              <div className="text-muted mb-2">
                📤 Click to upload an image
              </div>
              <div className="text-xs text-muted">
                Supports JPG, PNG, WebP, and other common formats
              </div>
            </label>
          </div>
          
          {uploadedImage && (
            <div className="mt-4">
              <h4 className="font-semibold text-fg mb-2">Uploaded Image</h4>
              <div className="p-4 border border-border/20 rounded-lg bg-surface/50">
                <div className="relative group">
                  <img
                    src={uploadedImage.url}
                    alt="Uploaded"
                    className="max-w-full max-h-[40vh] rounded-md mx-auto"
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => downloadUploadedImage(uploadedImage)}
                      className="btn-secondary text-xs px-2 py-1 bg-black/70 text-white hover:bg-black/90 backdrop-blur-sm mr-2"
                      title="Download Image"
                    >
                      📥 Download
                    </button>
                    <button
                      onClick={() => setUploadedImage(null)}
                      className="btn-secondary text-xs px-2 py-1 bg-red-600/70 text-white hover:bg-red-700/90 backdrop-blur-sm"
                      title="Remove Image"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => useUploadedAsReference()}
                    className="btn btn-secondary flex-1 text-sm"
                  >
                    Use as Character Reference
                  </button>
                  <button
                    onClick={() => analyzeUploadedImage()}
                    className="btn btn-secondary flex-1 text-sm"
                  >
                    Analyze & Describe
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Image Results */}
        {imageResults.length > 0 && (
          <section className="card">
            <h3 className="section-header">Generated Images</h3>
            <div className="space-y-4">
              {imageResults.map((r, i) => (
                <SingleImageDisplay key={i} imageResult={r} prompt={prompt} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* RIGHT SIDEBAR: Character Management (Secondary) */}
      <aside className="w-[320px] shrink-0 space-y-4">
        {/* Saved Characters */}
        <section className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-fg">Saved Characters</h3>
            <div className="flex gap-1">
              <button
                onClick={handleNewCharacter}
                className="btn btn-secondary text-sm px-2 py-1"
                aria-label="Create new character"
              >
                + New
              </button>
            </div>
          </div>
          
          {/* Export/Import Controls */}
          {characters.length > 0 && (
            <div className="mb-3 border-b border-border/20 pb-3">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={exportAllCharacters}
                  className="btn btn-secondary text-xs px-2 py-1 flex-1"
                  title="Export all characters"
                >
                  📥 Export All
                </button>
                <label className="btn btn-secondary text-xs px-2 py-1 flex-1 cursor-pointer text-center">
                  📤 Import
                  <input
                    type="file"
                    accept=".json"
                    onChange={importCharacters}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {characters.length > 0 ? characters.map((c) => (
              <div key={c.id} className="group">
                <button
                  onClick={() => handleSelectCharacter(c.id)}
                  className={`w-full flex items-center gap-2 text-left px-2 py-2 rounded-md border transition-colors ${
                    selectedCharacterId === c.id 
                      ? 'bg-primary text-black border-primary' 
                      : 'bg-transparent border-transparent hover:bg-white/10 text-fg'
                  }`}
                  aria-label={`Select character ${c.name}`}
                >
                  <img
                    src={
                      c.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=2a2a2a&color=d4af37`
                    }
                    alt={`${c.name} avatar`}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1 truncate">
                    <div className="font-semibold truncate text-xs">{c.name}</div>
                    <div className="text-xs opacity-70 truncate text-muted">
                      {(c.appearance || '').slice(0, 40)}
                    </div>
                  </div>
                </button>
                
                {/* Export button for individual character */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                  <button
                    onClick={() => exportCharacter(c)}
                    className="w-full btn btn-secondary text-xs py-1"
                    title={`Export ${c.name}`}
                  >
                    📥 Export "{c.name}"
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center text-muted text-sm py-4">
                No saved characters yet.<br/>
                Generate an image first, then save it as a character.
                <div className="mt-2">
                  <label className="btn btn-secondary text-xs px-3 py-1 cursor-pointer">
                    📤 Import Characters
                    <input
                      type="file"
                      accept=".json"
                      onChange={importCharacters}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Character Editor (when creating/editing) */}
        {(isCreatingNew || selectedCharacter) && (
          <section className="card">
            <h3 className="section-header">Character Editor</h3>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-lg border border-border bg-surface overflow-hidden">
                {isGeneratingAvatar ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <LoadingSpinner message="…" />
                  </div>
                ) : (
                  <img
                    src={
                      avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=333&color=fff&size=64`
                    }
                    alt="Character avatar"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <button
                  onClick={generateAvatar}
                  className="btn btn-secondary text-sm w-full"
                  disabled={isGeneratingAvatar || !appearance.trim()}
                  aria-label="Generate avatar from appearance description"
                >
                  Generate Avatar
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-fg">Name</label>
                <input
                  className="input mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Character name"
                  aria-label="Character name"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-fg">Appearance</label>
                <textarea
                  className="textarea mt-1 text-sm"
                  value={appearance}
                  onChange={(e) => setAppearance(e.target.value)}
                  placeholder="Physical description..."
                  aria-label="Character appearance description"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-fg">Personality</label>
                <textarea
                  className="textarea mt-1 text-sm"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder="Personality traits..."
                  aria-label="Character personality"
                  rows={2}
                />
              </div>

              <details>
                <summary className="text-sm font-semibold text-fg cursor-pointer">Advanced Settings</summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="text-xs font-semibold text-fg">Custom Prompt</label>
                    <input
                      className="input mt-1 text-sm"
                      value={signaturePrompt}
                      onChange={(e) => setSignaturePrompt(e.target.value)}
                      placeholder="Custom character description..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-fg">Seed</label>
                    <input
                      className="input mt-1 text-sm"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      placeholder="Consistency seed..."
                    />
                  </div>
                </div>
              </details>
            </div>

            <div className="mt-4 flex gap-2">
              {selectedCharacter && !isCreatingNew && (
                <button 
                  onClick={handleDeleteCharacter} 
                  className="btn btn-danger text-sm flex-1"
                  aria-label={`Delete character ${selectedCharacter.name}`}
                >
                  Delete
                </button>
              )}
              <button 
                onClick={handleSaveCharacter} 
                className="btn btn-primary text-sm flex-1"
                aria-label={isCreatingNew ? 'Create new character' : 'Save character changes'}
              >
                {isCreatingNew ? 'Create' : 'Save'}
              </button>
            </div>
          </section>
        )}
      </aside>
    </div>
  );
};

export default ImageCharacterStudio;