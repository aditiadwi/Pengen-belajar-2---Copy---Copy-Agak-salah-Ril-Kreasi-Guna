# 📝 Jurnal Pengembangan: Smart Drip Coffee (Evolution to V2)

### **1. Deskripsi Proyek**
Membangun platform e-commerce kopi premium (Smart Drip Coffee) yang mengintegrasikan pusat data cloud, manajemen inventaris otomatis, dan dashboard analitik visual. Proyek ini berevolusi dari landing page statis menjadi aplikasi web dinamis berskala produksi.

---

### **2. Tech Stack & Ekosistem (V2 Upgrade)**
*   **Frontend:** HTML5, CSS3 (Custom Properties & Responsive Grid), JavaScript (Vanilla ES6+).
*   **Backend & Database (BaaS):** 
    *   **Supabase:** Menggantikan `localStorage` sebagai database utama (PostgreSQL). Menangani persistensi data untuk Produk, Pesanan, Event, dan Feedback.
*   **API & Service Integration:** 
    *   **Cloudinary:** Penyimpanan bukti pembayaran melalui *Unsigned Uploads*.
    *   **EmailJS:** Notifikasi email transaksional dua sisi (untuk admin/penjual menggunakan `template_32knsih` dan pembeli/customer menggunakan `template_vsn07oo`).
    *   **Google Chart/Chart.js:** Visualisasi data statistik di dashboard admin.
*   **State Management:** LocalStorage digunakan secara strategis untuk *Form Persistence* dan *Cart State*.

---

### **3. Milestone Fitur Utama (Detail)**

#### **A. Dynamic Cloud Infrastructure (Database)**
*   **Schema Design:** Membangun relasi data untuk melacak penjualan.
*   **Autopilot Inventory:** Implementasi logika *atomic update* di mana stok produk berkurang secara otomatis seketika setelah transaksi divalidasi oleh sistem.
*   **Data Integrity:** Menggunakan SQL Repair scripts untuk memastikan skema database (kolom, tipe data) selalu sinkron dengan logika bisnis di frontend.

#### **B. Advanced Admin Dashboard (Control Center)**
*   **Visual Business Intelligence:** 
    *   Implementasi grafik garis interaktif untuk memantau tren pesanan harian.
    *   Algoritma penghitung "Best Seller" yang secara otomatis mengurai (parsing) data pesanan untuk menentukan produk terpopuler.
*   **Unified Management (All-in-One):**
    *   **Product CRUD:** Kontrol penuh atas nama, harga, stok, dan lokasi gambar.
    *   **Order Intelligence:** Detail pesanan mendalam termasuk rincian kurir, catatan pembeli, dan verifikasi bukti bayar visual.
    *   **Data Export:** Fitur "Download Excel (CSV)" untuk ekspor laporan penjualan dengan format yang dioptimalkan (BOM & Auto-Separator).
    *   **Feedback Moderation:** Sistem kurasi ulasan pelanggan sebelum dipublikasikan ke publik.
    *   **Live Event Controller:** Fitur untuk mengaktifkan/menonaktifkan pengumuman stand bazar secara real-time.

#### **C. Customer Experience (UX) Engineering**
*   **Private Order Tracking:** Sistem pelacakan pesanan berbasis Order ID unik, memastikan privasi antar pembeli tetap terjaga tanpa mewajibkan registrasi akun (User-friendly).
*   **Form Auto-Save:** Mencegah kehilangan data input pembeli saat halaman ter-refresh secara tidak sengaja melalui sinkronisasi *Real-time LocalStorage*.
*   **Visual Validation:** Memberikan *instant feedback* (highlight merah & pesan error) saat pengguna salah memasukkan format email atau nomor telepon.
*   **Dual-Receipt Email Notification:** Mengirimkan salinan detail pesanan secara otomatis baik ke penjual (admin) maupun pembeli (customer) sesaat setelah transaksi checkout dilakukan menggunakan API EmailJS.
*   **User Geolocation Auto-Fill:** Tombol "Gunakan Lokasi Terkini" pada formulir alamat checkout yang mendeteksi koordinat GPS pengguna secara otomatis menggunakan HTML5 Geolocation API, menerjemahkannya ke nama jalan/kota nyata menggunakan Nominatim API (reverse geocoding), lalu otomatis mengisi kolom alamat dan kota tujuan (yang secara otomatis memperbarui ongkos kirim).

---

### **4. Technical Challenges & Engineering Solutions**

| Masalah | Analisis Teknis | Solusi Engineering |
| :--- | :--- | :--- |
| **Database Schema Drift** | Perubahan kolom di Supabase sering terhambat oleh *cache* atau inkonsistensi tipe data (Array vs Text). | Implementasi **Master Fix SQL** (Drop & Recreate) untuk memastikan skema tabel 100% akurat. |
| **JS Reference Errors** | Penambahan library eksternal (CDN) sering menyebabkan tabrakan variabel atau fungsi yang tidak terdefinisi (*null*). | Menggunakan **Global Namespace (window.object)** dan *Safety Checks* (if-existence) pada setiap manipulasi DOM. |
| **UI Scalability** | Modal detail pesanan yang sangat panjang menyebabkan elemen penting (tombol update) terpotong di layar kecil. | Implementasi **Flexbox Modal Layout** dengan area scroll internal yang terisolasi (*Fixed Header & Footer*). |
| **Image Fallback** | Link gambar yang salah atau terhapus merusak estetika website (ikon broken image). | Penambahan event listener **onerror** pada elemen `<img>` untuk otomatis memuat gambar *placeholder* default. |
| **Accidental Deletion** | Menghapus data penting (produk/pesanan) tanpa sengaja dapat merusak laporan keuangan. | Implementasi **Confirmation Prompts** dengan pesan dinamis yang menyebutkan nama item sebelum proses `DELETE` dilakukan. |
| **Excel CSV Mess** | File CSV seringkali tidak terformat rapi (berantakan) saat dibuka di Microsoft Excel. | Penambahan **UTF-8 BOM** dan instruksi `sep=,` agar Excel otomatis mengenali kolom dan karakter spesial secara rapi. |
| **Dual Email Notification** | Kebutuhan untuk mengirim bukti pemesanan ke dua pihak secara independen (penjual dan pembeli) dengan template/tujuan yang berbeda menggunakan batasan EmailJS gratis. | Konfigurasi pemanggilan API ganda (`emailjs.send`) dengan memisahkan template admin (`template_32knsih`) dan template pembeli (`template_vsn07oo`) yang dinamis berdasarkan input email pembeli. |
| **User Address Entry & Autocomplete** | Pengguna seringkali kesulitan menuliskan alamat lengkap secara manual secara presisi, yang dapat memengaruhi keakuratan pengiriman dan ongkos kirim. | Integrasi tombol "Gunakan Lokasi Terkini" menggunakan **HTML5 Geolocation API** dan **OpenStreetMap Nominatim Reverse Geocoding API** untuk mengisi textarea alamat lengkap dan select dropdown kota secara instan. |
| **CSS Pollution & Conditional Deletion** | Class `.btn-delete` global di `style.css` menyembunyikan semua tombol hapus admin secara tidak sengaja karena bentrok nama. Selain itu, tombol hapus pesanan tidak terfilter sehingga bisa memicu penghapusan pesanan aktif. | Menyesuaikan selector di `style.css` menjadi `.testimonial-card .btn-delete` agar terisolasi, serta mengkondisikan tombol hapus pesanan di `admin.html` agar hanya dirender untuk pesanan berstatus `'CANCELLED'`. |
| **WhatsApp Floating Button & Contact Redirection** | Tombol WA melayang tidak ada di halaman pelacakan/sejarah. Selain itu, tautan email (`mailto:`) sering membuka tab kosong baru yang tidak menutup otomatis jika tidak memiliki klien email lokal. | Menambahkan tombol WA melayang di semua halaman. Mengubah alur tombol kontak Email menggunakan fungsi `handleEmailClick()` di `app.js` untuk otomatis menyalin alamat email ke clipboard dan mengarahkan ke halaman tulis Gmail Web secara aman. |
| **Contact Form split Email/WhatsApp** | Kebutuhan untuk memproses pesan formulir kontak lewat EmailJS (masuk ke kotak masuk email) sambil menyediakan opsi obrolan cepat langsung ke WhatsApp. | Memisahkan form kontak menjadi dua opsi tombol: Tombol Submit (`✉️ Kirim ke Email`) yang memicu pengiriman data via EmailJS, dan Tombol Shortcut (`💬 Hubungi via WhatsApp`) yang memvalidasi form lalu menyusun pesan teks terformat ke API WhatsApp. |
| **WhatsApp SVG Logo Accuracy** | Ikon WA sebelumnya adalah siluet putih dasar yang rentan terpotong oleh CSS `overflow: hidden` di beberapa browser dan kurang menyerupai logo resmi WhatsApp. | Mengganti SVG siluet dengan SVG resmi WhatsApp bertumpuk 2-lapisan (balon chat whites + lingkaran hijau & telepon cut-out), serta membersihkan batasan overflow pada CSS untuk rendering yang 100% presisi. |
| **Account Session Cart, Profile & Order History Isolation** | Menggunakan kunci global (`coffee_cart`, `checkout_form_data`, `customer_profile`, dan `recent_orders`) di `localStorage` membuat data keranjang, autofill alamat, dan riwayat pelacakan pesanan milik pengguna sebelumnya bocor ke pengguna lain yang login di browser/perangkat yang sama. | Mengubah seluruh kunci tersebut menjadi dinamis berdasarkan ID sesi aktif Supabase (`*_userId`). Ketika user melakukan login/logout atau ganti akun, sistem secara otomatis memuat ulang keranjang belanja, memperbarui profil autofill, dan menampilkan daftar nomor pelacakan pesanan (`recent_orders`) yang sesuai secara terisolasi. Selain itu, saat melakukan logoff (logout), seluruh data guest akan dihapus bersih (reset) agar sesi guest berikutnya dimulai dengan form & keranjang kosong tanpa sisa data akun sebelumnya. |
| **Hardcoded Credentials & Sensitive Data Exposure** | Kunci API (Supabase, NewsAPI, EmailJS) dan Cloudinary API Secret disimpan secara mentah/hardcoded di client-side JS dan file testing, yang berisiko bocor saat dipublikasikan ke Git. | Memigrasikan semua data sensitif ke `.env` file yang di-gitignored. Membuat utilitas `generate-env-js.js` untuk membuat config client-safe (`env.js`) secara lokal, menginjeksikannya ke `<head>` semua HTML, serta merestrukturisasi client-side JS agar mengambil nilai dari `window.ENV` dengan sistem *fallback* yang aman. |

---

### **5. Kesimpulan & Status Proyek**
Sistem **Smart Drip V2** saat ini dalam status **Stable**. Arsitektur telah siap untuk menangani trafik nyata dengan manajemen data yang terpusat dan aman di cloud.

*Update Terakhir: 17 Juli 2026*

