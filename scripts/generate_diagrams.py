"""
Generator Diagram Otomatis untuk Skripsi Oil Condition Monitoring System
Menggunakan PlantUML server untuk generate PNG diagram.
Output: folder docs/diagrams/ berisi semua gambar diagram
"""

import os
import sys
import zlib
import base64
import struct
import urllib.request
import urllib.error

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "diagrams")
os.makedirs(OUTPUT_DIR, exist_ok=True)

PLANTUML_SERVER = "https://www.plantuml.com/plantuml/png/"

# ─── PlantUML encoding ─────────────────────────────────────────────────────
_ENCODE_6BIT = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"

def _encode6(b: int) -> str:
    return _ENCODE_6BIT[b & 0x3F]

def _encode3bytes(b1: int, b2: int, b3: int) -> str:
    c1 = b1 >> 2
    c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
    c3 = ((b2 & 0xF) << 2) | (b3 >> 6)
    c4 = b3 & 0x3F
    return _encode6(c1) + _encode6(c2) + _encode6(c3) + _encode6(c4)

def plantuml_encode(text: str) -> str:
    compressed = zlib.compress(text.encode("utf-8"), 9)[2:-4]
    result = ""
    i = 0
    while i < len(compressed):
        b1 = compressed[i]
        b2 = compressed[i + 1] if i + 1 < len(compressed) else 0
        b3 = compressed[i + 2] if i + 2 < len(compressed) else 0
        result += _encode3bytes(b1, b2, b3)
        i += 3
    return result

def download_diagram(name: str, uml: str) -> bool:
    encoded = plantuml_encode(uml)
    url = PLANTUML_SERVER + encoded
    out_path = os.path.join(OUTPUT_DIR, f"{name}.png")
    try:
        print(f"  → Generating {name}.png ...")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
        with open(out_path, "wb") as f:
            f.write(data)
        size_kb = len(data) // 1024
        print(f"     ✓ Saved ({size_kb} KB) → {out_path}")
        return True
    except Exception as e:
        print(f"     ✗ GAGAL: {e}")
        return False

# ═══════════════════════════════════════════════════════════════════════════
# DEFINISI SEMUA DIAGRAM
# ═══════════════════════════════════════════════════════════════════════════

DIAGRAMS = {}

# ─── 1. Use Case Diagram – Admin ───────────────────────────────────────────
DIAGRAMS["01_usecase_admin"] = """
@startuml
skinparam actorStyle awesome
skinparam backgroundColor #FAFAFA
skinparam usecase {
  BackgroundColor #E8F4FD
  BorderColor #2980B9
  FontSize 13
}
skinparam actor {
  BackgroundColor #2C3E50
  FontColor #FFFFFF
  FontSize 14
}
title Use Case Diagram - Admin

left to right direction

actor "Admin" as admin #2C3E50

rectangle "Oil Condition Monitoring System" {
  usecase "Login" as UC_LOGIN
  usecase "Kelola Data Produk Oli" as UC_PROD
  usecase "Kelola Data Pelanggan" as UC_CUST
  usecase "Kelola Akun Pengguna" as UC_USER
  usecase "Proses Pesanan Pelanggan" as UC_ORDER
  usecase "Tangani Keluhan Pelanggan" as UC_COMP
  usecase "Input Hasil Uji Lab" as UC_LAB
  usecase "Kelola Permintaan Lab" as UC_REQ
  usecase "Lihat Dashboard & Laporan" as UC_DASH
}

admin --> UC_LOGIN
admin --> UC_PROD
admin --> UC_CUST
admin --> UC_USER
admin --> UC_ORDER
admin --> UC_COMP
admin --> UC_LAB
admin --> UC_REQ
admin --> UC_DASH
@enduml
"""

# ─── 2. Use Case Diagram – Sales ───────────────────────────────────────────
DIAGRAMS["02_usecase_sales"] = """
@startuml
skinparam actorStyle awesome
skinparam backgroundColor #FAFAFA
skinparam usecase {
  BackgroundColor #E8F8F5
  BorderColor #27AE60
  FontSize 13
}
skinparam actor {
  BackgroundColor #27AE60
  FontColor #FFFFFF
  FontSize 14
}
title Use Case Diagram - Sales

left to right direction

actor "Sales" as sales #27AE60

rectangle "Oil Condition Monitoring System" {
  usecase "Login" as UC_LOGIN
  usecase "Lihat Daftar\\nPermintaan Uji Lab" as UC_LIST
  usecase "Proses Permintaan\\nUji Lab" as UC_PROC
  usecase "Unggah Foto\\nSampel Oli" as UC_PHOTO
  usecase "Lihat Daftar\\nPelanggan & Mesin" as UC_VIEW
  usecase "Lihat Dashboard" as UC_DASH
}

sales --> UC_LOGIN
sales --> UC_LIST
sales --> UC_PROC
sales --> UC_PHOTO
sales --> UC_VIEW
sales --> UC_DASH
@enduml
"""

# ─── 3. Use Case Diagram – Customer ────────────────────────────────────────
DIAGRAMS["03_usecase_customer"] = """
@startuml
skinparam actorStyle awesome
skinparam backgroundColor #FAFAFA
skinparam usecase {
  BackgroundColor #FEF9E7
  BorderColor #E67E22
  FontSize 13
}
skinparam actor {
  BackgroundColor #E67E22
  FontColor #FFFFFF
  FontSize 14
}
title Use Case Diagram - Customer (Pelanggan)

left to right direction

actor "Customer" as cust #E67E22

rectangle "Oil Condition Monitoring System" {
  usecase "Login" as UC_LOGIN
  usecase "Ajukan Permintaan\\nUji Lab" as UC_REQ
  usecase "Pantau Status &\\nRiwayat Uji Lab" as UC_STAT
  usecase "Lihat Hasil\\nUji Laboratorium" as UC_RESULT
  usecase "Lakukan Pemesanan\\nProduk Oli" as UC_ORDER
  usecase "Pantau Status\\nPesanan" as UC_OSTATUS
  usecase "Ajukan Keluhan\\nPesanan" as UC_COMP
  usecase "Lihat Profil Perusahaan\\n& Daftar Mesin" as UC_PROFILE
}

cust --> UC_LOGIN
cust --> UC_REQ
cust --> UC_STAT
cust --> UC_RESULT
cust --> UC_ORDER
cust --> UC_OSTATUS
cust --> UC_COMP
cust --> UC_PROFILE
@enduml
"""

# ─── 4. Activity Diagram – Login ───────────────────────────────────────────
DIAGRAMS["04_activity_login"] = """
@startuml
skinparam backgroundColor #FAFAFA
skinparam activity {
  BackgroundColor #D6EAF8
  BorderColor #2980B9
  FontSize 13
}
skinparam activityDiamond {
  BackgroundColor #F9E79F
  BorderColor #F39C12
}
title Activity Diagram - Proses Login

|Pengguna|
start
:Buka Halaman Login;
:Isi Email & Password;
:Klik Tombol Login;

|Sistem|
:Terima Input Kredensial;
:Kirim ke Supabase Auth untuk Verifikasi;

if (Kredensial Valid?) then (Ya)
  :Buat Session Token;
  :Ambil Data Profil & Role;
  if (Role = Admin?) then (Ya)
    :Redirect ke Panel Admin;
  elseif (Role = Sales?) then (Ya)
    :Redirect ke Dashboard Sales;
  else (Customer)
    :Redirect ke Dashboard Customer;
  endif
else (Tidak)
  |Pengguna|
  :Tampilkan Pesan Error\\n"Email atau Password Salah";
  :Kembali Isi Form Login;
  stop
endif

|Pengguna|
:Akses Dashboard Sesuai Peran;
stop
@enduml
"""

# ─── 5. Activity Diagram – Ajukan Lab Request ──────────────────────────────
DIAGRAMS["05_activity_lab_request"] = """
@startuml
skinparam backgroundColor #FAFAFA
skinparam activity {
  BackgroundColor #D5F5E3
  BorderColor #27AE60
  FontSize 13
}
skinparam activityDiamond {
  BackgroundColor #F9E79F
  BorderColor #F39C12
}
title Activity Diagram - Pengajuan Permintaan Uji Lab (Customer)

|Customer|
start
:Login ke Sistem;
:Pilih Menu "Lab Request";

|Sistem|
:Tampilkan Daftar Permintaan;

|Customer|
:Klik "Ajukan Permintaan Baru";

|Sistem|
:Ambil Daftar Mesin Pelanggan dari DB;
:Tampilkan Formulir Permintaan;

|Customer|
:Isi Formulir\\n(Judul, Mesin, Deskripsi, Prioritas);
:Klik "Kirim";

|Sistem|
:Validasi Kelengkapan Data;

if (Data Lengkap?) then (Ya)
  :Simpan ke Tabel oil_lab_requests\\ndengan Status "pending";
  :Tampilkan Konfirmasi Berhasil;
else (Tidak)
  |Customer|
  :Tampilkan Pesan Validasi Error;
  :Lengkapi Data yang Kurang;
endif

|Customer|
:Melihat Permintaan dalam Daftar;
stop
@enduml
"""

# ─── 6. Activity Diagram – Sales Proses Lab ────────────────────────────────
DIAGRAMS["06_activity_sales_lab"] = """
@startuml
skinparam backgroundColor #FAFAFA
skinparam activity {
  BackgroundColor #FDEBD0
  BorderColor #E67E22
  FontSize 13
}
skinparam activityDiamond {
  BackgroundColor #F9E79F
  BorderColor #F39C12
}
title Activity Diagram - Penanganan Permintaan Lab (Sales)

|Sales|
start
:Login ke Sistem;
:Pilih Menu "Permintaan Lab";

|Sistem|
:Tampilkan Daftar Permintaan\\nyang Ditugaskan ke Sales ini;

|Sales|
:Pilih Permintaan;
:Ubah Status → "assigned";

|Sistem|
:Update Status di Database;

|Sales|
:Lakukan Perjalanan ke\\nLokasi Mesin Pelanggan;
:Ambil Sampel Oli dari Mesin;
:Unggah Foto Sampel Oli;
:Ubah Status → "sampling";

|Sistem|
:Simpan Foto ke Cloud Storage;
:Update Status di Database;

|Sales|
:Antar Sampel ke Laboratorium;
:Ubah Status → "completed";

|Sistem|
:Update Status Permintaan = "completed";
:Admin Notified untuk Input Hasil Lab;

|Sales|
stop
@enduml
"""

# ─── 7. Activity Diagram – Admin Input Hasil Lab ───────────────────────────
DIAGRAMS["07_activity_admin_lab"] = """
@startuml
skinparam backgroundColor #FAFAFA
skinparam activity {
  BackgroundColor #EBF5FB
  BorderColor #2C3E50
  FontSize 13
}
skinparam activityDiamond {
  BackgroundColor #F9E79F
  BorderColor #F39C12
}
title Activity Diagram - Admin Input Hasil Uji Lab

|Admin|
start
:Login ke Panel Admin;
:Pilih Menu "Lab Tests";

|Sistem|
:Tampilkan Daftar Hasil Uji;

|Admin|
:Klik "Tambah Hasil Uji Baru";

|Sistem|
:Tampilkan Formulir Input Hasil Lab;

|Admin|
:Pilih Mesin & Produk Oli;
:Isi Parameter Hasil Uji\\n(Viskositas 40°C, 100°C,\\nKadar Air, TAN, Tanggal);
:Unggah Berkas PDF Laporan;
:Klik "Simpan";

|Sistem|
:Validasi Data Parameter;

if (Data Valid?) then (Ya)
  :Simpan ke Tabel oil_lab_tests;
  :Link ke Mesin & Produk Terkait;
  :Tampilkan Konfirmasi Berhasil;
  :Data Tersedia di Dashboard Customer;
else (Tidak)
  |Admin|
  :Tampilkan Pesan Validasi;
  :Perbaiki Data;
endif

stop
@enduml
"""

# ─── 8. Activity Diagram – Customer Pesan Produk ───────────────────────────
DIAGRAMS["08_activity_order"] = """
@startuml
skinparam backgroundColor #FAFAFA
skinparam activity {
  BackgroundColor #F9EBEA
  BorderColor #C0392B
  FontSize 13
}
skinparam activityDiamond {
  BackgroundColor #F9E79F
  BorderColor #F39C12
}
title Activity Diagram - Pemesanan Produk Oli (Customer)

|Customer|
start
:Login ke Sistem;
:Pilih Menu "Pesanan";

|Sistem|
:Tampilkan Riwayat Pesanan;

|Customer|
:Klik "Buat Pesanan Baru";

|Sistem|
:Tampilkan Daftar Produk Oli;

|Customer|
:Pilih Produk & Isi Jumlah;
:Klik "Konfirmasi Pesanan";

|Sistem|
:Validasi Jumlah (> 0);

if (Jumlah Valid?) then (Ya)
  :Simpan ke Tabel oil_orders\\ndengan Status "pending";
  :Tampilkan Konfirmasi Berhasil;
else (Tidak)
  |Customer|
  :Tampilkan Pesan Error;
  :Isi Ulang Jumlah;
endif

|Admin/Sales|
:Terima Notifikasi Pesanan Baru;
:Ubah Status Pesanan;
:("processing" → "shipped" → "completed");

|Customer|
:Pantau Status Pesanan Real-time;
stop
@enduml
"""

# ─── 9. Sequence Diagram – Login ───────────────────────────────────────────
DIAGRAMS["09_sequence_login"] = """
@startuml
skinparam backgroundColor #FAFAFA
skinparam sequence {
  ArrowColor #2980B9
  ActorBorderColor #2C3E50
  LifeLineBorderColor #2980B9
  ParticipantBackgroundColor #EBF5FB
  ParticipantBorderColor #2980B9
  ActorBackgroundColor #2C3E50
  ActorFontColor #FFFFFF
}
title Sequence Diagram - Login Semua Peran

actor "Pengguna" as user
participant "Halaman Login" as page
participant "Middleware" as mid
participant "Supabase Auth" as auth
database "Database" as db

user -> page : Akses URL /login
page -> user : Tampilkan Form Login

user -> page : Submit (email, password)
page -> auth : signInWithPassword(email, password)
auth -> db : SELECT user WHERE email=...
db --> auth : User record
auth -> auth : Verifikasi password hash

alt Kredensial Valid
    auth --> page : Session Token + User ID
    page -> db : SELECT role FROM oil_profiles WHERE id=...
    db --> page : {role: "admin"/"sales"/"customer"}
    page -> mid : Set session cookie
    mid --> user : Redirect ke Dashboard (sesuai role)
else Kredensial Tidak Valid
    auth --> page : Error: Invalid credentials
    page --> user : Tampilkan pesan "Email atau Password salah"
end
@enduml
"""

# ─── 10. Sequence Diagram – Ajukan Lab Request ─────────────────────────────
DIAGRAMS["10_sequence_lab_request"] = """
@startuml
skinparam backgroundColor #FAFAFA
skinparam sequence {
  ArrowColor #27AE60
  ParticipantBackgroundColor #E8F8F5
  ParticipantBorderColor #27AE60
  ActorBackgroundColor #27AE60
  ActorFontColor #FFFFFF
}
title Sequence Diagram - Pengajuan Permintaan Uji Lab

actor "Customer" as cust
participant "Dashboard Customer" as page
participant "API Route\\n/api/customer/lab-requests" as api
database "Database (Supabase)" as db

cust -> page : Akses menu Lab Request
page -> api : GET /api/customer/lab-requests
api -> db : SELECT oil_lab_requests WHERE customer_id=...
db --> api : Daftar permintaan
api --> page : JSON data
page --> cust : Tampilkan daftar permintaan

cust -> page : Klik "Ajukan Permintaan Baru"
page -> api : GET /api/customer/machines
api -> db : SELECT oil_machines WHERE customer_id=...
db --> api : Daftar mesin
page --> cust : Tampilkan form dengan dropdown mesin

cust -> page : Isi form & Submit
page -> api : POST /api/customer/lab-requests {title, machine_id, description, priority}

api -> api : Validasi RLS (customer hanya bisa input data sendiri)
api -> db : INSERT INTO oil_lab_requests (status="pending")
db --> api : OK, new record ID

api --> page : {success: true, id: "uuid"}
page --> cust : Tampilkan konfirmasi "Permintaan berhasil diajukan"
@enduml
"""

# ─── 11. Sequence Diagram – Sales Proses Lab ───────────────────────────────
DIAGRAMS["11_sequence_sales_lab"] = """
@startuml
skinparam backgroundColor #FAFAFA
skinparam sequence {
  ArrowColor #E67E22
  ParticipantBackgroundColor #FEF9E7
  ParticipantBorderColor #E67E22
  ActorBackgroundColor #E67E22
  ActorFontColor #FFFFFF
}
title Sequence Diagram - Sales Memproses Permintaan Uji Lab

actor "Sales" as sales
participant "Dashboard Sales" as page
participant "Server Action" as action
participant "Supabase Storage" as storage
database "Database" as db

sales -> page : Akses Dashboard
page -> db : SELECT oil_lab_requests WHERE assigned_to=sales.id
db --> page : Daftar permintaan yang ditugaskan
page --> sales : Tampilkan daftar permintaan

sales -> page : Pilih permintaan & ubah status → "assigned"
page -> action : updateLabRequestStatus(id, "assigned")
action -> db : UPDATE oil_lab_requests SET status="assigned"
db --> action : OK
action --> page : Berhasil
page --> sales : Status diperbarui

sales -> page : Unggah foto sampel & ubah status → "sampling"
page -> storage : Upload foto ke Supabase Storage
storage --> page : URL foto tersimpan

page -> action : updateLabRequest(id, {status:"sampling", photo_url:...})
action -> db : UPDATE oil_lab_requests SET status, sample_photo_path
db --> action : OK
page --> sales : Foto terunggah, status diperbarui

sales -> page : Ubah status → "completed"
page -> action : updateLabRequestStatus(id, "completed")
action -> db : UPDATE oil_lab_requests SET status="completed"
db --> action : OK
page --> sales : Permintaan selesai
@enduml
"""

# ─── 12. Sequence Diagram – Admin Input Hasil Lab ──────────────────────────
DIAGRAMS["12_sequence_admin_lab"] = """
@startuml
skinparam backgroundColor #FAFAFA
skinparam sequence {
  ArrowColor #8E44AD
  ParticipantBackgroundColor #F5EEF8
  ParticipantBorderColor #8E44AD
  ActorBackgroundColor #2C3E50
  ActorFontColor #FFFFFF
}
title Sequence Diagram - Admin Input Hasil Uji Lab

actor "Admin" as admin
participant "Panel Admin\\n(Lab Tests)" as page
participant "Server Action\\ncreatLabTest()" as action
participant "Supabase Storage" as storage
database "Database" as db

admin -> page : Akses menu Lab Tests
page -> db : SELECT oil_lab_tests JOIN oil_machines
db --> page : Daftar hasil uji
page --> admin : Tampilkan daftar

admin -> page : Klik "Tambah Hasil Uji Baru"
page --> admin : Tampilkan form parameter hasil lab

admin -> page : Isi form (mesin, produk, viskositas\\n40°C, 100°C, kadar air, TAN, tanggal)
admin -> page : Unggah berkas PDF laporan

page -> storage : Upload PDF ke Supabase Storage
storage --> page : PDF URL

admin -> page : Klik "Simpan"
page -> action : createLabTest({machine_id, product_id,\\nviscosity_40c, viscosity_100c,\\nwater_content, tan_value, pdf_path})

action -> db : INSERT INTO oil_lab_tests VALUES (...)
db --> action : OK, record tersimpan

action --> page : {success: true}
page --> admin : Konfirmasi "Hasil uji berhasil disimpan"
note right of db : Data kini dapat dilihat oleh\\nCustomer pemilik mesin tersebut
@enduml
"""

# ─── 13. Sequence Diagram – Customer Lihat Hasil Lab ───────────────────────
DIAGRAMS["13_sequence_view_result"] = """
@startuml
skinparam backgroundColor #FAFAFA
skinparam sequence {
  ArrowColor #16A085
  ParticipantBackgroundColor #E8F8F5
  ParticipantBorderColor #16A085
  ActorBackgroundColor #E67E22
  ActorFontColor #FFFFFF
}
title Sequence Diagram - Customer Melihat Hasil Uji Lab

actor "Customer" as cust
participant "Dashboard Customer\\n(Lab Results)" as page
participant "API Route\\n/api/customer/lab-results" as api
database "Database" as db

cust -> page : Pilih Mesin & Akses Hasil Uji
page -> api : GET /api/customer/lab-results?machine_id=...

api -> api : Verifikasi RLS:\\ncustomer hanya bisa lihat mesin miliknya
api -> db : SELECT oil_lab_tests\\nWHERE machine_id=... ORDER BY test_date DESC
db --> api : Array hasil uji

api -> db : SELECT oil_products WHERE id=product_id
db --> api : Data produk (baseline parameter)

api --> page : JSON {tests: [...], product: {...}}

page -> page : Proses data untuk grafik tren
page --> cust : Tampilkan:\\n- Grafik tren viskositas, TAN, air\\n- Tabel riwayat hasil uji\\n- Indikator status kondisi oli

cust -> page : Klik "Unduh PDF"
page --> cust : Redirect ke URL PDF\\ndi Supabase Storage
@enduml
"""

# ─── 14. Class Diagram ─────────────────────────────────────────────────────
DIAGRAMS["14_class_diagram"] = """
@startuml
skinparam backgroundColor #FAFAFA
skinparam class {
  BackgroundColor #EBF5FB
  BorderColor #2980B9
  HeaderBackgroundColor #2980B9
  HeaderFontColor #FFFFFF
  FontSize 12
}
skinparam arrow {
  Color #2C3E50
}
title Class Diagram - Oil Condition Monitoring System

class OilCustomer {
  +id: UUID
  +company_name: String
  +status: String
  +user_management_pin_hash: String
  +created_at: Timestamp
  +updated_at: Timestamp
  --
  +getProfiles(): List<OilProfile>
  +getMachines(): List<OilMachine>
  +getOrders(): List<OilOrder>
  +getLabRequests(): List<OilLabRequest>
}

class OilProfile {
  +id: UUID
  +customer_id: UUID
  +role: String
  +full_name: String
  +email: String
  +phone_number: String
  +created_at: Timestamp
  +updated_at: Timestamp
  --
  +authenticate(): Boolean
  +getAssignedRequests(): List<OilLabRequest>
}

class OilProduct {
  +id: UUID
  +product_name: String
  +product_type: String
  +base_oil: String
  +viscosity_grade: String
  +oil_grade: String
  +baseline_viscosity_40c: Numeric
  +baseline_viscosity_100c: Numeric
  +baseline_tan: Numeric
  +created_at: Timestamp
  +updated_at: Timestamp
  --
  +getOrders(): List<OilOrder>
  +getLabTests(): List<OilLabTest>
}

class OilMachine {
  +id: UUID
  +customer_id: UUID
  +machine_name: String
  +location: String
  +status: String
  +model: String
  +serial_number: String
  +created_at: Timestamp
  +updated_at: Timestamp
  --
  +getLabRequests(): List<OilLabRequest>
  +getLabTests(): List<OilLabTest>
}

class OilOrder {
  +id: UUID
  +customer_id: UUID
  +product_id: UUID
  +quantity: Integer
  +status: String
  +created_at: Timestamp
  +updated_at: Timestamp
  +updated_by: UUID
  --
  +createOrder(): Boolean
  +updateStatus(status: String): Boolean
  +getComplaints(): List<OilComplaint>
}

class OilComplaint {
  +id: UUID
  +order_id: UUID
  +customer_id: UUID
  +description: String
  +status: String
  +resolution_notes: String
  +resolved_at: Timestamp
  +resolved_by: UUID
  +created_at: Timestamp
  +updated_at: Timestamp
  --
  +createComplaint(): Boolean
  +resolveComplaint(notes: String): Boolean
}

class OilLabRequest {
  +id: UUID
  +customer_id: UUID
  +machine_id: UUID
  +requested_by_profile_id: UUID
  +assigned_to_profile_id: UUID
  +title: String
  +description: String
  +priority: String
  +status: String
  +request_date: Date
  +due_date: Date
  +is_new_machine: Boolean
  +new_machine_data: JSON
  +sample_photo_path: String
  +created_at: Timestamp
  +updated_at: Timestamp
  --
  +createRequest(): Boolean
  +updateStatus(status: String): Boolean
  +uploadPhoto(path: String): Boolean
}

class OilLabTest {
  +id: UUID
  +machine_id: UUID
  +product_id: UUID
  +test_date: Date
  +viscosity_40c: Numeric
  +viscosity_100c: Numeric
  +water_content: Numeric
  +water_content_unit: String
  +tan_value: Numeric
  +pdf_path: String
  +notes: String
  +test_type: String
  +created_at: Timestamp
  +updated_at: Timestamp
  +updated_by: UUID
  --
  +createTest(): Boolean
  +uploadReport(path: String): Boolean
}

OilCustomer "1" --o{ "N" OilProfile : memiliki
OilCustomer "1" --o{ "N" OilMachine : mendaftarkan
OilCustomer "1" --o{ "N" OilOrder : melakukan
OilCustomer "1" --o{ "N" OilLabRequest : mengajukan

OilMachine "1" --o{ "N" OilLabRequest : menjadi subjek
OilMachine "1" --o{ "N" OilLabTest : memiliki riwayat

OilProduct "1" --o{ "N" OilOrder : dipesan dalam
OilProduct "1" --o{ "N" OilLabTest : dipakai pada

OilOrder "1" --o{ "N" OilComplaint : terkait dengan

OilProfile "1" --o{ "N" OilLabRequest : mengajukan (requested_by)
OilProfile "1" --o{ "N" OilLabRequest : ditugaskan (assigned_to)
@enduml
"""

# ─── 15. ERD ───────────────────────────────────────────────────────────────
DIAGRAMS["15_erd"] = """
@startuml
skinparam backgroundColor #FAFAFA
!define Table(name,desc) class name as "desc" << (T,#2980B9) >>
!define PK(x) <u><b>x</b></u>
!define FK(x) <i>x</i>

skinparam class {
  BackgroundColor #EBF5FB
  BorderColor #2980B9
  HeaderBackgroundColor #2C3E50
  HeaderFontColor #FFFFFF
  FontSize 11
}

title Entity Relationship Diagram (ERD)\\nOil Condition Monitoring System

Table(customers, "oil_customers") {
  PK(id): UUID
  company_name: VARCHAR(50)
  status: TEXT
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}

Table(profiles, "oil_profiles") {
  PK(id): UUID
  FK(customer_id): UUID
  role: TEXT
  full_name: VARCHAR(50)
  email: VARCHAR(50)
  phone_number: VARCHAR(20)
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}

Table(products, "oil_products") {
  PK(id): UUID
  product_name: VARCHAR(50)
  product_type: VARCHAR(50)
  viscosity_grade: VARCHAR(20)
  baseline_viscosity_40c: NUMERIC
  baseline_viscosity_100c: NUMERIC
  baseline_tan: NUMERIC
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}

Table(machines, "oil_machines") {
  PK(id): UUID
  FK(customer_id): UUID
  machine_name: VARCHAR(50)
  location: VARCHAR(100)
  status: TEXT
  model: VARCHAR(50)
  serial_number: VARCHAR(50)
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}

Table(orders, "oil_orders") {
  PK(id): UUID
  FK(customer_id): UUID
  FK(product_id): UUID
  quantity: INTEGER
  status: TEXT
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  FK(updated_by): UUID
}

Table(complaints, "oil_complaints") {
  PK(id): UUID
  FK(order_id): UUID
  FK(customer_id): UUID
  description: VARCHAR(2000)
  status: TEXT
  resolution_notes: VARCHAR(2000)
  resolved_at: TIMESTAMPTZ
  FK(resolved_by): UUID
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}

Table(lab_requests, "oil_lab_requests") {
  PK(id): UUID
  FK(customer_id): UUID
  FK(machine_id): UUID
  FK(requested_by_profile_id): UUID
  FK(assigned_to_profile_id): UUID
  title: VARCHAR(100)
  priority: TEXT
  status: TEXT
  request_date: DATE
  is_new_machine: BOOLEAN
  new_machine_data: JSONB
  sample_photo_path: VARCHAR(255)
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}

Table(lab_tests, "oil_lab_tests") {
  PK(id): UUID
  FK(machine_id): UUID
  FK(product_id): UUID
  test_date: DATE
  viscosity_40c: NUMERIC
  viscosity_100c: NUMERIC
  water_content: NUMERIC
  tan_value: NUMERIC
  pdf_path: VARCHAR(1000)
  notes: VARCHAR(2000)
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  FK(updated_by): UUID
}

customers "1" --o{ "N" profiles : "customer_id"
customers "1" --o{ "N" machines : "customer_id"
customers "1" --o{ "N" orders : "customer_id"
customers "1" --o{ "N" lab_requests : "customer_id"
customers "1" --o{ "N" complaints : "customer_id"

machines "1" --o{ "N" lab_requests : "machine_id"
machines "1" --o{ "N" lab_tests : "machine_id"

products "1" --o{ "N" orders : "product_id"
products "1" --o{ "N" lab_tests : "product_id"

orders "1" --o{ "N" complaints : "order_id"

profiles "1" --o{ "N" lab_requests : "requested_by"
profiles "1" --o{ "N" lab_requests : "assigned_to"
@enduml
"""

# ─── 16. LRS (Logical Record Structure) ────────────────────────────────────
DIAGRAMS["16_lrs"] = """
@startuml
skinparam backgroundColor #FAFAFA
skinparam class {
  BackgroundColor #FDFEFE
  BorderColor #566573
  HeaderBackgroundColor #2C3E50
  HeaderFontColor #FFFFFF
  FontSize 10
}
title Logical Record Structure (LRS)\\nOil Condition Monitoring System

class oil_customers {
  *id (PK)
  company_name
  status
  created_at
  updated_at
}

class oil_profiles {
  *id (PK)
  #customer_id (FK)
  role
  full_name
  email
  phone_number
  created_at
}

class oil_products {
  *id (PK)
  product_name
  product_type
  viscosity_grade
  baseline_viscosity_40c
  baseline_viscosity_100c
  baseline_tan
  created_at
}

class oil_machines {
  *id (PK)
  #customer_id (FK)
  machine_name
  location
  status
  model
  serial_number
  created_at
}

class oil_orders {
  *id (PK)
  #customer_id (FK)
  #product_id (FK)
  quantity
  status
  created_at
  #updated_by (FK)
}

class oil_complaints {
  *id (PK)
  #order_id (FK)
  #customer_id (FK)
  description
  status
  resolution_notes
  resolved_at
  created_at
}

class oil_lab_requests {
  *id (PK)
  #customer_id (FK)
  #machine_id (FK)
  #requested_by_profile_id (FK)
  #assigned_to_profile_id (FK)
  title
  priority
  status
  is_new_machine
  sample_photo_path
  request_date
}

class oil_lab_tests {
  *id (PK)
  #machine_id (FK)
  #product_id (FK)
  test_date
  viscosity_40c
  viscosity_100c
  water_content
  tan_value
  pdf_path
  notes
  created_at
}

oil_customers "1" --> "N" oil_profiles
oil_customers "1" --> "N" oil_machines
oil_customers "1" --> "N" oil_orders
oil_customers "1" --> "N" oil_lab_requests
oil_customers "1" --> "N" oil_complaints

oil_machines "1" --> "N" oil_lab_requests
oil_machines "1" --> "N" oil_lab_tests

oil_products "1" --> "N" oil_orders
oil_products "1" --> "N" oil_lab_tests

oil_orders "1" --> "N" oil_complaints

oil_profiles "1" --> "N" oil_lab_requests
@enduml
"""

# ═══════════════════════════════════════════════════════════════════════════
# MAIN – GENERATE ALL DIAGRAMS
# ═══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("  Generator Diagram Skripsi - Oil Condition Monitoring")
    print(f"  Output: {OUTPUT_DIR}")
    print("=" * 60)

    success_count = 0
    fail_count = 0

    for name, uml_code in DIAGRAMS.items():
        ok = download_diagram(name, uml_code.strip())
        if ok:
            success_count += 1
        else:
            fail_count += 1

    print()
    print("=" * 60)
    print(f"  Selesai! ✓ Berhasil: {success_count}  ✗ Gagal: {fail_count}")
    print(f"  Lokasi file: {OUTPUT_DIR}")
    print("=" * 60)
