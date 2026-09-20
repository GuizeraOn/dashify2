'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Megaphone, FileText, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { name: 'Dashboard',  href: '/dashboard',           icon: LayoutDashboard },
  { name: 'Campanhas',  href: '/dashboard/campanhas', icon: Megaphone },
  { name: 'Vendas',     href: '/dashboard/vendas',    icon: FileText },
  { name: 'Relatórios', href: '/dashboard/relatorios', icon: BarChart2 },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 w-full bg-[#1E1E1E] border-t border-[#333] z-50 md:hidden flex items-center justify-around pb-safe pt-2 px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
      {links.map((link) => {
        const isActive = pathname === link.href;
        const Icon = link.icon;

        return (
          <Link
            key={link.name}
            href={link.href}
            className={cn(
              "flex flex-col items-center justify-center w-full py-2 gap-1 rounded-lg transition-colors",
              isActive
                ? "text-blue-500"
                : "text-gray-400 hover:text-white"
            )}
          >
            <Icon size={20} className={cn(isActive && "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]")} />
            <span className="text-[10px] font-medium">{link.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
