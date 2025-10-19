/* LEEWAY HEADER
TAG: FRONTEND.SERVICE.TTS
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: audio-lines
ICON_SIG: CD534113
5WH: WHAT=Browser TTS & cadence wrapper; WHY=Consistent spoken output + resilience (keep-alive); WHO=Leeway Core (agnostic); WHERE=services/ttsService.ts; WHEN=2025-10-05; HOW=Web Speech API + adaptive selection
SPDX-License-Identifier: MIT
*/

// services/ttsService.ts
// FIX: The function `cleanTextForSpeech` was renamed to `finalizeSpokenOutput`. Updated the import.
import { finalizeSpokenOutput } from '../src/agentlee.core'; // Use unified core sanitizer
// OPTIONAL new cadence TTS (front-end only) integration
import * as LeeCadence from '../src/voice/leeTTS';

// --- New Audio Recorder Service ---

class AudioRecorderService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private mediaStream: MediaStream | null = null;

    async startRecording(): Promise<void> {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            console.warn('Recording is already in progress.');
            return;
        }

        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(this.mediaStream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.start();
        } catch (error) {
            console.error('Error starting audio recording:', error);
            throw new Error('Could not start microphone. Please check permissions.');
        }
    }

    stopRecording(): Promise<{ blob: Blob, mimeType: string }> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                return reject(new Error('Recording not started or already stopped.'));
            }

            this.mediaRecorder.onstop = () => {
                const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });
                
                this.mediaStream?.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
                this.mediaRecorder = null;

                resolve({ blob: audioBlob, mimeType });
            };

            this.mediaRecorder.stop();
        });
    }

    blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Data = (reader.result as string).split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

export const audioRecorderService = new AudioRecorderService();


// --- Text-to-Speech Service (Optimized) ---

let availableVoices: SpeechSynthesisVoice[] = [];
let selectedVoice: SpeechSynthesisVoice | null = null;
let voicePromise: Promise<SpeechSynthesisVoice[]> | null = null;

// FIX: A common browser bug can cause the SpeechSynthesis engine to go silent
// after a period of inactivity. This "keep-alive" timer sends a silent utterance
// every 14 seconds to prevent the engine from being suspended by the browser.
if (window.speechSynthesis) {
    setInterval(() => {
        if (!window.speechSynthesis.speaking) {
            const keepAlive = new SpeechSynthesisUtterance('');
            keepAlive.volume = 0;
            window.speechSynthesis.speak(keepAlive);
        }
    }, 14000);
}


const updateSelectedVoice = () => {
    if (availableVoices.length === 0) {
        selectedVoice = null;
        return;
    }

    const savedVoiceURI = localStorage.getItem('agent-lee-voice-uri');
    
    // If a voice is already saved by the user, respect that choice.
    if (savedVoiceURI) {
        const saved = availableVoices.find(v => v.voiceURI === savedVoiceURI);
        if (saved) {
            selectedVoice = saved;
            return;
        }
    }
    
    // If no voice is saved, establish a new high-quality default.
    const defaultVoiceOrder = [
        // High quality voice for desktop/Edge
        'Microsoft Christopher Online (Natural) - English (United States)',
        // Prioritize common, explicit male voices for mobile compatibility
        'Google UK English Male',
        'Microsoft George - English (United Kingdom)',
        'Microsoft David - English (United States)',
    ];

    let foundDefault: SpeechSynthesisVoice | undefined;

    for (const name of defaultVoiceOrder) {
        foundDefault = availableVoices.find(v => v.name === name);
        if (foundDefault) break;
    }
    
    // NEW, more robust fallback logic for mobile devices like Samsung
    if (!foundDefault) {
        foundDefault = 
            // 1. Explicitly search for any English male voice first. This is the highest priority fallback.
            availableVoices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')) ||
            // 2. "Google US English" is often a male voice on Android, even if not named as such.
            availableVoices.find(v => v.name === 'Google US English') ||
            // 3. Then, try the browser's default English voice.
            availableVoices.find(v => v.default && v.lang.startsWith('en')) ||
            // 4. Then, any US English voice.
            availableVoices.find(v => v.lang.startsWith('en-US')) ||
            // 5. Finally, the first available English voice of any kind.
            availableVoices.find(v => v.lang.startsWith('en')) ||
            // 6. The absolute last resort.
            availableVoices[0] ||
            undefined;
    }
    
    if (foundDefault) {
        selectedVoice = foundDefault;
        // Save the determined default to localStorage so it persists.
        localStorage.setItem('agent-lee-voice-uri', foundDefault.voiceURI);
    } else {
        selectedVoice = null;
    }
};

/**
 * Initializes the TTS service by loading available voices from the browser.
 * This should be called once when the application starts.
 */
export const initTts = () => {
    if (voicePromise) return; // Guard against multiple initializations

    voicePromise = new Promise((resolve) => {
        const getAndSetVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                availableVoices = voices;
                updateSelectedVoice();
                resolve(voices);
                window.speechSynthesis.onvoiceschanged = null; // Clean up listener
                return true;
            }
            return false;
        };

        if (!getAndSetVoices()) {
            window.speechSynthesis.onvoiceschanged = getAndSetVoices;
        }
    });
};

/**
 * Returns a promise that resolves with the list of available voices.
 * Used by UI components like the Settings page.
 */
export const getAvailableVoices = (): Promise<SpeechSynthesisVoice[]> => {
    if (!voicePromise) {
        // Fallback if initTts wasn't called at startup.
        initTts();
    }
    return voicePromise!;
};

/**
 * Re-evaluates the selected voice based on the value in localStorage.
 * Called from the Settings component after the user makes a change.
 */
export const refreshSelectedVoice = () => {
    updateSelectedVoice();
};

/**
 * Speaks the given text using the selected voice.
 * This is a non-blocking operation. It will use the browser's default voice
 * if the preferred voices have not been loaded yet.
 */
export const speak = async (
    text: string,
    onBoundary: (spokenText: string) => void,
    onEnd: () => void
): Promise<void> => {
    const useCadence = localStorage.getItem('agent-lee-tts-mode') === 'cadence';
    if (useCadence) {
        // Use new LeeCadence path (single pass, internal chunking & variation)
        try {
            const cleaned = finalizeSpokenOutput(text);
            if (!cleaned) { onEnd(); return; }
            await LeeCadence.ensureReady();
            // Map legacy configuration keys if present
            const rate = parseFloat(localStorage.getItem('agent-lee-voice-rate') || '1.08');
            const pitch = parseFloat(localStorage.getItem('agent-lee-voice-pitch') || '0.95');
            const pause = parseInt(localStorage.getItem('agent-lee-cadence-pause') || '160');
            LeeCadence.setConfig({ baseRate: rate, basePitch: pitch, pauseMs: pause });
            await LeeCadence.say(cleaned);
        } catch (e) {
            console.warn('Cadence TTS failed, falling back to legacy TTS', e);
            // proceed to legacy path below
        }
        onEnd();
        return;
    }
    if (!window.speechSynthesis) {
        console.error("Speech Synthesis not supported.");
        onEnd();
        return;
    }
    
    try {
        await getAvailableVoices(); // Ensure voices are ready
    } catch (err) {
        console.error("Failed to load voices for TTS:", err);
        onEnd(); // Can't speak without voices
        return;
    }
    
    const cleanedText = finalizeSpokenOutput(text);
    if (!cleanedText) {
        onEnd();
        return;
    }

    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    // FIX: Implemented a more robust text chunking strategy. The text is first split
    // into sentences, and then any sentence longer than 180 characters is further
    // broken down. This prevents errors in browsers that have a character limit
    // for a single SpeechSynthesisUtterance.
    const MAX_CHUNK_LENGTH = 180;
    const sentences = cleanedText.match(/[^.?!]+[.?!]+(\s|$)/g) || [cleanedText];
    const chunks: string[] = [];

    sentences.forEach(sentence => {
        let currentSentence = sentence.trim();
        if (!currentSentence) return;

        if (currentSentence.length <= MAX_CHUNK_LENGTH) {
            chunks.push(currentSentence);
        } else {
            // Sentence is too long, split it.
            while (currentSentence.length > 0) {
                if (currentSentence.length <= MAX_CHUNK_LENGTH) {
                    chunks.push(currentSentence);
                    break;
                }
                // Find the last space within the max length
                let splitPos = currentSentence.lastIndexOf(' ', MAX_CHUNK_LENGTH);
                // If no space is found, hard-cut it to prevent an infinite loop
                if (splitPos <= 0) {
                    splitPos = MAX_CHUNK_LENGTH;
                }
                // Add the chunk and update the remaining part of the sentence
                chunks.push(currentSentence.substring(0, splitPos));
                currentSentence = currentSentence.substring(splitPos).trim();
            }
        }
    });

    if (chunks.length === 0 && cleanedText.trim()) {
        chunks.push(cleanedText.trim());
    }
    
    let currentChunkIndex = 0;
    
    const baseRate = parseFloat(localStorage.getItem('agent-lee-voice-rate') || '1.0');
    const basePitch = parseFloat(localStorage.getItem('agent-lee-voice-pitch') || '1.3');
    const baseVolume = parseFloat(localStorage.getItem('agent-lee-voice-volume') || '0.8');
    const naturalness = parseFloat(localStorage.getItem('agent-lee-voice-naturalness') || '0.5');


    const speakNextChunk = () => {
        if (currentChunkIndex >= chunks.length) {
            onEnd(); // All chunks have been spoken
            return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[currentChunkIndex].trim());
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        utterance.volume = baseVolume;
        
        // Apply naturalness variations if enabled
        if (naturalness > 0) {
            // Vary rate by up to 10% of the naturalness setting
            const rateVariance = (Math.random() - 0.5) * 0.2 * naturalness; 
            utterance.rate = Math.max(0.5, Math.min(2, baseRate + rateVariance));
            
            // Vary pitch by up to 20% of the naturalness setting
            const pitchVariance = (Math.random() - 0.5) * 0.4 * naturalness;
            utterance.pitch = Math.max(0, Math.min(2, basePitch + pitchVariance));
        } else {
            utterance.rate = baseRate;
            utterance.pitch = basePitch;
        }

        // When this chunk ends, speak the next one.
        utterance.onend = () => {
            currentChunkIndex++;
            speakNextChunk();
        };

        // FIX: Added more detailed logging to the onerror handler and check for 'canceled'
        // error to make debugging future TTS issues easier.
        utterance.onerror = (event) => {
            if (event.error === 'interrupted' || event.error === 'canceled') {
                // These are normal, e.g., when the user clicks cancel.
                onEnd();
                return;
            }
            
            // FIX: Log the error property directly to avoid '[object Object]' output
            // and provide the full event object for detailed inspection.
            console.error(`SpeechSynthesisUtterance.onerror: ${event.error}`, event);
            
            onEnd(); // Stop speaking on error to prevent further issues.
        };
        
        window.speechSynthesis.speak(utterance);
    };

    speakNextChunk(); // Start the process
};


export const cancel = () => {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
};

/**
 * Speaks a test phrase with a specific voice URI, rate, pitch, and volume.
 */
export const testVoice = async (text: string, voiceURI: string, rate: number, pitch: number, volume: number, naturalness: number) => {
    const voices = await getAvailableVoices();
    const voice = voices.find(v => v.voiceURI === voiceURI);
    if (!voice) {
        console.error("Test voice not found");
        return;
    }

    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    
    // Use multiple sentences to better demonstrate the naturalness feature
    const testSentences = [
        "This is the selected voice for Agent Lee.",
        "With naturalness enabled, my pitch and rate will vary slightly.",
        "This creates a more dynamic and engaging delivery."
    ];

    let sentenceIndex = 0;
    
    const speakNextTestSentence = () => {
        if (sentenceIndex >= testSentences.length) return;

        const utterance = new SpeechSynthesisUtterance(testSentences[sentenceIndex]);
        utterance.voice = voice;
        utterance.volume = volume;

        // Apply same randomization logic as the main speak function for a consistent demo
        if (naturalness > 0) {
            const rateVariance = (Math.random() - 0.5) * 0.2 * naturalness;
            utterance.rate = Math.max(0.5, Math.min(2, rate + rateVariance));
            const pitchVariance = (Math.random() - 0.5) * 0.4 * naturalness;
            utterance.pitch = Math.max(0, Math.min(2, pitch + pitchVariance));
        } else {
            utterance.rate = rate;
            utterance.pitch = pitch;
        }

        utterance.onend = () => {
            sentenceIndex++;
            speakNextTestSentence();
        };
        
        utterance.onerror = (e) => {
             // FIX: Log the error property directly to avoid '[object Object]' output.
             console.error(`TTS Test Error: ${e.error}`, e);
        }

        window.speechSynthesis.speak(utterance);
    };

    speakNextTestSentence();
};