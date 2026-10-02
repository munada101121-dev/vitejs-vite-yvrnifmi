import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth'

import app from './firebase'

export const auth = getAuth(app)

export { onAuthStateChanged, signOut }

export type { User } from 'firebase/auth'