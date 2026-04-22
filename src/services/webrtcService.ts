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

  constructor() {
    this.pc = new RTCPeerConnection(servers);
  }

  private async cleanupSession(sessionId: string) {
     const sessionDoc = doc(db, 'remote_sessions', sessionId);
     const callerCandidates = collection(sessionDoc, 'callerCandidates');
     const calleeCandidates = collection(sessionDoc, 'calleeCandidates');
     
     // Delete old candidates
     const [sh1, sh2] = await Promise.all([getDocs(callerCandidates), getDocs(calleeCandidates)]);
     const deletions = [...sh1.docs, ...sh2.docs].map(d => deleteDoc(d.ref));
     await Promise.all(deletions);
     
     // Clear session doc but keep the object structure
     await setDoc(sessionDoc, { createdAt: new Date().toISOString(), status: 'hosting' });
  }

  async startHosting(sessionId: string, onRemoteStream: (stream: MediaStream) => void) {
    // 0. Cleanup any stale data from this ID
    await this.cleanupSession(sessionId);

    // 1. Get local screen stream
    try {
      // Basic options for high performance remote desktop
      const constraints: any = {
        video: {
          cursor: "always",
          frameRate: { ideal: 60, max: 60 },
          displaySurface: "monitor" // Suggest monitor to the browser
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      };

      this.localStream = await navigator.mediaDevices.getDisplayMedia(constraints);
    } catch (err) {
      console.error("Error capturing screen:", err);
      throw err;
    }

    // Ensure we close session if user stops sharing via browser bar
    this.localStream.getVideoTracks()[0].onended = () => {
      this.stop();
    };

    // 2. Add local tracks to pc
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.pc.addTrack(track, this.localStream!);
      });
    }

    // 3. Setup remote stream listener
    this.pc.ontrack = (event) => {
      console.log("Remote track received:", event.streams[0]);
      this.remoteStream = event.streams[0];
      onRemoteStream(this.remoteStream);
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log("ICE Connection State:", this.pc.iceConnectionState);
    };

    // 4. Setup signalling doc
    const sessionDoc = doc(db, 'remote_sessions', sessionId);
    const callerCandidates = collection(sessionDoc, 'callerCandidates');
    const calleeCandidates = collection(sessionDoc, 'calleeCandidates');

    // 5. Build ICE candidates for caller
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(callerCandidates, event.candidate.toJSON());
      }
    };

    // 6. Create offer
    const offerDescription = await this.pc.createOffer();
    await this.pc.setLocalDescription(offerDescription);

    const offer = {
      type: offerDescription.type,
      sdp: offerDescription.sdp,
    };

    await setDoc(sessionDoc, { offer, createdAt: new Date().toISOString() });

    // 7. Listen for remote answer
    onSnapshot(sessionDoc, (snapshot) => {
      const data = snapshot.data();
      if (!this.pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        this.pc.setRemoteDescription(answerDescription);
      }
    });

    // 8. Listen for remote ICE candidates
    onSnapshot(calleeCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          console.log("Adding remote ICE candidate (caller side)");
          const data = change.doc.data();
          this.pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });

    return this.localStream;
  }

  async startViewing(sessionId: string, onRemoteStream: (stream: MediaStream) => void) {
    const sessionDoc = doc(db, 'remote_sessions', sessionId);
    const callerCandidates = collection(sessionDoc, 'callerCandidates');
    const calleeCandidates = collection(sessionDoc, 'calleeCandidates');

    console.log(`Starting viewing session: ${sessionId}`);

    // 1. Build ICE candidates for callee
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Generating callee ICE candidate");
        addDoc(calleeCandidates, event.candidate.toJSON());
      }
    };

    // 2. Setup remote stream listener
    this.pc.ontrack = (event) => {
      console.log("Viewer received remote track:", event.streams[0]);
      this.remoteStream = event.streams[0];
      onRemoteStream(this.remoteStream);
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log("Viewer ICE Connection State:", this.pc.iceConnectionState);
    };

    // 3. Listen for offer from signalling doc (Real-time)
    return new Promise<void>((resolve, reject) => {
      const unsubscribe = onSnapshot(sessionDoc, async (snapshot) => {
        const sessionData = snapshot.data();
        
        if (sessionData?.offer && !this.pc.currentRemoteDescription) {
          console.log("Offer received, settings remote description");
          const offerDescription = sessionData.offer;
          
          try {
            // 4. Set remote description
            await this.pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

            // 5. Create answer
            const answerDescription = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answerDescription);

            const answer = {
              type: answerDescription.type,
              sdp: answerDescription.sdp,
            };

            console.log("Answer created, updating session doc");
            await updateDoc(sessionDoc, { answer });

            // 6. Listen for caller ICE candidates
            onSnapshot(callerCandidates, (candSnapshot) => {
              candSnapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                  console.log("Adding caller ICE candidate to viewer pc");
                  const data = change.doc.data();
                  this.pc.addIceCandidate(new RTCIceCandidate(data)).catch(e => console.warn("ICE add failed", e));
                }
              });
            });

            resolve();
          } catch (err) {
            console.error("Error during signalling answer:", err);
            // Don't reject immediately, wait for host to reappear if it was a crash
          }
        }
      }, (error) => {
        console.error("Snapshot error:", error);
      });
    });
  }

  stop() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.pc.close();
  }
}
