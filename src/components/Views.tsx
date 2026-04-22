import { useState } from 'react';
import { User, Clock, Activity, ShieldAlert, Book, Settings, Monitor, Lock, Globe, Zap, Cpu, Bell } from 'lucide-react';
import { motion } from 'motion/react';

export function AdvancedSettings() {
  const sections = [
    {
      title: 'Performance & Display',
      icon: Monitor,
      settings: [
        { label: 'Hardware Acceleration', desc: 'Use GPU for stream decoding', type: 'toggle', active: true },
        { label: 'Frame Rate Limit', desc: 'Max FPS for incoming stream', type: 'select', value: '60 FPS' },
        { label: 'Color Accuracy', desc: 'Enable HDR and 4:4:4 chroma', type: 'toggle', active: false },
      ]
    },
    {
      title: 'Security & Privacy',
      icon: Lock,
      settings: [
        { label: 'Unattended Access', desc: 'Allow connections without prompt', type: 'toggle', active: localStorage.getItem('unattended_access') === 'true' },
        { label: 'Two-Factor Auth', desc: 'Require mobile confirmation', type: 'button', text: 'Configure' },
        { label: 'Auto-Lock', desc: 'Lock host on disconnect', type: 'toggle', active: true },
      ]
    },
    {
      title: 'Network & Proxy',
      icon: Globe,
      settings: [
        { label: 'Direct P2P', desc: 'Prefer direct link over relay', type: 'toggle', active: true },
        { label: 'Proxy Server', desc: 'Route traffic through gateway', type: 'button', text: 'Setup' },
        { label: 'Listen Port', desc: 'Port for incoming signals', type: 'input', value: '3000' },
      ]
    }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="border-b border-white/5 pb-4 flex items-center justify-between">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">System Configuration</h2>
        <div className="flex gap-2">
            <span className="text-[9px] font-black uppercase bg-red-600/10 text-red-500 px-3 py-1 rounded border border-red-600/20">v7.2.4 Stable</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-[#1C1E26] rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
              <section.icon className="w-4 h-4 text-red-500" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white">{section.title}</h3>
            </div>
            <div className="p-6 space-y-6">
              {section.settings.map((s, sIdx) => (
                <div key={sIdx} className="flex items-start justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white mb-0.5">{s.label}</span>
                    <p className="text-[10px] text-white/30 leading-tight">{s.desc}</p>
                  </div>
                  
                  {s.type === 'toggle' && (
                    <button 
                      onClick={() => {
                        if (s.label === 'Unattended Access') {
                          localStorage.setItem('unattended_access', (!s.active).toString());
                          window.location.reload(); // Quick way to trigger App.tsx update
                        }
                      }}
                      className={`w-8 h-4 rounded-full relative transition-colors ${s.active ? 'bg-red-600' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${s.active ? 'left-[17px]' : 'left-0.5'}`} />
                    </button>
                  )}

                  {s.type === 'button' && (
                    <button className="text-[9px] font-black uppercase tracking-widest text-red-500 border border-red-500/20 px-3 py-1.5 rounded hover:bg-red-600 hover:text-white transition-all">
                      {s.text}
                    </button>
                  )}

                  {s.type === 'select' && (
                    <div className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-1 rounded border border-white/5 cursor-pointer hover:text-white">
                      {s.value}
                    </div>
                  )}

                  {s.type === 'input' && (
                    <div className="text-[10px] font-mono font-bold text-red-500 bg-red-600/5 px-2 py-1 rounded border border-red-600/10">
                      {s.value}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#1C1E26] p-8 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center">
            <Zap className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-widest mb-1 text-white">Turbo Engine Active</h4>
            <p className="text-xs text-white/30 max-w-sm">Deep optimization for low-bandwidth environments is currently enabled globally.</p>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-8 py-4 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-all">
            Reset Defaults
          </button>
          <button className="flex-1 md:flex-none px-8 py-4 bg-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/20 hover:bg-red-500 transition-all">
            Apply Changes
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function AddressBook() {
  const [contacts] = useState<{ name: string; group: string; lastSeen: string }[]>([]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Organization Contacts</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.length > 0 ? contacts.map((c, i) => (
          <div key={i} className="bg-[#1C1E26] p-6 rounded-2xl border border-white/5 hover:border-red-600/30 transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-red-600/10 transition-colors">
                <User className="text-white/20 group-hover:text-red-500 w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white">{c.name}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500/50">{c.group}</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/20">
              <span>Last Session</span>
              <span className={c.lastSeen === 'Online' ? 'text-green-500' : ''}>{c.lastSeen}</span>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-30">
            <User className="w-12 h-12 mb-4" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em]">No Contacts Synchronized</span>
          </div>
        )}
        <div className="border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center p-8 opacity-20 hover:opacity-50 transition-all cursor-pointer">
          <Book className="w-8 h-8 mb-2" />
          <span className="text-[10px] font-black uppercase tracking-widest">Add Contact</span>
        </div>
      </div>
    </motion.div>
  );
}

export function SessionLogs() {
  const [logs] = useState<{ target: string; duration: string; date: string; data: string }[]>([]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Connect Activity History</h2>
      </div>
      <div className="space-y-2">
        {logs.length > 0 ? logs.map((log, i) => (
          <div key={i} className="bg-[#1C1E26] p-4 rounded-xl border border-white/5 flex items-center justify-between hover:bg-[#24272E] transition-colors group">
            <div className="flex items-center gap-6">
              <Clock className="w-4 h-4 text-white/10 group-hover:text-red-500" />
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white">{log.target}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/20">{log.date}</span>
              </div>
            </div>
            <div className="flex gap-12 tabular-nums">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-tighter text-white/20">Duration</span>
                <span className="text-xs font-bold">{log.duration}</span>
              </div>
              <div className="flex flex-col items-end w-20">
                <span className="text-[9px] font-black uppercase tracking-tighter text-white/20">Transfer</span>
                <span className="text-xs font-bold text-red-500">{log.data}</span>
              </div>
            </div>
          </div>
        )) : (
          <div className="py-20 flex flex-col items-center justify-center opacity-30 bg-[#1C1E26] rounded-2xl border border-white/5 border-dashed">
            <Clock className="w-12 h-12 mb-4" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em]">No Sessions Recorded</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function NetworkStatus() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Live Network Metrics</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1C1E26] p-8 rounded-2xl border border-white/5 space-y-6">
          <div className="flex justify-between items-end">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500">Outbound Stream</h3>
            <span className="text-4xl font-bold tracking-tighter tabular-nums">8.4<span className="text-sm opacity-20 ml-1">Mbps</span></span>
          </div>
          <div className="h-24 flex items-end gap-1">
            {[40, 60, 20, 80, 50, 90, 40, 70, 100, 30, 60, 80].map((h, i) => (
              <div key={i} className="flex-1 bg-red-600/20 rounded-t-sm group relative">
                <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} className="absolute bottom-0 left-0 right-0 bg-red-600 rounded-t-sm" />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] font-bold text-white/20 uppercase tracking-widest">
            <span>Server: Frankfurt-01</span>
            <span>Est. Latency: 12ms</span>
          </div>
        </div>
        
        <div className="bg-[#1C1E26] p-8 rounded-2xl border border-white/5 flex flex-col justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30">Current Uplink</h3>
          <div className="space-y-4">
             <div className="flex justify-between items-center text-xs font-bold">
               <span className="opacity-40">Packet Loss</span>
               <span className="text-green-500">0.02%</span>
             </div>
             <div className="flex justify-between items-center text-xs font-bold">
               <span className="opacity-40">Jitter</span>
               <span className="text-green-500">0.8ms</span>
             </div>
             <div className="flex justify-between items-center text-xs font-bold">
               <span className="opacity-40">Encryption</span>
               <span className="text-red-500">AES-XTS-256</span>
             </div>
          </div>
          <button className="mt-8 w-full py-4 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-red-600/30 transition-all">
            Run Network Diagnostic
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function SecurityShield() {
  const [events] = useState<{ title: string; user: string; time: string; severity: string }[]>([]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Security Policy & Guard</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-4 bg-red-600/5 border border-red-600/10 p-8 rounded-2xl flex flex-col items-center">
          <ShieldAlert className="w-16 h-16 text-red-600 mb-6" />
          <h3 className="text-sm font-black uppercase tracking-widest mb-2">Shield Active</h3>
          <p className="text-center text-xs opacity-40 leading-relaxed">Continuous monitoring for unauthorized remote access and identity spoofing.</p>
          <div className="mt-10 w-full p-4 bg-red-600 rounded-xl text-center font-black uppercase text-[10px] tracking-widest text-white shadow-lg shadow-red-600/20">
            System Locked
          </div>
        </div>

        <div className="md:col-span-8 space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20">Access Events</h4>
          <div className="space-y-2">
            {events.length > 0 ? events.map((e, i) => (
              <div key={i} className="bg-[#1C1E26] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className={`w-2 h-2 rounded-full ${e.severity === 'high' ? 'bg-red-600' : e.severity === 'mid' ? 'bg-orange-500' : 'bg-green-500'}`} />
                   <div className="flex flex-col">
                     <span className="text-sm font-bold">{e.title}</span>
                     <span className="text-[10px] opacity-20 uppercase font-black">{e.user} • {e.time}</span>
                   </div>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 px-3 py-1 rounded">View</button>
              </div>
            )) : (
              <div className="py-20 flex flex-col items-center justify-center opacity-30 bg-[#1C1E26] rounded-xl border border-white/5 border-dashed">
                <ShieldAlert className="w-12 h-12 mb-4" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">No Security Threats Detected</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
