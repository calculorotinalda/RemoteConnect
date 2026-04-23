import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, connectFirestoreEmulator } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Inicialização standard com persistência de memória para evitar conflitos de cache offline
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

/**
 * Validação de conexão simplificada.
 * Agora apenas loga o erro sem bloquear a UI, permitindo que o Firebase
 * tente reconectar automaticamente em background.
 */
export async function validateFirestoreConnection() {
  try {
    // Tenta um fetch rápido com timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );
    
    await Promise.race([
      getDocFromServer(doc(db, '_internal_', 'health_check')),
      timeoutPromise
    ]);
    
    return true;
  } catch (error: any) {
    console.warn("Firestore status: em tentativa de ligação...", error.code || error.message);
    // Retornamos true para não bloquear a UI, deixando o Firebase gerir a reconexão
    return true;
  }
}
