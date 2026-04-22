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

const servers = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302', 
        'stun:stun2.l.google.com:19302', 
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302'
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCService {
  private pc: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private iceQueue: RTCIceCandidateInit[] = [];

  constructor() {
    this.pc = new RTCPeerConnection(servers);
  }

  private async addCandidate(candidate: any) {
    const iceCandidate = new RTCIceCandidate(candidate);
    if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
      await this.pc.addIceCandidate(iceCandidate).catch(e => console.warn("ICE error:", e));
    } else {
      this.iceQueue.push(candidate);
    }
  }

  private async processIceQueue() {
    while (this.iceQueue.length > 0) {
      const candidate = this.iceQueue.shift();
      if (candidate) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn("Queue ICE error:", e));
      }
    }
  }

  private async cleanupSession(sessionId: string) {
    // ... (logic remains)
  }

  async startHosting(sessionId: string, onRemoteStream: (stream: MediaStream) => void) {
    await this.cleanupSession(sessionId);
    
    // Setup listeners before creating offer
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(collection(doc(db, 'remote_sessions', sessionId), 'callerCandidates'), event.candidate.toJSON());
      }
    };

    this.pc.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      onRemoteStream(this.remoteStream);
    };

    try {
      this.localStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always", frameRate: 60 },
        audio: true
      });
      this.localStream.getTracks().forEach(t => this.pc.addTrack(t, this.localStream!));
    } catch (err) { throw err; }

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
      approved: !is2FA
    });

    onSnapshot(doc(db, 'remote_sessions', sessionId), async (snapshot) => {
      const data = snapshot.data();
      if (data?.answer && !this.pc.currentRemoteDescription) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
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

  async startViewing(sessionId: string, onRemoteStream: (stream: MediaStream) => void) {
    const sessionDoc = doc(db, 'remote_sessions', sessionId);
    
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(collection(sessionDoc, 'calleeCandidates'), event.candidate.toJSON());
      }
    };

    this.pc.ontrack = (event) => {
      onRemoteStream(event.streams[0]);
    };

    return new Promise<void>((resolve) => {
      onSnapshot(sessionDoc, async (snapshot) => {
        const data = snapshot.data();
        if (data?.offer && !this.pc.currentRemoteDescription) {
          await this.pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          await updateDoc(sessionDoc, { answer: { type: answer.type, sdp: answer.sdp } });
          await this.processIceQueue();
          resolve();
        }
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
    this.pc.close();
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
