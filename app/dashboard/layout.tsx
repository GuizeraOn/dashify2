'use client';

import { Suspense } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import TopNav from '@/components/layout/TopNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#121212]">
      {/* Top Navbar (Fixed) */}
      <TopNav />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 flex-shrink-0">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <main className="flex-1 overflow-y-auto px-5 md:px-8 pt-5 md:pt-6 pb-24 md:pb-8">
            {/* Header e as pages leem a URL com useSearchParams, o que exige um
                boundary de Suspense acima deles para o build de producao
                conseguir prerenderizar o shell estatico. */}
            <Suspense fallback={null}>
              <Header />
              {children}
            </Suspense>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </div>
  );
}
