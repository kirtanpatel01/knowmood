import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog';
import { Button } from '#/components/ui/button';
import { MoodDoll } from '../doll/mood-doll';
import { RefreshCw, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface MoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMood: 'happy' | 'unhappy';
  onSaveMood: (newMood: 'happy' | 'unhappy') => Promise<void>;
}

export function MoodDialog({
  open,
  onOpenChange,
  currentMood,
  onSaveMood,
}: MoodDialogProps) {
  const [selectedMood, setSelectedMood] = useState<'happy' | 'unhappy'>(currentMood);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when opened
  useEffect(() => {
    if (open) {
      setSelectedMood(currentMood);
    }
  }, [open, currentMood]);

  const handleFlip = () => {
    setSelectedMood((prev) => (prev === 'happy' ? 'unhappy' : 'happy'));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSaveMood(selectedMood);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save mood:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const isChanged = selectedMood !== currentMood;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[92vw] max-w-sm rounded-3xl p-6 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-[var(--border-soft)] shadow-2xl flex flex-col items-center">
        <DialogHeader className="w-full text-center items-center">
          <DialogTitle className="font-heading text-lg font-semibold text-[var(--text-main)]">
            How are you feeling?
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--text-muted)]">
            Drag or use the buttons to rotate. Flip to change your mood.
          </DialogDescription>
        </DialogHeader>

        {/* 3D Doll Viewing Area */}
        <div className="relative w-full flex flex-col items-center justify-center my-1 overflow-visible">
          <MoodDoll
            mood={selectedMood}
            size="md"
            interactive={true}
            showRotateButtons={true}
          />

          {/* Current Selection Label */}
          <motion.div
            key={selectedMood}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="mt-2 px-3 py-1 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-[var(--border-soft)] text-xs font-medium text-[var(--text-main)] shadow-sm"
          >
            {selectedMood === 'happy' ? '🌸 Happy' : '🌧️ Unhappy'}
          </motion.div>
        </div>

        {/* Action Controls */}
        <div className="w-full flex flex-col gap-2.5 mt-3">
          {/* Flip Toggle Button */}
          <motion.div whileTap={{ scale: 0.96 }}>
            <Button
              type="button"
              variant="outline"
              onClick={handleFlip}
              className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 border-[var(--border-soft)] hover:bg-[var(--bg-surface-soft)] text-[var(--text-main)] font-medium"
            >
              <RefreshCw className="w-4 h-4 text-[var(--text-muted)]" />
              Flip Doll to {selectedMood === 'happy' ? 'Unhappy' : 'Happy'}
            </Button>
          </motion.div>

          {/* Explicit Save Action */}
          <motion.div whileTap={{ scale: 0.96 }}>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                backgroundColor: selectedMood === 'happy' ? 'var(--doll-pink)' : 'var(--doll-blue)',
              }}
              className="w-full h-12 rounded-2xl text-white font-medium shadow-md hover:opacity-95"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">Saving...</span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  {isChanged ? 'Save New Mood' : 'Keep Current Mood'}
                </span>
              )}
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
