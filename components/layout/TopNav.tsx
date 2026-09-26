'use client';

import { ChevronDown, Moon, Edit, Check, LogOut } from 'lucide-react';
import { Target } from 'lucide-react';
import { Poppins } from 'next/font/google';
import { useLayoutStore } from '@/store/layoutStore';
import InstallButton from '@/components/pwa/InstallButton';
import NotificationBell from '@/components/pwa/NotificationBell';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase-auth';

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600'] });

export default function TopNav() {
  const { isEditingLayout, toggleEditingLayout } = useLayoutStore();
  const router = useRouter();

  const handleSignOut = async () => {
    await createBrowserSupabase().auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="h-16 bg-[#121212] border-b border-[#333] flex items-center justify-between px-4 md:px-6 z-40 flex-shrink-0">
      
      {/* Logo */}
      <div className="flex items-center gap-2">
        <Target className="text-[#0f62fe]" size={26} />
        <span className={`${poppins.className} text-white text-2xl font-medium tracking-tight mb-0.5`}>
          Dashify
        </span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 md:gap-5">

        {/* Notificações push de vendas aprovadas */}
        <NotificationBell />

        {/* So renderiza quando o navegador oferece a instalacao */}
        <InstallButton />
        
        {/* Workspace Selector */}
        <div className="flex items-center gap-1.5 md:gap-2 text-gray-300">
          <button className="flex items-center gap-1.5 md:gap-2 hover:text-white transition-colors">
            <span className="text-sm truncate max-w-[100px] md:max-w-none">Principal</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
        </div>

        {/* Icons */}
        <div className="flex items-center gap-3 md:gap-4 text-gray-300">
          {/* O grid so aceita arrastar/redimensionar a partir de 1024px,
              entao o botao acompanha esse mesmo breakpoint. */}
          <button 
            onClick={toggleEditingLayout}
            className={`transition-colors hidden lg:block ${isEditingLayout ? 'text-[#0f62fe]' : 'hover:text-white'}`}
            title="Editar Layout do Dashboard"
          >
            {isEditingLayout ? <Check size={18} /> : <Edit size={18} />}
          </button>
          <button className="hover:text-white transition-colors">
            <Moon size={18} />
          </button>
          <button
            onClick={handleSignOut}
            className="transition-colors hover:text-white"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
      
    </div>
  );
}
