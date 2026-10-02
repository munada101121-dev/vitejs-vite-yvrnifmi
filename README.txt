Bantu_In FINAL - Fitur Pembatalan Order

PAKET INI BERISI:
1. src/App.tsx
2. src/orders.ts
3. firestore.rules
4. README.txt

FITUR PEMBATALAN:

Customer:
- Hanya dapat membatalkan order dengan status pending.
- Wajib memberikan alasan pembatalan.
- Jika terdapat tawaran Helper yang sedang menunggu keputusan, Helper tersebut akan mendapat notifikasi pembatalan.

Helper:
- Dapat membatalkan pekerjaan dengan status accepted.
- Dapat membatalkan pekerjaan dengan status on_the_way.
- Wajib memberikan alasan pembatalan.
- Customer akan mendapat notifikasi pembatalan.

STATUS YANG TIDAK DAPAT DIBATALKAN:
- working
- completed
- expired

SETELAH DIBATALKAN:
- Order tidak dihapus dari Firestore.
- Status order berubah menjadi cancelled.
- Alasan pembatalan disimpan.
- Pihak yang membatalkan disimpan.
- Waktu pembatalan disimpan.
- Riwayat status tetap dipertahankan.
- Notifikasi order_cancelled dikirim sebagai notifikasi in-app.

CARA MEMASANG:

1. Ganti:
   src/App.tsx

2. Ganti:
   src/orders.ts

3. Ganti:
   firestore.rules

4. Deploy firestore.rules melalui Firebase Console.

5. Jalankan:
   npm run build

6. Pastikan build berhasil tanpa error.

7. Tes Customer:
   - Buat order.
   - Pastikan status pending.
   - Buka detail order.
   - Pilih Batalkan Permintaan.
   - Pilih/isi alasan.
   - Konfirmasi pembatalan.
   - Pastikan status menjadi cancelled.

8. Tes Helper:
   - Ambil sebuah order.
   - Pastikan status accepted atau on_the_way.
   - Buka detail pekerjaan.
   - Pilih Batalkan Pekerjaan.
   - Pilih/isi alasan.
   - Konfirmasi pembatalan.
   - Pastikan status menjadi cancelled.

9. Tes notifikasi:
   - Customer membatalkan order yang memiliki tawaran Helper.
   - Pastikan Helper menerima notifikasi pembatalan.
   - Helper membatalkan pekerjaan.
   - Pastikan Customer menerima notifikasi pembatalan.

CATATAN:
- Jangan menghapus order yang sudah cancelled.
- Jangan mengubah aturan pembatalan menjadi terlalu longgar.
- FCM belum diaktifkan. Notifikasi pada fitur ini menggunakan notifikasi in-app realtime.