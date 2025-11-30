
export enum AppState {
  ANALYSIS = 'ANALYSIS',
  LIBRARY = 'LIBRARY',
  MENU = 'MENU',
  GAMEPLAY = 'GAMEPLAY'
}

export type ArtStyle = 'anime' | 'pixel' | 'realistic';

export interface CharacterConfig {
  id: string; 
  name: string;
  imagePrompt: string; 
  imageUrl?: string; 
  expression: string;
  position: 'left' | 'center' | 'right';
}

export interface Choice {
  text: string;
  nextSceneId: string;
  requiredStat?: {
    stat: 'romance' | 'mystery' | 'courage';
    value: number;
  };
}

export interface AudioConfig {
  bgmTheme: {
    mood: 'happy' | 'sad' | 'suspense' | 'action' | 'mystery' | 'romantic';
    tempo: 'fast' | 'slow' | 'medium';
    waveType: 'sine' | 'square' | 'sawtooth' | 'triangle';
  };
  sfxTrigger?: 'door_slam' | 'heartbeat' | 'shock' | 'sparkle' | 'phone_ring' | 'typing' | 'none';
}

export interface Scene {
  id: string;
  type: 'story' | 'ending';
  backgroundPrompt: string;
  backgroundImageUrl?: string;
  characters: CharacterConfig[];
  speakerName: string;
  dialogueText: string;
  choices: Choice[];
  audioConfig?: AudioConfig; 
}

export interface Chapter {
  id: string;
  title: string;
  scenes: Scene[];
}

export interface CharacterRegistry {
  [characterName: string]: string; 
}

export interface VisualNovelData {
  id: string;
  createdAt: number;
  title: string;
  genre: string;
  summary: string; 
  roadmap: string; // The Master Script / Guide for the AI
  artStyle: ArtStyle; // Visual style preference
  chapters: Chapter[];
  currentChapterIndex: number;
  characterRegistry: CharacterRegistry;
}

export interface SavedProject {
  id: string;
  title: string;
  genre: string;
  createdAt: number;
  data: VisualNovelData;
}

export interface PlayerStats {
  romance: number;
  mystery: number;
  courage: number;
}
