import { useEffect, useRef } from 'react';
import { PlayerState } from '../types/player';
import { api } from '../services/api';

/**
 * Hook to integrate Web Media Session API for Lock Screen Controls,
 * notification widget, Bluetooth media keys, and background keepalive on mobile.
 */
export function useMediaSession(playerState: PlayerState) {
  const playerStateRef = useRef<PlayerState>(playerState);
  playerStateRef.current = playerState;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastTrackIdRef = useRef<string | null>(null);
  const isAudioUnlockedRef = useRef<boolean>(false);

  // Initialize silent audio element for mobile keepalive
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio('/silence.wav');
    audio.loop = true;
    audio.volume = 0.01; // Tiny non-zero volume so mobile engines don't cull the audio pipeline
    audioRef.current = audio;

    // One-time interaction listener to unlock audio autoplay policy on mobile
    const unlockAudio = () => {
      if (!isAudioUnlockedRef.current && audioRef.current) {
        audioRef.current.play().then(() => {
          isAudioUnlockedRef.current = true;
          // If not actively playing right now, pause it
          if (!playerStateRef.current.is_playing || playerStateRef.current.is_paused) {
            audioRef.current?.pause();
          }
        }).catch(() => {
          // Will retry on next interaction
        });
      }
    };

    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  // Register Media Session action handlers once
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const session = navigator.mediaSession;

    const safeSetHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        session.setActionHandler(action, handler);
      } catch (err) {
        // Some actions might not be supported in every browser
      }
    };

    safeSetHandler('play', async () => {
      try {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
        await api.togglePlayPause();
      } catch (e) {
        console.error('MediaSession: play error', e);
      }
    });

    safeSetHandler('pause', async () => {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        await api.togglePlayPause();
      } catch (e) {
        console.error('MediaSession: pause error', e);
      }
    });

    safeSetHandler('previoustrack', async () => {
      try {
        await api.previousTrack();
      } catch (e) {
        console.error('MediaSession: previous error', e);
      }
    });

    safeSetHandler('nexttrack', async () => {
      try {
        await api.nextTrack();
      } catch (e) {
        console.error('MediaSession: next error', e);
      }
    });

    safeSetHandler('seekto', async (details) => {
      if (details.seekTime != null && !isNaN(details.seekTime)) {
        try {
          await api.seek(Math.round(details.seekTime));
        } catch (e) {
          console.error('MediaSession: seek error', e);
        }
      }
    });

    safeSetHandler('seekbackward', async (details) => {
      const offset = details.seekOffset || 10;
      const current = playerStateRef.current.current_time || 0;
      try {
        await api.seek(Math.max(0, Math.round(current - offset)));
      } catch (e) {
        console.error('MediaSession: seekbackward error', e);
      }
    });

    safeSetHandler('seekforward', async (details) => {
      const offset = details.seekOffset || 10;
      const current = playerStateRef.current.current_time || 0;
      const duration = playerStateRef.current.duration || 0;
      try {
        await api.seek(Math.min(duration, Math.round(current + offset)));
      } catch (e) {
        console.error('MediaSession: seekforward error', e);
      }
    });

    safeSetHandler('stop', async () => {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        await api.stop();
      } catch (e) {
        console.error('MediaSession: stop error', e);
      }
    });

    return () => {
      // Clear handlers on unmount
      const actions: MediaSessionAction[] = [
        'play',
        'pause',
        'previoustrack',
        'nexttrack',
        'seekto',
        'seekbackward',
        'seekforward',
        'stop',
      ];
      actions.forEach((a) => safeSetHandler(a, null));
    };
  }, []);

  // Update Media Session Metadata when track changes
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const track = playerState.current_track;
    if (!track || !track.video_id) {
      navigator.mediaSession.metadata = null;
      lastTrackIdRef.current = null;
      return;
    }

    if (lastTrackIdRef.current !== track.video_id) {
      lastTrackIdRef.current = track.video_id;

      const artwork: MediaImage[] = [];
      if (track.thumbnail_url) {
        artwork.push({
          src: track.thumbnail_url,
          sizes: '512x512',
          type: 'image/jpeg',
        });
      }
      artwork.push(
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' }
      );

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || 'RPi Music Box',
        album: 'Raspberry Pi YouTube Music',
        artwork,
      });
    }
  }, [playerState.current_track]);

  // Update Playback State & Silent Audio Keepalive
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const isPlaying = playerState.is_playing && !playerState.is_paused;
    const isPaused = playerState.is_paused;

    if (isPlaying) {
      navigator.mediaSession.playbackState = 'playing';
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    } else if (isPaused) {
      navigator.mediaSession.playbackState = 'paused';
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    } else {
      navigator.mediaSession.playbackState = 'none';
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    }
  }, [playerState.is_playing, playerState.is_paused, playerState.is_idle]);

  // Update Position State (Seek bar on lock screen)
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    if (!('setPositionState' in navigator.mediaSession)) return;

    const duration = playerState.duration || 0;
    const current = playerState.current_time || 0;

    if (duration > 0 && current >= 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(duration, 0.1),
          playbackRate: 1.0,
          position: Math.min(Math.max(current, 0), duration),
        });
      } catch (err) {
        // Silently ignore position sync glitches
      }
    }
  }, [playerState.current_time, playerState.duration]);
}

