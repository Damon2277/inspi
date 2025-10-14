/**
 * 音频仪式管理器 - 管理仪式感相关的音频体验
 */

import { RitualType, RitualIntensity } from '../types';

// 环境音轨会话
export interface AmbientSession {
  id: string;
  volume: number;
  loop: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

// 心情枚举
export enum Mood {
  CALM = 'calm',
  ENERGETIC = 'energetic',
  MYSTICAL = 'mystical',
  CELEBRATORY = 'celebratory'
}

interface SoundVariantPaths {
  base: string;
  soft?: string;
  intense?: string;
}

const SOUND_VARIANTS: Record<string, SoundVariantPaths> = {
  'welcome-chime': {
    base: '/assets/sounds/welcome-chime.mp3',
    soft: '/assets/sounds/welcome-chime-soft.mp3',
    intense: '/assets/sounds/welcome-chime-intense.mp3'
  },
  'success-fanfare': {
    base: '/assets/sounds/success-fanfare.mp3',
    soft: '/assets/sounds/success-fanfare-soft.mp3',
    intense: '/assets/sounds/success-fanfare-intense.mp3'
  },
  'achievement-bell': {
    base: '/assets/sounds/achievement-bell.mp3',
    soft: '/assets/sounds/achievement-bell-soft.mp3'
  },
  'creation-spark': {
    base: '/assets/sounds/creation-spark.mp3',
    intense: '/assets/sounds/creation-spark-intense.mp3'
  },
  'sharing-notify': {
    base: '/assets/sounds/sharing-notify.mp3'
  },
  'milestone-triumph': {
    base: '/assets/sounds/milestone-triumph.mp3',
    intense: '/assets/sounds/milestone-triumph-intense.mp3'
  },
  'transition-whoosh': {
    base: '/assets/sounds/transition-whoosh.mp3',
    soft: '/assets/sounds/transition-whoosh-soft.mp3'
  }
};

const AMBIENT_TRACKS: Record<Mood, string> = {
  [Mood.CALM]: '/assets/ambient/calm.mp3',
  [Mood.ENERGETIC]: '/assets/ambient/energetic.mp3',
  [Mood.MYSTICAL]: '/assets/ambient/mystical.mp3',
  [Mood.CELEBRATORY]: '/assets/ambient/celebratory.mp3'
};

export class AudioRitualManager {
  private audioContext: AudioContext | null = null;
  private soundEffects: Map<string, HTMLAudioElement> = new Map();
  private ambientTracks: Map<string, HTMLAudioElement> = new Map();
  private currentAmbient: HTMLAudioElement | null = null;
  private masterVolume = 0.8;
  private effectsVolume = 0.7;
  private ambientVolume = 0.5;
  private readonly audioSupported: boolean;
  private missingSoundWarnings: Set<string> = new Set();

  constructor() {
    this.audioSupported = typeof window !== 'undefined' && typeof Audio !== 'undefined';

    if (this.audioSupported) {
      this.initializeAudioSystem();
      this.loadDefaultSounds();
    }
  }

  private maybeUnref(handle: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>): void {
    if (typeof handle === 'object' && handle !== null && 'unref' in handle && typeof (handle as NodeJS.Timeout).unref === 'function') {
      (handle as NodeJS.Timeout).unref();
    }
  }

  private initializeAudioSystem(): void {
    if (!this.audioSupported) {
      return;
    }

    // 初始化Web Audio API
    type AudioContextConstructor = typeof globalThis.AudioContext;
    const extendedWindow = window as Window & {
      AudioContext?: AudioContextConstructor;
      webkitAudioContext?: AudioContextConstructor;
    };
    const AudioContextCtor = extendedWindow.AudioContext ?? extendedWindow.webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    try {
      this.audioContext = new AudioContextCtor();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  private loadDefaultSounds(): void {
    if (!this.audioSupported) {
      return;
    }

    Object.entries(SOUND_VARIANTS).forEach(([id, variants]) => {
      this.preloadSoundVariant(id, variants.base);

      if (variants.soft) {
        this.preloadSoundVariant(`${id}-soft`, variants.soft);
      }

      if (variants.intense) {
        this.preloadSoundVariant(`${id}-intense`, variants.intense);
      }
    });
  }

  private preloadSoundVariant(id: string, url: string): void {
    try {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.soundEffects.set(id, audio);
    } catch (error) {
      if (!this.missingSoundWarnings.has(id)) {
        console.warn(`Failed to preload sound '${id}' from ${url}:`, error);
        this.missingSoundWarnings.add(id);
      }
    }
  }

  playRitualSound(type: RitualType, intensity: RitualIntensity): void {
    if (!this.audioSupported) {
      return;
    }

    const soundId = this.resolveSoundEffectId(type, intensity);
    const audio = this.soundEffects.get(soundId);
    
    if (audio) {
      audio.volume = this.calculateVolume(this.effectsVolume, intensity);
      audio.currentTime = 0;
      audio.play().catch(error => {
        console.warn('Failed to play ritual sound:', error);
      });
    } else if (!this.missingSoundWarnings.has(soundId)) {
      console.warn(`Sound effect '${soundId}' is not preloaded.`);
      this.missingSoundWarnings.add(soundId);
    }
  }

  createAmbientAtmosphere(mood: Mood): AmbientSession {
    if (!this.audioSupported) {
      return {
        id: `ambient-${mood}`,
        volume: 0,
        loop: false
      };
    }

    const ambientId = `ambient-${mood}`;
    let ambient = this.ambientTracks.get(ambientId);
    
    if (!ambient) {
      const ambientPath = AMBIENT_TRACKS[mood] ?? `/assets/ambient/${mood}.mp3`;
      ambient = new Audio(ambientPath);
      ambient.loop = true;
      ambient.preload = 'auto';
      this.ambientTracks.set(ambientId, ambient);
    }

    // 停止当前环境音乐
    if (this.currentAmbient && this.currentAmbient !== ambient) {
      this.fadeOut(this.currentAmbient, 1000);
    }

    // 播放新的环境音乐
    ambient.volume = 0;
    ambient.play().catch(error => {
      console.warn('Failed to play ambient sound:', error);
    });
    
    this.fadeIn(ambient, this.ambientVolume * this.masterVolume, 2000);
    this.currentAmbient = ambient;

    return {
      id: ambientId,
      volume: this.ambientVolume,
      loop: true,
      fadeIn: 2000
    };
  }

  adjustVolumeForRitual(baseVolume: number, intensity: RitualIntensity): number {
    return this.calculateVolume(baseVolume, intensity);
  }

  private getSoundIdForRitual(type: RitualType): string {
    const soundMap: Record<RitualType, string> = {
      [RitualType.WELCOME]: 'welcome-chime',
      [RitualType.ACHIEVEMENT]: 'success-fanfare',
      [RitualType.CREATION]: 'creation-spark',
      [RitualType.SHARING]: 'sharing-notify',
      [RitualType.MILESTONE]: 'milestone-triumph',
      [RitualType.TRANSITION]: 'transition-whoosh'
    };

    return soundMap[type] || 'welcome-chime';
  }

  private resolveSoundEffectId(type: RitualType, intensity: RitualIntensity): string {
    const baseId = this.getSoundIdForRitual(type);
    const intenseId = `${baseId}-intense`;
    const softId = `${baseId}-soft`;

    if (intensity >= RitualIntensity.DRAMATIC && this.soundEffects.has(intenseId)) {
      return intenseId;
    }

    if (intensity <= RitualIntensity.SUBTLE && this.soundEffects.has(softId)) {
      return softId;
    }

    if (this.soundEffects.has(baseId)) {
      return baseId;
    }

    return 'welcome-chime';
  }

  private calculateVolume(baseVolume: number, intensity: RitualIntensity): number {
    const intensityMultiplier = {
      [RitualIntensity.SUBTLE]: 0.7,
      [RitualIntensity.MODERATE]: 1.0,
      [RitualIntensity.DRAMATIC]: 1.2,
      [RitualIntensity.EPIC]: 1.4
    };

    return Math.min(baseVolume * intensityMultiplier[intensity] * this.masterVolume, 1.0);
  }

  private fadeIn(audio: HTMLAudioElement, targetVolume: number, duration: number): void {
    if (!this.audioSupported) {
      return;
    }

    const steps = 50;
    const stepDuration = duration / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      audio.volume = Math.min(volumeStep * currentStep, targetVolume);
      
      if (currentStep >= steps) {
        clearInterval(fadeInterval);
      }
    }, stepDuration);

    this.maybeUnref(fadeInterval);
  }

  private fadeOut(audio: HTMLAudioElement, duration: number): void {
    if (!this.audioSupported) {
      return;
    }

    const initialVolume = audio.volume;
    const steps = 50;
    const stepDuration = duration / steps;
    const volumeStep = initialVolume / steps;
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      audio.volume = Math.max(initialVolume - (volumeStep * currentStep), 0);
      
      if (currentStep >= steps) {
        clearInterval(fadeInterval);
        audio.pause();
        audio.currentTime = 0;
      }
    }, stepDuration);

    this.maybeUnref(fadeInterval);
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  setEffectsVolume(volume: number): void {
    this.effectsVolume = Math.max(0, Math.min(1, volume));
  }

  setAmbientVolume(volume: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, volume));
    if (this.audioSupported && this.currentAmbient) {
      this.currentAmbient.volume = this.ambientVolume * this.masterVolume;
    }
  }

  stopAllSounds(): void {
    if (!this.audioSupported) {
      return;
    }

    this.soundEffects.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    if (this.currentAmbient) {
      this.currentAmbient.pause();
      this.currentAmbient.currentTime = 0;
      this.currentAmbient = null;
    }
  }

  destroy(): void {
    this.stopAllSounds();
    this.soundEffects.clear();
    this.ambientTracks.clear();
    
    if (this.audioSupported && this.audioContext) {
      if (typeof this.audioContext.close === 'function') {
        void this.audioContext.close();
      }
    }
  }
}
