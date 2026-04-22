import { Monitor, Smartphone, Settings } from 'lucide-react';
import { NavigationItem } from '../types';

interface BottomNavProps {
  activeItem: NavigationItem;
  onItemSelect: (item: NavigationItem) => void;
}

export default function BottomNav({ activeItem, onItemSelect }: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 bg-[#0F1115]/90 backdrop-blur-xl border-t border-[#24272E] pb-4">
      <button 
        onClick={() => onItemSelect('connect')}
        className={`flex flex-col items-center justify-center py-2 w-full transition-all active:scale-90
          ${activeItem === 'connect' ? 'text-red-500' : 'text-white/20'}`}
      >
        <Monitor className="w-5 h-5 mb-1.5" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Live</span>
      </button>
      
      <button 
        onClick={() => onItemSelect('devices')}
        className={`flex flex-col items-center justify-center py-2 w-full transition-all active:scale-90
          ${activeItem === 'devices' ? 'text-red-500' : 'text-white/20'}`}
      >
        <Smartphone className="w-5 h-5 mb-1.5" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Nodes</span>
      </button>
      
      <button 
        onClick={() => onItemSelect('settings')}
        className={`flex flex-col items-center justify-center py-2 w-full transition-all active:scale-90
          ${activeItem === 'settings' ? 'text-red-500' : 'text-white/20'}`}
      >
        <Settings className="w-5 h-5 mb-1.5" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Config</span>
      </button>
    </nav>
  );
}
