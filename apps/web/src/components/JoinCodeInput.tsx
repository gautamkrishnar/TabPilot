import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface JoinCodeInputProps {
  readonly value?: string;
  readonly onComplete: (code: string) => void;
  readonly onChange?: (code: string) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

const CODE_LENGTH = 6;

export function JoinCodeInput({
  value,
  onComplete,
  onChange,
  disabled = false,
  className,
}: JoinCodeInputProps) {
  const [chars, setChars] = useState<string[]>(() => {
    if (value) {
      const vals = value.toUpperCase().split('').slice(0, CODE_LENGTH);
      while (vals.length < CODE_LENGTH) vals.push('');
      return vals;
    }
    return new Array(CODE_LENGTH).fill('');
  });

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Sync external value
  useEffect(() => {
    if (value !== undefined) {
      const vals = value.toUpperCase().split('').slice(0, CODE_LENGTH);
      while (vals.length < CODE_LENGTH) vals.push('');
      setChars(vals);
    }
  }, [value]);

  const focusInput = useCallback((index: number) => {
    const el = inputsRef.current[index];
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const updateChars = useCallback(
    (newChars: string[]) => {
      setChars(newChars);
      const code = newChars.join('');
      onChange?.(code);
      if (newChars.every((c) => c !== '')) {
        onComplete(code);
      }
    },
    [onChange, onComplete],
  );

  const handleChange = useCallback(
    (index: number, rawValue: string) => {
      // Normalize to alphanumeric uppercase
      const normalized = rawValue
        .replaceAll(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(-1); // Take last char (handles composition)

      if (!normalized) return;

      const newChars = [...chars];
      newChars[index] = normalized;
      updateChars(newChars);

      // Advance to next
      if (index < CODE_LENGTH - 1) {
        focusInput(index + 1);
      }
    },
    [chars, updateChars, focusInput],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (chars[index]) {
          // Clear current
          const newChars = [...chars];
          newChars[index] = '';
          updateChars(newChars);
        } else if (index > 0) {
          // Move to previous and clear
          focusInput(index - 1);
          const newChars = [...chars];
          newChars[index - 1] = '';
          updateChars(newChars);
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        focusInput(index - 1);
      } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
        e.preventDefault();
        focusInput(index + 1);
      } else if (e.key === 'Delete') {
        e.preventDefault();
        const newChars = [...chars];
        newChars[index] = '';
        updateChars(newChars);
      }
    },
    [chars, updateChars, focusInput],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData('text')
        .replaceAll(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, CODE_LENGTH);

      if (!pasted) return;

      const newChars = [...chars];
      for (let i = 0; i < CODE_LENGTH; i++) {
        newChars[i] = pasted[i] || '';
      }
      updateChars(newChars);

      // Focus last filled box or last box
      const lastFilled = Math.min(pasted.length - 1, CODE_LENGTH - 1);
      focusInput(lastFilled);
    },
    [chars, updateChars, focusInput],
  );

  const handleFocus = useCallback((index: number) => {
    inputsRef.current[index]?.select();
  }, []);

  return (
    <div className={cn('flex items-center gap-2.5 justify-center', className)}>
      {Array.from({ length: CODE_LENGTH }).map((_, index) => (
        <input
          key={`pos-${index}`}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={2} // Allow 2 to handle deletion edge cases
          value={chars[index]}
          disabled={disabled}
          className={cn(
            'w-12 h-14 text-center text-xl font-bold font-mono',
            'rounded-xl border-2 transition-all duration-150',
            'bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100',
            'outline-none',
            // Border states
            chars[index]
              ? 'border-indigo-500 shadow-glow-indigo'
              : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:shadow-glow-indigo',
            disabled && 'opacity-50 cursor-not-allowed',
            'caret-indigo-400',
          )}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          aria-label={`Join code character ${index + 1}`}
        />
      ))}
    </div>
  );
}
