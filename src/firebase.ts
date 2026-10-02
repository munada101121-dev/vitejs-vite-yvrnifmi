import { initializeApp } from 'firebase/app'

const firebaseConfig = {
  apiKey: 'AIzaSyAkbKp6rGKV27PiAF6U7FMpS0Q0Hl0_LS0',
  authDomain: 'bantu-in-dea82.firebaseapp.com',
  projectId: 'bantu-in-dea82',
  storageBucket: 'bantu-in-dea82.firebasestorage.app',
  messagingSenderId: '7329915591',
  appId: '1:7329915591:web:c1b08b224aad42790f54e2',
}

const app = initializeApp(firebaseConfig)

export default app