'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';

// --- BAGIAN RUMUS ---
const hitungDosisYoung = (umur: number, dosisDewasa: number): number => (umur / (umur + 12)) * dosisDewasa;
const hitungDosisBB = (beratBadan: number, dosisPerKg: number): number => beratBadan * dosisPerKg;
const hitungVolumeSirup = (permintaan: number, sediaan: number, volume: number): number => (permintaan / sediaan) * volume;
const hitungTabletPuyer = (dosisBungkus: number, jmlBungkus: number, dosisTablet: number): number => (dosisBungkus * jmlBungkus) / dosisTablet;
const hitungTPM = (volume: number, waktuJam: number, faktorTetes: number): number => (volume * faktorTetes) / (waktuJam * 60);

// Rumus Mosteller untuk Luas Permukaan Tubuh (BSA dalam m2)
const hitungBSA = (tinggiCm: number, beratKg: number): number => {
  return Math.sqrt((tinggiCm * beratKg) / 3600);
};

// --- MASTER DATA OBAT ---
const MASTER_OBAT = [
  { id: '1', kategori: 'Analgesik & Antipiretik', nama: 'Paracetamol', dosisPerKg: 10, maxDosisKg: 20, dosisDewasa: 500, sediaanMg: 120, sediaanMl: 5 },
  { id: '2', kategori: 'Analgesik & Antipiretik', nama: 'Ibuprofen', dosisPerKg: 10, maxDosisKg: 20, dosisDewasa: 400, sediaanMg: 100, sediaanMl: 5 },
  { id: '3', kategori: 'Analgesik & Antipiretik', nama: 'Asam Mefenamat', dosisPerKg: 6.5, maxDosisKg: 10, dosisDewasa: 500, sediaanMg: 50, sediaanMl: 5 },
  { id: '4', kategori: 'Antibiotik', nama: 'Amoxicillin', dosisPerKg: 15, maxDosisKg: 30, dosisDewasa: 500, sediaanMg: 125, sediaanMl: 5 },
  { id: '5', kategori: 'Antibiotik', nama: 'Cefadroxil', dosisPerKg: 15, maxDosisKg: 30, dosisDewasa: 500, sediaanMg: 125, sediaanMl: 5 },
  { id: '6', kategori: 'Antibiotik', nama: 'Cefixime', dosisPerKg: 1.5, maxDosisKg: 3, dosisDewasa: 100, sediaanMg: 100, sediaanMl: 5 },
  { id: '7', kategori: 'Antibiotik', nama: 'Azithromycin', dosisPerKg: 10, maxDosisKg: 15, dosisDewasa: 500, sediaanMg: 200, sediaanMl: 5 },
  { id: '8', kategori: 'Antibiotik', nama: 'Erythromycin', dosisPerKg: 12.5, maxDosisKg: 25, dosisDewasa: 500, sediaanMg: 200, sediaanMl: 5 },
  { id: '9', kategori: 'Antihistamin (Alergi)', nama: 'Cetirizine', dosisPerKg: 0.25, maxDosisKg: 0.5, dosisDewasa: 10, sediaanMg: 5, sediaanMl: 5 },
  { id: '10', kategori: 'Antihistamin (Alergi)', nama: 'Loratadine', dosisPerKg: 0.2, maxDosisKg: 0.4, dosisDewasa: 10, sediaanMg: 5, sediaanMl: 5 },
  { id: '11', kategori: 'Antihistamin (Alergi)', nama: 'Chlorpheniramine (CTM)', dosisPerKg: 0.08, maxDosisKg: 0.15, dosisDewasa: 4, sediaanMg: 2, sediaanMl: 5 },
  { id: '12', kategori: 'Pernapasan (Batuk/Asma)', nama: 'Ambroxol', dosisPerKg: 0.5, maxDosisKg: 1, dosisDewasa: 30, sediaanMg: 15, sediaanMl: 5 },
  { id: '13', kategori: 'Pernapasan (Batuk/Asma)', nama: 'Bromhexine', dosisPerKg: 0.3, maxDosisKg: 0.6, dosisDewasa: 8, sediaanMg: 4, sediaanMl: 5 },
  { id: '14', kategori: 'Pernapasan (Batuk/Asma)', nama: 'Salbutamol', dosisPerKg: 0.1, maxDosisKg: 0.2, dosisDewasa: 4, sediaanMg: 2, sediaanMl: 5 },
  { id: '15', kategori: 'Pencernaan (Lambung/Mual)', nama: 'Domperidone', dosisPerKg: 0.25, maxDosisKg: 0.5, dosisDewasa: 10, sediaanMg: 5, sediaanMl: 5 },
  { id: '16', kategori: 'Pencernaan (Lambung/Mual)', nama: 'Ondansetron', dosisPerKg: 0.15, maxDosisKg: 0.3, dosisDewasa: 8, sediaanMg: 4, sediaanMl: 5 },
  { id: '17', kategori: 'Pencernaan (Lambung/Mual)', nama: 'Ranitidine', dosisPerKg: 2, maxDosisKg: 4, dosisDewasa: 150, sediaanMg: 75, sediaanMl: 5 },
  { id: '18', kategori: 'Kortikosteroid', nama: 'Dexamethasone', dosisPerKg: 0.1, maxDosisKg: 0.3, dosisDewasa: 0.5, sediaanMg: 0.5, sediaanMl: 5 },
  { id: '19', kategori: 'Kortikosteroid', nama: 'Methylprednisolone', dosisPerKg: 0.5, maxDosisKg: 1, dosisDewasa: 4, sediaanMg: 4, sediaanMl: 5 },
];

type TabType = 'bb' | 'umur' | 'sirup' | 'puyer' | 'tpm' | 'bsa' | 'quiz';
type SoalQuiz = { beratBadan: number; dosisPerKg: number; jawabanBenar: number };

type RiwayatItem = {
  id: number;
  tipeTab: TabType;
  labelTipe: string;
  detail: string;
  hasil: string;
  satuan: string;
  waktu: string;
  payload: Record<string, string>;
};

const TAB_LIST: { id: TabType; label: string }[] = [
  { id: 'bb', label: 'Berat Badan' },
  { id: 'umur', label: 'Umur' },
  { id: 'sirup', label: 'Sirup' },
  { id: 'puyer', label: 'Puyer' },
  { id: 'tpm', label: 'Infus' },
  { id: 'bsa', label: 'BSA (Luas Tubuh)' },
  { id: 'quiz', label: 'Kuis' },
];

const buatSoalQuizBaru = (): SoalQuiz => {
  const acakBB = Math.floor(Math.random() * 15) + 5;
  const acakDosis = Math.floor(Math.random() * 10) + 10;
  return {
    beratBadan: acakBB,
    dosisPerKg: acakDosis,
    jawabanBenar: acakBB * acakDosis,
  };
};

export default function KalkulatorFarmasi() {
  const [activeTab, setActiveTab] = useState<TabType>('bb');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const [pilihanObat, setPilihanObat] = useState<string>('');
  const [pencarianObat, setPencarianObat] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const [umur, setUmur] = useState<string>('');
  const [dosisDewasa, setDosisDewasa] = useState<string>('');
  const [beratBadan, setBeratBadan] = useState<string>('');
  const [dosisPerKg, setDosisPerKg] = useState<string>('');

  const [dosisPermintaan, setDosisPermintaan] = useState<string>('');
  const [dosisSediaan, setDosisSediaan] = useState<string>('');
  const [volumeSediaan, setVolumeSediaan] = useState<string>('');

  const [dosisPerBungkus, setDosisPerBungkus] = useState<string>('');
  const [jumlahBungkus, setJumlahBungkus] = useState<string>('');
  const [dosisTablet, setDosisTablet] = useState<string>('');

  const [volumeInfus, setVolumeInfus] = useState<string>('');
  const [waktuInfus, setWaktuInfus] = useState<string>('');
  const [faktorTetes, setFaktorTetes] = useState<string>('20');

  // State untuk kalkulator BSA (Luas Permukaan Tubuh)
  const [tinggiBSA, setTinggiBSA] = useState<string>('');
  const [beratBSA, setBeratBSA] = useState<string>('');
  const [dosisPerM2, setDosisPerM2] = useState<string>('');

  // State untuk Generator Etiket Resep
  const [frekuensiEtiket, setFrekuensiEtiket] = useState<string>('3 kali sehari');
  const [aturanMakanEtiket, setAturanMakanEtiket] = useState<string>('Sesudah Makan');
  const [catatanEtiket, setCatatanEtiket] = useState<string>('');
  const [isCopiedEtiket, setIsCopiedEtiket] = useState<boolean>(false);

  const [riwayat, setRiwayat] = useState<RiwayatItem[]>(() => {
    if (typeof window !== 'undefined') {
      const dataTersimpan = localStorage.getItem('riwayatKalkulator');
      if (dataTersimpan) {
        try {
          return JSON.parse(dataTersimpan);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });

  const lastSavedSignature = useRef<string>('');

  const [soalQuiz, setSoalQuiz] = useState<SoalQuiz | null>(null);
  const [jawabanUser, setJawabanUser] = useState<string>('');
  const [statusQuiz, setStatusQuiz] = useState<'idle' | 'benar' | 'salah'>('idle');

  const generateSoalQuiz = () => {
    setSoalQuiz(buatSoalQuizBaru());
    setJawabanUser('');
    setStatusQuiz('idle');
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'quiz' && !soalQuiz) generateSoalQuiz();
  };

  const handlePilihObatObj = (obat: (typeof MASTER_OBAT)[0] | null) => {
    if (!obat) {
      setPilihanObat('');
      setPencarianObat('');
      setDosisPerKg('');
      setDosisDewasa('');
      setDosisSediaan('');
      setVolumeSediaan('');
      setDosisTablet('');
      setIsDropdownOpen(false);
      return;
    }

    setPilihanObat(obat.id);
    setPencarianObat(obat.nama);
    setIsDropdownOpen(false);

    setDosisPerKg(obat.dosisPerKg.toString());
    setDosisDewasa(obat.dosisDewasa.toString());
    setDosisSediaan(obat.sediaanMg.toString());
    setVolumeSediaan(obat.sediaanMl.toString());
    setDosisTablet(obat.dosisDewasa.toString());
  };

  const hapusSatuRiwayat = (id: number) => {
    const riwayatBaru = riwayat.filter((item) => item.id !== id);
    setRiwayat(riwayatBaru);
    localStorage.setItem('riwayatKalkulator', JSON.stringify(riwayatBaru));
  };

  const hapusSemuaRiwayat = () => {
    setRiwayat([]);
    localStorage.removeItem('riwayatKalkulator');
  };

  const editRiwayat = (item: RiwayatItem) => {
    setActiveTab(item.tipeTab);
    const p = item.payload;
    setPilihanObat(p.pilihanObat || '');
    if (p.pilihanObat) {
      const found = MASTER_OBAT.find((o) => o.id === p.pilihanObat);
      if (found) setPencarianObat(found.nama);
    } else {
      setPencarianObat('');
    }

    if (item.tipeTab === 'bb') {
      setBeratBadan(p.beratBadan);
      setDosisPerKg(p.dosisPerKg);
    } else if (item.tipeTab === 'umur') {
      setUmur(p.umur);
      setDosisDewasa(p.dosisDewasa);
    } else if (item.tipeTab === 'sirup') {
      setDosisPermintaan(p.dosisPermintaan);
      setDosisSediaan(p.dosisSediaan);
      setVolumeSediaan(p.volumeSediaan);
    } else if (item.tipeTab === 'puyer') {
      setDosisPerBungkus(p.dosisPerBungkus);
      setJumlahBungkus(p.jumlahBungkus);
      setDosisTablet(p.dosisTablet);
    } else if (item.tipeTab === 'tpm') {
      setVolumeInfus(p.volumeInfus);
      setWaktuInfus(p.waktuInfus);
      setFaktorTetes(p.faktorTetes);
    } else if (item.tipeTab === 'bsa') {
      setTinggiBSA(p.tinggiBSA);
      setBeratBSA(p.beratBSA);
      setDosisPerM2(p.dosisPerM2);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  let hasil: number | null = null;
  let satuanHasil = 'mg';
  let warningDosis: string | null = null;
  let errorMsg = '';
  let subInfoText = '';

  if (activeTab === 'bb') {
    satuanHasil = 'mg';
    const nBB = parseFloat(beratBadan);
    const nDosisKg = parseFloat(dosisPerKg);
    if (!isNaN(nBB) && !isNaN(nDosisKg) && nBB > 0 && nDosisKg > 0) {
      hasil = hitungDosisBB(nBB, nDosisKg);
      if (pilihanObat) {
        const obatDipilih = MASTER_OBAT.find((o) => o.id === pilihanObat);
        if (obatDipilih && nDosisKg > obatDipilih.maxDosisKg) {
          warningDosis = `⚠️ PERINGATAN OVERDOSE: Dosis ${nDosisKg} mg/kg melebihi batas aman referensi standar untuk ${obatDipilih.nama} (> ${obatDipilih.maxDosisKg} mg/kg).`;
        }
      }
    } else if (beratBadan !== '' || dosisPerKg !== '') {
      errorMsg = 'Mohon isi angka berat badan dan dosis dengan benar (> 0).';
    }
  } else if (activeTab === 'umur') {
    satuanHasil = 'mg';
    const nUmur = parseFloat(umur);
    const nDosis = parseFloat(dosisDewasa);
    if (!isNaN(nUmur) && !isNaN(nDosis)) {
      if (nUmur >= 1 && nUmur < 12) {
        hasil = hitungDosisYoung(nUmur, nDosis);
      } else if (umur !== '') {
        errorMsg = 'Rumus Young hanya berlaku untuk umur 1 - 11 tahun.';
      }
    } else if (umur !== '' || dosisDewasa !== '') {
      errorMsg = 'Mohon isi umur dan dosis dewasa dengan angka yang valid.';
    }
  } else if (activeTab === 'sirup') {
    satuanHasil = 'ml';
    const nMinta = parseFloat(dosisPermintaan);
    const nSedia = parseFloat(dosisSediaan);
    const nVol = parseFloat(volumeSediaan);
    if (!isNaN(nMinta) && !isNaN(nSedia) && !isNaN(nVol) && nSedia > 0 && nVol > 0) {
      hasil = hitungVolumeSirup(nMinta, nSedia, nVol);
    } else if (dosisPermintaan !== '' || dosisSediaan !== '' || volumeSediaan !== '') {
      errorMsg = 'Mohon lengkapi data sirup dengan angka yang valid (> 0).';
    }
  } else if (activeTab === 'puyer') {
    satuanHasil = 'mg';
    const nDosisBungkus = parseFloat(dosisPerBungkus);
    const nJmlBungkus = parseFloat(jumlahBungkus);
    const nDosisTab = parseFloat(dosisTablet);
    if (!isNaN(nDosisBungkus) && !isNaN(nJmlBungkus) && !isNaN(nDosisTab) && nDosisTab > 0) {
      hasil = hitungTabletPuyer(nDosisBungkus, nJmlBungkus, nDosisTab);
      satuanHasil = 'tablet';
    } else if (dosisPerBungkus !== '' || jumlahBungkus !== '' || dosisTablet !== '') {
      errorMsg = 'Mohon lengkapi data puyer dengan angka yang valid (> 0).';
    }
  } else if (activeTab === 'tpm') {
    satuanHasil = 'tetes/mnt';
    const nVol = parseFloat(volumeInfus);
    const nWaktu = parseFloat(waktuInfus);
    const nFaktor = parseFloat(faktorTetes);
    if (!isNaN(nVol) && !isNaN(nWaktu) && !isNaN(nFaktor) && nWaktu > 0) {
      hasil = Math.round(hitungTPM(nVol, nWaktu, nFaktor));
    } else if (volumeInfus !== '' || waktuInfus !== '') {
      errorMsg = 'Mohon lengkapi data infus dengan angka yang valid (> 0).';
    }
  } else if (activeTab === 'bsa') {
    satuanHasil = 'mg';
    const nTinggi = parseFloat(tinggiBSA);
    const nBerat = parseFloat(beratBSA);
    const nDosisM2 = parseFloat(dosisPerM2);
    if (!isNaN(nTinggi) && !isNaN(nBerat) && nTinggi > 0 && nBerat > 0) {
      const bsaVal = hitungBSA(nTinggi, nBerat);
      subInfoText = `Luas Permukaan (BSA): ${bsaVal.toFixed(3)} m²`;
      if (!isNaN(nDosisM2) && nDosisM2 > 0) {
        hasil = bsaVal * nDosisM2;
      }
    } else if (tinggiBSA !== '' || beratBSA !== '') {
      errorMsg = 'Mohon isi tinggi dan berat badan dengan benar (> 0).';
    }
  }

  useEffect(() => {
    if (hasil !== null && activeTab !== 'quiz') {
      const formattedHasil = Number.isInteger(hasil) ? hasil.toString() : hasil.toFixed(2).replace(/\.00$/, '');
      let labelTipe = '';
      let detail = '';
      let payload: Record<string, string> = {};

      if (activeTab === 'bb') {
        labelTipe = 'Berat Badan';
        detail = `BB: ${beratBadan}kg | Dosis: ${dosisPerKg}mg/kg`;
        payload = { beratBadan, dosisPerKg, pilihanObat };
      } else if (activeTab === 'umur') {
        labelTipe = 'Umur (Young)';
        detail = `U: ${umur}thn | Maks: ${dosisDewasa}mg`;
        payload = { umur, dosisDewasa, pilihanObat };
      } else if (activeTab === 'sirup') {
        labelTipe = 'Sirup Cair';
        detail = `Minta: ${dosisPermintaan}mg | Sedia: ${dosisSediaan}mg/${volumeSediaan}ml`;
        payload = { dosisPermintaan, dosisSediaan, volumeSediaan, pilihanObat };
      } else if (activeTab === 'puyer') {
        labelTipe = 'Racik Puyer';
        detail = `${jumlahBungkus}bks @${dosisPerBungkus}mg | Tab: ${dosisTablet}mg`;
        payload = { dosisPerBungkus, jumlahBungkus, dosisTablet, pilihanObat };
      } else if (activeTab === 'tpm') {
        labelTipe = 'Infus (TPM)';
        detail = `Vol: ${volumeInfus}ml | Waktu: ${waktuInfus}jam | FT: ${faktorTetes}`;
        payload = { volumeInfus, waktuInfus, faktorTetes };
      } else if (activeTab === 'bsa') {
        labelTipe = 'BSA (Luas Tubuh)';
        detail = `Tinggi: ${tinggiBSA}cm | BB: ${beratBSA}kg | Dosis: ${dosisPerM2}mg/m²`;
        payload = { tinggiBSA, beratBSA, dosisPerM2 };
      }

      const namaObat = pilihanObat && activeTab !== 'bsa' ? MASTER_OBAT.find((o) => o.id === pilihanObat)?.nama : '';
      const fullDetail = namaObat ? `[${namaObat}] ${detail}` : detail;
      const signature = `${activeTab}-${fullDetail}-${formattedHasil}`;

      if (signature !== lastSavedSignature.current) {
        lastSavedSignature.current = signature;
        const itemBaru: RiwayatItem = {
          id: Date.now(),
          tipeTab: activeTab,
          labelTipe,
          detail: fullDetail,
          hasil: formattedHasil,
          satuan: satuanHasil,
          waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          payload,
        };
        setRiwayat((prev) => {
          const updated = [itemBaru, ...prev].slice(0, 10);
          localStorage.setItem('riwayatKalkulator', JSON.stringify(updated));
          return updated;
        });
      }
    }
  }, [
    hasil,
    activeTab,
    beratBadan,
    dosisPerKg,
    umur,
    dosisDewasa,
    dosisPermintaan,
    dosisSediaan,
    volumeSediaan,
    dosisPerBungkus,
    jumlahBungkus,
    dosisTablet,
    volumeInfus,
    waktuInfus,
    faktorTetes,
    tinggiBSA,
    beratBSA,
    dosisPerM2,
    pilihanObat,
    satuanHasil,
  ]);

  const handleSubmitQuiz = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!soalQuiz) return;
    const jawabanAngka = parseFloat(jawabanUser);
    if (isNaN(jawabanAngka)) return;
    setStatusQuiz(jawabanAngka === soalQuiz.jawabanBenar ? 'benar' : 'salah');
  };

  const butuhPilihanObat = activeTab === 'bb' || activeTab === 'umur' || activeTab === 'sirup' || activeTab === 'puyer';

  const filteredMasterObat = MASTER_OBAT.filter((obat) => obat.nama.toLowerCase().includes(pencarianObat.toLowerCase()) || obat.kategori.toLowerCase().includes(pencarianObat.toLowerCase()));

  const namaObatLabel = pilihanObat ? MASTER_OBAT.find((o) => o.id === pilihanObat)?.nama || 'Obat Resep' : pencarianObat || 'Obat Klinis';
  const formattedHasilStr = hasil !== null ? (Number.isInteger(hasil) ? hasil.toString() : hasil.toFixed(2)) : '';
  const etiketFormattedText = `--- ETIKET RESEP FARMASI ---
Nama Obat: ${namaObatLabel}
Dosis/Takaran: ${formattedHasilStr} ${satuanHasil}
Aturan Pakai: ${frekuensiEtiket}, ${aturanMakanEtiket}
${catatanEtiket ? `Catatan: ${catatanEtiket}` : ''}
Tanggal: ${new Date().toLocaleDateString('id-ID')}`;

  const handleCopyEtiket = () => {
    navigator.clipboard.writeText(etiketFormattedText);
    setIsCopiedEtiket(true);
    setTimeout(() => setIsCopiedEtiket(false), 2000);
  };

  return (
    <main
      className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100' : 'bg-gradient-to-br from-indigo-50 to-slate-100 text-slate-800'} flex items-center justify-center p-4 sm:p-6 font-sans transition-colors duration-300`}
    >
      <div className={`w-full max-w-xl ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-indigo-950/50' : 'bg-white border-white shadow-xl shadow-indigo-100/50'} p-6 sm:p-8 rounded-[2rem] border transition-colors duration-300 relative`}>
        {/* --- TOMBOL TOGGLE DARK MODE --- */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`absolute top-6 right-6 p-2.5 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
          title="Ganti Tema Terang/Gelap"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>

        {/* --- HEADER --- */}
        <header className="text-center mb-8 pr-10 sm:pr-0">
          <div className={`inline-block p-3 ${isDarkMode ? 'bg-slate-800' : 'bg-indigo-50'} rounded-2xl mb-3`}>
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-800'} tracking-tight`}>DosiCare Pro</h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1 font-medium`}>Asisten Perhitungan Farmasi & Klinis</p>
        </header>

        {/* --- TAB NAVIGASI --- */}
        <div className={`grid grid-cols-4 sm:grid-cols-7 gap-1 p-1 ${isDarkMode ? 'bg-slate-800/80' : 'bg-slate-100'} rounded-xl mb-6`}>
          {TAB_LIST.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-2 px-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-200 ${activeTab === tab.id ? (isDarkMode ? 'bg-slate-700 text-indigo-300 shadow-sm ring-1 ring-slate-600' : 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/50') : isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* --- FORM KONTAINER (DINAMIS) --- */}
        {activeTab !== 'quiz' && (
          <div className="space-y-4">
            {butuhPilihanObat && (
              <div className={`p-4 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-indigo-50/50 border-indigo-100'} border rounded-xl mb-2 relative`}>
                <label className={`block text-sm font-bold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-900'} mb-2`}>🔍 Cari Master Obat (Ketik untuk Filter)</label>

                <div className="relative">
                  <input
                    type="text"
                    value={pencarianObat}
                    onChange={(e) => {
                      setPencarianObat(e.target.value);
                      setIsDropdownOpen(true);
                      if (e.target.value === '') handlePilihObatObj(null);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Ketik nama obat (contoh: Paracetamol)..."
                    className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-indigo-200 text-slate-900 placeholder-slate-400'} border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold shadow-sm`}
                  />
                  {pencarianObat && (
                    <button
                      type="button"
                      onClick={() => handlePilihObatObj(null)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-400'} text-sm font-bold px-1.5 py-0.5 rounded-md`}
                      title="Reset Pilihan"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {isDropdownOpen && (
                  <div
                    className={`absolute left-4 right-4 z-20 mt-1 max-h-56 overflow-y-auto ${isDarkMode ? 'bg-slate-800 border-slate-700 divide-slate-700' : 'bg-white border-indigo-200 divide-slate-100'} border rounded-xl shadow-lg divide-y`}
                  >
                    {filteredMasterObat.length > 0 ? (
                      filteredMasterObat.map((obat) => (
                        <div key={obat.id} onClick={() => handlePilihObatObj(obat)} className={`p-3 ${isDarkMode ? 'hover:bg-slate-700/80' : 'hover:bg-indigo-50'} cursor-pointer flex justify-between items-center transition-colors`}>
                          <div>
                            <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{obat.nama}</p>
                            <p className="text-[11px] text-slate-400 font-medium">{obat.kategori}</p>
                          </div>
                          <span className={`text-xs font-semibold ${isDarkMode ? 'text-indigo-300 bg-indigo-950/80' : 'text-indigo-600 bg-indigo-50'} px-2 py-1 rounded-md`}>
                            {obat.dosisPerKg ? `${obat.dosisPerKg} mg/kg` : `${obat.dosisDewasa} mg`}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-slate-500 text-center">Obat tidak ditemukan</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'bb' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Berat Anak (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={beratBadan}
                    onChange={(e) => setBeratBadan(e.target.value)}
                    className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                    placeholder="Contoh: 15"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Dosis Obat (mg/kgBB)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={dosisPerKg}
                    onChange={(e) => setDosisPerKg(e.target.value)}
                    className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                    placeholder="Contoh: 10"
                  />
                </div>
              </div>
            )}

            {activeTab === 'umur' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Umur Anak (Tahun)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={umur}
                    onChange={(e) => setUmur(e.target.value)}
                    className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                    placeholder="Contoh: 6"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Dosis Maks Dewasa</label>
                  <input
                    type="number"
                    step="0.1"
                    value={dosisDewasa}
                    onChange={(e) => setDosisDewasa(e.target.value)}
                    className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                    placeholder="Contoh: 500"
                  />
                </div>
              </div>
            )}

            {activeTab === 'sirup' && (
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Dosis yang Diminta Dokter (mg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={dosisPermintaan}
                    onChange={(e) => setDosisPermintaan(e.target.value)}
                    className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                    placeholder="Ketik total mg yang diresepkan..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Sediaan Botol (mg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={dosisSediaan}
                      onChange={(e) => setDosisSediaan(e.target.value)}
                      className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                      placeholder="Contoh: 250"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Dlm Volume (ml)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={volumeSediaan}
                      onChange={(e) => setVolumeSediaan(e.target.value)}
                      className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                      placeholder="Contoh: 5"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'puyer' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Dosis /Bungkus (mg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={dosisPerBungkus}
                      onChange={(e) => setDosisPerBungkus(e.target.value)}
                      className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                      placeholder="Contoh: 30"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Jumlah Bungkus</label>
                    <input
                      type="number"
                      step="1"
                      value={jumlahBungkus}
                      onChange={(e) => setJumlahBungkus(e.target.value)}
                      className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                      placeholder="Contoh: 15"
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Kandungan 1 Tablet Obat (mg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={dosisTablet}
                    onChange={(e) => setDosisTablet(e.target.value)}
                    className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                    placeholder="Contoh: 100"
                  />
                </div>
              </div>
            )}

            {activeTab === 'tpm' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Volume Infus (ml)</label>
                    <input
                      type="number"
                      step="1"
                      value={volumeInfus}
                      onChange={(e) => setVolumeInfus(e.target.value)}
                      className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                      placeholder="Contoh: 500"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Lama Waktu (Jam)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={waktuInfus}
                      onChange={(e) => setWaktuInfus(e.target.value)}
                      className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                      placeholder="Contoh: 8"
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Faktor Tetes (tts/ml)</label>
                  <select
                    value={faktorTetes}
                    onChange={(e) => setFaktorTetes(e.target.value)}
                    className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium cursor-pointer`}
                  >
                    <option value="20">Makro - 20 tts/ml (Dewasa Umum)</option>
                    <option value="15">Makro - 15 tts/ml (Dewasa)</option>
                    <option value="60">Mikro - 60 tts/ml (Anak/Bayi)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'bsa' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Tinggi Badan (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tinggiBSA}
                      onChange={(e) => setTinggiBSA(e.target.value)}
                      className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                      placeholder="Contoh: 120"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Berat Badan (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={beratBSA}
                      onChange={(e) => setBeratBSA(e.target.value)}
                      className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                      placeholder="Contoh: 25"
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Dosis Standar (mg / m²)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={dosisPerM2}
                    onChange={(e) => setDosisPerM2(e.target.value)}
                    className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                    placeholder="Contoh: 50"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- FORM QUIZ --- */}
        {activeTab === 'quiz' && soalQuiz && (
          <form onSubmit={handleSubmitQuiz} className="space-y-5">
            <div className={`p-6 ${isDarkMode ? 'bg-amber-950/40 border-amber-900/50 text-amber-200' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 text-amber-900'} border rounded-2xl text-center`}>
              <p className="text-sm font-bold mb-3 uppercase tracking-wider">Latihan Dosis Pasien</p>
              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-black">
                    {soalQuiz.beratBadan}
                    <span className="text-base font-medium">kg</span>
                  </p>
                  <p className="text-xs mt-1 opacity-70">Berat Badan</p>
                </div>
                <div className={`w-px ${isDarkMode ? 'bg-amber-800' : 'bg-amber-200'}`}></div>
                <div className="text-center">
                  <p className="text-3xl font-black">
                    {soalQuiz.dosisPerKg}
                    <span className="text-base font-medium">mg</span>
                  </p>
                  <p className="text-xs mt-1 opacity-70">Dosis per kgBB</p>
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Berapa Total Dosisnya? (mg)</label>
              <input
                type="number"
                step="0.1"
                value={jawabanUser}
                onChange={(e) => setJawabanUser(e.target.value)}
                className={`w-full p-3.5 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium`}
                placeholder="Ketik jawabanmu..."
                required
              />
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3.5 rounded-xl hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-200/20 transform active:scale-[0.98]">
              Cek Jawaban
            </button>

            {statusQuiz === 'benar' && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-center flex flex-col items-center">
                <span className="text-2xl mb-1">🎉</span>
                <p className="font-bold">Jawaban Tepat!</p>
                <button type="button" onClick={generateSoalQuiz} className="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-emerald-700 transition-colors">
                  Lanjut Soal Berikutnya
                </button>
              </div>
            )}

            {statusQuiz === 'salah' && <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-center font-bold">❌ Oops, masih kurang tepat. Hitung lagi ya!</div>}
          </form>
        )}

        {/* --- ERROR & SAFETY WARNING --- */}
        {errorMsg !== '' && activeTab !== 'quiz' && <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm text-center border border-red-100 font-medium">{errorMsg}</div>}

        {warningDosis && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-sm font-bold flex items-start gap-3 shadow-sm animate-pulse">
            <span className="text-xl">🚨</span>
            <div>{warningDosis}</div>
          </div>
        )}

        {/* --- HASIL KALKULASI DINAMIS --- */}
        {hasil !== null && errorMsg === '' && activeTab !== 'quiz' && (
          <div className="mt-8 space-y-4">
            <div className="p-6 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl text-center shadow-lg shadow-indigo-200/20 text-white transform transition-all">
              {subInfoText && <p className="text-indigo-200 font-medium mb-1 text-xs tracking-wide">{subInfoText}</p>}
              <p className="text-indigo-100 font-semibold mb-1 text-sm uppercase tracking-wider">
                {activeTab === 'puyer' ? 'Ambil & Gerus' : activeTab === 'sirup' ? 'Berikan Sebanyak' : activeTab === 'tpm' ? 'Kecepatan Tetesan' : activeTab === 'bsa' ? 'Dosis Total Berdasarkan BSA' : 'Dosis Sekali Minum'}
              </p>
              <p className="text-5xl font-black tracking-tight">
                {Number.isInteger(hasil) ? hasil : hasil.toFixed(2)} <span className="text-xl font-medium opacity-80">{satuanHasil}</span>
              </p>
            </div>

            {/* --- GENERATOR TEKS ETIKET RESEP --- */}
            <div className={`p-5 ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'} border rounded-2xl shadow-sm space-y-3`}>
              <div className="flex justify-between items-center">
                <h4 className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'} uppercase tracking-wider flex items-center gap-1.5`}>🏷️ Generator Etiket Resep Obat</h4>
                <button type="button" onClick={handleCopyEtiket} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1">
                  {isCopiedEtiket ? '✅ Berhasil Disalin!' : '📋 Salin Teks Etiket'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-1`}>Frekuensi / Waktu</label>
                  <select
                    value={frekuensiEtiket}
                    onChange={(e) => setFrekuensiEtiket(e.target.value)}
                    className={`w-full p-2 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg text-xs font-semibold outline-none`}
                  >
                    <option value="1 kali sehari">1 kali sehari</option>
                    <option value="2 kali sehari">2 kali sehari</option>
                    <option value="3 kali sehari">3 kali sehari</option>
                    <option value="4 kali sehari">4 kali sehari</option>
                    <option value="bila perlu (PRN)">Bila Perlu (PRN)</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-1`}>Aturan Makan</label>
                  <select
                    value={aturanMakanEtiket}
                    onChange={(e) => setAturanMakanEtiket(e.target.value)}
                    className={`w-full p-2 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg text-xs font-semibold outline-none`}
                  >
                    <option value="Sesudah Makan">Sesudah Makan</option>
                    <option value="Sebelum Makan">Sebelum Makan</option>
                    <option value="Bersama Makan">Bersama Makan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-1`}>Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={catatanEtiket}
                  onChange={(e) => setCatatanEtiket(e.target.value)}
                  placeholder="Contoh: Habiskan antibiotik / Kocok dahulu..."
                  className={`w-full p-2 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg text-xs outline-none font-medium`}
                />
              </div>

              {/* Preview Box Etiket */}
              <div className={`p-3 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'} border border-dashed rounded-xl font-mono text-[11px] whitespace-pre-line leading-relaxed`}>
                {etiketFormattedText}
              </div>
            </div>
          </div>
        )}

        {/* --- RIWAYAT PERHITUNGAN --- */}
        {riwayat.length > 0 && activeTab !== 'quiz' && (
          <div className={`mt-10 pt-8 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'} uppercase tracking-wider`}>Riwayat Terakhir</h3>
              <button onClick={hapusSemuaRiwayat} className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors bg-red-50 dark:bg-red-950/50 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-900/50">
                Hapus Semua
              </button>
            </div>

            <div className="space-y-3">
              {riwayat.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row justify-between sm:items-center p-4 ${isDarkMode ? 'bg-slate-800/50 border-slate-800 hover:bg-slate-800' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/80'} border rounded-xl transition-colors gap-3 group`}
                >
                  <div className="flex-1">
                    <p className="text-xs font-bold text-indigo-500 mb-1">
                      {item.labelTipe} <span className="text-slate-400 font-normal ml-1">• {item.waktu}</span>
                    </p>
                    <p className={`text-[11px] sm:text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} font-medium leading-relaxed`}>{item.detail}</p>
                  </div>

                  <div className={`flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 sm:border-l ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} pt-3 sm:pt-0 sm:pl-4`}>
                    <div className="text-left sm:text-right w-20">
                      <p className={`text-base sm:text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{item.hasil}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{item.satuan}</p>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => editRiwayat(item)}
                        className={`p-2 ${isDarkMode ? 'bg-slate-700 text-indigo-300 hover:bg-slate-600' : 'bg-indigo-100/50 text-indigo-600 hover:bg-indigo-200'} rounded-lg transition-colors`}
                        title="Edit Angka"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => hapusSatuRiwayat(item.id)}
                        className={`p-2 ${isDarkMode ? 'bg-slate-700 text-red-400 hover:bg-slate-600' : 'bg-red-100/50 text-red-500 hover:bg-red-200'} rounded-lg transition-colors`}
                        title="Hapus Baris Ini"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
