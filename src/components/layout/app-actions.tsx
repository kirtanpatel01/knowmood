import { User, Settings } from 'lucide-react';

interface AppActionsProps {
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  hasNotification?: boolean;
}

export function AppActions({
  onOpenProfile,
  onOpenSettings,
  hasNotification = false,
}: AppActionsProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between px-6 pb-safe safe-bottom pointer-events-none">
      {/* Bottom-left: Profile & Bond Management */}
      <div className="pointer-events-auto">
        <button
          onClick={onOpenProfile}
          aria-label="Profile and Connection"
          className="relative flex items-center justify-center w-11 h-11 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-main)] shadow-sm hover:shadow-md active:scale-95 transition-all"
        >
          <User className="w-5 h-5 stroke-[1.8]" />
          {hasNotification && (
            <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-[var(--doll-pink)] ring-2 ring-white dark:ring-zinc-900 animate-pulse" />
          )}
        </button>
      </div>

      {/* Bottom-right: Account Settings */}
      <div className="pointer-events-auto">
        <button
          onClick={onOpenSettings}
          aria-label="Account Settings"
          className="flex items-center justify-center w-11 h-11 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-main)] shadow-sm hover:shadow-md active:scale-95 transition-all"
        >
          <Settings className="w-5 h-5 stroke-[1.8]" />
        </button>
      </div>
    </nav>
  );
}
