import { useRef, useState, useCallback } from 'react';

export interface VideoPlayerState {
  isPlaying: boolean;
  isReversed: boolean;
  playbackSpeed: number;
  currentTime: number;
  duration: number;
  isLoaded: boolean;
  fileName: string;
  error: string | null;
}

export function useVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isReversedRef = useRef(false);
  const isPlayingRef = useRef(false);
  // Store video element in state so consumers re-render when it's created
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [state, setState] = useState<VideoPlayerState>({
    isPlaying: false,
    isReversed: false,
    playbackSpeed: 1.0,
    currentTime: 0,
    duration: 0,
    isLoaded: false,
    fileName: '',
    error: null,
  });

  const blobUrlRef = useRef<string | null>(null);
  // Guard against spurious error events fired during source switching
  const switchingRef = useRef(false);

  const clearImage = useCallback(() => {
    imageRef.current = null;
    setImageElement(null);
  }, []);

  // Revoke any outstanding blob URL to prevent memory leaks
  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  // Clean up all existing sources before switching to a new one
  const resetSource = useCallback(() => {
    switchingRef.current = true;
    clearImage();
    revokeBlobUrl();
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
      video.removeAttribute('src');
      video.loop = true;
      video.muted = true;
      video.playbackRate = 1.0;
      video.removeAttribute('crossorigin');
    }
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(t => t.stop());
      webcamStreamRef.current = null;
    }
  }, [clearImage, revokeBlobUrl]);

  const initVideo = useCallback(() => {
    // Clean up previous source before (re)using the video element
    resetSource();

    if (videoRef.current) return videoRef.current;

    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.preload = 'auto';
    video.loop = true;

    video.addEventListener('play', () => {
      isPlayingRef.current = true;
      setState(s => ({ ...s, isPlaying: true }));
    });

    video.addEventListener('pause', () => {
      // Only update if we're not in reverse mode (reverse pauses native video)
      if (!isReversedRef.current) {
        isPlayingRef.current = false;
        setState(s => ({ ...s, isPlaying: false }));
      }
    });

    video.addEventListener('loadedmetadata', () => {
      setState(s => ({
        ...s,
        duration: video.duration,
        isLoaded: true,
        error: null,
      }));
    });

    // Auto-play once video is ready
    video.addEventListener('canplay', () => {
      if (video.paused && !isReversedRef.current) {
        video.play().catch(() => {});
      }
    });

    video.addEventListener('timeupdate', () => {
      setState(s => ({ ...s, currentTime: video.currentTime }));
    });

    video.addEventListener('error', () => {
      // Ignore errors fired during source switching (e.g. removing src attribute)
      if (switchingRef.current) return;
      // If a MediaStream is actively set, ignore stale src-related errors
      if (video.srcObject) return;

      const mediaError = video.error;
      let msg = 'Failed to load video.';
      if (mediaError) {
        switch (mediaError.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            msg = 'Video loading was aborted.';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            msg = 'Network error — the URL may be blocked by CORS or unreachable.';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            msg = 'Video could not be decoded — unsupported format.';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            msg = 'Video source not supported. YouTube/streaming URLs won\'t work — use a direct .mp4/.webm link or drop a local file.';
            break;
        }
      }
      isPlayingRef.current = false;
      setState(s => ({ ...s, error: msg, isLoaded: false, isPlaying: false }));
    });

    videoRef.current = video;
    setVideoElement(video);
    return video;
  }, [resetSource]);

  const loadFile = useCallback((file: File) => {
    const video = initVideo();
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    video.src = url;
    video.load();
    switchingRef.current = false;
    setState(s => ({ ...s, fileName: file.name, error: null }));
  }, [initVideo]);

  const loadUrl = useCallback((url: string) => {
    // Validate URL scheme to prevent protocol abuse
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setState(s => ({ ...s, error: 'Only HTTP/HTTPS URLs are supported.' }));
        return;
      }
    } catch {
      setState(s => ({ ...s, error: 'Invalid URL.' }));
      return;
    }
    const video = initVideo();
    video.crossOrigin = 'anonymous';
    video.src = url;
    video.load();
    switchingRef.current = false;
    setState(s => ({ ...s, fileName: url.split('/').pop() || 'Video', error: null }));
  }, [initVideo]);

  const loadImage = useCallback((file: File) => {
    resetSource();

    const img = new Image();
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    img.onload = () => {
      imageRef.current = img;
      setImageElement(img);
      isPlayingRef.current = true;
      switchingRef.current = false;
      setState({
        fileName: file.name,
        error: null,
        isLoaded: true,
        isPlaying: true,
        isReversed: false,
        playbackSpeed: 1.0,
        duration: 0,
        currentTime: 0,
      });
    };
    img.onerror = () => {
      switchingRef.current = false;
      setState(s => ({ ...s, error: 'Failed to load image.' }));
    };
    img.src = url;
  }, [resetSource]);

  const togglePlay = useCallback(() => {
    // Image mode: just toggle the playing state (controls effect animation)
    if (imageRef.current) {
      const nowPlaying = !isPlayingRef.current;
      isPlayingRef.current = nowPlaying;
      setState(s => ({ ...s, isPlaying: nowPlaying }));
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (isReversedRef.current) {
      // Reverse mode: toggle our manual playback flag
      const nowPlaying = !isPlayingRef.current;
      isPlayingRef.current = nowPlaying;
      setState(s => ({ ...s, isPlaying: nowPlaying }));
    } else {
      // Normal mode: directly call play/pause on the video element
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
      // State updates come from the play/pause event listeners
    }
  }, []);

  const toggleReverse = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const goingReverse = !isReversedRef.current;
    isReversedRef.current = goingReverse;

    if (goingReverse) {
      // Entering reverse: pause native video, we'll manually step currentTime
      video.pause();
      isPlayingRef.current = true;
      setState(s => ({ ...s, isReversed: true, isPlaying: true }));
    } else {
      // Leaving reverse: resume native playback
      isPlayingRef.current = true;
      setState(s => ({ ...s, isReversed: false, isPlaying: true }));
      video.play().catch(() => {});
    }
  }, []);

  const cycleSpeed = useCallback(() => {
    const video = videoRef.current;
    const speeds = [0.25, 0.5, 1.0, 1.5, 2.0, 3.0];
    setState(s => {
      const currentIdx = speeds.indexOf(s.playbackSpeed);
      const nextIdx = (currentIdx + 1) % speeds.length;
      const newSpeed = speeds[nextIdx];
      if (video) video.playbackRate = newSpeed;
      return { ...s, playbackSpeed: newSpeed };
    });
  }, []);

  const seek = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
    setState(s => ({ ...s, currentTime: video.currentTime }));
  }, []);

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  const webcamStreamRef = useRef<MediaStream | null>(null);

  const loadWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const video = initVideo();
      webcamStreamRef.current = stream;
      // Remove crossOrigin for MediaStream sources (prevents canvas tainting issues)
      video.removeAttribute('crossorigin');
      video.loop = false;

      // Register listener BEFORE setting srcObject to avoid race condition
      const metadataReady = new Promise<void>((resolve) => {
        video.addEventListener('loadedmetadata', () => resolve(), { once: true });
      });

      video.srcObject = stream;
      switchingRef.current = false;
      await metadataReady;

      await video.play();
      isPlayingRef.current = true;
      setState(s => ({ ...s, fileName: 'Webcam', error: null, isPlaying: true, isLoaded: true }));
    } catch {
      switchingRef.current = false;
      setState(s => ({ ...s, error: 'Could not access webcam. Check permissions.' }));
    }
  }, [initVideo]);

  const loadScreen = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      const video = initVideo();
      webcamStreamRef.current = stream;
      // Remove crossOrigin for MediaStream sources
      video.removeAttribute('crossorigin');
      video.loop = false;

      // Allow audio from the captured tab
      video.muted = false;

      // Register listener BEFORE setting srcObject to avoid race condition
      const metadataReady = new Promise<void>((resolve) => {
        video.addEventListener('loadedmetadata', () => resolve(), { once: true });
      });

      video.srcObject = stream;
      switchingRef.current = false;
      await metadataReady;

      await video.play();
      isPlayingRef.current = true;
      setState(s => ({ ...s, fileName: 'Screen Capture', error: null, isPlaying: true, isLoaded: true }));

      // Handle user stopping the share via browser UI
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        isPlayingRef.current = false;
        stream.getTracks().forEach(t => t.stop());
        video.srcObject = null;
        video.muted = true;
        webcamStreamRef.current = null;
        setState(s => ({
          ...s,
          isPlaying: false,
          isLoaded: false,
          fileName: '',
        }));
      });
    } catch {
      // User cancelled the picker — not an error
      switchingRef.current = false;
    }
  }, [initVideo]);

  const unload = useCallback(() => {
    revokeBlobUrl();
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
      video.removeAttribute('src');
      video.loop = true;
      video.muted = true;
      video.playbackRate = 1.0;
    }
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(t => t.stop());
      webcamStreamRef.current = null;
    }
    imageRef.current = null;
    setImageElement(null);
    isReversedRef.current = false;
    isPlayingRef.current = false;
    setState({
      isPlaying: false,
      isReversed: false,
      playbackSpeed: 1.0,
      currentTime: 0,
      duration: 0,
      isLoaded: false,
      fileName: '',
      error: null,
    });
  }, []);

  return {
    videoElement,
    imageElement,
    state,
    loadFile,
    loadUrl,
    loadImage,
    loadWebcam,
    loadScreen,
    togglePlay,
    toggleReverse,
    cycleSpeed,
    seek,
    clearError,
    unload,
  };
}
