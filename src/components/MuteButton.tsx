import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export function MuteButton() {
  const [muted, setMuted] = useState(() => localStorage.getItem('tuples_muted') === '1');

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    import('../lib/juice').then((j) => j.setMuted(next));
  };

  return (
    <button
      onClick={toggle}
      title={muted ? 'Unmute sound' : 'Mute sound'}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-200
        bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 rounded-lg transition-all"
    >
      {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
    </button>
  );
}
