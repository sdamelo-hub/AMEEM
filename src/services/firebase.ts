import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBpnvpwc0-TAre64pHjh-hYcxrYev5jz5s",
  authDomain: "mbour-df1cc.firebaseapp.com",
  projectId: "mbour-df1cc",
  storageBucket: "mbour-df1cc.firebasestorage.app",
  messagingSenderId: "85523672541",
  appId: "1:85523672541:web:3c376a74789e223765da34"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
