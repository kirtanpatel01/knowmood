import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { LogOut, Check, AlertCircle, Loader2 } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUsername: string;
  onUpdateUsername: (newUsername: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

export function SettingsDialog({
  open,
  onOpenChange,
  currentUsername,
  onUpdateUsername,
  onLogout,
}: SettingsDialogProps) {
  const [usernameInput, setUsernameInput] = useState(currentUsername);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim() === currentUsername) return;

    try {
      setIsUpdating(true);
      setMessage(null);
      await onUpdateUsername(usernameInput.trim());
      setMessage({ text: 'Username updated successfully!', isError: false });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update username.', isError: true });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await onLogout();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[92vw] max-w-sm rounded-3xl p-6 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-[var(--border-soft)] shadow-2xl">
        <DialogHeader className="text-left pb-2 border-b border-[var(--border-soft)]">
          <DialogTitle className="font-heading text-lg font-semibold text-[var(--text-main)]">
            Account Settings
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--text-muted)]">
            Manage your username or sign out.
          </DialogDescription>
        </DialogHeader>

        {message && (
          <div
            className={`flex items-center gap-2 p-3 text-xs rounded-2xl border ${
              message.isError
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
            }`}
          >
            {message.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Check className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveUsername} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username" className="text-xs text-[var(--text-muted)] font-medium">
              Username
            </Label>
            <div className="flex gap-2">
              <Input
                id="username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="h-11 rounded-2xl bg-[var(--bg-surface-soft)] border-[var(--border-soft)] text-sm flex-1"
                placeholder="New username"
              />
              <Button
                type="submit"
                disabled={isUpdating || usernameInput.trim() === currentUsername}
                className="h-11 px-4 rounded-2xl bg-[var(--text-main)] text-white text-xs font-medium"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </form>

        <div className="pt-2 border-t border-[var(--border-soft)]">
          <Button
            type="button"
            variant="ghost"
            disabled={isLoggingOut}
            onClick={handleLogout}
            className="w-full h-11 rounded-2xl flex items-center justify-center gap-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium"
          >
            <LogOut className="w-4 h-4" />
            {isLoggingOut ? 'Logging out...' : 'Log Out'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
