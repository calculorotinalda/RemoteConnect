import { 
  doc, 
  setDoc, 
  onSnapshot, 
  addDoc, 
  collection, 
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const servers: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302', 
        'stun:stun2.l.google.com:19302', 
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
        'stun:stun.l.google.com:19302',
        'stun:stun.services.mozilla.com',
        'stun:stun.stunprotocol.org',
        'stun:stun.vusec.net',
        'stun:stun.iphone-dev.com'
      ],
    },
  ],
  iceCandidatePoolSize: 10
};

export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private iceQueue: RTCIceCandidateInit[] = [];

  constructor() {
    // We'll create the PC in the start methods to ensure a fresh one
  }

  private createPeerConnection(onStateChange?: (state: string) => void) {
    if (this.pc) {
      try {
        this.pc.close();
        this.pc = null;
      } catch (e) {
        console.warn("Error closing previous PC:", e);
      }
    }

    console.log("Creating PeerConnection...");
    try {
      // Use the global RTCPeerConnection constructor directly to avoid any proxy/context issues
      if (typeof window.RTCPeerConnection !== 'undefined') {
        this.pc = new RTCPeerConnection(servers);
      } else {
        const vendorRTC = (window as any).webkitRTCPeerConnection || (window as any).mozRTCPeerConnection;
        if (vendorRTC) {
          this.pc = new vendorRTC(servers);
        } else {
          throw new Error("RTCPeerConnection not supported");
        }
      }
      
      this.pc.onconnectionstatechange = () => {
        if (onStateChange) onStateChange(this.pc?.connectionState || 'unknown');
      };
      
      this.pc.oniceconnectionstatechange = () => {
        const state = this.pc?.iceConnectionState;
        console.log("ICE State:", state);
        if (onStateChange) onStateChange(`ice:${state}`);
      };
    } catch (err) {
      console.error("Failed to construct RTCPeerConnection:", err);
      if (onStateChange) onStateChange('error:Construction failed');
      throw err;
    }
  }

  private async addCandidate(candidate: any) {
    if (!this.pc) return;
    try {
      console.log("Attempting to add ICE candidate...", !!this.pc.remoteDescription);
      if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
        // Some browsers return RTCIceCandidate objects that need serialization
        const candidateData = candidate.candidate ? candidate : { candidate };
        const iceCandidate = new RTCIceCandidate(candidateData as any);
        await this.pc.addIceCandidate(iceCandidate);
        console.log("ICE candidate added successfully");
      } else {
        console.log("Remote description not set yet, queuing candidate");
        this.iceQueue.push(candidate);
      }
    } catch (e) {
      console.warn("ICE error ignored:", e);
    }
  }

  private async processIceQueue() {
    if (!this.pc) return;
    console.log("Processing queued candidates:", this.iceQueue.length);
    while (this.iceQueue.length > 0) {
      const candidate = this.iceQueue.shift();
      if (candidate) {
        try {
          const iceCandidate = new RTCIceCandidate(candidate);
          await this.pc.addIceCandidate(iceCandidate);
        } catch (e) {
          console.warn("Queue ICE error:", e);
        }
      }
    }
  }

  private async cleanupSession(sessionId: string) {
    try {
      const sessionDoc = doc(db, 'remote_sessions', sessionId);
      const callerCandidates = collection(sessionDoc, 'callerCandidates');
      const calleeCandidates = collection(sessionDoc, 'calleeCandidates');
      
      const [callerSnap, calleeSnap] = await Promise.all([
        getDocs(callerCandidates),
        getDocs(calleeCandidates)
      ]);
      
      const deletions = [
        ...callerSnap.docs.map(d => deleteDoc(d.ref)),
        ...calleeSnap.docs.map(d => deleteDoc(d.ref))
      ];
      
      await Promise.all(deletions);
    } catch (e) {
      console.warn("Cleanup warning:", e);
    }
  }

  async startHosting(sessionId: string, onRemoteStream: (stream: MediaStream) => void, onStateChange?: (state: string) => void) {
    await this.cleanupSession(sessionId);
    this.createPeerConnection(onStateChange);
    
    if (!this.pc) throw new Error("Failed to create PeerConnection");

    this.pc.onicecandidate = (event) => {
      if (event.candidate && event.candidate.candidate) {
        const c = {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: (event.candidate as any).usernameFragment || null
        };
        addDoc(collection(doc(db, 'remote_sessions', sessionId), 'callerCandidates'), c)
          .catch(e => console.error("Error sending candidate:", e));
      }
    };

    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        onRemoteStream(this.remoteStream);
      }
    };

    try {
      console.log("Requesting screen capture...");
      this.localStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          cursor: "always",
          displaySurface: "monitor",
          frameRate: { ideal: 30, max: 60 },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } as any,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } as any
      });
      
      if (!this.localStream || this.localStream.getTracks().length === 0) {
        throw new Error("Nenhum sinal capturado. Verifique as permissões do navegador.");
      }

      console.log("Capture granted, tracks:", this.localStream.getTracks().map(t => `${t.kind}:${t.enabled}`));
      
      this.localStream.getTracks().forEach(t => {
        if (this.pc) {
          console.log(`Adding ${t.kind} track to PC...`);
          this.pc.addTrack(t, this.localStream!);
        }
      });

      // Monitor stream health
      this.localStream.getTracks().forEach(t => {
        t.onended = () => {
          console.warn("Local track ended:", t.kind);
          if (onStateChange) onStateChange('Captura interrompida pelo sistema ou utilizador.');
        };
      });
    } catch (err) { 
      console.error("Capture failed or cancelled:", err);
      throw err; 
    }

    const offerDescription = await this.pc.createOffer();
    await this.pc.setLocalDescription(offerDescription);

    const sessionPassword = localStorage.getItem('session_password');
    const is2FA = localStorage.getItem('two_factor_auth') === 'true';

    await setDoc(doc(db, 'remote_sessions', sessionId), { 
      offer: { type: offerDescription.type, sdp: offerDescription.sdp },
      createdAt: new Date().toISOString(),
      passwordRequired: !!sessionPassword,
      passwordHash: sessionPassword,
      approvalRequired: is2FA,
      approved: !is2FA,
      answer: null
    });

    onSnapshot(doc(db, 'remote_sessions', sessionId), async (snapshot) => {
      const data = snapshot.data();
      if (data?.answer && this.pc && !this.pc.currentRemoteDescription) {
        console.log("Answer received, setting remote description...");
        const answer = new RTCSessionDescription(data.answer);
        await this.pc.setRemoteDescription(answer);
        await this.processIceQueue();
      }
    });

    onSnapshot(collection(doc(db, 'remote_sessions', sessionId), 'calleeCandidates'), (sk) => {
      sk.docChanges().forEach(change => {
        if (change.type === 'added') this.addCandidate(change.doc.data());
      });
    });

    return this.localStream;
  }

  async startViewing(sessionId: string, onRemoteStream: (stream: MediaStream) => void, onStateChange?: (state: string) => void) {
    const sessionDoc = doc(db, 'remote_sessions', sessionId);
    this.createPeerConnection(onStateChange);
    
    if (!this.pc) throw new Error("Failed to create PeerConnection");

    this.iceQueue = [];

    this.pc.onicecandidate = (event) => {
      if (event.candidate && event.candidate.candidate) {
        const c = {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: (event.candidate as any).usernameFragment || null
        };
        addDoc(collection(sessionDoc, 'calleeCandidates'), c)
          .catch(e => console.error("Error sending callee candidate:", e));
      }
    };

    this.pc.ontrack = (event) => {
      console.log("Remote track received:", event.track.kind, "id:", event.track.id);
      
      const updateStream = () => {
        if (this.remoteStream) {
          console.log("Signaling stream update to UI...");
          // Pass a new MediaStream object to force React to update its state
          // but reuse the existing tracks to avoid re-negotiation
          onRemoteStream(new MediaStream(this.remoteStream.getTracks()));
        }
      };

      event.track.onmute = () => {
        console.warn("Remote track muted:", event.track.kind);
        updateStream();
      };
      
      event.track.onunmute = () => {
        console.log("Remote track unmuted (data flowing):", event.track.kind);
        updateStream();
      };

      if (!this.remoteStream) {
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
        } else {
          this.remoteStream = new MediaStream([event.track]);
        }
      } else {
        const existingTracks = this.remoteStream.getTracks();
        if (!existingTracks.find(t => t.id === event.track.id)) {
          this.remoteStream.addTrack(event.track);
        }
      }
      
      updateStream();
    };

    return new Promise<void>((resolve, reject) => {
      console.log("Starting onSnapshot listener for session:", sessionId);
      const unsubscribe = onSnapshot(sessionDoc, async (snapshot) => {
        if (!snapshot.exists()) {
          console.log("Session document does not exist yet. Waiting for Host...");
          if (onStateChange) onStateChange('A aguardar sinal do computador remoto...');
          return;
        }

        const data = snapshot.data();
        console.log("Session snapshot update received:", { 
          hasOffer: !!data?.offer, 
          status: data?.status,
          hostPresent: data?.hostPresent
        });

        if (data?.status === 'initializing' && !data?.offer) {
          if (onStateChange) onStateChange('Computador remoto detetado. Aguardando captura...');
        }

        if (data?.offer && this.pc && !this.pc.currentRemoteDescription) {
          try {
            console.log("Offer detected! Setting remote description...");
            if (onStateChange) onStateChange('Sinal recebido, a processar...');
            
            const offer = new RTCSessionDescription(data.offer);
            await this.pc.setRemoteDescription(offer);
            
            console.log("Creating answer...");
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            
            console.log("Sending answer to Firestore...");
            await updateDoc(sessionDoc, { 
              answer: { type: answer.type, sdp: answer.sdp },
              viewerConnectedAt: new Date().toISOString()
            });
            
            await this.processIceQueue();
            resolve();
          } catch (e) {
            console.error("Signaling error in viewer:", e);
            unsubscribe();
            reject(e);
          }
        }
      }, (error) => {
        console.error("Session snapshot error:", error);
        unsubscribe();
        reject(error);
      });

      onSnapshot(collection(sessionDoc, 'callerCandidates'), (sk) => {
        sk.docChanges().forEach(change => {
          if (change.type === 'added') this.addCandidate(change.doc.data());
        });
      });
    });
  }

  stop() {
    this.localStream?.getTracks().forEach(t => t.stop());
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }

  async checkPassword(sessionId: string): Promise<string | null> {
    const sessionSnapshot = await getDoc(doc(db, 'remote_sessions', sessionId));
    if (sessionSnapshot.exists()) {
      const data = sessionSnapshot.data();
      return data.passwordRequired ? data.passwordHash : null;
    }
    return null;
  }

  async approveSession(sessionId: string) {
    const sessionDoc = doc(db, 'remote_sessions', sessionId);
    await updateDoc(sessionDoc, { approved: true });
  }
}
