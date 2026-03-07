import Image from 'next/image';
import type { Memory } from '@/types';

interface Props {
  memory: Memory;
  onClick: () => void;
}

export default function MemoryThumbnail({ memory, onClick }: Props) {
  const day = new Date(memory.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <button
      onClick={onClick}
      className="group relative aspect-square rounded-xl overflow-hidden bg-cream-dark text-left w-full"
    >
      {memory.media_url ? (
        <Image
          src={memory.media_url}
          alt={memory.caption}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, 33vw"
        />
      ) : (
        <div className="w-full h-full bg-rose-blush/40" />
      )}

      {/* Bottom gradient overlay with caption */}
      <div
        className="absolute inset-x-0 bottom-0 px-2 pb-2 pt-8"
        style={{ background: 'linear-gradient(to top, rgba(45,28,28,0.65), transparent)' }}
      >
        {memory.dot_emoji && (
          <span className="text-base leading-none">{memory.dot_emoji}</span>
        )}
        <p className="font-serif text-[11px] text-white line-clamp-2 leading-snug mt-0.5">
          {memory.caption}
        </p>
        <p className="font-sans text-[9px] text-white/70 mt-0.5">{day}</p>
      </div>
    </button>
  );
}
