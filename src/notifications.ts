import {
  addDoc,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore'

import app from './firebase'

const db = getFirestore(app)

// ============================================================
// TIPE NOTIFIKASI
// ============================================================

export type NotificationType =
  | 'offer_created'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'order_completed'
  | 'order_cancelled'
  | 'order_expired'
  | 'order_taken'
  | 'helper_on_the_way'
  | 'work_started'
  | 'agreement_accepted'
  | 'general'

// ============================================================
// DATA NOTIFIKASI
// ============================================================

export type AppNotification = {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  orderId?: string | null
  read: boolean
  createdAt?: Timestamp | Date | null
}

// ============================================================
// REFERENSI COLLECTION
// ============================================================

function notificationsCollection(userId: string) {
  return collection(
    db,
    'profiles',
    userId,
    'notifications',
  )
}

// ============================================================
// BUAT NOTIFIKASI
// ============================================================

export async function createNotification(data: {
  userId: string
  type: NotificationType
  title: string
  message: string
  orderId?: string | null
}) {
  if (!data.userId) {
    throw new Error(
      'User ID penerima notifikasi tidak boleh kosong.',
    )
  }

  await addDoc(
    notificationsCollection(data.userId),
    {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      orderId: data.orderId ?? null,
      read: false,
      createdAt: serverTimestamp(),
    },
  )
}

// ============================================================
// LISTENER REALTIME
// ============================================================

export function listenToNotifications(
  userId: string,
  onData: (
    notifications: AppNotification[],
  ) => void,
  onError?: (error: Error) => void,
) {
  if (!userId) {
    onData([])
    return () => {}
  }

  const notificationsQuery = query(
    notificationsCollection(userId),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      const data = snapshot.docs
        .map(
          (
            item: QueryDocumentSnapshot,
          ): AppNotification => {
            const raw = item.data()

            return {
              id: item.id,

              userId: String(
                raw.userId ?? userId,
              ),

              type:
                (raw.type as NotificationType) ??
                'general',

              title: String(
                raw.title ?? 'Notifikasi',
              ),

              message: String(
                raw.message ?? '',
              ),

              orderId:
                typeof raw.orderId === 'string'
                  ? raw.orderId
                  : null,

              read:
                raw.read === true,

              createdAt:
                raw.createdAt ?? null,
            }
          },
        )

      onData(data)
    },
    (error) => {
      console.error(
        'Listener notifikasi gagal:',
        error,
      )

      onError?.(error)
    },
  )
}

// ============================================================
// TANDAI SATU NOTIFIKASI SUDAH DIBACA
// ============================================================

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
) {
  if (!userId || !notificationId) {
    return
  }

  const notificationRef = doc(
    db,
    'profiles',
    userId,
    'notifications',
    notificationId,
  )

  await updateDoc(
    notificationRef,
    {
      read: true,
    },
  )
}

// ============================================================
// ALIAS LAMA
// ============================================================

export async function markNotificationAsReadForUser(
  userId: string,
  notificationId: string,
) {
  await markNotificationAsRead(
    userId,
    notificationId,
  )
}

// ============================================================
// TANDAI SEMUA SUDAH DIBACA
// ============================================================

export async function markAllNotificationsAsRead(
  notifications: AppNotification[],
) {
  const unread = notifications.filter(
    (item) => item.read !== true,
  )

  if (unread.length === 0) {
    return
  }

  const batch = writeBatch(db)

  for (const notification of unread) {
    if (
      !notification.userId ||
      !notification.id
    ) {
      continue
    }

    const notificationRef = doc(
      db,
      'profiles',
      notification.userId,
      'notifications',
      notification.id,
    )

    batch.update(
      notificationRef,
      {
        read: true,
      },
    )
  }

  await batch.commit()
}