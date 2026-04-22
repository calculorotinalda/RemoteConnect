import { useState, useRef, useEffect } from 'react';
import { X, Maximize2, Keyboard, MousePointer2, MessageSquare, Shield, Info, Send, FileUp, Paperclip, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WebRTCService } from '../services/webrtcService';

interface Message {
  id: string;
  sender: 'me' | 'remote';
  text: string;
  time: string;
}

interface TransferFile {
  id: string;
  name: string;
  size: string;
  progress: number;
}

interface RemoteSessionViewProps {
  remoteId: string;
  onClose: () => void;
  isHost?: boolean;
}

export default function RemoteSessionView({ remoteId, onClose, isHost = false }: RemoteSessionViewProps) {
  const [activePanel, setActivePanel] = useState<'none' | 'chat' | 'files'>('none');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [transfers, setTransfers] = useState<TransferFile[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');
  const videoRef = useRef<HTMLVideoElement>(null);
  const rtcServiceRef = useRef<WebRTCService | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const service = new WebRTCService();
    rtcServiceRef.current = service;

    const setupSession = async () => {
      try {
        if (isHost) {
          setConnectionStatus('Waiting for screen capture permission...');
          const stream = await service.startHosting(remoteId, (remoteStream) => {
             // ...
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setConnectionStatus('Broadcasting screen...');
            setIsConnecting(false);
          }
        } else {
          setConnectionStatus('Searching for remote host...');
          await service.startViewing(remoteId, (remoteStream) => {
            console.log("Stream received in view component:", remoteStream);
            if (videoRef.current) {
              videoRef.current.srcObject = remoteStream;
              videoRef.current.play().catch(e => console.error("Video play failed:", e));
              setIsConnecting(false);
            }
          });
          setConnectionStatus('Synchronizing P2P tunnel...');
        }
      } catch (err) {
        console.error("Session failed:", err);
        setConnectionStatus('Error: ' + (err as Error).message);
        setTimeout(onClose, 3000);
      }
    };

    setupSession();

    return () => {
      service.stop();
    };
  }, [remoteId, isHost, onClose]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activePanel]);

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'me',
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    
    // Simulate reply
    setTimeout(() => {
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'remote',
        text: 'Message received on ' + remoteId,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, reply]);
    }, 1500);
  };

  const simulateUpload = () => {
    const newFile: TransferFile = {
      id: Date.now().toString(),
      name: `Document_${Math.floor(Math.random() * 100)}.pdf`,
      size: '2.4 MB',
      progress: 0
    };
    setTransfers(prev => [...prev, newFile]);

    const interval = setInterval(() => {
      setTransfers(prev => prev.map(f => {
        if (f.id === newFile.id) {
          const next = f.progress + 10;
          if (next >= 100) clearInterval(interval);
          return { ...f, progress: Math.min(next, 100) };
        }
        return f;
      }));
    }, 300);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      {/* Session Toolbar */}
      <header className="h-12 bg-slate-900 border-b border-white/5 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Live Session: {remoteId}</span>
          </div>
          <div className="h-4 w-px bg-white/10 hidden md:block"></div>
          <div className="hidden md:flex items-center gap-2">
            <button className="p-2 text-white/40 hover:text-white transition-colors"><Keyboard className="w-4 h-4" /></button>
            <button className="p-2 text-white/40 hover:text-white transition-colors "><MousePointer2 className="w-4 h-4" /></button>
            <button 
              onClick={() => setActivePanel(activePanel === 'chat' ? 'none' : 'chat')}
              className={`p-2 transition-colors flex items-center gap-2 ${activePanel === 'chat' ? 'text-red-500 bg-red-500/10 rounded-lg' : 'text-white/40 hover:text-white'}`}
            >
              <MessageSquare className="w-4 h-4" />
              {messages.length > 0 && <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>}
            </button>
            <button 
              onClick={() => setActivePanel(activePanel === 'files' ? 'none' : 'files')}
              className={`p-2 transition-colors flex items-center gap-2 ${activePanel === 'files' ? 'text-red-500 bg-red-500/10 rounded-lg' : 'text-white/40 hover:text-white'}`}
            >
              <FileUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
            <Shield className="w-3 h-3 text-red-500" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest leading-none">Encrypted</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Remote Screen */}
        <main className="flex-1 relative bg-[#0A0B0E] flex items-center justify-center p-4">
          <motion.div 
            layout
            className="relative w-full max-w-6xl aspect-video bg-[#16181D] rounded-xl shadow-2xl border border-white/5 overflow-hidden flex items-center justify-center"
          >
            {isConnecting && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">{connectionStatus}</span>
              </div>
            )}
            
            <video 
              ref={videoRef}
              autoPlay
              playsInline
              // Mute by default to ensure browser allows autoplay
              muted
              className={`w-full h-full object-contain ${isHost ? 'opacity-30 grayscale blur-sm' : ''}`}
            />

            {!isHost && !isConnecting && (
              <motion.div 
                animate={{ x: [100, 400, 200, 500], y: [100, 200, 300, 100] }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute z-10 pointer-events-none"
              >
                <MousePointer2 className="w-5 h-5 text-white drop-shadow-lg fill-black" />
              </motion.div>
            )}

            {isHost && !isConnecting && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="px-6 py-3 bg-red-600/20 border border-red-600/50 backdrop-blur-md rounded-xl">
                    <span className="text-xs font-black uppercase tracking-widest text-white">Your screen is being shared in real-time</span>
                </div>
              </div>
            )}
          </motion.div>
        </main>

        {/* Side Panels */}
        <AnimatePresence mode="wait">
          {activePanel === 'chat' && (
            <motion.aside 
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              className="w-80 bg-[#16181D] border-l border-white/5 flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Secure Chat</span>
                <button onClick={() => setActivePanel('none')}><X className="w-4 h-4 text-white/20" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-10 opacity-20 flex flex-col items-center">
                    <MessageSquare className="w-8 h-8 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No messages yet</p>
                  </div>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`flex flex-col ${m.sender === 'me' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${m.sender === 'me' ? 'bg-red-600 text-white rounded-br-none' : 'bg-white/5 text-slate-300 rounded-bl-none'}`}>
                      {m.text}
                    </div>
                    <span className="text-[8px] font-bold opacity-30 mt-1 uppercase">{m.time}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 bg-black/30 border-t border-white/5">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-red-600 transition-colors"
                  />
                  <button onClick={sendMessage} className="p-2 bg-red-600 rounded-xl text-white hover:bg-red-500 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.aside>
          )}

          {activePanel === 'files' && (
            <motion.aside 
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              className="w-80 bg-[#16181D] border-l border-white/5 flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">File Transfer</span>
                <button onClick={() => setActivePanel('none')}><X className="w-4 h-4 text-white/20" /></button>
              </div>
              <div className="flex-1 p-4 space-y-4">
                <button 
                  onClick={simulateUpload}
                  className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center gap-2 hover:border-red-600/50 hover:bg-red-600/5 transition-all text-white/40 hover:text-red-500 group"
                >
                  <Paperclip className="w-6 h-6" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Post local file to remote</span>
                </button>

                <div className="space-y-3">
                  {transfers.length > 0 && <h4 className="text-[9px] font-black text-white/20 uppercase tracking-widest border-b border-white/5 pb-2">Active Transfers</h4>}
                  {transfers.map(f => (
                    <div key={f.id} className="bg-black/30 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-white/80 truncate w-40">{f.name}</span>
                          <span className="text-[9px] text-white/30">{f.size}</span>
                        </div>
                        {f.progress === 100 ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <div className="text-[10px] font-mono text-red-500">{f.progress}%</div>}
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${f.progress}%` }}
                          className="h-full bg-red-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Stats */}
      <footer className="h-8 bg-black px-6 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/10">
        <div className="flex gap-8">
          <span>Latency: 12ms</span>
          <span>Buffer: 16ms</span>
        </div>
        <div className="flex gap-8 text-green-500/30">
          <span>H.264 Accelerated</span>
          <span>Audio Feed Active</span>
        </div>
      </footer>
    </motion.div>
  );
}

function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}
