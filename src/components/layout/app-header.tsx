import { MoodDoll } from '../doll/mood-doll';

interface AppHeaderProps {
  currentMood: 'happy' | 'unhappy';
  onOpenMoodDialog: () => void;
}

export function AppHeader({ currentMood, onOpenMoodDialog }: AppHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-safe safe-top pointer-events-none">
      {/* Top-left: Minimal Wordmark */}
      <div className="pointer-events-auto">
        <span className="font-heading font-semibold text-lg sm:text-xl tracking-tight text-[var(--text-main)] select-none opacity-90 hover:opacity-100 transition-opacity">
          knowmood
        </span>
      </div>

      {/* Top-right: Mini Mood Doll Indicator */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={onOpenMoodDialog}
          aria-label="Change your mood"
          className="group relative flex items-center justify-center p-1 rounded-full bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md border border-[var(--border-soft)] shadow-sm hover:shadow-md active:scale-95 transition-all duration-200"
        >
          <MoodDoll mood={currentMood} size="sm" interactive={false} />
          {/* Subtle mood tooltip pill */}
          <span className="absolute -bottom-7 right-0 text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-white/90 dark:bg-zinc-800/90 text-[var(--text-muted)] border border-[var(--border-soft)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {currentMood === 'happy' ? 'Happy' : 'Unhappy'}
          </span>
        </button>
      </div>
    </header>
  );
}
