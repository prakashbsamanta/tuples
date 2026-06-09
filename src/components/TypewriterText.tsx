import { useEffect, useRef, useState } from 'react';

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Reveals text character-by-character like a futuristic terminal. */
export function TypewriterText({ text, className, speed = 12 }: { text: string; className?: string; speed?: number }) {
  const [count, setCount] = useState(0);
  const idRef = useRef<number | null>(null);

  useEffect(() => {
    if (idRef.current) window.clearInterval(idRef.current);
    if (!text || reduceMotion()) { setCount(text?.length ?? 0); return; }
    setCount(0);
    let i = 0;
    idRef.current = window.setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length && idRef.current) window.clearInterval(idRef.current);
    }, speed);
    return () => { if (idRef.current) window.clearInterval(idRef.current); };
  }, [text, speed]);

  const done = count >= text.length;
  return (
    <span className={className}>
      {text.slice(0, count)}
      {!done && <span className="text-indigo-400 animate-pulse">▋</span>}
    </span>
  );
}
