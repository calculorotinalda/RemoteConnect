import { Play, Settings, Rocket, Timer } from 'lucide-react';
import { Device } from '../types';
import { motion } from 'motion/react';

interface DeviceRowProps {
  device: Device;
  onConnect: () => void;
  key?: any;
}

export default function DeviceRow({ device, onConnect }: DeviceRowProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.005 }}
      className="group flex flex-col md:flex-row items-center gap-4 bg-surface-container border border-slate-800 p-4 rounded-lg hover:border-orange-500/40 hover:bg-surface-container-high transition-all"
    >
      <div className="relative w-full md:w-24 h-32 md:h-16 rounded overflow-hidden bg-surface-dim border border-slate-800">
        <img 
          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
          alt={device.name}
          src={device.thumbnail}
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/40">
          <Play className="text-white w-6 h-6 fill-current" />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div className="flex flex-col justify-center">
          <span className="font-bold text-sm tracking-tight text-white group-hover:text-red-500 transition-colors">{device.name}</span>
          <span className="font-mono text-[10px] opacity-40 uppercase tracking-widest">{device.ip}</span>
        </div>
        
        <div className="hidden md:flex items-center justify-end gap-3 px-4">
          <div className="px-2.5 py-1 rounded bg-[#16181D] text-white/30 font-black text-[9px] uppercase tracking-[0.1em] border border-white/5">
            {device.encryption}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
        <button className="p-2 text-white/20 hover:text-red-500 transition-all">
          <Settings className="w-4 h-4" />
        </button>
        <button 
          onClick={onConnect}
          disabled={device.status === 'offline'}
          className="flex-1 md:flex-none bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-4 py-2 rounded-lg border border-red-600/20 hover:border-red-600 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm disabled:opacity-20 disabled:cursor-not-allowed"
        >
          LINK
          <Rocket className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
