import pdfplumber
import os

src_dir = r"C:\Users\Acuel\Downloads\Compressed\Compressed"
out_dir = r"C:\Users\Acuel\Oil-Monitoring\supabase\scripts"

# File paling relevan untuk Sistem Informasi
priority_files = [
    "Pedoman Penyusunan TA Universitas BSI Tahun 2026.pdf",
    "Petunjuk Teknis Penyusunan TA Prodi Sistem Informasi (S1) Tahun 2026.pdf",
    "Petunjuk Teknis Penyusunan TA Prodi Sistem Informasi (D3) Tahun 2026.pdf",
    "Petunjuk Teknis Penyusunan TA Prodi Informatika (S1) Tahun 2026.pdf",
    "Petunjuk Teknis Penyusunan TA Prodi Rekayasa Perangkat Lunak (S1) Tahun 2026.pdf",
]

os.makedirs(out_dir, exist_ok=True)

for fname in priority_files:
    pdf_path = os.path.join(src_dir, fname)
    if not os.path.exists(pdf_path):
        print(f"[!] Not found: {fname}")
        continue

    out_fname = fname.replace(".pdf", ".txt")
    out_path = os.path.join(out_dir, out_fname)

    print(f"Converting: {fname} ...")
    all_text = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    all_text.append(f"--- HALAMAN {i+1} ---\n{text}")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("\n\n".join(all_text))
        print(f"    -> Saved: {out_path} ({len(all_text)} pages)")
    except Exception as e:
        print(f"    -> ERROR: {e}")

print("Done.")
