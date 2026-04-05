import { Github, Plus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { UserAvatarMenu } from './UserAvatarMenu';

interface LayoutProps {
  readonly children: React.ReactNode;
  readonly showNav?: boolean;
}

export function Layout({ children, showNav = true }: LayoutProps) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {showNav && (
        <header
          className={cn(
            'sticky top-0 z-50 w-full',
            'border-b border-zinc-200/60 dark:border-zinc-800/60',
            'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md',
            isHome && 'border-transparent bg-transparent',
          )}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2.5 group">
                <img
                  src="/logo.svg"
                  alt="Tab Pilot logo"
                  width={32}
                  height={32}
                  className="rounded-lg shadow-glow-indigo group-hover:shadow-glow-violet transition-shadow duration-300"
                />
                <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                  Tab Pilot
                </span>
              </Link>

              {/* Right side */}
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/gautamkrishnar/TabPilot"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub repository"
                  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <Github className="h-5 w-5" />
                </a>
                <ThemeToggle />
                <UserAvatarMenu />
                {!isHome && (
                  <Button asChild variant="glow" size="sm">
                    <Link to="/create">
                      <Plus className="h-4 w-4" />
                      Create Session
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1">{children}</main>
    </div>
  );
}
