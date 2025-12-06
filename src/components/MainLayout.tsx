import { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
    children: ReactNode;
    showHeader?: boolean;
    showNav?: boolean;
}

export const MainLayout = ({
    children,
    showHeader = true,
    showNav = true
}: MainLayoutProps) => {
    return (
        <div className="min-h-screen">
            {showHeader && <Header />}

            <main className={`${showHeader ? 'pt-14' : ''} ${showNav ? 'pb-20' : ''}`}>
                {children}
            </main>

            {showNav && <BottomNav />}
        </div>
    );
};
