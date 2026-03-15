// Year-divider panel that renders between frames — styled as a cinema film leader

interface FilmLeaderProps {
  year: string;
}

export default function FilmLeader({ year }: FilmLeaderProps) {
  return (
    <div className="relative flex-none flex flex-col" style={{ width: 180 }}>
      {/* Top sprocket strip */}
      <div className="sprocket-strip w-full" style={{ height: 32 }} />

      {/* Leader body */}
      <div
        className="flex flex-col items-center justify-center gap-5 flex-1"
        style={{
          background: 'linear-gradient(160deg, #100d08, #0d0b08)',
          borderLeft:  '7px solid #1c1610',
          borderRight: '7px solid #1c1610',
          aspectRatio: '3 / 4',
        }}
      >
        {/* Academy-leader style crosshair circle */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width:  72,
            height: 72,
            borderRadius: '50%',
            border: '1.5px solid rgba(201,150,74,0.35)',
          }}
        >
          {/* Horizontal hairline */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 1,
              background: 'rgba(201,150,74,0.25)',
              transform: 'translateY(-50%)',
            }}
          />
          {/* Vertical hairline */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: 1,
              background: 'rgba(201,150,74,0.25)',
              transform: 'translateX(-50%)',
            }}
          />
          {/* Centre dot */}
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'rgba(201,150,74,0.55)',
            }}
          />
        </div>

        {/* Year */}
        <span
          className="font-serif"
          style={{
            fontSize: 48,
            letterSpacing: '0.08em',
            color: 'rgba(201,150,74,0.8)',
            lineHeight: 1,
          }}
        >
          {year}
        </span>

        {/* Subtitle label */}
        <span
          className="font-mono uppercase tracking-[0.35em]"
          style={{ fontSize: 8, color: 'rgba(201,150,74,0.3)' }}
        >
          New Chapter
        </span>
      </div>

      {/* Bottom sprocket strip */}
      <div className="sprocket-strip w-full" style={{ height: 32 }} />
    </div>
  );
}
