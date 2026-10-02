import {
  addDoc,
  collection,
  doc,
  getDocs,
  getDoc,
  getFirestore,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore'

import app from './firebase'

import {
  createNotification,
  type NotificationType,
} from './notifications'

const db = getFirestore(app)

// ============================================================
// NOTIFIKASI
// ============================================================

async function notifyUser(
  userId: string | null | undefined,
  type: NotificationType,
  title: string,
  message: string,
  orderId: string,
) {
  console.log('📢 MENCOBA MEMBUAT NOTIFIKASI:', {
    userId,
    type,
    title,
    orderId,
  })

  if (!userId) {
    console.warn(
      `⚠️ Notifikasi ${type} dibatalkan: userId penerima kosong.`,
    )
    return
  }

  try {
    await createNotification({
      userId,
      type,
      title,
      message,
      orderId,
    })

    console.log(
      `✅ Notifikasi ${type} berhasil dibuat untuk user ${userId}`,
    )
  } catch (error) {
    console.error(
      `❌ Gagal membuat notifikasi ${type} untuk user ${userId}:`,
      error,
    )
  }
}

async function notifyCancellation(
  userId: string | null | undefined,
  orderId: string,
  message: string,
) {
  await notifyUser(
    userId,
    'order_cancelled',
    'Order Dibatalkan',
    message,
    orderId,
  )
}

// ============================================================
// PENGATURAN KADALUARSA
// ============================================================

const CUSTOMER_DECISION_WINDOW_MS =
  60 * 60 * 1000

// ============================================================
// BATAS ORDER CUSTOMER
// ============================================================

const MAX_ACTIVE_ORDERS = 3

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'accepted',
  'on_the_way',
  'working',
]

// ============================================================
// TYPE
// ============================================================

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'on_the_way'
  | 'working'
  | 'completed'
  | 'cancelled'
  | 'expired'

export type TawaranStatus =
  | 'none'
  | 'menunggu_customer'
  | 'diterima'
  | 'ditolak'

export type OrderStatusHistory = {
  status: OrderStatus
  at: unknown
  note?: string
  cancellationReason?: string
}

export type Order = {
  id: string
  customerId: string
  helperId?: string | null

  kesepakatanCustomer?: boolean
  kesepakatanHelper?: boolean

  kategori: string
  judul: string
  deskripsi: string
  lokasi: string
  budgetCustomer: number
  targetDurasiCustomer: string
  waktuDibutuhkan: string
  waktuDibutuhkanAt?: unknown
  status: OrderStatus
  hargaTawaran: number | null
  estimasiDurasiHelper?: string
  hargaDisepakati: number | null
  tawaranHelperId?: string | null
  tawaranStatus?: TawaranStatus
  needsCustomerDecision?: boolean
  responseDeadlineAt?: unknown
  statusHistory: OrderStatusHistory[]
  createdAt?: unknown
  updatedAt?: unknown
  expiresAt?: unknown
  cancelledBy?: 'customer' | 'helper' | null
  cancellationReason?: string | null
  cancelledAt?: unknown
}

// ============================================================
// BANTUAN KONVERSI WAKTU
// ============================================================

function getTimestampFromDateTimeLocal(
  value: string,
): Timestamp {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      'Waktu dibutuhkan tidak valid.',
    )
  }

  return Timestamp.fromDate(date)
}

// ============================================================
// BANTUAN MEMBACA TIMESTAMP
// ============================================================

function getTimestampMillis(
  value: unknown,
): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis()
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  ) {
    return value.toMillis()
  }

  if (value instanceof Date) {
    return value.getTime()
  }

  return null
}

// ============================================================
// FORMAT RUPIAH
// ============================================================

function formatRupiah(value: number): string {
  return new Intl.NumberFormat(
    'id-ID',
  ).format(value)
}

// ============================================================
// BUAT ORDER
// ============================================================

export async function createOrder(data: {
  customerId: string
  kategori: string
  judul: string
  deskripsi: string
  lokasi: string
  budget: number
  waktuDibutuhkan: string
  targetDurasiCustomer: string
}) {
  const customerId = data.customerId

  const existingOrders =
    await getCustomerOrders(customerId)

  const activeOrderCount =
    existingOrders.filter((order) =>
      ACTIVE_ORDER_STATUSES.includes(
        order.status,
      ),
    ).length

  if (
    activeOrderCount >= MAX_ACTIVE_ORDERS
  ) {
    throw new Error(
      `Kamu sudah memiliki ${MAX_ACTIVE_ORDERS} Order aktif. Selesaikan atau batalkan salah satu Order terlebih dahulu sebelum membuat Order baru.`,
    )
  }

  const waktuDibutuhkanAt =
    getTimestampFromDateTimeLocal(
      data.waktuDibutuhkan,
    )

  const waktuDibutuhkanMillis =
    waktuDibutuhkanAt.toMillis()

  if (
    waktuDibutuhkanMillis <= Date.now()
  ) {
    throw new Error(
      'Waktu dibutuhkan harus berada di masa depan.',
    )
  }

  const expiresAt =
    Timestamp.fromMillis(
      waktuDibutuhkanMillis +
        CUSTOMER_DECISION_WINDOW_MS,
    )

  await addDoc(
    collection(db, 'orders'),
    {
      customerId,
      helperId: null,
      kategori: data.kategori,
      judul: data.judul,
      deskripsi: data.deskripsi,
      lokasi: data.lokasi,
      budgetCustomer: data.budget,targetDurasiCustomer: data.targetDurasiCustomer,
      waktuDibutuhkan:
        data.waktuDibutuhkan,
      waktuDibutuhkanAt,
      status: 'pending',
      hargaTawaran: null,
      hargaDisepakati: null,
      tawaranHelperId: null,
      tawaranStatus: 'none',
      needsCustomerDecision: false,
      responseDeadlineAt: null,
      statusHistory: [
        {
          status: 'pending',
          at: Timestamp.now(),
          note: 'Permintaan dibuat oleh Customer.',
        },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt,
    },
  )
}

// ============================================================
// AMBIL ORDER CUSTOMER
// ============================================================

export async function getCustomerOrders(
  customerId: string,
): Promise<Order[]> {
  const ordersQuery = query(
    collection(db, 'orders'),
    where(
      'customerId',
      '==',
      customerId,
    ),
    orderBy(
      'createdAt',
      'desc',
    ),
  )

  const snapshot =
    await getDocs(ordersQuery)

  const orders = snapshot.docs.map(
    (docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    }),
  ) as Order[]

  const now = Date.now()

  for (const order of orders) {
    const waktuMillis =
      getTimestampMillis(
        order.waktuDibutuhkanAt,
      )

    if (
      order.status === 'pending' &&
      waktuMillis !== null &&
      now >= waktuMillis
    ) {
      try {
        await expireOrderIfNeeded(
          order.id,
        )
      } catch (error) {
        console.error(
          `Gagal memeriksa kadaluarsa order ${order.id}:`,
          error,
        )
      }
    }
  }

  const refreshedSnapshot =
    await getDocs(ordersQuery)

  return refreshedSnapshot.docs.map(
    (docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    }),
  ) as Order[]
}

// ============================================================
// CEK WAKTU ORDER
// ============================================================

export async function expireOrderIfNeeded(
  orderId: string,
): Promise<boolean> {
  const orderRef = doc(
    db,
    'orders',
    orderId,
  )

  let notificationCustomerId:
    | string
    | null = null

  let notificationTitle = ''

  let shouldNotifyExpired = false

  let shouldNotifyTimeReached = false

  let timeReachedCustomerId:
    | string
    | null = null

    let timeReachedOrderTitle = ''

  const changed =
    await runTransaction(
      db,
      async (transaction) => {
        const orderSnapshot =
          await transaction.get(
            orderRef,
          )

        if (
          !orderSnapshot.exists()
        ) {
          return false
        }

        const orderData =
          orderSnapshot.data() as Order

        if (
          orderData.status !==
          'pending'
        ) {
          return false
        }

        const waktuDibutuhkanMillis =
          getTimestampMillis(
            orderData.waktuDibutuhkanAt,
          )

        if (
          waktuDibutuhkanMillis === null
        ) {
          return false
        }

        const now = Date.now()

        if (
          now <
          waktuDibutuhkanMillis
        ) {
          return false
        }

        // ------------------------------------------------------
        // MASUK KE MASA KEPUTUSAN CUSTOMER
        // ------------------------------------------------------

        if (
          orderData.needsCustomerDecision !==
          true
        ) {
          const responseDeadlineMillis =
            waktuDibutuhkanMillis +
            CUSTOMER_DECISION_WINDOW_MS

          const responseDeadlineAt =
            Timestamp.fromMillis(
              responseDeadlineMillis,
            )

          transaction.update(
            orderRef,
            {
              status: 'pending',
              needsCustomerDecision: true,
              responseDeadlineAt,
              expiresAt:
                responseDeadlineAt,
              statusHistory: [
                ...(orderData.statusHistory ||
                  []),
                {
                  status: 'pending',
                  at: Timestamp.now(),
                  note:
                    'Waktu dibutuhkan telah tiba. Customer diberi waktu 1 jam untuk menentukan apakah tetap mencari Helper.',
                },
              ],
              updatedAt:
                serverTimestamp(),
            },
          )

          shouldNotifyTimeReached = true

          timeReachedCustomerId =
    orderData.customerId

    timeReachedOrderTitle =
    orderData.judul

          return true
        }

        // ------------------------------------------------------
        // CEK BATAS WAKTU KEPUTUSAN CUSTOMER
        // ------------------------------------------------------

        const responseDeadlineMillis =
          getTimestampMillis(
            orderData.responseDeadlineAt,
          )

        if (
          responseDeadlineMillis === null
        ) {
          return false
        }

        if (
          now <
          responseDeadlineMillis
        ) {
          return false
        }

        // ------------------------------------------------------
        // ORDER KADALUARSA
        // ------------------------------------------------------

        transaction.update(
          orderRef,
          {
            status: 'expired',
            helperId: null,
            needsCustomerDecision: false,
            responseDeadlineAt:
              orderData.responseDeadlineAt,
            statusHistory: [
              ...(orderData.statusHistory ||
                []),
              {
                status: 'expired',
                at: Timestamp.now(),
                note:
                  'Permintaan kadaluarsa karena 1 jam setelah waktu dibutuhkan telah berakhir.',
              },
            ],
            updatedAt:
              serverTimestamp(),
          },
        )

        notificationCustomerId =
          orderData.customerId

        notificationTitle =
          orderData.judul

        shouldNotifyExpired = true

        return true
      },
    )

  // Notifikasi dikirim SETELAH transaksi berhasil.
  if (
    changed &&
    shouldNotifyExpired &&
    notificationCustomerId
  ) {
    await notifyUser(
      notificationCustomerId,
      'order_expired',
      'Order Kedaluwarsa',
      `Order "${notificationTitle}" telah kedaluwarsa karena batas waktu pencarian Helper telah berakhir.`,
      orderId,
    )
  }

  if (
        changed &&
            shouldNotifyTimeReached &&
                timeReachedCustomerId
                ) {
                    await notifyUser(
                            timeReachedCustomerId,
                                    'general',
                                            'Waktu Bantuan Tercapai',
                                                    `Waktu bantuan untuk order "${timeReachedOrderTitle}" telah tiba.`,
                                                            orderId,
                                                                )
                                                                }

  return changed
}

// ============================================================
// AMBIL ORDER PENDING UNTUK HELPER
//
// Fungsi ini HANYA membaca daftar pekerjaan.
// Tidak menjalankan expireOrderIfNeeded().
// ============================================================

export async function getPendingOrders(): Promise<
  Order[]
> {
  const ordersQuery = query(
    collection(db, 'orders'),
    where(
      'status',
      '==',
      'pending',
    ),
    where(
      'needsCustomerDecision',
      '==',
      false,
    ),
    where(
      'helperId',
      '==',
      null,
    ),
    orderBy(
      'createdAt',
      'desc',
    ),
  )

  const snapshot =
    await getDocs(ordersQuery)

  const orders = snapshot.docs.map(
    (docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    }),
  ) as Order[]

  const now = Date.now()

  return orders.filter(
    (order) => {
      const millis =
        getTimestampMillis(
          order.waktuDibutuhkanAt,
        )

      return (
        millis === null ||
        millis > now
      )
    },
  )
}

// ============================================================
// AMBIL SATU ORDER
// ============================================================

export async function getOrderById(
  orderId: string,
): Promise<Order | null> {
  const snapshot =
    await getDoc(
      doc(
        db,
        'orders',
        orderId,
      ),
    )

  if (!snapshot.exists()) {
    return null
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Order
}

// ============================================================
// AMBIL ORDER MILIK HELPER
// ============================================================

export async function getHelperOrders(
  helperId: string,
): Promise<Order[]> {
  const ordersQuery = query(
    collection(db, 'orders'),
    where(
      'helperId',
      '==',
      helperId,
    ),
  )

  const snapshot =
    await getDocs(ordersQuery)

  const orders = snapshot.docs.map(
    (docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    }),
  ) as Order[]

  const activeOrders =
    orders.filter(
      (order) =>
        order.status ===
          'accepted' ||
        order.status ===
          'on_the_way' ||
        order.status ===
          'working',
    )

  activeOrders.sort(
    (a, b) => {
      const aTime =
        getTimestampMillis(
          a.createdAt,
        ) ?? 0

      const bTime =
        getTimestampMillis(
          b.createdAt,
        ) ?? 0

      return bTime - aTime
    },
  )

  return activeOrders
}

// ============================================================
// HELPER: AJUKAN TAWARAN HARGA
// ============================================================

export async function ajukanTawaranHarga(
  orderId: string,
  helperId: string,
  _helperName: string,
  hargaTawaran: number,
  estimasiDurasiHelper: string,
) {
  if (
    !Number.isFinite(
      hargaTawaran,
    ) ||
    hargaTawaran <= 0
  ) {
    throw new Error(
      'Harga tawaran harus berupa angka lebih dari 0.',
    )
  }

  const orderRef = doc(
    db,
    'orders',
    orderId,
  )

  const helperActiveOrders =
  await getHelperOrders(
    helperId,
  )

if (helperActiveOrders.length > 0) {
  throw new Error(
    'Anda masih memiliki pekerjaan yang sedang berjalan. Selesaikan pekerjaan tersebut terlebih dahulu sebelum mengajukan tawaran harga untuk pekerjaan baru.',
  )
}

  let customerIdToNotify:
    | string
    | null = null

  let orderTitleToNotify = ''

  await runTransaction(
    db,
    async (transaction) => {
      const orderSnapshot =
        await transaction.get(
          orderRef,
        )

      if (
        !orderSnapshot.exists()
      ) {
        throw new Error(
          'Pesanan tidak ditemukan.',
        )
      }

      const orderData =
        orderSnapshot.data() as Order

      if (
        orderData.status !==
        'pending'
      ) {
        throw new Error(
          'Pesanan ini sudah tidak tersedia untuk tawaran.',
        )
      }

      if (
        orderData.helperId !== null
      ) {
        throw new Error(
          'Pesanan ini sudah memiliki Helper.',
        )
      }

      if (
        orderData.needsCustomerDecision ===
        true
      ) {
        throw new Error(
          'Pesanan sedang menunggu keputusan Customer.',
        )
      }

      if (
        orderData.tawaranStatus ===
        'menunggu_customer'
      ) {
        throw new Error(
          'Pesanan ini sedang menunggu keputusan Customer atas tawaran Helper lain.',
        )
      }

      const waktuDibutuhkanMillis =
        getTimestampMillis(
          orderData.waktuDibutuhkanAt,
        )

      if (
        waktuDibutuhkanMillis !==
          null &&
        Date.now() >=
          waktuDibutuhkanMillis
      ) {
        throw new Error(
          'Waktu pengambilan pekerjaan ini sudah lewat.',
        )
      }

      customerIdToNotify =
        orderData.customerId

      orderTitleToNotify =
        orderData.judul

      transaction.update(
        orderRef,
        {
          hargaTawaran:
            hargaTawaran,
            estimasiDurasiHelper:
  estimasiDurasiHelper,
          hargaDisepakati:
            null,
          tawaranHelperId:
            helperId,
          tawaranStatus:
            'menunggu_customer',
          updatedAt:
            serverTimestamp(),
          statusHistory: [
            ...(orderData.statusHistory ||
              []),
            {
              status: 'pending',
              at: Timestamp.now(),
              note:
                'Helper mengajukan tawaran harga.',
            },
          ],
        },
      )
    },
  )

  await notifyUser(
    customerIdToNotify,
    'offer_created',
    'Ada Tawaran Harga Baru',
    `Ada Helper yang mengajukan tawaran Rp${formatRupiah(hargaTawaran)} untuk order "${orderTitleToNotify}".`,
    orderId,
  )
}

// ============================================================
// CUSTOMER: TERIMA TAWARAN HARGA
// ============================================================

export async function terimaTawaranHarga(
  orderId: string,
  customerId: string,
) {
  const orderRef = doc(
    db,
    'orders',
    orderId,
  )

  let helperIdToNotify:
    | string
    | null = null

  let orderTitleToNotify = ''

  let hargaDisepakatiToNotify =
    0

  await runTransaction(
    db,
    async (transaction) => {
      const orderSnapshot =
        await transaction.get(
          orderRef,
        )

      if (
        !orderSnapshot.exists()
      ) {
        throw new Error(
          'Pesanan tidak ditemukan.',
        )
      }

      const orderData =
        orderSnapshot.data() as Order

      if (
        orderData.customerId !==
        customerId
      ) {
        throw new Error(
          'Kamu tidak berhak menerima tawaran ini.',
        )
      }

      if (
        orderData.status !==
        'pending'
      ) {
        throw new Error(
          'Pesanan ini sudah tidak berstatus pending.',
        )
      }

      if (
        orderData.needsCustomerDecision ===
        true
      ) {
        throw new Error(
          'Pesanan sudah masuk masa keputusan Customer.',
        )
      }

      if (
        orderData.tawaranStatus !==
        'menunggu_customer'
      ) {
        throw new Error(
          'Tidak ada tawaran harga yang sedang menunggu keputusan.',
        )
      }

      if (
        !orderData.tawaranHelperId
      ) {
        throw new Error(
          'Helper penawar tidak ditemukan.',
        )
      }

      if (
        orderData.hargaTawaran ===
          null ||
        orderData.hargaTawaran <= 0
      ) {
        throw new Error(
          'Harga tawaran tidak valid.',
        )
      }

      const waktuDibutuhkanMillis =
        getTimestampMillis(
          orderData.waktuDibutuhkanAt,
        )

      if (
        waktuDibutuhkanMillis !==
          null &&
        Date.now() >=
          waktuDibutuhkanMillis
      ) {
        throw new Error(
          'Waktu pengambilan pekerjaan ini sudah lewat.',
        )
      }

      helperIdToNotify =
        orderData.tawaranHelperId

      orderTitleToNotify =
        orderData.judul

      hargaDisepakatiToNotify =
        orderData.hargaTawaran

      transaction.update(
        orderRef,
        {
          helperId:
            orderData.tawaranHelperId,
          status: 'accepted',
          hargaDisepakati:
            orderData.hargaTawaran,
          tawaranStatus:
            'diterima',
            kesepakatanCustomer: false,
kesepakatanHelper: false,
          needsCustomerDecision:
            false,
          responseDeadlineAt:
            null,
          statusHistory: [
            ...(orderData.statusHistory ||
              []),
            {
              status: 'accepted',
              at: Timestamp.now(),
              note:
                'Customer menerima tawaran harga dan Helper menjadi Helper order.',
            },
          ],
          updatedAt:
            serverTimestamp(),
        },
      )
    },
  )

  await notifyUser(
    helperIdToNotify,
    'offer_accepted',
    'Tawaran Diterima',
    `Customer menerima tawaran Rp${formatRupiah(hargaDisepakatiToNotify)} untuk order "${orderTitleToNotify}".`,
    orderId,
  )
}

export async function setujuiKesepakatan(
  orderId: string,
  helperId: string,
) {
  const orderRef = doc(
    db,
    'orders',
    orderId,
  )

  let customerIdToNotify: string | null = null
let orderTitleToNotify = ''

  await runTransaction(
    db,
    async (transaction) => {
      const orderSnapshot =
        await transaction.get(
          orderRef,
        )

      if (!orderSnapshot.exists()) {
        throw new Error(
          'Pekerjaan tidak ditemukan.',
        )
      }

      const orderData =
        orderSnapshot.data() as Order

      if (
        orderData.helperId !==
        helperId
      ) {
        throw new Error(
          'Kamu tidak berhak menyetujui kesepakatan ini.',
        )
      }

      if (
        orderData.status !==
        'accepted'
      ) {
        throw new Error(
          'Pekerjaan belum berada pada tahap kesepakatan.',
        )
      }

      if (
        orderData.kesepakatanHelper ===
        true
      ) {
        throw new Error(
          'Kamu sudah menyetujui kesepakatan ini.',
        )
      }

      customerIdToNotify =
  orderData.customerId

orderTitleToNotify =
  orderData.judul

      transaction.update(
        orderRef,
        {
          kesepakatanHelper: true,
          updatedAt:
            serverTimestamp(),
        },
      )
    },
    )
  
    await notifyUser(
      customerIdToNotify,
      'agreement_accepted',
      'Helper Menyetujui Kesepakatan',
      `Helper telah menyetujui kesepakatan untuk order "${orderTitleToNotify}".`,
      orderId,
    )
  }
  
  export async function setujuiKesepakatanCustomer(
  orderId: string,
  customerId: string,
) {
  const orderRef = doc(
    db,
    'orders',
    orderId,
  )

  let helperIdToNotify: string | null = null
let orderTitleToNotify = ''

  await runTransaction(
    db,
    async (transaction) => {
      const orderSnapshot =
        await transaction.get(
          orderRef,
        )

      if (!orderSnapshot.exists()) {
        throw new Error(
          'Pekerjaan tidak ditemukan.',
        )
      }

      const orderData =
        orderSnapshot.data() as Order

      if (
        orderData.customerId !==
        customerId
      ) {
        throw new Error(
          'Kamu tidak berhak menyetujui kesepakatan ini.',
        )
      }

      if (
        orderData.status !==
        'accepted'
      ) {
        throw new Error(
          'Pekerjaan belum berada pada tahap kesepakatan.',
        )
      }

      if (
        orderData.kesepakatanCustomer ===
        true
      ) {
        throw new Error(
          'Kamu sudah menyetujui kesepakatan ini.',
        )
      }

      helperIdToNotify =
  orderData.helperId ?? null

orderTitleToNotify =
  orderData.judul

      transaction.update(
        orderRef,
        {
          kesepakatanCustomer: true,
          updatedAt:
            serverTimestamp(),
        },
      )
    },
    )
  
    await notifyUser(
      helperIdToNotify,
      'agreement_accepted',
      'Customer Menyetujui Kesepakatan',
      `Customer telah menyetujui kesepakatan untuk order "${orderTitleToNotify}".`,
      orderId,
    )
  }
  

// ============================================================
// CUSTOMER: TOLAK TAWARAN HARGA
// ============================================================

export async function tolakTawaranHarga(
  orderId: string,
  customerId: string,
) {
  const orderRef = doc(
    db,
    'orders',
    orderId,
  )

  let helperIdToNotify:
    | string
    | null = null

  let orderTitleToNotify = ''

  await runTransaction(
    db,
    async (transaction) => {
      const orderSnapshot =
        await transaction.get(
          orderRef,
        )

      if (
        !orderSnapshot.exists()
      ) {
        throw new Error(
          'Pesanan tidak ditemukan.',
        )
      }

      const orderData =
        orderSnapshot.data() as Order

      if (
        orderData.customerId !==
        customerId
      ) {
        throw new Error(
          'Kamu tidak berhak menolak tawaran ini.',
        )
      }

      if (
        orderData.status !==
        'pending'
      ) {
        throw new Error(
          'Pesanan ini sudah tidak berstatus pending.',
        )
      }

      if (
        orderData.tawaranStatus !==
        'menunggu_customer'
      ) {
        throw new Error(
          'Tidak ada tawaran harga yang sedang menunggu keputusan.',
        )
      }

      helperIdToNotify =
        orderData.tawaranHelperId ??
        null

      orderTitleToNotify =
        orderData.judul

      transaction.update(
        orderRef,
        {
          hargaTawaran: null,
          hargaDisepakati: null,
          tawaranHelperId: null,
          tawaranStatus:
            'ditolak',
          statusHistory: [
            ...(orderData.statusHistory ||
              []),
            {
              status: 'pending',
              at: Timestamp.now(),
              note:
                'Customer menolak tawaran harga Helper.',
            },
          ],
          updatedAt:
            serverTimestamp(),
        },
      )
    },
  )

  await notifyUser(
    helperIdToNotify,
    'offer_rejected',
    'Tawaran Ditolak',
    `Customer menolak tawaranmu untuk order "${orderTitleToNotify}".`,
    orderId,
  )
}

// ============================================================
// HELPER AMBIL ORDER
// ============================================================

export async function acceptOrder(
  orderId: string,
  helperId: string,
) {
  const orderRef = doc(
    db,
    'orders',
    orderId,
  )

  const helperActiveOrders =
  await getHelperOrders(
      helperId,
  )

if (helperActiveOrders.length > 0) {
  throw new Error(
      'Anda masih memiliki pekerjaan yang sedang berjalan. Selesaikan pekerjaan tersebut terlebih dahulu sebelum mengambil pekerjaan baru.',
  )
}

  let customerIdToNotify:
    | string
    | null = null

  let orderTitleToNotify = ''

  await runTransaction(
    db,
    async (transaction) => {
      const orderSnapshot =
        await transaction.get(
          orderRef,
        )

      if (
        !orderSnapshot.exists()
      ) {
        throw new Error(
          'Pesanan tidak ditemukan.',
        )
      }

      const orderData =
        orderSnapshot.data() as Order

      if (
        orderData.status !==
        'pending'
      ) {
        throw new Error(
          'Pesanan sudah diambil Helper lain atau tidak tersedia.',
        )
      }

      if (
        orderData.needsCustomerDecision ===
        true
      ) {
        throw new Error(
          'Pesanan sedang menunggu keputusan Customer.',
        )
      }

      if (
        orderData.tawaranStatus ===
        'menunggu_customer'
      ) {
        throw new Error(
          'Pesanan sedang menunggu keputusan Customer atas tawaran harga.',
        )
      }

      const waktuDibutuhkanMillis =
        getTimestampMillis(
          orderData.waktuDibutuhkanAt,
        )

      if (
        waktuDibutuhkanMillis !==
          null &&
        Date.now() >=
          waktuDibutuhkanMillis
      ) {
        throw new Error(
          'Waktu pengambilan pekerjaan ini sudah lewat.',
        )
      }

      customerIdToNotify =
        orderData.customerId

      orderTitleToNotify =
        orderData.judul

      transaction.update(
        orderRef,
        {
          helperId,
          status: 'accepted',
          hargaTawaran: null,
          tawaranHelperId: null,
          tawaranStatus: 'none',
          kesepakatanCustomer: false,
kesepakatanHelper: false,
          hargaDisepakati:
            orderData.budgetCustomer,
          statusHistory: [
            ...(orderData.statusHistory ||
              []),
            {
              status: 'accepted',
              at: Timestamp.now(),
              note:
                'Pesanan diambil oleh Helper.',
            },
          ],
          updatedAt:
            serverTimestamp(),
        },
      )
    },
  )

  await notifyUser(
    customerIdToNotify,
    'order_taken',
    'Helper Ditemukan',
    `Order "${orderTitleToNotify}" sudah diambil oleh Helper.`,
    orderId,
  )
}

// ============================================================
// HELPER BERANGKAT
// accepted -> on_the_way
// ============================================================

export async function startOrderTravel(
  orderId: string,
  helperId: string,
) {
  const orderRef = doc(
    db,
    'orders',
    orderId,
  )

  let customerIdToNotify:
    | string
    | null = null

  let orderTitleToNotify = ''

  await runTransaction(
    db,
    async (transaction) => {
      const orderSnapshot =
        await transaction.get(
          orderRef,
        )

      if (
        !orderSnapshot.exists()
      ) {
        throw new Error(
          'Pekerjaan tidak ditemukan.',
        )
      }

      const orderData =
        orderSnapshot.data() as Order

      if (
        orderData.helperId !==
        helperId
      ) {
        throw new Error(
          'Kamu tidak berhak menjalankan pekerjaan ini.',
        )
      }

      if (
        orderData.status !==
        'accepted'
      ) {
        throw new Error(
          'Pekerjaan belum berada pada tahap siap berangkat.',
        )
      }

      if (
        orderData.kesepakatanCustomer !== true ||
        orderData.kesepakatanHelper !== true
      ) {
        throw new Error(
          'Kesepakatan Customer dan Helper belum lengkap. Helper belum dapat berangkat.',
        )
      }

      customerIdToNotify =
        orderData.customerId

      orderTitleToNotify =
        orderData.judul

      transaction.update(
        orderRef,
        {
          status: 'on_the_way',
          statusHistory: [
            ...(orderData.statusHistory ||
              []),
            {
              status: 'on_the_way',
              at: Timestamp.now(),
              note:
                'Helper berangkat menuju lokasi Customer.',
            },
          ],
          updatedAt:
            serverTimestamp(),
        },
      )
    },
  )

  await notifyUser(
    customerIdToNotify,
    'helper_on_the_way',
    'Helper Dalam Perjalanan',
    `Helper sedang menuju lokasi untuk order "${orderTitleToNotify}".`,
    orderId,
  )
}

// ============================================================
// HELPER MULAI PEKERJAAN
// on_the_way -> working
// ============================================================

export async function startOrderWork(
  orderId: string,
  helperId: string,
) {
  const orderRef = doc(
    db,
    'orders',
    orderId,
  )

  let customerIdToNotify:
    | string
    | null = null

  let orderTitleToNotify = ''

  await runTransaction(
    db,
    async (transaction) => {
      const orderSnapshot =
        await transaction.get(
          orderRef,
        )

      if (
        !orderSnapshot.exists()
      ) {
        throw new Error(
          'Pekerjaan tidak ditemukan.',
        )
      }

      const orderData =
        orderSnapshot.data() as Order

      if (
        orderData.helperId !==
        helperId
      ) {
        throw new Error(
          'Kamu tidak berhak menjalankan pekerjaan ini.',
        )
      }

      if (
        orderData.status !==
        'on_the_way'
      ) {
        throw new Error(
          'Pekerjaan belum berada pada tahap Dalam Perjalanan.',
        )
      }

      customerIdToNotify =
        orderData.customerId

      orderTitleToNotify =
        orderData.judul

      transaction.update(
        orderRef,
        {
          status: 'working',
          statusHistory: [
            ...(orderData.statusHistory ||
              []),
            {
              status: 'working',
              at: Timestamp.now(),
              note:
                'Helper tiba di lokasi dan mulai mengerjakan pekerjaan.',
            },
          ],
          updatedAt:
            serverTimestamp(),
        },
      )
    },
  )

  await notifyUser(
    customerIdToNotify,
    'work_started',
    'Pekerjaan Dimulai',
    `Helper sudah tiba dan mulai mengerjakan order "${orderTitleToNotify}".`,
    orderId,
  )
}

// ============================================================
// HELPER MENYELESAIKAN PEKERJAAN
// working -> completed
// ============================================================

export async function completeOrder(
  orderId: string,
  helperId: string,
) {
  const orderRef = doc(
    db,
    'orders',
    orderId,
  )

  let customerIdToNotify:
    | string
    | null = null

  let orderTitleToNotify = ''

  await runTransaction(
    db,
    async (transaction) => {
      const orderSnapshot =
        await transaction.get(
          orderRef,
        )

      if (
        !orderSnapshot.exists()
      ) {
        throw new Error(
          'Pekerjaan tidak ditemukan.',
        )
      }

      const orderData =
        orderSnapshot.data() as Order

      if (
        orderData.helperId !==
        helperId
      ) {
        throw new Error(
          'Kamu tidak berhak menyelesaikan pekerjaan ini.',
        )
      }

      if (
        orderData.status !==
        'working'
      ) {
        throw new Error(
          'Pekerjaan belum berada pada tahap Sedang Dikerjakan.',
        )
      }

      customerIdToNotify =
        orderData.customerId

      orderTitleToNotify =
        orderData.judul

      transaction.update(
        orderRef,
        {
          status: 'completed',
          statusHistory: [
            ...(orderData.statusHistory ||
              []),
            {
              status: 'completed',
              at: Timestamp.now(),
              note:
                'Helper menyelesaikan pekerjaan.',
            },
          ],
          updatedAt:
            serverTimestamp(),
        },
      )
    },
  )

  await notifyUser(
    customerIdToNotify,
    'order_completed',
    'Pekerjaan Selesai',
    `Helper telah menyelesaikan order "${orderTitleToNotify}".`,
    orderId,
  )
}

// ============================================================
// CUSTOMER: TETAP CARI HELPER
// ============================================================

export async function continueSearchingOrder(
  orderId: string,
  customerId: string,
  newWaktuDibutuhkan: string,
) {
  const orderRef = doc(
    db,
    'orders',
    orderId,
  )

  const newWaktuDibutuhkanAt =
    getTimestampFromDateTimeLocal(
      newWaktuDibutuhkan,
    )

  const newWaktuDibutuhkanMillis =
    newWaktuDibutuhkanAt.toMillis()

  if (
    newWaktuDibutuhkanMillis <=
    Date.now()
  ) {
    throw new Error(
      'Waktu baru harus berada di masa depan.',
    )
  }

  const newExpiresAt =
    Timestamp.fromMillis(
      newWaktuDibutuhkanMillis +
        CUSTOMER_DECISION_WINDOW_MS,
    )

  await runTransaction(
    db,
    async (transaction) => {
      const orderSnapshot =
        await transaction.get(
          orderRef,
        )

      if (
        !orderSnapshot.exists()
      ) {
        throw new Error(
          'Pesanan tidak ditemukan.',
        )
      }

      const orderData =
        orderSnapshot.data() as Order

      if (
        orderData.customerId !==
        customerId
      ) {
        throw new Error(
          'Kamu tidak berhak mengubah permintaan ini.',
        )
      }

      if (
        orderData.status !==
        'pending'
      ) {
        throw new Error(
          'Permintaan ini sudah tidak berstatus pending.',
        )
      }

      if (
        orderData.helperId !== null
      ) {
        throw new Error(
          'Permintaan ini sudah memiliki Helper.',
        )
      }

      if (
        orderData.needsCustomerDecision !==
        true
      ) {
        throw new Error(
          'Permintaan ini belum membutuhkan keputusan Customer.',
        )
      }

      transaction.update(
        orderRef,
        {
          status: 'pending',
          customerId:
            orderData.customerId,
          helperId: null,
          kategori:
            orderData.kategori,
          judul:
            orderData.judul,
          deskripsi:
            orderData.deskripsi,
          lokasi:
            orderData.lokasi,
          budgetCustomer:
            orderData.budgetCustomer,
          waktuDibutuhkan:
            newWaktuDibutuhkan,
          waktuDibutuhkanAt:
            newWaktuDibutuhkanAt,
          hargaTawaran: null,
          hargaDisepakati: null,
          tawaranHelperId: null,
          tawaranStatus: 'none',
          needsCustomerDecision:
            false,
          responseDeadlineAt:
            null,
          expiresAt:
            newExpiresAt,
          statusHistory: [
            ...(orderData.statusHistory ||
              []),
            {
              status: 'pending',
              at: Timestamp.now(),
              note:
                'Customer memilih tetap mencari Helper dengan waktu baru.',
            },
          ],
          updatedAt:
            serverTimestamp(),
        },
      )
    },
  )
}

// ============================================================
// CUSTOMER: BERHENTI MENCARI HELPER
// ============================================================

export async function stopSearchingOrder(
  orderId: string,
  customerId: string,
) {
  const orderRef = doc(
    db,
    'orders',
    orderId,
  )

  let notificationTitle = ''

  await runTransaction(
    db,
    async (transaction) => {
      const orderSnapshot =
        await transaction.get(
          orderRef,
        )

      if (
        !orderSnapshot.exists()
      ) {
        throw new Error(
          'Pesanan tidak ditemukan.',
        )
      }

      const orderData =
        orderSnapshot.data() as Order

      if (
        orderData.customerId !==
        customerId
      ) {
        throw new Error(
          'Kamu tidak berhak mengubah permintaan ini.',
        )
      }

      if (
        orderData.status !==
        'pending'
      ) {
        throw new Error(
          'Permintaan ini sudah tidak berstatus pending.',
        )
      }

      if (
        orderData.helperId !== null
      ) {
        throw new Error(
          'Permintaan ini sudah memiliki Helper.',
        )
      }

      if (
        orderData.needsCustomerDecision !==
        true
      ) {
        throw new Error(
          'Permintaan ini belum berada pada tahap keputusan Customer.',
        )
      }

      notificationTitle =
        orderData.judul

      transaction.update(
        orderRef,
        {
          status: 'expired',
          helperId: null,
          needsCustomerDecision:
            false,
          responseDeadlineAt:
            orderData.responseDeadlineAt ??
            null,
          statusHistory: [
            ...(orderData.statusHistory ||
              []),
            {
              status: 'expired',
              at: Timestamp.now(),
              note:
                'Customer memilih berhenti mencari Helper.',
            },
          ],
          updatedAt:
            serverTimestamp(),
        },
      )
    },
  )

  // Notifikasi kepada Customer sendiri sebagai
  // konfirmasi bahwa pencarian dihentikan.
  await notifyUser(
    customerId,
    'order_expired',
    'Pencarian Helper Dihentikan',
    `Pencarian Helper untuk order "${notificationTitle}" telah dihentikan.`,
    orderId,
  )
}

// ============================================================
// BATALKAN ORDER
//
// Customer: pending
// Helper: accepted / on_the_way
// Alasan wajib.
// ============================================================

export async function cancelOrder(
  orderId: string,
  userId: string,
  reason: string,
): Promise<{
  cancelledBy: 'customer' | 'helper'
  reopenedForHelper: boolean
}> {
  const cleanReason =
    reason.trim()

  if (!cleanReason) {
    throw new Error(
      'Alasan pembatalan wajib diisi.',
    )
  }

  if (
    cleanReason.length > 500
  ) {
    throw new Error(
      'Alasan pembatalan maksimal 500 karakter.',
    )
  }

  const orderRef = doc(
    db,
    'orders',
    orderId,
  )

  let cancelledBy:
    | 'customer'
    | 'helper' = 'customer'

  let notifyUserId:
    | string
    | null = null

  let reopenedForHelper =
    false

  await runTransaction(
    db,
    async (transaction) => {
      const snapshot =
        await transaction.get(
          orderRef,
        )

      if (!snapshot.exists()) {
        throw new Error(
          'Pesanan tidak ditemukan.',
        )
      }

      const orderData =
        snapshot.data() as Order

      if (
        orderData.customerId ===
          userId &&
        orderData.status ===
          'pending'
      ) {
        cancelledBy = 'customer'

        notifyUserId =
          orderData.tawaranHelperId ??
          orderData.helperId ??
          null

        transaction.update(
          orderRef,
          {
            status: 'cancelled',
            needsCustomerDecision:
              false,
            responseDeadlineAt:
              null,
            cancelledBy:
              'customer',
            cancellationReason:
              cleanReason,
            cancelledAt:
              serverTimestamp(),
            statusHistory: [
              ...(orderData.statusHistory ||
                []),
              {
                status: 'cancelled',
                at: Timestamp.now(),
                note:
                  'Customer membatalkan order.',
                cancellationReason:
                  cleanReason,
              },
            ],
            updatedAt:
              serverTimestamp(),
          },
        )
      } else if (
        orderData.helperId ===
          userId &&
        (
          orderData.status ===
            'accepted' ||
          orderData.status ===
            'on_the_way'
        )
      ) {
        cancelledBy = 'helper'

        notifyUserId =
          orderData.customerId

        reopenedForHelper =
          true

        transaction.update(
          orderRef,
          {
            status: 'pending',
            helperId: null,
            hargaTawaran: null,
            hargaDisepakati:
              null,
            tawaranHelperId:
              null,
            tawaranStatus:
              'none',
            needsCustomerDecision:
              false,
            responseDeadlineAt:
              null,
            cancelledBy:
              null,
            cancellationReason:
              null,
            cancelledAt:
              null,
            statusHistory: [
              ...(orderData.statusHistory ||
                []),
              {
                status: 'cancelled',
                at: Timestamp.now(),
                note:
                  'Helper membatalkan order. Order kembali tersedia untuk Helper lain.',
                cancellationReason:
                  cleanReason,
              },
              {
                status: 'pending',
                at: Timestamp.now(),
                note:
                  'Order dibuka kembali setelah Helper membatalkan pekerjaan.',
              },
            ],
            updatedAt:
              serverTimestamp(),
          },
        )
      } else {
        throw new Error(
          'Order ini tidak dapat dibatalkan pada tahap sekarang.',
        )
      }
    },
  )

  const message =
    reopenedForHelper
      ? `Helper membatalkan pekerjaan. Alasan: ${cleanReason}. Order kembali tersedia untuk Helper lain.`
      : `Customer membatalkan order. Alasan: ${cleanReason}`

  await notifyCancellation(
    notifyUserId,
    orderId,
    message,
  )

  return {
    cancelledBy,
    reopenedForHelper,
  }
}