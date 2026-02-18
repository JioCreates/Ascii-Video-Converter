import { useState, useEffect, useRef } from 'react';

interface BootSequenceProps {
  onComplete: () => void;
}

const BOOT_LINES = [
  { text: 'BIOS v1.2 (c) 1983 MicroTech Systems Inc.', delay: 0 },
  { text: '', delay: 150 },
  { text: 'MEMORY CHECK.......... 640K OK', delay: 300 },
  { text: '', delay: 600 },
  { text: 'LOADING ASCII-PLAYER v1.0', delay: 800 },
  { text: '', delay: 900 },
  { text: '> INIT VIDEO SUBSYSTEM........ OK', delay: 1100 },
  { text: '> INIT ASCII RENDERER........ OK', delay: 1400 },
  { text: '> INIT EFFECT CHAIN.......... OK', delay: 1700 },
  { text: '> INIT AUDIO SUBSYSTEM....... OK', delay: 2000 },
  { text: '> INIT WEBCAM DRIVER......... OK', delay: 2300 },
  { text: '', delay: 2500 },
  { text: 'ALL SYSTEMS NOMINAL.', delay: 2700 },
  { text: '', delay: 2900 },
  { text: 'READY.', delay: 3100 },
];

const TOTAL_DURATION = 3800;

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [cursorVisible, setCursorVisible] = useState(true);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Schedule each line to appear
    for (const line of BOOT_LINES) {
      const timer = setTimeout(() => {
        setVisibleLines(prev => [...prev, line.text]);
      }, line.delay);
      timerRefs.current.push(timer);
    }

    // Complete after all lines shown
    const completeTimer = setTimeout(onComplete, TOTAL_DURATION);
    timerRefs.current.push(completeTimer);

    // Cursor blink
    const cursorTimer = setInterval(() => {
      setCursorVisible(v => !v);
    }, 500);

    return () => {
      timerRefs.current.forEach(clearTimeout);
      clearInterval(cursorTimer);
    };
  }, [onComplete]);

  return (
    <div className="boot-sequence">
      {visibleLines.map((line, i) => (
        <div key={i} className="boot-line">
          {line}
        </div>
      ))}
      <span className={`boot-cursor ${cursorVisible ? '' : 'hidden'}`}>
        &#9608;
      </span>
    </div>
  );
}
