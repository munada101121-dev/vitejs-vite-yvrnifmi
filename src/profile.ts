import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from 'firebase/firestore'

import app from './firebase'

const db = getFirestore(app)

// ============================================================
// MODE USER
// ============================================================

export type UserMode =
  | 'customer'
  | 'helper'
  | 'seller'

// ============================================================
// PROFILE USER
// ============================================================

export type UserProfile = {
  uid: string

  // Nama utama yang digunakan aplikasi
  modeAktif: UserMode

  // Alias kompatibilitas dengan App.tsx
  mode?: UserMode

  nama?: string

  displayName?: string

  email?: string

  saldo?: number
}

// ============================================================
// AMBIL PROFILE USER
// ============================================================

export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const profileRef =
    doc(
      db,
      'profiles',
      userId,
    )

  const snapshot =
    await getDoc(
      profileRef,
    )

  if (!snapshot.exists()) {
    return null
  }

  const data =
    snapshot.data() as Partial<UserProfile>

  const modeAktif =
    data.modeAktif ??
    data.mode ??
    'customer'

  return {
    uid:
      userId,

    modeAktif,

    mode:
      modeAktif,

    nama:
      data.nama,

    displayName:
      data.displayName ??
      data.nama,

    email:
      data.email,

    saldo:
      data.saldo ??
      0,
  }
}

// ============================================================
// UPDATE MODE USER
//
// modeAktif dibuat opsional agar kompatibel dengan
// pemanggilan lama dari App.tsx.
//
// Jika mode tidak diberikan, fungsi tidak mengubah mode.
// ============================================================

export async function updateUserMode(
  userId: string,
  modeAktif?: UserMode,
) {
  if (!modeAktif) {
    return
  }

  const profileRef =
    doc(
      db,
      'profiles',
      userId,
    )

  await setDoc(
    profileRef,
    {
      uid:
        userId,

      modeAktif,

      mode:
        modeAktif,
    },
    {
      merge: true,
    },
  )
}

// ============================================================
// BUAT PROFILE USER
// ============================================================

export async function createUserProfile(
  userId: string,
  modeAktif: UserMode = 'customer',
  nama?: string,
  email?: string,
) {
  const profileRef =
    doc(
      db,
      'profiles',
      userId,
    )

  await setDoc(
    profileRef,
    {
      uid:
        userId,

      modeAktif,

      mode:
        modeAktif,

      ...(nama !== undefined
        ? {
            nama,
            displayName:
              nama,
          }
        : {}),

      ...(email !== undefined
        ? {
            email,
          }
        : {}),

      saldo:
        0,
    },
    {
      merge: true,
    },
  )
}