/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: CharacterContext.tsx; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\contexts\CharacterContext.tsx; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

/* LEEWAY HEADER — DO NOT REMOVE
REGION: CONTEXT.CHARACTER
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=users ICON_SIG=CD534113
5WH: WHAT=Character context for persistent character management; WHY=Store AI personas across sessions; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\contexts\CharacterContext.tsx; WHEN=2025-10-05; HOW=React Context API
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

import React, { createContext, ReactNode, useEffect, useState } from 'react';
import type { Character } from '../types';

interface CharacterContextType {
    characters: Character[];
    addCharacter: (character: Omit<Character, 'id' | 'createdAt'>) => Character;
    updateCharacter: (updatedCharacter: Character) => void;
    deleteCharacter: (id: number) => void;
}

export const CharacterContext = createContext<CharacterContextType>({
    characters: [],
    addCharacter: () => ({} as Character),
    updateCharacter: () => {},
    deleteCharacter: () => {},
});

export const CharacterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [characters, setCharacters] = useState<Character[]>(() => {
        try {
            const localData = localStorage.getItem('agent-lee-characters');
            return localData ? JSON.parse(localData) : [];
        } catch (error) {
            console.error("Could not parse characters from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('agent-lee-characters', JSON.stringify(characters));
        } catch (error) {
            console.error("Could not save characters to localStorage", error);
        }
    }, [characters]);

    const addCharacter = (characterData: Omit<Character, 'id' | 'createdAt'>): Character => {
        const newCharacter: Character = {
            ...characterData,
            id: Date.now(),
            createdAt: new Date().toISOString(),
        };
        setCharacters(prev => [newCharacter, ...prev]);
        return newCharacter;
    };

    const updateCharacter = (updatedCharacter: Character) => {
        setCharacters(prev => prev.map(c => (c.id === updatedCharacter.id ? updatedCharacter : c)));
    };

    const deleteCharacter = (id: number) => {
        if (window.confirm('Are you sure you want to delete this character profile? This action is permanent.')) {
            setCharacters(prev => prev.filter(c => c.id !== id));
        }
    };

    return (
        <CharacterContext.Provider value={{ characters, addCharacter, updateCharacter, deleteCharacter }}>
            {children}
        </CharacterContext.Provider>
    );
};
