import { useState, useRef, useEffect } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import ConnectHero from './components/ConnectHero';
import DeviceRow from './components/DeviceRow';
import RemoteSessionView from './components/RemoteSessionView';
import { AddressBook, SessionLogs, NetworkStatus, SecurityShield, AdvancedSettings } from './components/Views';
import { Device, NavigationItem } from './types';

const MOCK_DEVICES: Device[] = [];

export default function App() {
  const [activeItem, setActiveItem] = useState<NavigationItem>('connect');
  const [activeSession, setActiveSession] = useState<{ id: string; isHost: boolean } | null>(null);
  const [hostingId, setHostingId] = useState<string | null>(null);
  const [isUnattendedActive, setIsUnattendedActive] = useState(false);
  const myCurrentIdRef = useRef<string>('');

  // Handle automatic hosting if "Unattended" is enabled in settings
  useEffect(() => {
    const isUnattended = localStorage.getItem('unattended_access') === 'true';
    setIsUnattendedActive(isUnattended);

    // Only auto-start on fresh application load (sessionStorage used as a flag)
    const hasAutoStarted = sessionStorage.getItem('auto_started') === 'true';
    
    if (isUnattended && !activeSession && !hasAutoStarted) {
      sessionStorage.setItem('auto_started', 'true');
      
      let id = localStorage.getItem('persistent_id');
      if (!id) {
        const part1 = Math.floor(Math.random() * 900 + 100);
        const part2 = Math.floor(Math.random() * 900 + 100);
        const part3 = Math.floor(Math.random() * 900 + 100);
        id = `${part1}${part2}${part3}`;
        localStorage.setItem('persistent_id', id);
      }
      myCurrentIdRef.current = id;
      
      const timer = setTimeout(() => {
         startSession(id!, true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []); // Only run on mount

  const startSession = (id: string, isHost: boolean = false) => {
    setActiveSession({ id, isHost });
  };

  const startHosting = (id: string) => {
    setHostingId(id);
  };

  const stopHosting = () => {
    setHostingId(null);
  };

  const closeSession = () => {
    setActiveSession(null);
  };

  return (
    <div className="min-h-screen">
      <Header 
        activeItem={activeItem}
        onItemSelect={setActiveItem}
      />
      
      <Sidebar 
        activeItem={activeItem} 
        onItemSelect={setActiveItem} 
      />

      <main className="md:ml-20 pt-24 pb-24 md:pb-20 px-4 md:px-12 max-w-none">
        <div className="max-w-7xl mx-auto">
          {activeItem === 'connect' && (
            <ConnectHero 
              onSessionStart={(id) => startSession(id, false)} 
              onHostStart={startHosting} 
            />
          )}

          {activeItem === 'devices' && (
            <>
              <section>
                <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Recent Sessions</h2>
                  <div className="flex gap-4">
                    <button className="text-white/20 hover:text-white transition-colors">
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button className="text-red-500">
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MOCK_DEVICES.length > 0 ? MOCK_DEVICES.map((device) => (
                    <DeviceRow 
                      key={device.id} 
                      device={device} 
                      onConnect={() => startSession(device.remoteId || device.ip, false)}
                    />
                  )) : (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center bg-[#1C1E26] rounded-3xl border border-dashed border-white/5 opacity-10">
                      <LayoutGrid className="w-12 h-12 mb-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">No Recent Connections</span>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {activeItem === 'address-book' && <AddressBook />}
          {activeItem === 'session-logs' && <SessionLogs />}
          {activeItem === 'history' && <SessionLogs />}
          {activeItem === 'logs' && <SecurityShield />}
          {activeItem === 'network' && <NetworkStatus />}
          {activeItem === 'settings' && <AdvancedSettings />}
        </div>
      </main>

      <footer className="hidden md:flex fixed bottom-0 left-20 right-0 h-14 bg-[#0F1115] border-t border-[#24272E] px-8 items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
        <div>RemoteConnect Professional Edition</div>
        <div className="flex gap-8">
          <span className="flex items-center gap-2"><div className="w-1 h-1 bg-green-500 rounded-full"></div> Latency: 12ms</span>
          <span>Encryption: AES-256</span>
          <span className="text-green-500/40">Secure Channel Active</span>
        </div>
      </footer>

      <BottomNav 
        activeItem={activeItem} 
        onItemSelect={setActiveItem} 
      />

      <AnimatePresence>
        {activeSession && (
          <RemoteSessionView 
            remoteId={activeSession.id} 
            isHost={activeSession.isHost}
            onClose={closeSession} 
          />
        )}
        {hostingId && (
          <RemoteSessionView 
            remoteId={hostingId} 
            isHost={true}
            onClose={stopHosting} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
