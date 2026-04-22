import { User, Bell, Search, Terminal } from 'lucide-react';
import { NavigationItem } from '../types';

interface HeaderProps {
  activeItem: NavigationItem;
  onItemSelect: (item: NavigationItem) => void;
}

export default function Header({ activeItem, onItemSelect }: HeaderProps) {
  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-16 bg-[#16181D]/50 backdrop-blur-md border-b border-[#24272E]">
      <div className="flex items-center gap-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white text-lg italic">R</div>
          <span className="font-sans font-black text-lg tracking-tighter text-white hidden lg:block uppercase italic">RemoteConnect</span>
        </div>
        
        <div className="hidden md:flex gap-8">
          <button 
            onClick={() => onItemSelect('devices')}
            className={`text-[10px] font-black tracking-[0.1em] uppercase transition-all pb-5 pt-1 border-b-2 cursor-pointer ${activeItem === 'devices' ? 'text-red-500 border-red-500' : 'opacity-30 border-transparent hover:opacity-100'}`}
          >
            Connections
          </button>
          <button 
            onClick={() => onItemSelect('address-book')}
            className={`text-[10px] font-black tracking-[0.1em] uppercase transition-all pb-5 pt-1 border-b-2 cursor-pointer ${activeItem === 'address-book' ? 'text-red-500 border-red-500' : 'opacity-30 border-transparent hover:opacity-100'}`}
          >
            Address Book
          </button>
          <button 
            onClick={() => onItemSelect('session-logs')}
            className={`text-[10px] font-black tracking-[0.1em] uppercase transition-all pb-5 pt-1 border-b-2 cursor-pointer ${activeItem === 'session-logs' ? 'text-red-500 border-red-500' : 'opacity-30 border-transparent hover:opacity-100'}`}
          >
            Session Logs
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center bg-black/20 border border-white/5 rounded-full px-4 py-1.5 gap-3 w-64">
          <Search className="w-3.5 h-3.5 text-white/20" />
          <input 
            type="text" 
            placeholder="Search network..." 
            className="bg-transparent border-none text-[11px] text-white focus:outline-none w-full placeholder:text-white/10"
          />
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold bg-green-500/10 text-green-500 px-4 py-1.5 rounded-full border border-green-500/20 tracking-widest uppercase">
          <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          READY
        </div>
        <div className="w-9 h-9 rounded-xl bg-[#1C1E26] border border-outline/20 flex items-center justify-center overflow-hidden hover:border-red-500 transition-all cursor-pointer">
           <User className="w-4 h-4 text-white/20" />
        </div>
      </div>
    </header>
  );
}
