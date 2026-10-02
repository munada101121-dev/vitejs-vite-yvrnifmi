import { useEffect, useRef, useState } from 'react'
import './App.css';

import { auth, onAuthStateChanged, signOut, type User } from './auth';

import AuthScreen from './AuthScreen';

import {
  listenToNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type AppNotification,
} from './notifications';

import { getUserProfile, updateUserMode, type UserProfile } from './profile';

import {
  acceptOrder,
  ajukanTawaranHarga,
  cancelOrder,
  completeOrder,
  continueSearchingOrder,
  createOrder,
  getCustomerOrders,
  getOrderById,
  getHelperOrders,
  getPendingOrders,
  setujuiKesepakatan,
  setujuiKesepakatanCustomer,
  startOrderTravel,
  startOrderWork,
  stopSearchingOrder,
  terimaTawaranHarga,
  tolakTawaranHarga,
  type Order,
} from './orders';

type Mode = 'customer' | 'helper' | 'seller';

type DecisionModal =
  | 'none'
  | 'warning'
  | 'stop'
  | 'active_order'
  | 'cancel_order'
  | 'cancel_helper_order';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [profileLoading, setProfileLoading] = useState(false);

  const [halaman, setHalaman] = useState('dashboard');

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const [notificationsError, setNotificationsError] = useState('');

  const [mode, setMode] = useState<Mode>('customer');

  const [showMode, setShowMode] = useState(false);

  const [kategoriDipilih, setKategoriDipilih] = useState('');

  const [judul, setJudul] = useState('');

  const [deskripsi, setDeskripsi] = useState('');

  const [lokasi, setLokasi] = useState('');

  const [budget, setBudget] = useState('');

  const [waktuDibutuhkan, setWaktuDibutuhkan] = useState('');

  const [targetDurasiCustomer, setTargetDurasiCustomer] = useState('');

  const [catatanDurasiCustomer, setCatatanDurasiCustomer] = useState('');

  const [pesanError, setPesanError] = useState('');

  const [orders, setOrders] = useState<Order[]>([]);

  const [ordersLoading, setOrdersLoading] = useState(false);

  const [ordersError, setOrdersError] = useState('');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);

  const [pendingOrdersLoading, setPendingOrdersLoading] = useState(false);

  const [pendingOrdersError, setPendingOrdersError] = useState('');

  const [helperOrders, setHelperOrders] = useState<Order[]>([]);

  const [helperOrdersLoading, setHelperOrdersLoading] = useState(false);

  const [helperOrdersError, setHelperOrdersError] = useState('');

  const [acceptingOrder, setAcceptingOrder] = useState(false);

  const [offeringPrice, setOfferingPrice] = useState(false);

  const [acceptingOffer, setAcceptingOffer] = useState(false);

  const [rejectingOffer, setRejectingOffer] = useState(false);

  const [hargaTawaranInput, setHargaTawaranInput] = useState('');

  const [showHelperOfferForm, setShowHelperOfferForm] =
  useState(false);

  const helperOfferFormRef =
  useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showHelperOfferForm) {
      return;
    }
  
    const timer = window.setTimeout(() => {
      helperOfferFormRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  
    return () => window.clearTimeout(timer);
  }, [showHelperOfferForm]);

  const [estimasiDurasiHelper, setEstimasiDurasiHelper] = useState('');

  const [startingTravel, setStartingTravel] = useState(false);

  const [startingWork, setStartingWork] = useState(false);

  const [completingOrder, setCompletingOrder] = useState(false);

  const [creatingOrder, setCreatingOrder] = useState(false);

  const [newWaktuDibutuhkan, setNewWaktuDibutuhkan] = useState('');

  const [decisionLoading, setDecisionLoading] = useState(false);

  const [activeDecisionModal, setActiveDecisionModal] =
    useState<DecisionModal>('none');

  const [cancelReason, setCancelReason] = useState('');

  const [cancelReasonOption, setCancelReasonOption] = useState('');

  const [showCancelReasonDropdown, setShowCancelReasonDropdown] =
    useState(false);

  // ============================================================
  // RESET FORM ORDER
  // ============================================================

  const resetOrderForm = () => {
    setKategoriDipilih('');
    setJudul('');
    setDeskripsi('');
    setLokasi('');
    setBudget('');
    setWaktuDibutuhkan('')
    setTargetDurasiCustomer('')
    setPesanError('');
  };

  // ============================================================
  // BUKA FORM PERMINTAAN BARU
  // ============================================================

  const bukaPermintaanBaru = () => {
    resetOrderForm();
    setHalaman('customer');
  };

  // ============================================================
  // FORMAT WAKTU NOTIFIKASI
  // ============================================================

  const formatNotificationDate = (value: unknown) => {
    if (!value) {
      return 'Baru saja';
    }

    try {
      let date: Date | null = null;

      if (value instanceof Date) {
        date = value;
      } else if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate?: unknown }).toDate === 'function'
      ) {
        date = (value as { toDate: () => Date }).toDate();
      } else if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);

        if (!Number.isNaN(parsed.getTime())) {
          date = parsed;
        }
      }

      if (!date || Number.isNaN(date.getTime())) {
        return 'Baru saja';
      }

      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Baru saja';
    }
  };

  const unreadNotificationCount = notifications.filter(
    (notification) => notification.read !== true
  ).length;

  const handleOpenNotification = async (notification: AppNotification) => {
    if (!notification.read) {
      try {
        await markNotificationAsRead(user!.uid, notification.id);
      } catch (error) {
        console.error('Gagal menandai notifikasi sebagai dibaca:', error);
      }
    }
    if (!notification.orderId) {
      return;
    }

    const order = await getOrderById(notification.orderId);
    if (!order) {
      return;
    }
    setSelectedOrder(order);
    setHalaman('detail');
  };

  const handleMarkAllNotificationsAsRead = async () => {
    const unreadNotifications = notifications.filter(
      (notification) => notification.read !== true
    );

    if (unreadNotifications.length === 0) {
      return;
    }

    try {
      await markAllNotificationsAsRead(unreadNotifications);
    } catch (error) {
      console.error('Gagal menandai semua notifikasi sebagai dibaca:', error);
    }
  };

  // ============================================================
  // AUTH + PROFILE
  // ============================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setMode('customer');
        setHalaman('dashboard');
        setShowMode(false);
        setProfileLoading(false);
        setAuthLoading(false);

        setOrders([]);
        setOrdersError('');

        setPendingOrders([]);
        setPendingOrdersError('');

        setHelperOrders([]);
        setHelperOrdersError('');

        setSelectedOrder(null);

        setNotifications([]);
        setNotificationsError('');
        setNotificationsLoading(false);

        setActiveDecisionModal('none');

        setHargaTawaranInput('');

        resetOrderForm();

        return;
      }

      setHalaman('dashboard');
      setShowMode(false);
      setProfileLoading(true);

      try {
        const userProfile = await getUserProfile(currentUser.uid);

        setProfile(userProfile);

        if (
          userProfile?.modeAktif === 'customer' ||
          userProfile?.modeAktif === 'helper' ||
          userProfile?.modeAktif === 'seller'
        ) {
          setMode(userProfile.modeAktif);
        } else {
          setMode('customer');
        }
      } catch (error) {
        console.error('Gagal memuat profile:', error);

        setProfile(null);
        setMode('customer');
      } finally {
        setProfileLoading(false);
        setAuthLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // ============================================================
  // NOTIFIKASI REALTIME
  // ============================================================

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setNotificationsError('');
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError('');

    const unsubscribe = listenToNotifications(
      user.uid,
      (data) => {
        setNotifications(data);
        setNotificationsLoading(false);
        setNotificationsError('');
      },
      (error) => {
        console.error('Gagal memuat notifikasi realtime:', error);

        setNotificationsLoading(false);
        setNotificationsError(error.message);
      }
    );

    return unsubscribe;
  }, [user]);

  // ============================================================
  // LOAD ORDER CUSTOMER
  // ============================================================

  const loadCustomerOrders = async () => {

    if (!user) {
      return;
    }

    setOrdersLoading(true);
    setOrdersError('');

    try {
      const data = await getCustomerOrders(user.uid);

      setOrders(data);

      setSelectedOrder((currentSelectedOrder) => {
        if (!currentSelectedOrder) {
          return currentSelectedOrder;
        }

        const updated = data.find(
          (order) => order.id === currentSelectedOrder.id
        );

        return updated ?? currentSelectedOrder;
      });
    } catch (error) {
      console.error('Gagal mengambil order Customer:', error);

      setOrders([]);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      setOrdersError(errorMessage);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!user || mode !== 'customer') {
      setOrders([]);
      setOrdersError('');
      return;
    }

    loadCustomerOrders();

    const interval = window.setInterval(() => {
      loadCustomerOrders();
    }, 30 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [user, mode]);

  // ============================================================
  // LOAD ORDER HELPER
  // ============================================================

  const loadPendingOrders = async () => {
    if (!user) {
      return;
    }

    setPendingOrdersLoading(true);
    setPendingOrdersError('');

    try {
      const data = await getPendingOrders();

      setPendingOrders(data);
    } catch (error) {
      console.error('Gagal mengambil pekerjaan tersedia:', error);

      setPendingOrders([]);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      setPendingOrdersError(errorMessage);
    } finally {
      setPendingOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!user || mode !== 'helper') {
      setPendingOrders([]);
      setPendingOrdersError('');
      return;
    }

    loadPendingOrders();

    const interval = window.setInterval(() => {
      loadPendingOrders();
    }, 30 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [user, mode]);

  // ============================================================
  // LOAD PEKERJAAN MILIK HELPER
  // ============================================================

  const loadHelperOrders = async () => {
    if (!user) {
      return;
    }

    setHelperOrdersLoading(true);
    setHelperOrdersError('');

    try {
      const data = await getHelperOrders(user.uid);

      setHelperOrders(data);
    } catch (error) {
      console.error('Gagal mengambil pekerjaan Helper:', error);

      setHelperOrders([]);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      setHelperOrdersError(errorMessage);
    } finally {
      setHelperOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!user || mode !== 'helper') {
      setHelperOrders([]);
      setHelperOrdersError('');
      return;
    }

    loadHelperOrders();

    const interval = window.setInterval(() => {
      loadHelperOrders();
    }, 30 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [user, mode]);

  // ============================================================
  // KATEGORI
  // ============================================================

  const kategori = [
    {
      icon: '🛒',
      nama: 'Belanja',
    },
    {
      icon: '🧹',
      nama: 'Bersih-bersih',
    },
    {
      icon: '🌱',
      nama: 'Kebun',
    },
    {
      icon: '🔧',
      nama: 'Perbaikan',
    },
    {
      icon: '📦',
      nama: 'Angkut',
    },
    {
      icon: '📱',
      nama: 'Digital',
    },
    {
      icon: '🏠',
      nama: 'Bantuan Rumah',
    },
    {
      icon: '🚗',
      nama: 'Kendaraan',
    },
    {
      icon: '➕',
      nama: 'Lainnya',
    },
  ];

  // ============================================================
  // STATUS
  // ============================================================

  const statusLabel = (status: Order['status']) => {
    if (status === 'pending') {
      return 'Menunggu Helper';
    }

    if (status === 'accepted') {
      return 'Helper Ditemukan';
    }

    if (status === 'on_the_way') {
      return 'Dalam Perjalanan';
    }

    if (status === 'working') {
      return 'Sedang Dikerjakan';
    }

    if (status === 'completed') {
      return 'Selesai';
    }

    if (status === 'cancelled') {
      return 'Dibatalkan';
    }

    if (status === 'expired') {
      return 'Kadaluarsa';
    }

    return status;
  };

  // ============================================================
  // BUAT PERMINTAAN
  // ============================================================

  const buatPermintaan = async () => {
    if (!user) {
      setPesanError('Akun belum terdeteksi.');
      return;
    }

    if (creatingOrder) {
      return;
    }

    if (
      !kategoriDipilih ||
      !judul.trim() ||
      !deskripsi.trim() ||
      !lokasi.trim() ||
      !budget.trim() ||
      !waktuDibutuhkan.trim()
    ) {
      setPesanError('Mohon lengkapi semua kolom terlebih dahulu.');
      return;
    }

    const budgetNumber = Number(budget);

    if (!Number.isFinite(budgetNumber) || budgetNumber <= 0) {
      setPesanError('Budget harus berupa angka lebih dari 0.');
      return;
    }

    const tanggalDibutuhkanObj = new Date(waktuDibutuhkan);

    if (
      Number.isNaN(tanggalDibutuhkanObj.getTime()) ||
      tanggalDibutuhkanObj.getTime() <= Date.now()
    ) {
      setPesanError('Waktu dibutuhkan harus berada di masa depan.');
      return;
    }

    setPesanError('');
    setCreatingOrder(true);

    try {
      await createOrder({
        customerId: user.uid,
        kategori: kategoriDipilih,
        judul: judul.trim(),
        deskripsi: deskripsi.trim(),
        lokasi: lokasi.trim(),
        budget: budgetNumber,
        waktuDibutuhkan,
        targetDurasiCustomer,
      });

      const data = await getCustomerOrders(user.uid);

      setOrders(data);
      setHalaman('berhasil');
    } catch (error) {
      console.error('Gagal membuat permintaan:', error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      setPesanError(`Permintaan gagal dibuat.\n${errorMessage}`);
    } finally {
      setCreatingOrder(false);
    }
  };

  // ============================================================
  // SWITCH MODE
  // ============================================================

  const pilihMode = async (modeBaru: Mode) => {
    if (!user) {
      return;
    }

    const modeSebelumnya = mode;

    setMode(modeBaru);
    setShowMode(false);
    setHalaman('dashboard');

    try {
      await updateUserMode(user.uid, modeBaru);

      setProfile((currentProfile) => {
        if (!currentProfile) {
          return currentProfile;
        }

        return {
          ...currentProfile,
          modeAktif: modeBaru,
        };
      });
    } catch (error: any) {
      console.error('GAGAL MENYIMPAN MODE:', error);

      setMode(modeSebelumnya);
      setShowMode(false);

      const errorCode = error?.code || 'tidak diketahui';

      const errorMessage = error?.message || 'Tidak ada pesan error.';

      alert(
        `GAGAL MENYIMPAN MODE\n\nKode: ${errorCode}\n\nPesan: ${errorMessage}`
      );
    }
  };

  // ============================================================
  // HELPER: AMBIL PEKERJAAN
  // ============================================================

  const ambilPekerjaan = async () => {
    if (!user || !selectedOrder) {
      return;
    }

    if (selectedOrder.status !== 'pending') {
      alert('Pekerjaan ini sudah tidak tersedia.');
      return;
    }

    if (selectedOrder.tawaranStatus === 'menunggu_customer') {
      alert('Pesanan sedang menunggu keputusan Customer atas tawaran harga.');
      return;
    }

    setAcceptingOrder(true);

    try {
      await acceptOrder(selectedOrder.id, user.uid);

      const orderBaru: Order = {
        ...selectedOrder,
        helperId: user.uid,
        status: 'accepted',
        statusHistory: [
          ...(selectedOrder.statusHistory || []),
          {
            status: 'accepted',
            at: new Date(),
            note: 'Pesanan diambil oleh Helper.',
          },
        ],
      };

      setSelectedOrder(orderBaru);

      setPendingOrders((currentOrders) =>
        currentOrders.filter((order) => order.id !== selectedOrder.id)
      );

      await loadHelperOrders();
    } catch (error) {
      console.error('Gagal mengambil pekerjaan:', error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage ===
        'Anda masih memiliki pekerjaan yang sedang berjalan. Selesaikan pekerjaan tersebut terlebih dahulu sebelum mengambil pekerjaan baru.'
      ) {
        setActiveDecisionModal('active_order');
        return;
      }

      alert(`Gagal mengambil pekerjaan.\n\n${errorMessage}`);
    } finally {
      setAcceptingOrder(false);
    }
  };

  // ============================================================
  // HELPER: TAWAR HARGA
  // ============================================================

  const closeKeyboard = () => {
    const activeElement = document.activeElement;
  
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  };

  const handleAjukanTawaran = async () => {
    if (!user || !selectedOrder) {
      return;
    }

    if (selectedOrder.status !== 'pending') {
      alert('Pesanan ini sudah tidak tersedia untuk tawaran harga.');
      return;
    }

    const harga = Number(hargaTawaranInput);

    if (!estimasiDurasiHelper.trim()) {
      closeKeyboard();
      alert('Waktu pengerjaan belum dipilih.');
      return;
    }
    
    if (!hargaTawaranInput.trim()) {
      alert('Harga tawaran belum diisi.');
      return;
    }

    if (!Number.isFinite(harga) || harga <= 0) {
      alert('Harga tawaran harus berupa angka lebih dari 0.');
      return;
    }

    setOfferingPrice(true);

    try {
      await ajukanTawaranHarga(
        selectedOrder.id,
        user.uid,
        profile?.nama || user.displayName || 'Helper',
        harga,
        estimasiDurasiHelper
      );

      const orderBaru: Order = {
        ...selectedOrder,
        hargaTawaran: harga,
        hargaDisepakati: null,
        tawaranHelperId: user.uid,
        tawaranStatus: 'menunggu_customer',
      };

      setSelectedOrder(orderBaru);

      setPendingOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderBaru.id ? orderBaru : order
        )
      );

      setHargaTawaranInput('');
    } catch (error) {
      console.error('Gagal mengajukan tawaran harga:', error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage ===
        'Anda masih memiliki pekerjaan yang sedang berjalan. Selesaikan pekerjaan tersebut terlebih dahulu sebelum mengajukan tawaran harga untuk pekerjaan baru.'
      ) {
        setActiveDecisionModal('active_order');
        return;
      }

      alert(`Gagal mengajukan tawaran harga.\n\n${errorMessage}`);
    } finally {
      setOfferingPrice(false);
    }
  };

  // ============================================================
  // CUSTOMER: TERIMA TAWARAN
  // ============================================================

  const handleTerimaTawaran = async () => {
    if (!user || !selectedOrder) {
      return;
    }

    setAcceptingOffer(true);

    try {
      await terimaTawaranHarga(selectedOrder.id, user.uid);

      const data = await getCustomerOrders(user.uid);

      setOrders(data);

      const updated = data.find((order) => order.id === selectedOrder.id);

      if (updated) {
        setSelectedOrder(updated);
      } else {
        setSelectedOrder({
          ...selectedOrder,
          helperId: selectedOrder.tawaranHelperId,
          status: 'accepted',
          hargaDisepakati: selectedOrder.hargaTawaran,
          tawaranStatus: 'diterima',
          needsCustomerDecision: false,
          responseDeadlineAt: null,
        });
      }
    } catch (error) {
      console.error('Gagal menerima tawaran harga:', error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage ===
        'Helper tersebut masih memiliki pekerjaan yang sedang berjalan. Tawaran tidak dapat diterima sampai pekerjaan tersebut selesai.'
      ) {
        setActiveDecisionModal('active_order');
        return;
      }

      alert(`Gagal menerima tawaran harga.\n\n${errorMessage}`);
    } finally {
      setAcceptingOffer(false);
    }
  };

  const handleSetujuiKesepakatanCustomer = async () => {
    if (!user || !selectedOrder) {
      return;
    }
  
    if (selectedOrder.status !== 'accepted') {
      alert('Pekerjaan belum berada pada tahap kesepakatan.');
      return;
    }
  
    if (selectedOrder.kesepakatanCustomer === true) {
      alert('Kamu sudah menyetujui kesepakatan ini.');
      return;
    }
  
    try {
      await setujuiKesepakatanCustomer(
        selectedOrder.id,
        user.uid
      );
  
      const orderBaru: Order = {
        ...selectedOrder,
        kesepakatanCustomer: true,
      };
  
      setSelectedOrder(orderBaru);
  
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderBaru.id
            ? orderBaru
            : order
        )
      );
  
      await loadCustomerOrders();
  
      alert('Kesepakatan berhasil disetujui.');
    } catch (error) {
      console.error(
        'Gagal menyetujui kesepakatan:',
        error
      );
  
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);
  
      alert(
        `Gagal menyetujui kesepakatan.\n\n${errorMessage}`
      );
    }
  };

  // ============================================================
  // CUSTOMER: TOLAK TAWARAN
  // ============================================================

  const handleTolakTawaran = async () => {
    if (!user || !selectedOrder) {
      return;
    }

    setRejectingOffer(true);

    try {
      await tolakTawaranHarga(selectedOrder.id, user.uid);

      const data = await getCustomerOrders(user.uid);

      setOrders(data);

      const updated = data.find((order) => order.id === selectedOrder.id);

      if (updated) {
        setSelectedOrder(updated);
      } else {
        setSelectedOrder({
          ...selectedOrder,
          hargaTawaran: null,
          hargaDisepakati: null,
          tawaranHelperId: null,
          tawaranStatus: 'none',
        });
      }
    } catch (error) {
      console.error('Gagal menolak tawaran harga:', error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      alert(`Gagal menolak tawaran harga.\n\n${errorMessage}`);
    } finally {
      setRejectingOffer(false);
    }
  };

  // ============================================================
  // HELPER: BERANGKAT
  // accepted -> on_the_way
  // ============================================================

  const handleStartTravel = async () => {
    if (!user || !selectedOrder) {
      return;
    }

    if (selectedOrder.status !== 'accepted') {
      alert('Pekerjaan ini belum berada pada tahap siap berangkat.');
      return;
    }

    setStartingTravel(true);

    try {
      await startOrderTravel(selectedOrder.id, user.uid);

      const orderBaru: Order = {
        ...selectedOrder,
        status: 'on_the_way',
        statusHistory: [
          ...(selectedOrder.statusHistory || []),
          {
            status: 'on_the_way',
            at: new Date(),
            note: 'Helper berangkat menuju lokasi Customer.',
          },
        ],
      };

      setSelectedOrder(orderBaru);

      setHelperOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderBaru.id ? orderBaru : order
        )
      );

      await loadHelperOrders();
    } catch (error) {
      console.error('Gagal mengubah status perjalanan:', error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      alert(`Gagal memulai perjalanan.\n\n${errorMessage}`);
    } finally {
      setStartingTravel(false);
    }
  };

  const handleSetujuiKesepakatan = async () => {
    if (!user || !selectedOrder) {
      return;
    }
  
    if (selectedOrder.status !== 'accepted') {
      alert('Pekerjaan belum berada pada tahap kesepakatan.');
      return;
    }
  
    if (selectedOrder.kesepakatanHelper === true) {
      alert('Kamu sudah menyetujui kesepakatan ini.');
      return;
    }
  
    try {
      await setujuiKesepakatan(
        selectedOrder.id,
        user.uid
      );
  
      const orderBaru: Order = {
        ...selectedOrder,
        kesepakatanHelper: true,
      };
  
      setSelectedOrder(orderBaru);
  
      setHelperOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderBaru.id
            ? orderBaru
            : order
        )
      );
  
      await loadHelperOrders();
  
      alert('Kesepakatan berhasil disetujui.');
    } catch (error) {
      console.error(
        'Gagal menyetujui kesepakatan:',
        error
      );
  
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);
  
      alert(
        `Gagal menyetujui kesepakatan.\n\n${errorMessage}`
      );
    }
  };

  // ============================================================
  // HELPER: MULAI PEKERJAAN
  // on_the_way -> working
  // ============================================================

  const handleStartWork = async () => {
    if (!user || !selectedOrder) {
      return;
    }

    if (selectedOrder.status !== 'on_the_way') {
      alert('Pekerjaan belum berada pada tahap Dalam Perjalanan.');
      return;
    }

    setStartingWork(true);

    try {
      await startOrderWork(selectedOrder.id, user.uid);

      const orderBaru: Order = {
        ...selectedOrder,
        status: 'working',
        statusHistory: [
          ...(selectedOrder.statusHistory || []),
          {
            status: 'working',
            at: new Date(),
            note: 'Helper tiba di lokasi dan mulai mengerjakan pekerjaan.',
          },
        ],
      };

      setSelectedOrder(orderBaru);

      setHelperOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderBaru.id ? orderBaru : order
        )
      );

      await loadHelperOrders();
    } catch (error) {
      console.error('Gagal memulai pekerjaan:', error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      alert(`Gagal memulai pekerjaan.\n\n${errorMessage}`);
    } finally {
      setStartingWork(false);
    }
  };

  // ============================================================
  // HELPER: SELESAIKAN PEKERJAAN
  // working -> completed
  // ============================================================

  const handleCompleteOrder = async () => {
    if (!user || !selectedOrder) {
      return;
    }

    if (selectedOrder.status !== 'working') {
      alert('Pekerjaan belum berada pada tahap Sedang Dikerjakan.');
      return;
    }

    setCompletingOrder(true);

    try {
      await completeOrder(selectedOrder.id, user.uid);

      const orderBaru: Order = {
        ...selectedOrder,
        status: 'completed',
        statusHistory: [
          ...(selectedOrder.statusHistory || []),
          {
            status: 'completed',
            at: new Date(),
            note: 'Helper menyelesaikan pekerjaan.',
          },
        ],
      };

      setSelectedOrder(orderBaru);

      setHelperOrders((currentOrders) =>
        currentOrders.filter((order) => order.id !== orderBaru.id)
      );

      await loadHelperOrders();
    } catch (error) {
      console.error('Gagal menyelesaikan pekerjaan:', error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      alert(`Gagal menyelesaikan pekerjaan.\n\n${errorMessage}`);
    } finally {
      setCompletingOrder(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!user || !selectedOrder) {
      return;
    }

    if (selectedOrder.status !== 'pending') {
      alert('Permintaan ini tidak dapat dibatalkan pada tahap sekarang.');
      return;
    }

    const reason = cancelReason.trim();

    if (!reason) {
      setActiveDecisionModal('cancel_order');
      return;
    }

    setDecisionLoading(true);

    try {
      await cancelOrder(selectedOrder.id, user.uid, reason);

      const orderBaru: Order = {
        ...selectedOrder,
        status: 'cancelled',
        cancelledBy: 'customer',
        cancellationReason: reason,
        cancelledAt: new Date(),
        needsCustomerDecision: false,
        responseDeadlineAt: null,
        statusHistory: [
          ...(selectedOrder.statusHistory || []),
          {
            status: 'cancelled',
            at: new Date(),
            note: 'Customer membatalkan order.',
            cancellationReason: reason,
          },
        ],
      };

      setSelectedOrder(orderBaru);
      setCancelReason('');
      setActiveDecisionModal('none');

      await loadCustomerOrders();
    } catch (error) {
      console.error('Gagal membatalkan permintaan:', error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      alert(`Gagal membatalkan permintaan.\n\n${errorMessage}`);
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleCancelHelperOrder = async () => {
    if (!user || !selectedOrder) {
      return;
    }

    if (
      selectedOrder.status !== 'accepted' &&
      selectedOrder.status !== 'on_the_way'
    ) {
      alert('Pekerjaan ini tidak dapat dibatalkan pada tahap sekarang.');
      return;
    }

    const reason = cancelReason.trim();

    if (!reason) {
      setActiveDecisionModal('cancel_helper_order');
      return;
    }

    setDecisionLoading(true);

    try {
      await cancelOrder(selectedOrder.id, user.uid, reason);

      setSelectedOrder({
        ...selectedOrder,
        status: 'pending',
        helperId: null,
        hargaTawaran: null,
        hargaDisepakati: null,
        tawaranHelperId: null,
        tawaranStatus: 'none',
        needsCustomerDecision: false,
        responseDeadlineAt: null,
        cancelledBy: null,
        cancellationReason: null,
        cancelledAt: null,
        statusHistory: [
          ...(selectedOrder.statusHistory || []),
          {
            status: 'cancelled',
            at: new Date(),
            note: 'Helper membatalkan pekerjaan. Order kembali tersedia untuk Helper lain.',
            cancellationReason: reason,
          },
          {
            status: 'pending',
            at: new Date(),
            note: 'Order dibuka kembali setelah Helper membatalkan pekerjaan.',
          },
        ],
      });

      setCancelReason('');
      setActiveDecisionModal('none');

      await loadHelperOrders();
    } catch (error) {
      console.error('Gagal membatalkan pekerjaan:', error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      alert(`Gagal membatalkan pekerjaan.\n\n${errorMessage}`);
    } finally {
      setDecisionLoading(false);
    }
  };

  // ============================================================
  // TETAP CARI
  // ============================================================

  const handleContinueSearching = async () => {
    if (!user || !selectedOrder) {
      return;
    }

    if (!newWaktuDibutuhkan) {
      setActiveDecisionModal('warning');
      return;
    }

    setDecisionLoading(true);

    try {
      await continueSearchingOrder(
        selectedOrder.id,
        user.uid,
        newWaktuDibutuhkan
      );

      const data = await getCustomerOrders(user.uid);

      setOrders(data);

      const updated = data.find((order) => order.id === selectedOrder.id);

      if (updated) {
        setSelectedOrder(updated);
      }

      setNewWaktuDibutuhkan('');
    } catch (error) {
      console.error('Gagal melanjutkan pencarian:', error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      alert(`Gagal melanjutkan pencarian.\n\n${errorMessage}`);
    } finally {
      setDecisionLoading(false);
    }
  };

  // ============================================================
  // TAMPILKAN MODAL BERHENTI
  // ============================================================

  const handleStopSearching = () => {
    if (!user || !selectedOrder) {
      return;
    }

    setActiveDecisionModal('stop');
  };

  // ============================================================
  // KONFIRMASI BERHENTI
  // ============================================================

  const confirmStopSearching = async () => {
    if (!user || !selectedOrder) {
      return;
    }

    setActiveDecisionModal('none');
    setDecisionLoading(true);

    try {
      await stopSearchingOrder(selectedOrder.id, user.uid);

      const data = await getCustomerOrders(user.uid);

      setOrders(data);

      const updated = data.find((order) => order.id === selectedOrder.id);

      if (updated) {
        setSelectedOrder(updated);
      }
    } catch (error) {
      console.error('Gagal menghentikan pencarian:', error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      alert(`Gagal menghentikan pencarian.\n\n${errorMessage}`);
    } finally {
      setDecisionLoading(false);
    }
  };

  // ============================================================
  // HEADER
  // ============================================================

  const Header = () => (
    <header className="app-header">
      <div className="app-logo">Bantu_In</div>

      <div className="header-actions">
        <div className="mode-wrapper">
          <button
            className="mode-button"
            onClick={() => setShowMode(!showMode)}
          >
            {mode === 'customer' && '👤 Customer'}

            {mode === 'helper' && '🛠️ Helper'}

            {mode === 'seller' && '🏪 Seller'}

            <span>▼</span>
          </button>

          {showMode && (
            <div className="mode-menu">
              <button
                onClick={() => pilihMode('customer')}
                className={mode === 'customer' ? 'active' : ''}
              >
                👤 Customer
                {mode === 'customer' && <span>✓</span>}
              </button>

              <button
                onClick={() => pilihMode('helper')}
                className={mode === 'helper' ? 'active' : ''}
              >
                🛠️ Helper
                {mode === 'helper' && <span>✓</span>}
              </button>

              <button
                onClick={() => pilihMode('seller')}
                className={mode === 'seller' ? 'active' : ''}
              >
                🏪 Seller
                {mode === 'seller' && <span>✓</span>}
              </button>
            </div>
          )}
        </div>

        <button
          className="icon-button"
          onClick={() => setHalaman('notifikasi')}
          aria-label="Notifikasi"
          style={{
            position: 'relative',
          }}
        >
          🔔
          {unreadNotificationCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                minWidth: '17px',
                height: '17px',
                padding: '0 4px',
                borderRadius: '999px',
                background: '#d71920',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: '800',
                lineHeight: '17px',
                textAlign: 'center',
                border: '2px solid #ffffff',
                boxSizing: 'border-box',
              }}
            >
              {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
            </span>
          )}
        </button>

        <button
          className="icon-button"
          onClick={() => setHalaman('logout')}
          aria-label="Logout"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
            <path d="M15 16l4-4-4-4" />
            <path d="M19 12H9" />
          </svg>
        </button>
      </div>
    </header>
  );

  // ============================================================
  // BOTTOM NAV
  // ============================================================

  const BottomNav = () => (
    <nav className="bottom-nav">
      <button
        className={`nav-item ${halaman === 'dashboard' ? 'active' : ''}`}
        onClick={() => setHalaman('dashboard')}
      >
        <span>🏠</span>
        <small>Beranda</small>
      </button>

      <button
        className={`nav-item ${halaman === 'aktivitas' ? 'active' : ''}`}
        onClick={() => setHalaman('aktivitas')}
      >
        <span>📋</span>
        <small>Aktivitas</small>
      </button>

      <button
        className={`nav-item ${halaman === 'profil' ? 'active' : ''}`}
        onClick={() => setHalaman('profil')}
      >
        <span>👤</span>
        <small>Profil</small>
      </button>
    </nav>
  );

  // ============================================================
  // LOADING
  // ============================================================

  if (authLoading || profileLoading) {
    return (
      <div className="app">
        <main className="welcome">
          <h1>Memuat Bantu_In...</h1>
        </main>
      </div>
    );
  }

  // ============================================================
  // BELUM LOGIN
  // ============================================================

  if (!user) {
    return <AuthScreen />;
  }

  // ============================================================
  // CUSTOMER DASHBOARD
  // ============================================================

  if (halaman === 'dashboard' && mode === 'customer') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <div className="dashboard-header">
            <h1>Halo 👋</h1>

            <p className="description">Mau minta bantuan apa?</p>
          </div>

          <button className="balance-card" onClick={() => setHalaman('topup')}>
            <div>
              <span>💰 Saldo Kamu</span>

              <strong>
                Rp {Number(profile?.saldo ?? 0).toLocaleString('id-ID')}
              </strong>
            </div>

            <span className="topup-link">+ Top Up</span>
          </button>

          <div className="dashboard-actions">
            <button
              className="dashboard-card primary-card"
              onClick={bukaPermintaanBaru}
            >
              <span className="dashboard-icon">➕</span>

              <strong>Buat Permintaan</strong>
            </button>

            <button
              className="dashboard-card"
              onClick={() => setHalaman('aktivitas')}
            >
              <span className="dashboard-icon">📋</span>

              <strong>Permintaan Saya</strong>
            </button>
          </div>

          <section className="recent-section">
            <h2>Aktivitas Terbaru</h2>

            {orders.length > 0 ? (
              <button
                className="recent-order"
                onClick={() => {
                  setSelectedOrder(orders[0]);

                  setHalaman('detail');
                }}
              >
                <div>
                  <strong>{orders[0].judul}</strong>

                  <span>{statusLabel(orders[0].status)}</span>
                </div>

                <span>›</span>
              </button>
            ) : (
              <div className="empty-state">
                <span>📋</span>

                <p>Belum ada aktivitas</p>
              </div>
            )}
          </section>

          <BottomNav />
        </main>
      </div>
    );
  }

  // ============================================================
  // HELPER DASHBOARD
  // ============================================================

  if (halaman === 'dashboard' && mode === 'helper') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <div className="dashboard-header">
            <h1>Halo, Helper 👋</h1>

            <p className="description">Siap membantu hari ini?</p>
          </div>

          <button className="balance-card" onClick={() => setHalaman('topup')}>
            <div>
              <span>💰 Saldo Kamu</span>

              <strong>
                Rp {Number(profile?.saldo ?? 0).toLocaleString('id-ID')}
              </strong>
            </div>

            <span className="topup-link">+ Top Up</span>
          </button>

          <div className="helper-actions">
            <button
              className="helper-card primary-card"
              onClick={() => setHalaman('tersedia')}
            >
              <span className="dashboard-icon">🔎</span>

              <strong>
                Pekerjaan Tersedia
                {pendingOrders.length > 0 && (
                  <span className="available-badge">
                    {pendingOrders.length}
                  </span>
                )}
              </strong>
            </button>

            <button
              className="helper-card"
              onClick={() => setHalaman('pekerjaan')}
            >
              <span className="dashboard-icon">📋</span>

              <strong>Pekerjaan Saya</strong>
            </button>

            <button
              className="helper-card"
              onClick={() => setHalaman('penghasilan')}
            >
              <span className="dashboard-icon">💵</span>

              <strong>Penghasilan</strong>
            </button>
          </div>

          <section className="recent-section">
            <h2>Aktivitas Terbaru</h2>

            {helperOrders.length > 0 ? (
              <button
                className="recent-order"
                onClick={() => {
                  setSelectedOrder(helperOrders[0]);

                  setActiveDecisionModal('none');

                  setHalaman('detail');
                }}
              >
                <div>
                  <strong>{helperOrders[0].judul}</strong>

                  <span>{statusLabel(helperOrders[0].status)}</span>
                </div>

                <span>›</span>
              </button>
            ) : (
              <div className="empty-state">
                <span>📋</span>

                <p>Belum ada aktivitas</p>
              </div>
            )}
          </section>

          <BottomNav />
        </main>
      </div>
    );
  }

  // ============================================================
  // SELLER DASHBOARD
  // ============================================================

  if (halaman === 'dashboard' && mode === 'seller') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <div className="dashboard-header">
            <h1>Halo, Seller 👋</h1>

            <p className="description">Siap berjualan hari ini?</p>
          </div>

          <button className="balance-card" onClick={() => setHalaman('topup')}>
            <div>
              <span>💰 Saldo Kamu</span>

              <strong>
                Rp {Number(profile?.saldo ?? 0).toLocaleString('id-ID')}
              </strong>
            </div>

            <span className="topup-link">+ Top Up</span>
          </button>

          <div className="seller-actions">
            <button
              className="seller-card primary-card"
              onClick={() => setHalaman('produk')}
            >
              <span className="dashboard-icon">📦</span>

              <strong>Produk</strong>
            </button>

            <button
              className="seller-card"
              onClick={() => setHalaman('pesanan-masuk')}
            >
              <span className="dashboard-icon">🛒</span>

              <strong>Pesanan Masuk</strong>
            </button>

            <button
              className="seller-card"
              onClick={() => setHalaman('penjualan')}
            >
              <span className="dashboard-icon">💵</span>

              <strong>Penjualan</strong>
            </button>
          </div>

          <section className="recent-section">
            <h2>Aktivitas Terbaru</h2>

            <div className="empty-state">
              <span>📋</span>

              <p>Belum ada aktivitas</p>
            </div>
          </section>

          <BottomNav />
        </main>
      </div>
    );
  }

  // ============================================================
  // PILIH KATEGORI
  // ============================================================

  if (halaman === 'customer') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <h1>Butuh Bantuan</h1>

          <p className="description">Kamu butuh bantuan apa?</p>

          <div className="category-grid">
            {kategori.map((item) => (
              <button
                key={item.nama}
                className="category-card"
                onClick={() => {
                  resetOrderForm();

                  setKategoriDipilih(item.nama);

                  setHalaman('buat-order');
                }}
              >
                <span className="category-icon">{item.icon}</span>

                <span>{item.nama}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              resetOrderForm();
              setHalaman('dashboard');
            }}
          >
            Kembali
          </button>

          <BottomNav />
        </main>
      </div>
    );
  }

  // ============================================================
  // BUAT ORDER
  // ============================================================

  if (halaman === 'buat-order') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />
  
          <h1>Buat Permintaan</h1>
  
          <p className="description">
            Kategori bantuan
          </p>
  
          <h2>
            {kategoriDipilih}
          </h2>
  
          {pesanError && (
            <p
              style={{
                margin: '0 0 12px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: '#fff0f0',
                color: '#d71920',
                fontSize: '13px',
                fontWeight: '600',
                whiteSpace: 'pre-wrap',
              }}
            >
              {pesanError}
            </p>
          )}
  
          {/* JUDUL */}
          <div className="form-field">
            <label htmlFor="judul">
              Judul bantuan
            </label>
  
            <input
              id="judul"
              type="text"
              value={judul}
              onChange={(e) =>
                setJudul(e.target.value)
              }
              placeholder="Contoh: Tolong belikan obat"
            />
          </div>
  
          {/* DESKRIPSI */}
          <div className="form-field">
            <label htmlFor="deskripsi">
              Deskripsi
            </label>
  
            <textarea
              id="deskripsi"
              value={deskripsi}
              onChange={(e) =>
                setDeskripsi(e.target.value)
              }
              placeholder="Jelaskan bantuan yang kamu butuhkan"
              rows={3}
            />
          </div>
  
          {/* LOKASI */}
          {/* LOKASI */}
<div className="form-field lokasi-field">
            <label htmlFor="lokasi">
              Lokasi
            </label>
  
            <input
              id="lokasi"
              type="text"
              value={lokasi}
              onChange={(e) =>
                setLokasi(e.target.value)
              }
              placeholder="Contoh: Sucinaraja"
            />
          </div>
  
          {/* BUDGET */}
          <div className="form-field">
            <label htmlFor="budget">
              Perkiraan budget
            </label>
  
            <input
              id="budget"
              type="number"
              value={budget}
              onChange={(e) =>
                setBudget(e.target.value)
              }
              placeholder="Contoh: 50000"
            />
          </div>
  
          {/* WAKTU DIBUTUHKAN */}
          <div className="form-group waktu-native-group">
  <label htmlFor="waktu">
    Waktu dibutuhkan
  </label>

  <input
    id="waktu"
    className="waktu-native-input"
    type="datetime-local"
    value={waktuDibutuhkan}
    onChange={(e) =>
      setWaktuDibutuhkan(e.target.value)
    }
  />
</div>
  
          {/* TARGET DURASI */}
          <div
            style={{
              paddingTop: '0px',
            }}
          >
            <label htmlFor="durasi">
              Target durasi pekerjaan
            </label>
  
            <div className="duration-select-wrapper">
  <select
    id="durasi"
    value={targetDurasiCustomer}
    onChange={(e) => {
      const value = e.target.value;

      setTargetDurasiCustomer(value);

      if (value === 'Lebih dari 5 jam') {
        setCatatanDurasiCustomer('');
      } else {
        setCatatanDurasiCustomer('');
      }
    }}
    className="duration-native-select"
  >
    <option value="">
      Tentukan perkiraan lama pekerjaan yang kamu butuhkan
    </option>

    <option value="30 menit">
      30 menit
    </option>

    <option value="1 jam">
      1 jam
    </option>

    <option value="2 jam">
      2 jam
    </option>

    <option value="3 jam">
      3 jam
    </option>

    <option value="4 jam">
      4 jam
    </option>

    <option value="5 jam">
      5 jam
    </option>

    <option value="Lebih dari 5 jam">
      Lebih dari 5 jam
    </option>
  </select>
</div>
  
            {/* CATATAN DURASI */}
            {targetDurasiCustomer ===
              'Lebih dari 5 jam' && (
              <div
                style={{
                  marginTop: '10px',
                }}
              >
                <label htmlFor="catatanDurasiCustomer">
                  Catatan durasi
                </label>
  
                <textarea
                  id="catatanDurasiCustomer"
                  value={catatanDurasiCustomer}
                  onChange={(e) =>
                    setCatatanDurasiCustomer(
                      e.target.value
                    )
                  }
                  placeholder="Contoh: pekerjaan membutuhkan waktu 1 hari"
                  rows={3}
                />
              </div>
            )}
          </div>
  
          {/* TOMBOL */}
          <div className="actions">
            <button
              onClick={buatPermintaan}
              disabled={creatingOrder}
            >
              {creatingOrder
                ? 'Membuat Permintaan...'
                : 'Buat Permintaan'}
            </button>
  
            <button
              onClick={() => {
                resetOrderForm();
                setHalaman('customer');
              }}
              disabled={creatingOrder}
            >
              Kembali
            </button>
          </div>
        </main>
      </div>
    );
  }
  
  // =======================================================
  // BERHASIL
  // ============================================================

  if (halaman === 'berhasil') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <div
            style={{
              fontSize: '36px',
              textAlign: 'center',
            }}
          >
            ✓
          </div>

          <h1>Permintaan Berhasil Dibuat</h1>

          <p className="description">
            Permintaan kamu sudah dibuat dan siap ditemukan oleh Helper.
          </p>

          <div className="detail-card">
            <div className="summary-item">
              <span>Kategori</span>

              <strong>{kategoriDipilih}</strong>
            </div>

            <div className="summary-item">
              <span>Judul</span>

              <strong>{judul}</strong>
            </div>

            <div className="summary-item">
              <span>Lokasi</span>

              <strong>{lokasi}</strong>
            </div>

            <div className="summary-item">
              <span>Budget</span>

              <strong>Rp {Number(budget).toLocaleString('id-ID')}</strong>
            </div>

            <div className="summary-item">
              <span>Waktu</span>

              <strong>{waktuDibutuhkan}</strong>
            </div>
          </div>

          <div className="actions">
            <button onClick={() => setHalaman('aktivitas')}>
              Lihat Permintaan Saya
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ============================================================
  // AKTIVITAS
  // ============================================================

  if (halaman === 'aktivitas') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <h1>
            {mode === 'helper'
              ? 'Aktivitas Helper'
              : mode === 'seller'
              ? 'Aktivitas Seller'
              : 'Permintaan Saya'}
          </h1>

          {mode === 'helper' ? (
            <div className="empty-state">
              <span>📋</span>

              <p>Belum ada aktivitas.</p>
            </div>
          ) : mode === 'seller' ? (
            <div className="empty-state">
              <span>📋</span>

              <p>Belum ada aktivitas.</p>
            </div>
          ) : ordersLoading ? (
            <div className="empty-state">
              <span>⏳</span>

              <p>Memuat permintaan...</p>
            </div>
          ) : ordersError ? (
            <div
              className="empty-state"
              style={{
                textAlign: 'left',
              }}
            >
              <span>⚠️</span>

              <p
                style={{
                  color: '#d71920',
                  fontWeight: '700',
                  marginBottom: '8px',
                }}
              >
                Gagal membaca order dari Firestore.
              </p>

              <small
                style={{
                  display: 'block',
                  color: '#555',
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                }}
              >
                {ordersError}
              </small>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <span>📋</span>

              <p>Belum ada permintaan.</p>

              <small
                style={{
                  display: 'block',
                  marginTop: '6px',
                  color: '#888',
                }}
              >
                Belum ada order yang ditemukan untuk akun ini.
              </small>
            </div>
          ) : (
            <div>
              {orders.map((order) => (
                <button
                  key={order.id}
                  className="order-card"
                  onClick={() => {
                    setSelectedOrder(order);

                    setHargaTawaranInput('');

                    setNewWaktuDibutuhkan('');

                    setActiveDecisionModal('none');

                    setHalaman('detail');
                  }}
                >
                  <div className="order-card-top">
                    <span>{order.kategori}</span>

                    <strong>{statusLabel(order.status)}</strong>
                  </div>

                  <h2>{order.judul}</h2>

                  <p>{order.deskripsi}</p>

                  <div className="order-card-info">
                    <span>📍 {order.lokasi}</span>

                    <span>
                      💰 Rp{' '}
                      {Number(order.budgetCustomer).toLocaleString('id-ID')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

<button
  className="detail-back-button"
  onClick={() => setHalaman('dashboard')}
>
  Kembali
</button>

          {mode === 'customer' && <BottomNav />}
        </main>
      </div>
    );
  }

  // ============================================================
  // DETAIL
  // ============================================================

  if (halaman === 'detail') {
    const perluKeputusan =
      selectedOrder?.status === 'pending' &&
      selectedOrder?.needsCustomerDecision === true &&
      mode === 'customer';

    const adaTawaranMenunggu =
      selectedOrder?.status === 'pending' &&
      selectedOrder?.tawaranStatus === 'menunggu_customer' &&
      selectedOrder?.tawaranHelperId;

    const isHelperFromOwnJob =
      mode === 'helper' && selectedOrder?.helperId === user.uid;

    const isHelperTawaranSendiri =
      mode === 'helper' && selectedOrder?.tawaranHelperId === user.uid;

    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <h1>Detail Permintaan</h1>

          {selectedOrder ? (
            <div className="detail-card">
              {/* ==================================================
                              STATUS UTAMA
                          ================================================== */}

              <div className="detail-status">
                🟡 {statusLabel(selectedOrder.status)}
              </div>

              {/* ==================================================
                              CUSTOMER: WAKTU SUDAH TERCAPAI
                          ================================================== */}

              {perluKeputusan && (
                <div
                  style={{
                    margin: '10px 0 14px',
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#fff7e6',
                    border: '1px solid #f2c66d',
                  }}
                >
                  <strong
                    style={{
                      display: 'block',
                      marginBottom: '5px',
                    }}
                  >
                    Waktu bantuan sudah tercapai
                  </strong>

                  <p
                    style={{
                      margin: '0 0 10px',
                      fontSize: '13px',
                      lineHeight: 1.4,
                    }}
                  >
                    Belum ada Helper yang mengambil permintaan ini. Kamu masih
                    bisa melanjutkan pencarian dengan waktu baru atau berhenti
                    mencari.
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <label htmlFor="waktuBaru">Waktu baru</label>

                    <input
                      id="waktuBaru"
                      type="datetime-local"
                      value={newWaktuDibutuhkan}
                      onChange={(e) => setNewWaktuDibutuhkan(e.target.value)}
                    />

                    <button
                      onClick={handleContinueSearching}
                      disabled={decisionLoading}
                    >
                      {decisionLoading ? 'Memproses...' : 'Tetap Cari'}
                    </button>

                    <button
                      onClick={handleStopSearching}
                      disabled={decisionLoading}
                    >
                      Berhenti
                    </button>
                  </div>
                </div>
              )}

              {/* ==================================================
                              CUSTOMER: TAWARAN HARGA
                          ================================================== */}

              {mode === 'customer' && adaTawaranMenunggu && (
                <div
                  style={{
                    margin: '14px 0 18px',
                    padding: '16px',
                    borderRadius: '14px',
                    background: '#fff8e7',
                    border: '1px solid #f4c76b',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.05)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '9px',
                      marginBottom: '12px',
                    }}
                  >
                    <span
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: '#fff0c2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '19px',
                      }}
                    >
                      💰
                    </span>

                    <div>
                      <strong
                        style={{
                          display: 'block',
                          fontSize: '15px',
                        }}
                      >
                        Ada Tawaran Harga
                      </strong>

                      <span
                        style={{
                          display: 'block',
                          marginTop: '2px',
                          fontSize: '12px',
                          color: '#777',
                        }}
                      >
                        Customer perlu memilih
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gap: '8px',
                      marginBottom: '14px',
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #eee',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#777',
                          marginBottom: '3px',
                        }}
                      >
                        Budget kamu
                      </span>

                      <strong
                        style={{
                          fontSize: '14px',
                        }}
                      >
                        Rp{' '}
                        {Number(selectedOrder.budgetCustomer).toLocaleString(
                          'id-ID'
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #f0d28d',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#777',
                          marginBottom: '3px',
                        }}
                      >
                        Tawaran Helper
                      </span>

                      <strong
                        style={{
                          display: 'block',
                          fontSize: '22px',
                        }}
                      >
                        Rp{' '}
                        {Number(selectedOrder.hargaTawaran ?? 0).toLocaleString(
                          'id-ID'
                        )}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                    }}
                  >
                    <button
                      onClick={handleTolakTawaran}
                      disabled={acceptingOffer || rejectingOffer}
                      style={{
                        flex: 1,
                        minHeight: '44px',
                        border: '1px solid #ddd',
                        borderRadius: '10px',
                        background: '#ffffff',
                        color: '#555',
                        fontWeight: '700',
                      }}
                    >
                      {rejectingOffer ? 'Memproses...' : 'Tolak'}
                    </button>

                    <button
                      onClick={handleTerimaTawaran}
                      disabled={acceptingOffer || rejectingOffer}
                      style={{
                        flex: 1,
                        minHeight: '44px',
                        border: 'none',
                        borderRadius: '10px',
                        background: '#d71920',
                        color: '#ffffff',
                        fontWeight: '700',
                      }}
                    >
                      {acceptingOffer ? 'Memproses...' : 'Terima'}
                    </button>
                  </div>
                </div>
              )}

              {/* ==================================================
                              HELPER: TAWAR HARGA
                          ================================================== */}

              {mode === 'helper' &&
                selectedOrder.status === 'pending' &&
                selectedOrder.needsCustomerDecision !== true &&
                selectedOrder.tawaranStatus !== 'menunggu_customer' &&
                showHelperOfferForm && (
                  <div
          ref={helperOfferFormRef}
                    style={{
                      marginTop: '16px',
                      padding: '16px',
                      borderRadius: '14px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        marginBottom: '10px',
                      }}
                    >
                      <span
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: '#fff0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                        }}
                      >
                        💰
                      </span>

                      <div
  style={{
    marginBottom: '12px',
  }}
>
  <strong
    style={{
      display: 'block',
      fontSize: '15px',
      lineHeight: '1.2',
      color: '#222',
    }}
  >
    Tawar Harga
  </strong>

  <span
    style={{
      display: 'block',
      marginTop: '3px',
      fontSize: '10px',
      lineHeight: '1.3',
      color: '#888',
    }}
  >
    Ajukan harga yang kamu inginkan
  </span>
</div>
                    </div>

                    <div
                      style={{
                        marginBottom: '8px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: '#f8fafc',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#777',
                          marginBottom: '3px',
                        }}
                      >
                        Biaya Pengerjaan
                      </span>

                      <strong
                        style={{
                          fontSize: '14px',
                        }}
                      >
                        Rp{' '}
                        {Number(selectedOrder.budgetCustomer).toLocaleString(
                          'id-ID'
                        )}
                      </strong>
                    </div>

                    <div
  style={{
    marginBottom: '8px',
    padding: '8px 10px',
    borderRadius: '8px',
    background: '#f8fafc',
  }}
>
  <span
    style={{
      display: 'block',
      fontSize: '12px',
      color: '#777',
      marginBottom: '3px',
    }}
  >
    Perkiraan Waktu Pengerjaan
  </span>

  <strong
    style={{
      fontSize: '14px',
    }}
  >
    {selectedOrder.targetDurasiCustomer || '-'}
  </strong>
</div>

                    <label
                      htmlFor="hargaTawaran"
                      style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '13px',
                        fontWeight: '700',
                      }}
                    >
                      Harga tawaran
                    </label>

                    <div
                      style={{
                        position: 'relative',
                        marginBottom: '9px',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '14px',
                          color: '#222',
                          fontWeight: '600',
                          pointerEvents: 'none',
                        }}
                      >
                        Rp
                      </span>

                      <input
                        id="hargaTawaran"
                        type="number"
                        value={hargaTawaranInput}
                        onChange={(e) => setHargaTawaranInput(e.target.value)}
                        placeholder={
                          hargaTawaranInput
                            ? 'Masukkan harga tawaran'
                            : 'Harga tawaran belum diisi'
                        }
                        min="1"
                        disabled={offeringPrice}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '10px 12px 10px 38px',
                          borderRadius: '10px',
                          border:'1px solid #d7dce2',
                          fontSize: '14px',
                          fontWeight: '600',
                        }}
                      />
                    </div>

                    <div
      style={{
        marginBottom: '12px',
      }}
    >
      <label
        htmlFor="estimasiDurasiHelper"
        style={{
          display: 'block',
          marginBottom: '6px',
          fontSize: '12px',
          fontWeight: '700',
        }}
      >
        Waktu Pengerjaan
      </label>

      <select
        id="estimasiDurasiHelper"
        value={estimasiDurasiHelper}
        onChange={(e) =>
          setEstimasiDurasiHelper(e.target.value)
        }
        disabled={offeringPrice}
        style={{
          width: '100%',
          minHeight: '44px',
          boxSizing: 'border-box',
          padding: '10px 12px',
          borderRadius: '10px',
          border: '1px solid #d7dce2',
          background: '#ffffff',
          fontSize: '14px',
          color: estimasiDurasiHelper ? '#222' : '#999',
          fontWeight: '600',
        }}
      >
        <option value="">Pilih waktu pengerjaan</option>
        <option value="30 menit">
          30 menit
        </option>
        <option value="1 jam">
          1 jam
        </option>
        <option value="2 jam">
          2 jam
        </option>
        <option value="3 jam">
          3 jam
        </option>
        <option value="4 jam">
          4 jam
        </option>
        <option value="5 jam">
          5 jam
        </option>
        <option value="Lebih dari 5 jam">
          Lebih dari 5 jam
        </option>
      </select>
    </div>

                    <button
                      onClick={handleAjukanTawaran}
                      disabled={offeringPrice}
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        border: 'none',
                        borderRadius: '10px',
                        background: offeringPrice ? '#d1d5db' : '#d71920',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: '700',
                      }}
                    >
                      {offeringPrice ? 'Mengirim Tawaran...' : 'Ajukan Tawaran'}
                    </button>

                    <button
  type="button"
  onClick={() => {
    closeKeyboard();
  }}
  
  disabled={offeringPrice}
  style={{
    width: '100%',
    marginTop: '8px',
    minHeight: '38px',
    border: '1px solid #e5e5e5',
    borderRadius: '10px',
    background: '#ffffff',
    color: '#777',
    fontSize: '13px',
    fontWeight: '600',
  }}
>
  Batal Tawar
</button>
                  </div>
                )}

              {/* ==================================================
                              HELPER: STATUS TAWARAN SENDIRI
                          ================================================== */}

              {mode === 'helper' &&
                isHelperTawaranSendiri &&
                selectedOrder.status === 'pending' &&
                selectedOrder.tawaranStatus === 'menunggu_customer' && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '16px',
                      borderRadius: '14px',
                      background: '#fff8e7',
                      border: '1px solid #f2c66d',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      <span
                        style={{
                          width: '36px',
                          height: '36px',
                          flexShrink: 0,
                          borderRadius: '10px',
                          background: '#fff0c2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                        }}
                      >
                        ⏳
                      </span>

                      <div>
                        <strong
                          style={{
                            display: 'block',
                            fontSize: '15px',
                            marginBottom: '5px',
                          }}
                        >
                          Menunggu keputusan Customer
                        </strong>

                        <p
                          style={{
                            margin: '0',
                            fontSize: '13px',
                            color: '#666',
                            lineHeight: 1.45,
                          }}
                        >
                          Tawaran kamu sudah dikirim. Tunggu Customer menerima
                          atau menolaknya.
                        </p>

                        <div
                          style={{
                            marginTop: '10px',
                            padding: '9px 11px',
                            borderRadius: '9px',
                            background: '#ffffff',
                            border: '1px solid #f0d28d',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#777',
                            }}
                          >
                            Tawaran kamu
                          </span>

                          <strong
                            style={{
                              display: 'block',
                              marginTop: '2px',
                              fontSize: '17px',
                            }}
                          >
                            Rp{' '}
                            {Number(
                              selectedOrder.hargaTawaran ?? 0
                            ).toLocaleString('id-ID')}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* ==================================================
                              HELPER: TAWARAN MILIK HELPER LAIN
                          ================================================== */}

              {mode === 'helper' &&
                selectedOrder.status === 'pending' &&
                selectedOrder.tawaranStatus === 'menunggu_customer' &&
                !isHelperTawaranSendiri && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '16px',
                      borderRadius: '14px',
                      background: '#f8fafc',
                      border: '1px solid #d8dee7',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      <span
                        style={{
                          width: '36px',
                          height: '36px',
                          flexShrink: 0,
                          borderRadius: '10px',
                          background: '#e9edf3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                        }}
                      >
                        🔒
                      </span>

                      <div>
                        <strong
                          style={{
                            display: 'block',
                            fontSize: '15px',
                            marginBottom: '5px',
                          }}
                        >
                          Sedang ditawar Helper lain
                        </strong>

                        <p
                          style={{
                            margin: '0',
                            fontSize: '13px',
                            color: '#666',
                            lineHeight: 1.45,
                          }}
                        >
                          Helper lain sudah mengajukan tawaran harga. Tunggu
                          keputusan Customer terlebih dahulu.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* ==================================================
                              DETAIL ORDER
                          ================================================== */}

              <div className="summary-item">
                <span>Kategori</span>

                <strong>{selectedOrder.kategori}</strong>
              </div>

              <div className="summary-item">
                <span>Judul</span>

                <strong>{selectedOrder.judul}</strong>
              </div>

              <div className="summary-item">
                <span>Deskripsi</span>

                <strong>{selectedOrder.deskripsi}</strong>
              </div>

              <div className="summary-item">
                <span>Lokasi</span>

                <strong>{selectedOrder.lokasi}</strong>
              </div>

              <div className="summary-item">
  <span>Budget Customer</span>
  <strong>
    Rp{' '}
    {Number(
      selectedOrder.budgetCustomer
    ).toLocaleString('id-ID')}
  </strong>
</div>

<div className="summary-item">
  <span>Durasi yang Diinginkan</span>
  <strong>
    {selectedOrder.targetDurasiCustomer || '-'}
  </strong>
</div>

{selectedOrder.hargaDisepakati != null && (
                <div className="summary-item">
                  <span>Harga Disepakati</span>

                  <strong>
                    Rp{' '}
                    {Number(selectedOrder.hargaDisepakati).toLocaleString(
                      'id-ID'
                    )}
                  </strong>
                </div>
              )}
 
              {selectedOrder.estimasiDurasiHelper && (
                <div className="summary-item">
                  <span>Durasi pekerjaan</span>
                  <strong>
                    {selectedOrder.estimasiDurasiHelper}
                  </strong>
                </div>
              )}
              
              <div className="summary-item">
                <span>Waktu dibutuhkan</span>

                <strong>
                  {new Date(selectedOrder.waktuDibutuhkan).toLocaleString(
                    'id-ID',
                    {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </strong>
              </div>

              {mode === 'customer' && selectedOrder.status === 'pending' && (
                <div
                  className="actions"
                  style={{
                    marginTop: '16px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCancelReason('');
                      setActiveDecisionModal('cancel_order');
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: '#ffffff',
                      color: '#d71920',
                      border: '1px solid #d71920',
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Batalkan Permintaan
                  </button>
                </div>
              )}
{mode === 'helper' &&
  isHelperFromOwnJob &&
  selectedOrder.status === 'accepted' &&
  selectedOrder.kesepakatanHelper !== true && (
    <div
      className="actions"
      style={{
        marginTop: '16px',
      }}
    >
      <button
        type="button"
        onClick={handleSetujuiKesepakatan}
      >
        Setujui Kesepakatan
      </button>
    </div>
  )
}

{mode === 'customer' &&
    selectedOrder.customerId === user?.uid &&
    selectedOrder.status === 'accepted' &&
    selectedOrder.kesepakatanCustomer !== true && (
      <div
        className="actions"
        style={{
          marginTop: '16px',
        }}
      >
        <button
          type="button"
          onClick={handleSetujuiKesepakatanCustomer}
        >
          Setujui Kesepakatan
        </button>
      </div>
    )}


              {/* ==================================================
                              HELPER: BERANGKAT
                          ================================================== */}

              {mode === 'helper' &&
                isHelperFromOwnJob &&
                selectedOrder.status === 'accepted' &&
    selectedOrder.kesepakatanCustomer === true &&
    selectedOrder.kesepakatanHelper === true && (
                  <div
                    className="actions"
                    style={{
                      marginTop: '16px',
                    }}
                  >
                    <button
                      onClick={handleStartTravel}
                      disabled={startingTravel}
                    >
                      {startingTravel ? 'Memproses...' : 'Berangkat'}
                    </button>
                  </div>
                )}

              {/* ==================================================
                              HELPER: MULAI PEKERJAAN
                          ================================================== */}

              {mode === 'helper' &&
                isHelperFromOwnJob &&
                selectedOrder.status === 'on_the_way' && (
                  <div
                    className="actions"
                    style={{
                      marginTop: '16px',
                    }}
                  >
                    <button onClick={handleStartWork} disabled={startingWork}>
                      {startingWork ? 'Memproses...' : '🔧 Mulai Pekerjaan'}
                    </button>
                  </div>
                )}

              {/* ==================================================
                              HELPER: SELESAIKAN PEKERJAAN
                          ================================================== */}

              {mode === 'helper' &&
                isHelperFromOwnJob &&
                selectedOrder.status === 'working' && (
                  <button
                    onClick={handleCompleteOrder}
                    disabled={completingOrder}
                    style={{
                      width: '100%',
                      marginTop: '16px',
                      padding: '12px 16px',
                      border: 'none',
                      borderRadius: '10px',
                      background: completingOrder ? '#d1d5db' : '#dc2626',
                      color: '#ffffff',
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: completingOrder ? 'not-allowed' : 'pointer',
                      boxShadow: completingOrder
                        ? 'none'
                        : '0 3px 8px rgba(220, 38, 38, 0.25)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {completingOrder
                      ? 'Menyelesaikan...'
                      : '✅ Selesaikan Pekerjaan'}
                  </button>
                )}

              {mode === 'helper' &&
                isHelperFromOwnJob &&
                (selectedOrder.status === 'accepted' ||
                  selectedOrder.status === 'on_the_way') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancelReason('');
                      setActiveDecisionModal('cancel_helper_order');
                    }}
                    style={{
                      width: '100%',
                      marginTop: '10px',
                      padding: '12px 16px',
                      border: '1px solid #d71920',
                      borderRadius: '10px',
                      background: '#ffffff',
                      color: '#d71920',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Batalkan Pekerjaan
                  </button>
                )}

              {/* ==================================================
                              HELPER: AMBIL PEKERJAAN
                          ================================================== */}

              {mode === 'helper' &&
                selectedOrder.status === 'pending' &&
                selectedOrder.needsCustomerDecision !== true &&
                selectedOrder.tawaranStatus !== 'menunggu_customer' &&
                !showHelperOfferForm &&
                (
                  <div className="actions">
  <button
    onClick={ambilPekerjaan}
    disabled={acceptingOrder}
  >
    {acceptingOrder
      ? 'Mengambil...'
      : 'Ambil Pekerjaan'}
  </button>

  <button
    onClick={() => {
      setShowHelperOfferForm(true);
    }}
  >
    Tawar Harga
  </button>
</div>
                )}
            </div>
          ) : (
            <div className="empty-state">
              <span>📋</span>

              <p>Data permintaan tidak ditemukan.</p>
            </div>
          )}

          <button
            onClick={() =>
              setHalaman(
                mode === 'helper'
                  ? isHelperFromOwnJob
                    ? 'pekerjaan'
                    : 'tersedia'
                  : 'aktivitas'
              )
            }
          >
            Kembali
          </button>

          {/* ======================================================
                          MODAL KEPUTUSAN CUSTOMER
                      ====================================================== */}

          {activeDecisionModal !== 'none' && (
            <div
              role="dialog"
              aria-modal="true"
              onClick={() => setActiveDecisionModal('none')}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                background: 'rgba(0, 0, 0, 0.45)',
              }}
            >
              <div
                onClick={(event) => event.stopPropagation()}
                style={{
                  width: '100%',
                  maxWidth: '360px',
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '24px 20px',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.20)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '58px',
                    height: '58px',
                    margin: '0 auto 14px',
                    borderRadius: '50%',
                    background: '#fff4e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                  }}
                >
                  ⚠️
                </div>

                {activeDecisionModal === 'active_order' ? (
                  <>
                    <h2
                      style={{
                        margin: '0 0 8px',
                        fontSize: '20px',
                      }}
                    >
                      Masih Ada Pekerjaan Aktif
                    </h2>

                    <p
                      style={{
                        margin: '0',
                        color: '#666',
                        fontSize: '14px',
                        lineHeight: '1.5',
                      }}
                    >
                      Selesaikan pekerjaan yang sedang kamu jalankan terlebih
                      dahulu sebelum mengambil pekerjaan baru.
                    </p>

                    <button
                      type="button"
                      onClick={() => setActiveDecisionModal('none')}
                      style={{
                        width: '100%',
                        marginTop: '20px',
                        padding: '12px',
                        border: 'none',
                        borderRadius: '12px',
                        background: '#d71920',
                        color: '#ffffff',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      Mengerti
                    </button>
                  </>
                ) : activeDecisionModal === 'cancel_helper_order' ? (
                  <>
                    <h2
                      style={{
                        margin: '0 0 8px',
                        fontSize: '20px',
                      }}
                    >
                      Batalkan Pekerjaan
                    </h2>

                    <p
                      style={{
                        margin: '0 0 14px',
                        color: '#666',
                        fontSize: '14px',
                        lineHeight: '1.5',
                      }}
                    >
                      Masukkan alasan mengapa kamu ingin membatalkan pekerjaan
                      ini.
                    </p>

                    <div className="cancel-reason-dropdown">
                      <button
                        type="button"
                        className="cancel-reason-dropdown-button"
                        onClick={() =>
                          setShowCancelReasonDropdown(!showCancelReasonDropdown)
                        }
                      >
                        <span>
                          {cancelReasonOption || 'Pilih alasan pembatalan'}
                        </span>

                        <span className="cancel-reason-arrow">▼</span>
                      </button>

                      {showCancelReasonDropdown && (
                        <div className="cancel-reason-dropdown-menu">
                          <button
                            type="button"
                            onClick={() => {
                              setCancelReasonOption('Kendala perjalanan');
                              setCancelReason('Kendala perjalanan');
                              setShowCancelReasonDropdown(false);
                            }}
                          >
                            Kendala perjalanan
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCancelReasonOption(
                                'Tidak bisa melanjutkan sesuai waktu'
                              );
                              setCancelReason(
                                'Tidak bisa melanjutkan sesuai waktu'
                              );
                              setShowCancelReasonDropdown(false);
                            }}
                          >
                            Tidak bisa melanjutkan sesuai waktu
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCancelReasonOption('Lokasi sulit dijangkau');
                              setCancelReason('Lokasi sulit dijangkau');
                              setShowCancelReasonDropdown(false);
                            }}
                          >
                            Lokasi sulit dijangkau
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCancelReasonOption('Ada kendala pribadi');
                              setCancelReason('Ada kendala pribadi');
                              setShowCancelReasonDropdown(false);
                            }}
                          >
                            Ada kendala pribadi
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCancelReasonOption('Alasan lainnya');
                              setCancelReason('');
                              setShowCancelReasonDropdown(false);
                            }}
                          >
                            Alasan lainnya
                          </button>
                        </div>
                      )}
                    </div>

                    {cancelReasonOption === 'Alasan lainnya' && (
                      <textarea
                        value={cancelReason}
                        onChange={(event) =>
                          setCancelReason(event.target.value)
                        }
                        placeholder="Contoh: Ada kendala sehingga tidak dapat melanjutkan pekerjaan"
                        maxLength={500}
                        rows={4}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '12px',
                          border: '1px solid #ddd',
                          borderRadius: '10px',
                          fontSize: '14px',
                          resize: 'vertical',
                          outline: 'none',
                        }}
                      />
                    )}

                    <button
                      type="button"
                      onClick={handleCancelHelperOrder}
                      disabled={decisionLoading}
                      style={{
                        width: '100%',
                        marginTop: '12px',
                        padding: '12px',
                        border: 'none',
                        borderRadius: '12px',
                        background: decisionLoading ? '#d1d5db' : '#d71920',
                        color: '#ffffff',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: decisionLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {decisionLoading
                        ? 'Membatalkan...'
                        : 'Batalkan Pekerjaan'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCancelReason('');
                        setActiveDecisionModal('none');
                      }}
                      disabled={decisionLoading}
                      style={{
                        width: '100%',
                        marginTop: '8px',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '12px',
                        background: '#ffffff',
                        color: '#333',
                        fontWeight: '600',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Kembali
                    </button>
                  </>
                ) : activeDecisionModal === 'cancel_order' ? (
                  <>
                    <h2
                      style={{
                        margin: '0 0 8px',
                        fontSize: '20px',
                      }}
                    >
                      Batalkan Permintaan
                    </h2>

                    <p
                      style={{
                        margin: '0 0 14px',
                        color: '#666',
                        fontSize: '12px',
                        lineHeight: '1.5',
                      }}
                    >
                      Masukkan alasan pembatalan permintaan ini.
                    </p>

                    <select
                      className="cancel-reason-select"
                      value={cancelReasonOption}
                      onChange={(event) => {
                        const value = event.target.value;

                        setCancelReasonOption(value);

                        if (value !== 'Alasan lainnya') {
                          setCancelReason(value);
                        } else {
                          setCancelReason('');
                        }
                      }}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '12px',
                        marginBottom: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '10px',
                        fontSize: '12px',
                        background: '#ffffff',
                        outline: 'none',
                      }}
                    >
                      <option value="">Pilih alasan pembatalan</option>

                      <option value="Kendala perjalanan">
                        Kendala perjalanan
                      </option>

                      <option value="Tidak bisa melanjutkan sesuai waktu">
                        Tidak bisa melanjutkan sesuai waktu
                      </option>

                      <option value="Lokasi sulit dijangkau">
                        Lokasi sulit dijangkau
                      </option>

                      <option value="Ada kendala pribadi">
                        Ada kendala pribadi
                      </option>

                      <option value="Alasan lainnya">Alasan lainnya</option>
                    </select>

                    {cancelReasonOption === 'Alasan lainnya' && (
                      <textarea
                        value={cancelReason}
                        onChange={(event) =>
                          setCancelReason(event.target.value)
                        }
                        placeholder="Contoh: Sudah tidak membutuhkan bantuan"
                        maxLength={500}
                        rows={4}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '12px',
                          border: '1px solid #ddd',
                          borderRadius: '10px',
                          fontSize: '14px',
                          resize: 'vertical',
                          outline: 'none',
                        }}
                      />
                    )}

                    <button
                      type="button"
                      onClick={handleCancelOrder}
                      disabled={decisionLoading}
                      style={{
                        width: '100%',
                        marginTop: '12px',
                        padding: '12px',
                        border: 'none',
                        borderRadius: '12px',
                        background: decisionLoading ? '#d1d5db' : '#d71920',
                        color: '#ffffff',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: decisionLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {decisionLoading
                        ? 'Membatalkan...'
                        : 'Batalkan Permintaan'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCancelReason('');
                        setActiveDecisionModal('none');
                      }}
                      disabled={decisionLoading}
                      style={{
                        width: '100%',
                        marginTop: '8px',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '12px',
                        background: '#ffffff',
                        color: '#333',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: decisionLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Kembali
                    </button>
                  </>
                ) : activeDecisionModal === 'warning' ? (
                  <>
                    <h2
                      style={{
                        margin: '0 0 8px',
                        fontSize: '20px',
                      }}
                    >
                      Waktu Belum Dipilih
                    </h2>

                    <p
                      style={{
                        margin: '0',
                        color: '#666',
                        fontSize: '14px',
                        lineHeight: '1.5',
                      }}
                    >
                      Silakan pilih waktu baru terlebih dahulu sebelum
                      melanjutkan pencarian Helper.
                    </p>

                    <button
                      type="button"
                      onClick={() => setActiveDecisionModal('none')}
                      style={{
                        width: '100%',
                        marginTop: '20px',
                        padding: '12px',
                        border: 'none',
                        borderRadius: '12px',
                        background: '#d71920',
                        color: '#ffffff',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      Mengerti
                    </button>
                  </>
                ) : (
                  <>
                    <h2
                      style={{
                        margin: '0 0 8px',
                        fontSize: '20px',
                      }}
                    >
                      Berhenti Mencari?
                    </h2>

                    <p
                      style={{
                        margin: '0',
                        color: '#666',
                        fontSize: '14px',
                        lineHeight: '1.5',
                      }}
                    >
                      Permintaan ini akan dihentikan dan menjadi kadaluarsa.
                      Kamu tidak akan lagi mencari Helper untuk permintaan ini.
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        gap: '10px',
                        marginTop: '20px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveDecisionModal('none')}
                        disabled={decisionLoading}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '12px',
                          border: '1px solid #ddd',
                          background: '#ffffff',
                          color: '#444',
                          fontWeight: '700',
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                      >
                        Batal
                      </button>

                      <button
                        type="button"
                        onClick={confirmStopSearching}
                        disabled={decisionLoading}
                        style={{
                          flex: 1,
                          padding: '12px',
                          border: 'none',
                          borderRadius: '12px',
                          background: '#d71920',
                          color: '#ffffff',
                          fontWeight: '700',
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                      >
                        {decisionLoading ? 'Memproses...' : 'Ya, Berhenti'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ============================================================
  // PEKERJAAN TERSEDIA
  // ============================================================

  if (halaman === 'tersedia') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <h1>Pekerjaan Tersedia</h1>

          {pendingOrdersLoading ? (
            <div className="empty-state">
              <span>⏳</span>

              <p>Memuat pekerjaan...</p>
            </div>
          ) : pendingOrdersError ? (
            <div
              className="empty-state"
              style={{
                textAlign: 'left',
              }}
            >
              <span>⚠️</span>

              <p
                style={{
                  color: '#d71920',
                  fontWeight: '700',
                  marginBottom: '8px',
                }}
              >
                Gagal membaca pekerjaan tersedia.
              </p>

              <small
                style={{
                  display: 'block',
                  color: '#555',
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                }}
              >
                {pendingOrdersError}
              </small>
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="empty-state">
              <span>🔎</span>

              <p>Belum ada pekerjaan tersedia.</p>

              <small
                style={{
                  display: 'block',
                  marginTop: '6px',
                  color: '#888',
                }}
              >
                Saat Customer membuat permintaan baru, pekerjaan akan muncul di
                sini.
              </small>
            </div>
          ) : (
            <div>
              {pendingOrders.map((order) => (
                <button
                  key={order.id}
                  className="order-card"
                  onClick={() => {
                    setSelectedOrder(order);

                    setHargaTawaranInput('');

                    setActiveDecisionModal('none');

                    setHalaman('detail');
                  }}
                >
                  <div className="order-card-top">
                    <span>{order.kategori}</span>

                    <strong
                      style={
                        order.tawaranStatus === 'menunggu_customer'
                          ? {
                              color: '#b77900',
                            }
                          : undefined
                      }
                    >
                      {order.tawaranStatus === 'menunggu_customer'
                        ? '⏳ Menunggu'
                        : '✓ Tersedia'}
                    </strong>
                  </div>

                  <h2>{order.judul}</h2>

                  <p>{order.deskripsi}</p>

                  <div className="order-card-info">
                    <span>📍 {order.lokasi}</span>

                    <span>
                      💰 Rp{' '}
                      {Number(order.budgetCustomer).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {order.tawaranStatus === 'menunggu_customer' && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: '#fff8e7',
                        fontSize: '11px',
                        color: '#8a6500',
                        textAlign: 'left',
                      }}
                    >
                      🔒 Sedang menunggu keputusan Customer
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setHalaman('dashboard')}>Kembali</button>
        </main>
      </div>
    );
  }

  // ============================================================
  // PEKERJAAN SAYA
  // ============================================================

  if (halaman === 'pekerjaan') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <h1>Pekerjaan Saya</h1>

          {helperOrdersLoading ? (
            <div className="empty-state">
              <span>⏳</span>

              <p>Memuat pekerjaan...</p>
            </div>
          ) : helperOrdersError ? (
            <div
              className="empty-state"
              style={{
                textAlign: 'left',
              }}
            >
              <span>⚠️</span>

              <p
                style={{
                  color: '#d71920',
                  fontWeight: '700',
                  marginBottom: '8px',
                }}
              >
                Gagal membaca pekerjaan.
              </p>

              <small
                style={{
                  display: 'block',
                  color: '#555',
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                }}
              >
                {helperOrdersError}
              </small>
            </div>
          ) : helperOrders.length === 0 ? (
            <div className="empty-state">
              <span>📋</span>

              <p>Belum ada pekerjaan.</p>

              <small
                style={{
                  display: 'block',
                  marginTop: '6px',
                  color: '#888',
                }}
              >
                Pekerjaan yang kamu ambil akan muncul di sini.
              </small>
            </div>
          ) : (
            <div>
              {helperOrders.map((order) => (
                <button
                  key={order.id}
                  className="order-card"
                  onClick={() => {
                    setSelectedOrder(order);

                    setHargaTawaranInput('');

                    setActiveDecisionModal('none');

                    setHalaman('detail');
                  }}
                >
                  <div className="order-card-top">
                    <span>{order.kategori}</span>

                    <strong>{statusLabel(order.status)}</strong>
                  </div>

                  <h2>{order.judul}</h2>

                  <p>{order.deskripsi}</p>

                  <div className="order-card-info">
                    <span>📍 {order.lokasi}</span>

                    <span>
                      💰 Rp{' '}
                      {Number(
                        order.hargaDisepakati ?? order.budgetCustomer
                      ).toLocaleString('id-ID')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setHalaman('dashboard')}>Kembali</button>
        </main>
      </div>
    );
  }

  // ============================================================
  // PENGHASILAN
  // ============================================================

  if (halaman === 'penghasilan') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <h1>Penghasilan</h1>

          <div className="balance-card">
            <div>
              <span>💵 Total Penghasilan</span>

              <strong>Rp 0</strong>
            </div>
          </div>

          <button onClick={() => setHalaman('dashboard')}>Kembali</button>
        </main>
      </div>
    );
  }

  // ============================================================
  // PRODUK
  // ============================================================

  if (halaman === 'produk') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <h1>Produk</h1>

          <div className="empty-state">
            <span>📦</span>

            <p>Belum ada produk.</p>
          </div>

          <button onClick={() => setHalaman('dashboard')}>Kembali</button>
        </main>
      </div>
    );
  }

  // ============================================================
  // PESANAN MASUK
  // ============================================================

  if (halaman === 'pesanan-masuk') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <h1>Pesanan Masuk</h1>

          <div className="empty-state">
            <span>🛒</span>

            <p>Belum ada pesanan masuk.</p>
          </div>

          <button onClick={() => setHalaman('dashboard')}>Kembali</button>
        </main>
      </div>
    );
  }

  // ============================================================
  // PENJUALAN
  // ============================================================

  if (halaman === 'penjualan') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <h1>Penjualan</h1>

          <div className="balance-card">
            <div>
              <span>💵 Total Penjualan</span>

              <strong>Rp 0</strong>
            </div>
          </div>

          <button onClick={() => setHalaman('dashboard')}>Kembali</button>
        </main>
      </div>
    );
  }

  // ============================================================
  // TOP UP
  // ============================================================

  if (halaman === 'topup') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <h1>Top Up Saldo</h1>

          <p className="description">Pilih nominal yang ingin ditambahkan.</p>

          <div className="topup-options">
            <button>Rp 20.000</button>

            <button>Rp 50.000</button>

            <button>Rp 100.000</button>

            <button>Rp 200.000</button>
          </div>

          <button onClick={() => setHalaman('dashboard')}>Kembali</button>
        </main>
      </div>
    );
  }

  // ============================================================
  // NOTIFIKASI
  // ============================================================

  if (halaman === 'notifikasi') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <h1 style={{ margin: 0 }}>Notifikasi</h1>

            {unreadNotificationCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllNotificationsAsRead}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '6px 0',
                  cursor: 'pointer',
                }}
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <button
            onClick={() => setHalaman('dashboard')}
            style={{
              marginTop: '4px',
              marginBottom: '14px',
              padding: '7px 14px',
              border: 'none',
              borderRadius: '8px',
              background: '#f1f1f1',
              color: '#333',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Kembali
          </button>

          {notificationsLoading ? (
            <div className="empty-state">
              <span>⏳</span>

              <p>Memuat notifikasi...</p>
            </div>
          ) : notificationsError ? (
            <div
              className="empty-state"
              style={{
                textAlign: 'left',
              }}
            >
              <span>⚠️</span>

              <p
                style={{
                  color: '#d71920',
                  fontWeight: '700',
                  marginBottom: '8px',
                }}
              >
                Gagal memuat notifikasi.
              </p>

              <small
                style={{
                  display: 'block',
                  color: '#555',
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                }}
              >
                {notificationsError}
              </small>
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <span>🔔</span>

              <p>Belum ada notifikasi.</p>

              <small
                style={{
                  display: 'block',
                  marginTop: '6px',
                  color: '#888',
                }}
              >
                Notifikasi baru akan muncul otomatis di sini.
              </small>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: '8px',
                textAlign: 'left',
              }}
            >
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleOpenNotification(notification)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: notification.read
                      ? '1px solid #eeeeee'
                      : '1px solid #f1b8bb',
                    background: notification.read ? '#ffffff' : '#fff6f6',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <span
                      style={{
                        width: '34px',
                        height: '34px',
                        flexShrink: 0,
                        borderRadius: '10px',
                        background: notification.read ? '#f1f1f1' : '#ffe7e8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '17px',
                      }}
                    >
                      {notification.type === 'offer_created'
                        ? '💰'
                        : notification.type === 'offer_accepted'
                        ? '✅'
                        : notification.type === 'offer_rejected'
                        ? '❌'
                        : notification.type === 'order_completed'
                        ? '🎉'
                        : notification.type === 'order_cancelled'
                        ? '🚫'
                        : notification.type === 'order_expired'
                        ? '⏰'
                        : '🔔'}
                    </span>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <strong
                          style={{
                            fontSize: '13px',
                            color: '#222',
                          }}
                        >
                          {notification.title}
                        </strong>

                        {!notification.read && (
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              flexShrink: 0,
                              marginTop: '5px',
                              borderRadius: '50%',
                              background: '#d71920',
                            }}
                          />
                        )}
                      </div>

                      <p
                        style={{
                          margin: '4px 0 6px',
                          color: '#555',
                          fontSize: '12px',
                          lineHeight: 1.45,
                        }}
                      >
                        {notification.message}
                      </p>

                      <small
                        style={{
                          color: '#999',
                          fontSize: '10px',
                        }}
                      >
                        {formatNotificationDate(notification.createdAt)}
                      </small>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setHalaman('dashboard')}>Kembali</button>
        </main>
      </div>
    );
  }

  // ============================================================
  // PROFIL
  // ============================================================

  if (halaman === 'profil') {
    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <h1>Profil</h1>

          <div className="profile-card">
            <div className="profile-avatar">👤</div>

            <strong>
              {profile?.nama || user.email || 'Pengguna Bantu_In'}
            </strong>

            <span>
              {mode === 'helper'
                ? 'Helper'
                : mode === 'seller'
                ? 'Seller'
                : 'Customer'}
            </span>

            <small
              style={{
                marginTop: '6px',
                color: '#888',
                fontSize: '11px',
              }}
            >
              {profile?.email || user.email}
            </small>
          </div>

          <button onClick={() => setHalaman('dashboard')}>Kembali</button>

          <BottomNav />
        </main>
      </div>
    );
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  if (halaman === 'logout') {
    const handleLogout = async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Gagal logout:', error);
      }
    };

    return (
      <div className="app">
        <main className="welcome">
          <Header />

          <h1>Keluar dari Bantu_In?</h1>

          <p className="description">Kamu yakin ingin keluar dari akun?</p>

          <div className="actions">
            <button onClick={handleLogout}>Ya, Keluar</button>

            <button onClick={() => setHalaman('dashboard')}>Batal</button>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

export default App;
