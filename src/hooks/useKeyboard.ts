import { useEffect } from 'react';

interface KeyboardActions {
  togglePlay: () => void;
  toggleReverse: () => void;
  cycleSpeed: () => void;
  seekForward: () => void;
  seekBackward: () => void;
  nextColorMode: () => void;
  toggleEffect: (index: number) => void;
  adjustIntensity: (delta: number) => void;
  toggleAutoCycle: () => void;
  randomize: () => void;
  reset: () => void;
  toggleCrt: () => void;
  toggleFullscreen: () => void;
  toggleInfo: () => void;
  toggleHelp: () => void;
  goBack: () => void;
  cycleCharset: () => void;
  toggleAudio: () => void;
  screenshot: () => void;
  toggleRecord: () => void;
  cyclePhosphor: () => void;
  toggleBurnIn: () => void;
  toggleInterlace: () => void;
  toggleTimestamp: () => void;
  copyText: () => void;
  channelSwitch: () => void;
  toggleScanLine: () => void;
  toggleDatamosh: () => void;
  toggleMarquee: () => void;
  toggleMirror: () => void;
}

export function useKeyboard(actions: KeyboardActions, active: boolean) {
  useEffect(() => {
    if (!active) return;

    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Normalize single-char keys to lowercase for caps lock support
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      switch (key) {
        case ' ':
          e.preventDefault();
          actions.togglePlay();
          break;
        case 'j':
          e.preventDefault();
          actions.toggleReverse();
          break;
        case 's':
          e.preventDefault();
          actions.cycleSpeed();
          break;
        case 'ArrowRight':
          e.preventDefault();
          actions.seekForward();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          actions.seekBackward();
          break;
        case 'e':
          e.preventDefault();
          actions.nextColorMode();
          break;
        case '1': case '2': case '3': case '4': case '5':
        case '6': case '7': case '8': case '9':
          e.preventDefault();
          actions.toggleEffect(parseInt(e.key) - 1);
          break;
        case '+': case '=':
          e.preventDefault();
          actions.adjustIntensity(0.1);
          break;
        case '-': case '_':
          e.preventDefault();
          actions.adjustIntensity(-0.1);
          break;
        case 'a':
          e.preventDefault();
          actions.toggleAutoCycle();
          break;
        case 'r':
          e.preventDefault();
          actions.randomize();
          break;
        case '0':
          e.preventDefault();
          actions.reset();
          break;
        case 'c':
          e.preventDefault();
          actions.toggleCrt();
          break;
        case 'f':
          e.preventDefault();
          actions.toggleFullscreen();
          break;
        case 'x':
          e.preventDefault();
          actions.cycleCharset();
          break;
        case 'm':
          e.preventDefault();
          actions.toggleAudio();
          break;
        case 'p':
          e.preventDefault();
          actions.screenshot();
          break;
        case 'g':
          e.preventDefault();
          actions.toggleRecord();
          break;
        case 'v':
          e.preventDefault();
          actions.cyclePhosphor();
          break;
        case 'b':
          e.preventDefault();
          actions.toggleBurnIn();
          break;
        case 'n':
          e.preventDefault();
          actions.toggleInterlace();
          break;
        case 't':
          e.preventDefault();
          actions.toggleTimestamp();
          break;
        case 'y':
          e.preventDefault();
          actions.copyText();
          break;
        case 'w':
          e.preventDefault();
          actions.channelSwitch();
          break;
        case 'l':
          e.preventDefault();
          actions.toggleScanLine();
          break;
        case 'd':
          e.preventDefault();
          actions.toggleDatamosh();
          break;
        case 'h':
          e.preventDefault();
          actions.toggleMarquee();
          break;
        case 'q':
          e.preventDefault();
          actions.toggleMirror();
          break;
        case 'i':
          e.preventDefault();
          actions.toggleInfo();
          break;
        case '?':
          e.preventDefault();
          actions.toggleHelp();
          break;
        case 'Escape':
          e.preventDefault();
          actions.goBack();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions, active]);
}
