import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Megaphone, Target, ShoppingBag, FileText, Settings, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { name: 'Dashboard',   href: '/dashboard',              icon: LayoutDashboard },
  { name: 'Meta Ads',    href: '#',                       icon: Target },
  { name: 'Campanhas',   href: '/dashboard/campanhas',    icon: Megaphone },
  { name: 'Produtos',    href: '#',                       icon: ShoppingBag },
  { name: 'Vendas',      href: '/dashboard/vendas',       icon: FileText },
  { name: 'Relatórios',  href: '/dashboard/relatorios',   icon: BarChart2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex h-full flex-col bg-[#1E1E1E] border-r border-[#333] w-64 shrink-0">
      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600/10 text-blue-500"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={18} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#333]">
        <Link
          href="/dashboard/configuracoes"
          className={cn(
            "flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium transition-colors",
            pathname === '/dashboard/configuracoes'
              ? "bg-blue-600/10 text-blue-500"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Settings size={18} />
          Configurações
        </Link>
      </div>
    </div>
  );
}
