import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'

import app from './firebase'

const db = getFirestore(app)

/* ========================================================
   ORDER STATUS
   ======================================================== */

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'on_the_way'
  | 'working'
  | 'completed'
  | 'cancelled'
  | 'expired'

/* ========================================================
   STATUS HISTORY
   ======================================================== */

export type OrderStatusHistory = {
  status: OrderStatus
  at: unknown
  note?: string
}

/* ========================================================
   ORDER TYPE
   ======================================================== */

export type Order = {
  id: string

  customerId: string

  kategori: string
  judul: string
  deskripsi: string
  lokasi: string

  budgetCustomer: number

  waktuDibutuhkan: string

  status: OrderStatus

  hargaTawaran: number | null
  hargaDisepakati: number | null

  statusHistory: OrderStatusHistory[]

  createdAt?: unknown
  updatedAt?: unknown
}

/* ========================================================
   CREATE ORDER
   ======================================================== */

export async function createOrder(
  customerId: string,
  data: {
    kategori: string
    judul: string
    deskripsi: string
    lokasi: string
    budgetCustomer: number
    waktuDibutuhkan: string
  },
){

const customerOrders =
  await getCustomerOrders(
    customerId,
  )

const activeCustomerOrders =
  customerOrders.filter(
    (order) =>
      order.status ===
        'pending' ||
      order.status ===
        'accepted' ||
      order.status ===
        'on_the_way' ||
      order.status ===
        'working',
  )

if (
  activeCustomerOrders.length >=
  3
) {
  throw new Error(
    'Kamu sudah memiliki 3 pekerjaan aktif. Selesaikan salah satunya terlebih dahulu sebelum membuat permintaan baru.',
  )
}


  const orderRef = await addDoc(
    collection(db, 'orders'),
    {
      customerId,

      kategori: data.kategori,
      judul: data.judul,
      deskripsi: data.deskripsi,
      lokasi: data.lokasi,

      budgetCustomer: data.budgetCustomer,

      kesepakatanCustomer: false,
kesepakatanHelper: false,

      waktuDibutuhkan: data.waktuDibutuhkan,

      status: 'pending',

      hargaTawaran: null,
      hargaDisepakati: null,

      statusHistory: [
        {
          status: 'pending',
          at: serverTimestamp(),
          note: 'Permintaan dibuat oleh Customer.',
        },
      ],

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  )

  return orderRef.id
}

/* ========================================================
   GET CUSTOMER ORDERS
   ======================================================== */

export async function getCustomerOrders(
  customerId: string,
): Promise<Order[]> {
  const ordersQuery = query(
    collection(db, 'orders'),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc'),
  )

  const snapshot = await getDocs(ordersQuery)

  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  })) as Order[]
}

/* ========================================================
   GET PENDING ORDERS FOR HELPER
   ======================================================== */

export async function getPendingOrders(): Promise<Order[]> {
  const ordersQuery = query(
    collection(db, 'orders'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
  )

  const snapshot = await getDocs(ordersQuery)

  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  })) as Order[]
}