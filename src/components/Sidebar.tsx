import { Server, History, RefreshCcw, ShieldCheck, Settings } from 'lucide-react';
import { NavigationItem } from '../types';

interface SidebarProps {
  activeItem: NavigationItem;
  onItemSelect: (item: NavigationItem) => void;
}

export default function Sidebar({ activeItem, onItemSelect }: SidebarProps) {
  const items = [
    { id: 'devices', label: 'Devices', icon: Server },
    { id: 'history', label: 'History', icon: History },
    { id: 'network', label: 'Network', icon: RefreshCcw },
    { id: 'logs', label: 'Shield', icon: ShieldCheck },
  ] as const;

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-20 z-[40] flex-col py-8 bg-[#16181D] border-r border-[#24272E] pt-20 transition-all">
      <nav className="flex-1 px-3 space-y-6 flex flex-col items-center pt-4">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemSelect(item.id as NavigationItem)}
            className={`w-12 h-12 flex items-center justify-center transition-all duration-300 rounded-xl relative group
              ${activeItem === item.id 
                ? 'bg-red-600 shadow-lg shadow-red-600/20 text-white translate-x-1' 
                : 'text-slate-600 hover:text-slate-300 hover:bg-slate-800/30'
              }`}
          >
            <item.icon className="w-5 h-5" />
            <div className="absolute left-16 bg-slate-900 border border-slate-700 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {item.label}
            </div>
          </button>
        ))}
      </nav>

      <div className="px-3 py-4 flex flex-col items-center gap-6 mb-4">
        <button 
          onClick={() => onItemSelect('settings')}
          className={`transition-colors ${activeItem === 'settings' ? 'text-red-500' : 'text-slate-700 hover:text-white'}`}
        >
          <Settings className={`w-5 h-5 ${activeItem === 'settings' ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : ''}`} />
        </button>
        <div className="opacity-20 text-[10px] uppercase font-black tracking-[0.3em] rotate-180 select-none" style={{ writingMode: 'vertical-rl' }}>
          v7.2.4
        </div>
      </div>
    </aside>
  );
}
