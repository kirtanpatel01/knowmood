import { useState } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { authClient } from '#/lib/auth-client';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { MoodDoll } from '#/components/doll/mood-doll';
import { AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export const Route = createFileRoute('/signup')({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 24) {
      setError('Username must be between 3 and 24 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      setError('Username can only contain letters, numbers, underscores, and dashes.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await authClient.signUp.email({
        email: `${cleanUsername.toLowerCase()}@knowmood.local`,
        username: cleanUsername,
        password,
        name: cleanUsername,
      });

      if (res.error) {
        setError(res.error.message || 'Signup failed.');
        return;
      }

      navigate({ to: '/' });
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center p-6 bg-[var(--background)]">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Soft Branding & Mini Doll */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 mb-1">
            <MoodDoll mood="happy" size="sm" interactive={true} className="w-24 h-24" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--text-main)]">
            knowmood
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Create an account to get your mood doll.
          </p>
        </div>

        {/* Signup Form Box */}
        <div className="w-full p-6 rounded-3xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-[var(--border-soft)] shadow-xl">
          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 text-xs rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username" className="text-xs text-[var(--text-muted)] font-medium">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="choose a username"
                className="h-11 rounded-2xl bg-[var(--bg-surface-soft)] border-[var(--border-soft)] text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs text-[var(--text-muted)] font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="at least 6 characters"
                className="h-11 rounded-2xl bg-[var(--bg-surface-soft)] border-[var(--border-soft)] text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-xs text-[var(--text-muted)] font-medium"
              >
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="repeat your password"
                className="h-11 rounded-2xl bg-[var(--bg-surface-soft)] border-[var(--border-soft)] text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 mt-2 rounded-2xl bg-[var(--doll-pink)] hover:bg-[var(--doll-pink-hover)] text-white font-medium shadow-md plush-press flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-xs text-[var(--text-muted)]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-[var(--doll-pink)] hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
