import { useState, useEffect } from 'react';
import { Radio, Zap, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConnectHeroProps {
  onSessionStart: (id: string) => void;
  onHostStart: (id: string) => void;
}

export default function ConnectHero({ onSessionStart, onHostStart }: ConnectHeroProps) {
  const [remoteId, setRemoteId] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [myDeskId, setMyDeskId] = useState('--- --- ---');

  useEffect(() => {
    // If we have a persistent ID from App.tsx/Unattended mode, use it
    const savedId = localStorage.getItem('persistent_id');
    const isUnattended = localStorage.getItem('unattended_access') === 'true';

    if (isUnattended && savedId) {
      const formatted = savedId.match(/.{1,3}/g)?.join('-') || savedId;
      setMyDeskId(formatted);
      return;
    }

    // Otherwise generate a session-only ID
    const generateId = () => {
      const part1 = Math.floor(Math.random() * 900 + 100);
      const part2 = Math.floor(Math.random() * 900 + 100);
      const part3 = Math.floor(Math.random() * 900 + 100);
      return `${part1}-${part2}-${part3}`;
    };
    setMyDeskId(generateId());
  }, []);

  const handleHost = () => {
    onHostStart(myDeskId);
  };

  const handleConnect = () => {
    const cleanId = remoteId.replace(/[- ]/g, '');
    const myCleanId = myDeskId.replace(/[- ]/g, '');
    if (!cleanId.trim()) return;
    
    setStatus('connecting');
    
    // Quick validation and start
    setTimeout(() => {
      if (cleanId.length < 5) {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setStatus('connected');
        setTimeout(() => {
          if (cleanId === myCleanId) {
            onHostStart(cleanId);
          } else {
            onSessionStart(cleanId);
          }
          setStatus('idle');
          setRemoteId('');
        }, 300); // 300ms is enough for visual feedback
      }
    }, 500); // 500ms for "Wait" state
  };

  const startHostSession = () => {
     onHostStart(myDeskId.replace(/[- ]/g, ''));
  };

  return (
    <section className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-16">
      <div className="md:col-span-5 flex flex-col justify-between space-y-8">
        <div className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">This Desk</h2>
          <div className="text-5xl md:text-7xl font-bold tracking-tighter text-white tabular-nums">{myDeskId.replace(/-/g, ' ')}</div>
          <p className="text-sm text-white/50 max-w-xs leading-relaxed">
            Your device is ready for incoming connections. Share this ID with others.
          </p>
          <button 
            onClick={startHostSession}
            className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all font-bold"
          >
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            Start Hosting This Screen
          </button>
        </div>
        
        <div className="p-6 bg-[#1C1E26] rounded-2xl border border-white/5 space-y-4 hidden md:block">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500">Security Profile</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Unattended Access</span>
            <div className="w-10 h-5 bg-red-600 rounded-full flex items-center px-1 justify-end">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="flex items-center justify-between opacity-50">
            <span className="text-sm font-medium">Screen Recording</span>
            <div className="w-10 h-5 bg-white/20 rounded-full flex items-center px-1">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:col-span-7 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Remote Desk</h2>
          <div className="relative">
            <input 
              type="text" 
              value={remoteId}
              onChange={(e) => setRemoteId(e.target.value)}
              disabled={status === 'connecting' || status === 'connected'}
              placeholder="Enter Remote ID" 
              className="w-full bg-[#1C1E26] border-2 border-[#2D3039] rounded-2xl px-6 md:px-8 py-6 text-2xl md:text-3xl font-bold tracking-tight text-white placeholder:text-white/10 focus:outline-none focus:border-red-600 transition-colors disabled:opacity-50"
            />
            
            <AnimatePresence mode="wait">
              {status === 'idle' && (
                <button 
                  onClick={handleConnect}
                  className="hidden md:block absolute right-4 top-4 bottom-4 px-8 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg shadow-red-600/20"
                >
                  Connect
                </button>
              )}
              {status === 'connecting' && (
                <div className="absolute right-4 top-4 bottom-4 px-8 bg-slate-800 text-white font-black uppercase tracking-widest text-xs rounded-xl flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wait
                </div>
              )}
              {status === 'connected' && (
                <button 
                  onClick={() => { setStatus('idle'); setRemoteId(''); }}
                  className="absolute right-4 top-4 bottom-4 px-8 bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest text-xs rounded-xl flex items-center gap-3"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Active
                </button>
              )}
              {status === 'error' && (
                <div className="absolute right-4 top-4 bottom-4 px-8 bg-orange-600 text-white font-black uppercase tracking-widest text-xs rounded-xl flex items-center gap-3">
                  <XCircle className="w-4 h-4" />
                  Invalid ID
                </div>
              )}
            </AnimatePresence>

            <button 
              onClick={handleConnect}
              disabled={status !== 'idle'}
              className="md:hidden mt-4 w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2"
            >
              {status === 'idle' ? 'Connect' : status.toUpperCase()}
              {status === 'connecting' && <Loader2 className="w-4 h-4 animate-spin" />}
            </button>
          </div>
        </div>

        <div className={`hidden md:flex items-center gap-4 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl border transition-all duration-500
          ${status === 'connected' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-green-500/5 text-green-500/30 border-green-500/10'}
        `}>
          <Radio className={`w-4 h-4 ${status === 'connected' ? 'text-green-400' : 'text-green-500 animate-pulse'}`} />
          {status === 'connected' ? 'Session encrypted - Connection stable' : 'Secure Tunnel Ready for transmission'}
        </div>
      </div>
    </section>
  );
}
