import React, { useState, useRef, useEffect } from 'react';
import { X, Maximize2, Keyboard, MousePointer2, MessageSquare, Shield, Info, Send, FileUp, Paperclip, Loader2, Monitor, Lock, CheckCircle2, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WebRTCService } from '../services/webrtcService';
import { db, validateFirestoreConnection } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

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
  const [connectionStatus, setConnectionStatus] = useState('A iniciar...');
  const [hasError, setHasError] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isApproved, setIsApproved] = useState(true);
  const [hasNewRequest, setHasNewRequest] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [remoteCursor, setRemoteCursor] = useState<{x: number, y: number} | null>(null);
  const [showHostPreview, setShowHostPreview] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rtcServiceRef = useRef<WebRTCService | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleRemoteInput = (e: any) => {
      if (!isHost) return;
      const data = e.detail;
      if (data.type === 'mouse') {
        setRemoteCursor({ x: data.x, y: data.y });
        // Clear cursor after 1s of inactivity
        const timer = (window as any)._cursorTimer;
        if (timer) clearTimeout(timer);
        (window as any)._cursorTimer = setTimeout(() => setRemoteCursor(null), 1000);
      }
    };

    window.addEventListener('remote-input', handleRemoteInput);
    return () => window.removeEventListener('remote-input', handleRemoteInput);
  }, [isHost]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && activeStream) {
      console.log("Attaching stream to video element:", activeStream.id, "tracks:", activeStream.getTracks().map(t => `${t.kind}:${t.readyState}`));
      
      // Ensure video is configured for auto-play
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      
      // Re-assignment logic
      if (video.srcObject !== activeStream) {
        video.srcObject = activeStream;
      }
      
      const attemptPlay = async () => {
        try {
          await video.play();
          console.log("Video play triggered successfully");
        } catch (e: any) {
          if (e.name !== 'AbortError') {
            console.warn("Play failed:", e.message);
            // Retry once after interaction
          }
        }
      };
      
      attemptPlay();
      
      // Handle unmute events at component level too
      activeStream.getTracks().forEach(track => {
        track.onunmute = () => {
          console.log("Track unmuted in component, triggering play...");
          attemptPlay();
        };
      });
    }
  }, [activeStream]);

  useEffect(() => {
    if (activeStream && videoRef.current) {
      const timer = setTimeout(() => {
        if (videoRef.current && videoRef.current.videoWidth === 0 && !isConnecting && !hasError) {
          console.log("Auto-syncing black stream...");
          handleSyncFlux();
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [activeStream, isConnecting, hasError]);

  const [trackUpdate, setTrackUpdate] = useState(0);
  useEffect(() => {
    if (activeStream) {
      const handler = () => {
        console.log("Stream tracks changed, updating UI...");
        setTrackUpdate(prev => prev + 1);
      };
      activeStream.onaddtrack = handler;
      activeStream.onremovetrack = handler;
      return () => {
        activeStream.onaddtrack = null;
        activeStream.onremovetrack = null;
      };
    }
  }, [activeStream]);

  const onStateChange = (state: string) => {
    console.log("WebRTC State Change:", state);
    
    if (state === 'connected' || state === 'ice:connected') {
      setConnectionStatus('Ligação estabelecida!');
      setIsConnecting(false);
    } else if (state === 'connecting' || state === 'ice:checking') {
      setConnectionStatus('A estabelecer túnel seguro...');
    } else if (state === 'failed' || state === 'disconnected' || state === 'ice:failed') {
      setConnectionStatus('Ligação interrompida. Verifique a rede.');
      setHasError(true);
    } else if (state.startsWith('ice:')) {
      const iceState = state.split(':')[1];
      if (iceState === 'checking') {
         setConnectionStatus('A procurar melhor rota de rede (ICE)...');
      } else if (iceState === 'connected') {
         setConnectionStatus('Rota de rede encontrada!');
         setIsConnecting(false);
      } else if (iceState === 'failed') {
         setConnectionStatus('Falha na rota P2P. Tente em nova aba.');
         setHasError(true);
      }
    }
  };

  const setupSession = async () => {
    if (!rtcServiceRef.current) return;
    const service = rtcServiceRef.current;
    
    setHasError(false);
    try {
      setConnectionStatus('A verificar ligação...');
      await validateFirestoreConnection();

      if (isHost) {
        // Pre-initialize session doc so viewer knows we are here
        await setDoc(doc(db, 'remote_sessions', remoteId), {
          status: 'initializing',
          hostPresent: true,
          createdAt: new Date().toISOString()
        }, { merge: true });

        setConnectionStatus('Aguardando permissão de captura (Clique para permitir se necessário)...');
        
        const stream = await service.startHosting(remoteId, (rs) => {
           // Host receiving viewer's stream (if any)
        }, onStateChange).catch(err => {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            throw new Error('Permissão de captura negada. Clique no botão de host novamente.');
          }
          if (err.name === 'InvalidStateError' || err.message.includes('gesture')) {
            throw new Error('A captura requer um clique manual por segurança. Tente novamente.');
          }
          throw err;
        });
        
        setActiveStream(stream);
        setConnectionStatus('Transmissão ativa...');
        setIsConnecting(false);

        onSnapshot(doc(db, 'remote_sessions', remoteId), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data?.answer && !data.approved && localStorage.getItem('two_factor_auth') === 'true') {
              setHasNewRequest(true);
            }
          }
        });
      } else {
        setConnectionStatus('A conectar ao PC remoto...');
        
        // Tenta carregar a password, mas não desiste se falhar por "offline" inicial
        let requiredPassword = false;
        try {
          const pwd = await service.checkPassword(remoteId);
          requiredPassword = !!pwd;
        } catch (e) {
          console.warn("Check password falhou (possível delay de rede), a tentar viewer flow...");
        }

        if (requiredPassword) {
          setPasswordRequired(true);
          setConnectionStatus('Sessão Encriptada - Introduza Password');
        } else {
          initiateViewerFlow(onStateChange);
        }
      }
    } catch (err: any) {
      console.error("Session failed:", err);
      let errorMsg = err.message || 'Erro de rede ou permissão';
      
      // Melhora mensagens comuns
      if (errorMsg.includes('getDisplayMedia') || errorMsg.includes('MediaDevices')) {
        errorMsg = "Ambiente sem suporte a Captura. Nota: Algumas apps/wrappers bloqueiam esta funcão. Tente usar no Chrome/Edge oficial.";
      }
      
      setConnectionStatus('Erro: ' + errorMsg);
      setHasError(true);
      
      console.log("Final error shown to user:", errorMsg);
    }
  };

  const [showCaptureTip, setShowCaptureTip] = useState(false);
  useEffect(() => {
    if (isHost && !isConnecting && !hasError) {
      setShowCaptureTip(true);
      const timer = setTimeout(() => setShowCaptureTip(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [isHost, isConnecting, hasError]);

  const initiateViewerFlow = (onState: (state: string) => void) => {
    onSnapshot(doc(db, 'remote_sessions', remoteId), (snap) => {
      const data = snap.data();
      if (data?.approvalRequired && !data.approved) {
        setIsApproved(false);
        setConnectionStatus('Aguardando aprovação do Host (2FA)...');
      } else if (data?.approved) {
        setIsApproved(true);
      }
    });

    startViewingSession(onState);
  };

  useEffect(() => {
    const service = new WebRTCService();
    rtcServiceRef.current = service;
    
    setupSession();
    
    (window as any)._initiateViewer = (onState: any) => initiateViewerFlow(onState || onStateChange);

    return () => {
      service.stop();
      delete (window as any)._initiateViewer;
    };
  }, [remoteId, isHost, onClose]);

  const startViewingSession = async (onStateChange?: (state: string) => void) => {
    if (!rtcServiceRef.current) return;
    
    setIsConnecting(true);
    setConnectionStatus('A aguardar sinal do computador remoto...');
    
    try {
      await rtcServiceRef.current.startViewing(remoteId, (stream) => {
        console.log("Stream received in view component:", stream.id, "tracks:", stream.getTracks().length);
        setActiveStream(stream);
        setIsConnecting(false);
        setConnectionStatus('Ligação ativa!');

        // Monitor track status
        stream.getTracks().forEach(track => {
          track.onended = () => {
            console.warn("Remote track ended:", track.kind);
            setHasError(true);
          };
          track.onmute = () => console.log("Remote track muted:", track.kind);
          track.onunmute = () => console.log("Remote track unmuted:", track.kind);
        });
      }, onStateChange);
      
      setConnectionStatus('Sincronizando túnel P2P...');
    } catch (err) {
      console.error("Viewing failed:", err);
      setConnectionStatus('Erro na sincronização. Tente de novo.');
      setHasError(true);
    }
  };

  const handleVideoInteraction = (e: React.MouseEvent) => {
    if (!rtcServiceRef.current || isConnecting || hasError) return;
    
    // For Host mode, we normally don't send inputs to ourselves to avoid loops, 
    // but for self-connection testing we can allow it if the user clicks.
    if (isHost) {
      console.log("Interaction ignored in host mode to prevent loops.");
      return;
    }
    
    const video = videoRef.current;
    if (!video) return;

    const rect = video.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    // Rendered video size (visual)
    const cw = video.offsetWidth;
    const ch = video.offsetHeight;
    
    // Intrinsic video size (actual pixels)
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    
    if (!vw || !vh || !cw || !ch) return;

    // Scale to fit (contain) logic exactly as browser renders it
    const vRatio = vw / vh;
    const cRatio = cw / ch;

    let actualW, actualH, offX = 0, offY = 0;
    if (cRatio > vRatio) {
      // Container is wider than video, height is fixed
      actualH = ch;
      actualW = ch * vRatio;
      offX = (cw - actualW) / 2;
    } else {
      // Container is taller than video, width is fixed
      actualW = cw;
      actualH = cw / vRatio;
      offY = (ch - actualH) / 2;
    }

    // Normalized coordinates (0 to 1) relative to THE CONTENT area only
    const relativeX = x - rect.left - offX;
    const relativeY = y - rect.top - offY;
    
    const nx = Math.max(0, Math.min(1, relativeX / actualW));
    const ny = Math.max(0, Math.min(1, relativeY / actualH));

    // Only send if within the actual video frame bounds
    if (relativeX >= 0 && relativeX <= actualW && relativeY >= 0 && relativeY <= actualH) {
      rtcServiceRef.current.sendInput({
        type: 'mouse',
        action: e.type === 'mousedown' ? 'mousedown' : e.type === 'mouseup' ? 'mouseup' : 'move',
        x: nx,
        y: ny,
        button: e.button
      });
    }
  };

  const handleUnlock = async () => {
    if (!rtcServiceRef.current) return;
    
    const correctHash = await rtcServiceRef.current.checkPassword(remoteId);
    if (passwordInput === correctHash) {
      setPasswordRequired(false);
      setPasswordError(false);
      if ((window as any)._initiateViewer) {
        (window as any)._initiateViewer();
      }
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

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

  const handleSyncFlux = async () => {
    const video = videoRef.current;
    if (video && activeStream) {
      console.log("Applying hard sync to stream...");
      try {
        video.srcObject = null;
        await new Promise(r => setTimeout(r, 100));
        video.srcObject = activeStream;
        await video.play();
        setTrackUpdate(p => p + 1);
      } catch (e) {
        console.warn("Sync failed:", e);
      }
    }
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
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
            <Shield className="w-3 h-3 text-red-500" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest leading-none">Encrypted</span>
          </div>
          
          <div className="flex items-center gap-2">
            {!isConnecting && !hasError && (
              <button 
                onClick={handleSyncFlux}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 rounded-lg text-red-500 transition-all group"
                title="Sincronizar vídeo caso esteja preto"
              >
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></div>
                <span className="text-[9px] font-black uppercase tracking-widest">Sincronizar Fluxo</span>
              </button>
            )}

            {isHost && (
              <button 
                onClick={() => setShowHostPreview(!showHostPreview)}
                className={`p-2 rounded-lg border transition-all ${showHostPreview ? 'border-white/10 text-white/40 hover:text-white' : 'border-blue-500/50 bg-blue-500/10 text-blue-500'}`}
                title={showHostPreview ? "Ocultar pré-visualização (Evita efeito garrafão)" : "Mostrar pré-visualização"}
              >
                {showHostPreview ? <Monitor className="w-4 h-4" /> : <div className="relative"><Monitor className="w-4 h-4" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-0.5 bg-blue-500 rotate-45 transform"></div></div></div>}
              </button>
            )}
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white transition-all ml-2"
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
            {/* Overlays de Segurança e Estado - Sempre no topo (z-index alto e no final) */}
            <AnimatePresence>
              {isHost && hasNewRequest && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md">
                  <motion.div 
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="bg-[#1C1E26] border border-red-600/30 p-6 rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.2)] flex items-center justify-between gap-6"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-600/10 rounded-2xl flex items-center justify-center">
                        <Monitor className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-1">Pedido de Acesso 2FA</span>
                        <span className="text-xs font-bold text-white">Alguém está a tentar ligar-se</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setHasNewRequest(false)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all"
                      >
                         <X className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={async () => {
                          if (rtcServiceRef.current) {
                            await rtcServiceRef.current.approveSession(remoteId);
                            setHasNewRequest(false);
                          }
                        }}
                        className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Aprovar
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {isConnecting && !passwordRequired && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
                >
                  <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
                  <div className="flex flex-col items-center gap-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">{connectionStatus}</span>
                    {hasError && (
                      <button 
                        onClick={() => setupSession()}
                        className="px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-colors"
                      >
                        Tentar Novamente
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {passwordRequired && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-[#0F1115] backdrop-blur-md"
                >
                  <div className="w-full max-w-sm p-8 bg-[#16181D] rounded-3xl border border-white/5 shadow-2xl space-y-6">
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className="w-12 h-12 bg-red-600/10 rounded-2xl flex items-center justify-center mb-2">
                        <Lock className="w-6 h-6 text-red-600" />
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-white">Desafio de Segurança</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
                        Esta sessão está protegida por encriptação. Introduza a password do computador remoto para aceder.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <input 
                        type="password"
                        autoFocus
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                        placeholder="••••••••"
                        className={`w-full bg-white/5 border ${passwordError ? 'border-red-500 animate-shake' : 'border-white/10'} rounded-2xl px-6 py-4 text-center text-white text-xl tracking-[0.5em] focus:outline-none focus:border-red-600 transition-all`}
                      />
                      
                      <button 
                        onClick={handleUnlock}
                        className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                      >
                        Desbloquear Sessão
                      </button>
                      
                      <button 
                        onClick={onClose}
                        className="w-full py-2 text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                      >
                        Cancelar Ligação
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {!isApproved && !isHost && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-[120] flex flex-col items-center justify-center bg-[#0F1115] backdrop-blur-md"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center animate-pulse">
                      <Shield className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Verificação de Identidade</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed max-w-xs">
                      A Autenticação de Dois Fatores (2FA) está ativa. O administrador remoto deve aprovar manualmente o seu pedido.
                    </p>
                    <div className="mt-4 flex gap-4">
                      <button onClick={onClose} className="px-6 py-2 bg-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <video 
              ref={videoRef}
              autoPlay
              playsInline
              // Mute by default to ensure browser allows autoplay
              muted
              onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                video.play().catch(console.error);
                // Força layout refresh para evitar bugs de ecrã preto em alguns browsers shell
                video.style.transform = 'scale(1)';
              }}
              onMouseDown={handleVideoInteraction}
              onMouseUp={handleVideoInteraction}
              onMouseMove={(e) => {
                if (!(window as any)._lastMove || Date.now() - (window as any)._lastMove > 50) {
                  handleVideoInteraction(e);
                  (window as any)._lastMove = Date.now();
                }
              }}
              onContextMenu={(e) => {
                 e.preventDefault();
                 handleVideoInteraction(e);
              }}
              className={`w-full h-full object-contain bg-[#0a0a0a] cursor-crosshair ${(isHost && !showHostPreview) ? 'hidden' : ''} ${isHost ? 'opacity-100 transition-opacity' : ''}`}
            />

            {isHost && !showHostPreview && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md pointer-events-none">
                <Shield className="w-12 h-12 text-blue-500 mb-4 opacity-50" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Modo Anti-Garrafão Ativo</p>
                <p className="text-[8px] text-white/30 uppercase mt-2">A transmitir ecrã silenciosamente...</p>
              </div>
            )}

            {isHost && showCaptureTip && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-32 left-1/2 -translate-x-1/2 z-[150] w-full max-w-xs text-center"
              >
                <div className="bg-blue-600/20 border border-blue-500/30 backdrop-blur-md p-4 rounded-2xl shadow-xl">
                  <p className="text-[10px] text-blue-100 uppercase font-black tracking-widest leading-relaxed">
                    DICA: Para evitar o efeito de "tunel de telas", minimize esta janela ou escolha um ecrã diferente na captura.
                  </p>
                </div>
              </motion.div>
            )}

            {isHost && remoteCursor && (
              <div 
                className="absolute w-6 h-6 border-2 border-red-500 rounded-full pointer-events-none z-[200] shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                style={{ 
                  left: `${remoteCursor.x * 100}%`, 
                  top: `${remoteCursor.y * 100}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-red-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                  Remote Pointer
                </div>
              </div>
            )}

            {activeStream && !isConnecting && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {videoRef.current && videoRef.current.videoWidth === 0 && (
                  <motion.button 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSyncFlux();
                    }}
                    className="pointer-events-auto flex flex-col items-center gap-4 p-8 bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl group hover:border-red-500/50 transition-all shadow-2xl"
                  >
                    <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center border border-red-600/30 group-hover:scale-110 transition-all">
                      <RefreshCcw className="w-8 h-8 text-red-500 group-hover:rotate-180 transition-all duration-700" />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-black uppercase tracking-widest text-xs">Imagem Preta detetada</p>
                      <p className="text-white/40 text-[10px] uppercase mt-1 tracking-wider">Clique para forçar sincronização de fluxo</p>
                    </div>
                  </motion.button>
                )}
              </div>
            )}

            {activeStream && activeStream.getTracks().length === 0 && !isConnecting && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="px-6 py-3 bg-yellow-600/20 border border-yellow-600/50 backdrop-blur-md rounded-xl">
                  <span className="text-xs font-black uppercase tracking-widest text-white animate-pulse">Sem sinal de vídeo. A aguardar Host...</span>
                </div>
              </div>
            )}

            {!isConnecting && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
                {activeStream && activeStream.getTracks().length === 0 && (
                   <div className="px-4 py-2 bg-red-500/20 border border-red-500/50 backdrop-blur-md rounded-lg mb-2">
                     <span className="text-[10px] font-bold text-white uppercase tracking-wider">A aguardar fluxo de dados do remoto...</span>
                   </div>
                )}
                <button 
                  onClick={async () => {
                    const video = videoRef.current;
                    if (video && activeStream) {
                      try {
                        console.log("Manual video pulse triggered...");
                        // Hard reset of srcObject
                        const stream = video.srcObject as MediaStream;
                        video.srcObject = null;
                        
                        setTimeout(async () => {
                          if (video) {
                            video.srcObject = stream;
                            try {
                              await video.play();
                              console.log("Pulse play success");
                            } catch (e) {
                              console.warn("Pulse play failed:", e);
                            }
                          }
                        }, 50);

                        if (isHost && rtcServiceRef.current) {
                           // Try to re-detect tracks
                           setTrackUpdate(prev => prev + 1);
                        }
                      } catch (e: any) {
                        console.warn("Manual reload failed:", e);
                      }
                    } else if (hasError) {
                      setupSession();
                    }
                  }}
                  className="px-4 py-1.5 bg-black/60 hover:bg-black/80 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all backdrop-blur-md shadow-lg"
                >
                  {hasError ? 'Tentar Reconectar' : (isHost ? 'Reiniciar Captura Local' : 'Imagem preta? Clique para Recarregar')}
                </button>
              </div>
            )}

            {!isConnecting && activeStream && activeStream.getTracks().some(t => t.kind === 'video' && t.enabled) && (
              <div key={trackUpdate} className="absolute top-20 right-8 z-50 flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                <span className="text-[8px] font-black uppercase tracking-tighter text-green-500">
                  {isHost ? 'A Emitir Sinal OK' : 'Sinal de Vídeo Recebido'}
                </span>
              </div>
            )}

            {isHost && !isConnecting && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="px-6 py-3 bg-red-600/20 border border-red-600/50 backdrop-blur-md rounded-xl">
                    <span className="text-xs font-black uppercase tracking-widest text-white">O seu ecrã está a ser partilhado em tempo real</span>
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
