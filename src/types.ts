
export interface SavedAudio {
  id: string;
  text: string;
  voiceName: string;
  lang: string;
  pitch: number;
  rate: number;
  timestamp: number;
}

export interface ClonedVoice {
  id: string;
  name: string;
  lang: string;
  gender: 'male' | 'female' | 'non-binary';
  age: 'child' | 'teen' | 'young-adult' | 'adult' | 'senior';
  sampleUrl?: string;
  isCloned: boolean;
}

export interface VoiceConfig {
  id: string; // Original voice name act as ID for native/cloud
  customName?: string;
  isDisabled: boolean;
  isHidden: boolean;
}

export type VoiceCategory = 'all' | 'cloned' | 'standard';
export type AgeFilter = 'all' | 'child' | 'teen' | 'young-adult' | 'adult' | 'senior';
export type GenderFilter = 'all' | 'male' | 'female' | 'non-binary';
