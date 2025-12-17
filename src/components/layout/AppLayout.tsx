import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export function AppLayout({ children, showNav = true }: AppLayoutProps) {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <div className={showNav ? 'pb-32' : ''}>{children}</div>
      {showNav && <BottomNav />}
    </div>
  );
}
