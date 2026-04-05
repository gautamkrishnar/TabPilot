import { Check, Copy, ExternalLink, Link2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { cn, copyToClipboard, getJoinUrl } from '@/lib/utils';

interface JoinCodeDisplayProps {
  readonly joinCode: string;
  readonly className?: string;
  /** Show only the code characters + copy button, without the share-link section */
  readonly codeOnly?: boolean;
}

export function JoinCodeDisplay({ joinCode, className, codeOnly = false }: JoinCodeDisplayProps) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const joinUrl = getJoinUrl(joinCode);

  const handleCopyCode = async () => {
    await copyToClipboard(joinCode);
    setCodeCopied(true);
    toast.success('Join code copied!', { duration: 2000 });
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    await copyToClipboard(joinUrl);
    setLinkCopied(true);
    toast.success('Join link copied!', { duration: 2000 });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const chars = joinCode.toUpperCase().split('');

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Code display */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-zinc-400">Join Code</p>
        <div className="flex items-center gap-2">
          {chars.map((char, i) => (
            <div
              key={`pos-${i}`}
              className={cn(
                'w-12 h-14 flex items-center justify-center',
                'rounded-lg border-2 border-zinc-300 dark:border-zinc-700',
                'bg-zinc-50 dark:bg-zinc-900',
                'text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100',
                'shadow-lg',
              )}
            >
              {char}
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyCode}
          className="gap-2 border-zinc-300 dark:border-zinc-700"
        >
          {codeCopied ? (
            <>
              <Check className="h-4 w-4 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy Code
            </>
          )}
        </Button>
      </div>

      {!codeOnly && (
        <>
          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-xs text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>

          {/* Shareable link */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-zinc-400 text-center">Share Link</p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <Link2 className="h-4 w-4 text-zinc-500 flex-shrink-0" />
              <span className="text-xs text-zinc-400 flex-1 truncate font-mono">{joinUrl}</span>
              <a
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors flex-shrink-0"
                aria-label="Open join link"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-2 border-zinc-300 dark:border-zinc-700 w-full"
            >
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-green-400">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Share Link
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
