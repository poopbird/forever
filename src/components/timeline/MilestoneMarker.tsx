interface MilestoneMarkerProps {
  label: string;
}

export default function MilestoneMarker({ label }: MilestoneMarkerProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Gold dot */}
      <div className="w-5 h-5 rounded-full bg-gold-warm border-[3px] border-cream shadow-md" />
      {/* Label pill */}
      <span
        className="bg-rose-deep text-white font-sans text-[9px] font-bold
                   tracking-wider uppercase px-2 py-0.5 rounded-full
                   whitespace-nowrap shadow-sm"
      >
        {label}
      </span>
    </div>
  );
}
