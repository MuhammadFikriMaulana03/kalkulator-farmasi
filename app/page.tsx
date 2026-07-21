'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';

// --- BAGIAN RUMUS ---
const hitungDosisYoung = (umur: number, dosisDewasa: number): number => (umur / (umur + 12)) * dosisDewasa;
const hitungDosisBB = (beratBadan: number, dosisPerKg: number): number => beratBadan * dosisPerKg;
const hitungVolumeSirup = (permintaan: number, sediaan: number, volume: number): number => (permintaan / sediaan) * volume;
const hitungVolumeInjeksi = (permintaan: number, sediaan: number, volume: number): number => (permintaan / sediaan) * volume;
const hitungTabletPuyer = (dosisBungkus: number, jmlBungkus: number, dosisTablet: number): number => (dosisBungkus * jmlBungkus) / dosisTablet;
const hitungTPM = (volume: number, waktuJam: number, faktorTetes: number): number => (volume * faktorTetes) / (waktuJam * 60);

// Rumus Mosteller untuk Luas Permukaan Tubuh (BSA dalam m2)
const hitungBSA = (tinggiCm: number, beratKg: number): number => {
  return Math.sqrt((tinggiCm * beratKg) / 3600);
};

// Rumus Cockcroft-Gault untuk Klirens Kreatinin (CrCl ml/min)
const hitungCrCl = (umur: number, beratKg: number, serumKreatinin: number, jenisKelamin: 'laki' | 'perempuan'): number => {
  if (serumKreatinin <= 0) return 0;
  let crcl = ((140 - umur) * beratKg) / (72 * serumKreatinin);
  if (jenisKelamin === 'perempuan') {
    crcl *= 0.85;
  }
  return crcl;
};

// Rumus Syringe Pump Vasoaktif (ml/jam)
const hitungSyringePump = (berat: number, dosisMcgKgMin: number, massaMg: number, volMl: number): number => {
  if (massaMg <= 0 || volMl <= 0) return 0;
  const mcgPerJam = dosisMcgKgMin * berat * 60;
  const mcgPerMl = (massaMg * 1000) / volMl;
  return mcgPerJam / mcgPerMl;
};

// --- MASTER DATA OBAT (SUPER LENGKAP 90+ OBAT) ---
const MASTER_OBAT = [
  // Oral - Analgesik, Antipiretik & NSAID
  { id: '1', kategori: 'Analgesik & Antipiretik', nama: 'Paracetamol', dosisPerKg: 10, maxDosisKg: 15, dosisDewasa: 500, sediaanMg: 120, sediaanMl: 5 },
  { id: '2', kategori: 'Analgesik & NSAID', nama: 'Ibuprofen', dosisPerKg: 10, maxDosisKg: 10, dosisDewasa: 400, sediaanMg: 100, sediaanMl: 5 },
  { id: '3', kategori: 'Analgesik & NSAID', nama: 'Asam Mefenamat', dosisPerKg: 6.5, maxDosisKg: 6.5, dosisDewasa: 500, sediaanMg: 50, sediaanMl: 5 },
  { id: '41', kategori: 'Analgesik & NSAID', nama: 'Diclofenac Sodium', dosisPerKg: 1, maxDosisKg: 3, dosisDewasa: 50, sediaanMg: 50, sediaanMl: 1 },
  { id: '42', kategori: 'Analgesik Opioid', nama: 'Tramadol (Oral)', dosisPerKg: 1, maxDosisKg: 2, dosisDewasa: 50, sediaanMg: 50, sediaanMl: 1 },
  { id: '36', kategori: 'Analgesik & NSAID', nama: 'Meloxicam', dosisPerKg: 0.125, maxDosisKg: 0.25, dosisDewasa: 15, sediaanMg: 15, sediaanMl: 1 },
  { id: '35', kategori: 'Sendi & Otot (Asam Urat)', nama: 'Allopurinol', dosisPerKg: 3, maxDosisKg: 5, dosisDewasa: 100, sediaanMg: 100, sediaanMl: 1 },
  { id: '67', kategori: 'Sendi & Otot (Asam Urat)', nama: 'Colchicine', dosisPerKg: 0.02, maxDosisKg: 0.03, dosisDewasa: 0.5, sediaanMg: 0.5, sediaanMl: 1 },

  // Oral - Antibiotik, Antivirus, Antijamur
  { id: '4', kategori: 'Antibiotik', nama: 'Amoxicillin', dosisPerKg: 15, maxDosisKg: 30, dosisDewasa: 500, sediaanMg: 125, sediaanMl: 5 },
  { id: '5', kategori: 'Antibiotik', nama: 'Cefadroxil', dosisPerKg: 15, maxDosisKg: 30, dosisDewasa: 500, sediaanMg: 125, sediaanMl: 5 },
  { id: '6', kategori: 'Antibiotik', nama: 'Cefixime', dosisPerKg: 1.5, maxDosisKg: 3, dosisDewasa: 100, sediaanMg: 100, sediaanMl: 5 },
  { id: '7', kategori: 'Antibiotik', nama: 'Azithromycin', dosisPerKg: 10, maxDosisKg: 15, dosisDewasa: 500, sediaanMg: 200, sediaanMl: 5 },
  { id: '8', kategori: 'Antibiotik', nama: 'Erythromycin', dosisPerKg: 12.5, maxDosisKg: 25, dosisDewasa: 500, sediaanMg: 200, sediaanMl: 5 },
  { id: '37', kategori: 'Antibiotik', nama: 'Ciprofloxacin', dosisPerKg: 10, maxDosisKg: 15, dosisDewasa: 500, sediaanMg: 500, sediaanMl: 1 },
  { id: '39', kategori: 'Antibiotik', nama: 'Levofloxacin', dosisPerKg: 10, maxDosisKg: 20, dosisDewasa: 500, sediaanMg: 500, sediaanMl: 1 },
  { id: '43', kategori: 'Antibiotik', nama: 'Clindamycin', dosisPerKg: 8, maxDosisKg: 20, dosisDewasa: 300, sediaanMg: 150, sediaanMl: 1 },
  { id: '44', kategori: 'Antibiotik', nama: 'Cotrimoxazole', dosisPerKg: 4, maxDosisKg: 6, dosisDewasa: 480, sediaanMg: 240, sediaanMl: 5 },
  { id: '68', kategori: 'Antibiotik', nama: 'Thiamphenicol', dosisPerKg: 10, maxDosisKg: 25, dosisDewasa: 500, sediaanMg: 250, sediaanMl: 5 },
  { id: '69', kategori: 'Antibiotik', nama: 'Doxycycline', dosisPerKg: 2, maxDosisKg: 4, dosisDewasa: 100, sediaanMg: 100, sediaanMl: 1 },
  { id: '45', kategori: 'Antivirus', nama: 'Acyclovir', dosisPerKg: 20, maxDosisKg: 20, dosisDewasa: 400, sediaanMg: 400, sediaanMl: 1 },
  { id: '46', kategori: 'Antijamur', nama: 'Ketoconazole', dosisPerKg: 3.3, maxDosisKg: 6.6, dosisDewasa: 200, sediaanMg: 200, sediaanMl: 1 },
  { id: '47', kategori: 'Antijamur', nama: 'Nystatin Drop', dosisPerKg: 100000, maxDosisKg: 100000, dosisDewasa: 500000, sediaanMg: 100000, sediaanMl: 1 },
  { id: '70', kategori: 'Antijamur', nama: 'Fluconazole', dosisPerKg: 3, maxDosisKg: 6, dosisDewasa: 150, sediaanMg: 150, sediaanMl: 1 },

  // Oral - Antihistamin & Pernapasan
  { id: '9', kategori: 'Antihistamin (Alergi)', nama: 'Cetirizine', dosisPerKg: 0.25, maxDosisKg: 0.25, dosisDewasa: 10, sediaanMg: 5, sediaanMl: 5 },
  { id: '10', kategori: 'Antihistamin (Alergi)', nama: 'Loratadine', dosisPerKg: 0.2, maxDosisKg: 0.2, dosisDewasa: 10, sediaanMg: 5, sediaanMl: 5 },
  { id: '11', kategori: 'Antihistamin (Alergi)', nama: 'Chlorpheniramine (CTM)', dosisPerKg: 0.08, maxDosisKg: 0.15, dosisDewasa: 4, sediaanMg: 2, sediaanMl: 5 },
  { id: '71', kategori: 'Antihistamin (Alergi)', nama: 'Levocetirizine', dosisPerKg: 0.1, maxDosisKg: 0.2, dosisDewasa: 5, sediaanMg: 5, sediaanMl: 1 },
  { id: '12', kategori: 'Pernapasan (Batuk/Asma)', nama: 'Ambroxol', dosisPerKg: 0.5, maxDosisKg: 0.5, dosisDewasa: 30, sediaanMg: 15, sediaanMl: 5 },
  { id: '13', kategori: 'Pernapasan (Batuk/Asma)', nama: 'Bromhexine', dosisPerKg: 0.3, maxDosisKg: 0.3, dosisDewasa: 8, sediaanMg: 4, sediaanMl: 5 },
  { id: '14', kategori: 'Pernapasan (Batuk/Asma)', nama: 'Salbutamol', dosisPerKg: 0.1, maxDosisKg: 0.15, dosisDewasa: 4, sediaanMg: 2, sediaanMl: 5 },
  { id: '72', kategori: 'Pernapasan (Asma/PPOK)', nama: 'Theophylline', dosisPerKg: 4, maxDosisKg: 6, dosisDewasa: 150, sediaanMg: 150, sediaanMl: 1 },

  // Oral - Pencernaan
  { id: '15', kategori: 'Pencernaan (Lambung/Mual)', nama: 'Domperidone', dosisPerKg: 0.25, maxDosisKg: 0.25, dosisDewasa: 10, sediaanMg: 5, sediaanMl: 5 },
  { id: '16', kategori: 'Pencernaan (Lambung/Mual)', nama: 'Ondansetron (Oral)', dosisPerKg: 0.15, maxDosisKg: 0.15, dosisDewasa: 8, sediaanMg: 4, sediaanMl: 5 },
  { id: '17', kategori: 'Pencernaan (Lambung/Mual)', nama: 'Ranitidine', dosisPerKg: 2, maxDosisKg: 4, dosisDewasa: 150, sediaanMg: 75, sediaanMl: 5 },
  { id: '48', kategori: 'Pencernaan (Lambung)', nama: 'Lansoprazole', dosisPerKg: 0.5, maxDosisKg: 1, dosisDewasa: 30, sediaanMg: 30, sediaanMl: 1 },
  { id: '49', kategori: 'Pencernaan (Lambung)', nama: 'Sucralfate Sirup', dosisPerKg: 10, maxDosisKg: 20, dosisDewasa: 1000, sediaanMg: 500, sediaanMl: 5 },
  { id: '38', kategori: 'Pencernaan (Spasmolitik)', nama: 'Hyoscine Butylbromide (Buscopan)', dosisPerKg: 0.3, maxDosisKg: 0.5, dosisDewasa: 10, sediaanMg: 10, sediaanMl: 1 },
  { id: '73', kategori: 'Pencernaan (Diare)', nama: 'Attapulgite', dosisPerKg: 10, maxDosisKg: 20, dosisDewasa: 600, sediaanMg: 600, sediaanMl: 1 },

  // Oral - Kortikosteroid
  { id: '18', kategori: 'Kortikosteroid', nama: 'Dexamethasone', dosisPerKg: 0.1, maxDosisKg: 0.3, dosisDewasa: 0.5, sediaanMg: 0.5, sediaanMl: 5 },
  { id: '19', kategori: 'Kortikosteroid', nama: 'Methylprednisolone', dosisPerKg: 0.5, maxDosisKg: 2, dosisDewasa: 4, sediaanMg: 4, sediaanMl: 5 },
  { id: '74', kategori: 'Kortikosteroid', nama: 'Prednisone', dosisPerKg: 0.5, maxDosisKg: 1, dosisDewasa: 5, sediaanMg: 5, sediaanMl: 1 },

  // Oral - Kardiovaskular & Endokrin
  { id: '31', kategori: 'Kardiovaskular (Antihipertensi)', nama: 'Amlodipine', dosisPerKg: 0.1, maxDosisKg: 0.2, dosisDewasa: 5, sediaanMg: 5, sediaanMl: 1 },
  { id: '32', kategori: 'Kardiovaskular (Antihipertensi)', nama: 'Captopril', dosisPerKg: 0.3, maxDosisKg: 1, dosisDewasa: 12.5, sediaanMg: 12.5, sediaanMl: 1 },
  { id: '50', kategori: 'Kardiovaskular (Antihipertensi)', nama: 'Bisoprolol', dosisPerKg: 0.05, maxDosisKg: 0.1, dosisDewasa: 5, sediaanMg: 5, sediaanMl: 1 },
  { id: '51', kategori: 'Kardiovaskular (Antihipertensi)', nama: 'Valsartan', dosisPerKg: 1, maxDosisKg: 2, dosisDewasa: 80, sediaanMg: 80, sediaanMl: 1 },
  { id: '52', kategori: 'Kardiovaskular (Antihipertensi)', nama: 'Candesartan', dosisPerKg: 0.1, maxDosisKg: 0.2, dosisDewasa: 8, sediaanMg: 8, sediaanMl: 1 },
  { id: '75', kategori: 'Kardiovaskular (Antihipertensi)', nama: 'Furosemide (Oral)', dosisPerKg: 1, maxDosisKg: 2, dosisDewasa: 40, sediaanMg: 40, sediaanMl: 1 },
  { id: '76', kategori: 'Kardiovaskular (Antihipertensi)', nama: 'Spironolactone', dosisPerKg: 1, maxDosisKg: 3, dosisDewasa: 25, sediaanMg: 25, sediaanMl: 1 },
  { id: '77', kategori: 'Kardiovaskular (Jantung)', nama: 'Digoxin', dosisPerKg: 0.01, maxDosisKg: 0.02, dosisDewasa: 0.25, sediaanMg: 0.25, sediaanMl: 1 },
  { id: '33', kategori: 'Endokrin (Antidiabetes)', nama: 'Metformin', dosisPerKg: 10, maxDosisKg: 20, dosisDewasa: 500, sediaanMg: 500, sediaanMl: 1 },
  { id: '53', kategori: 'Endokrin (Antidiabetes)', nama: 'Glimepiride', dosisPerKg: 0.02, maxDosisKg: 0.05, dosisDewasa: 2, sediaanMg: 2, sediaanMl: 1 },
  { id: '54', kategori: 'Endokrin (Antidiabetes)', nama: 'Glibenclamide', dosisPerKg: 0.1, maxDosisKg: 0.2, dosisDewasa: 5, sediaanMg: 5, sediaanMl: 1 },
  { id: '78', kategori: 'Endokrin (Antidiabetes)', nama: 'Acarbose', dosisPerKg: 1, maxDosisKg: 2, dosisDewasa: 50, sediaanMg: 50, sediaanMl: 1 },
  { id: '34', kategori: 'Kardiovaskular (Anti-Kolesterol)', nama: 'Simvastatin', dosisPerKg: 0.2, maxDosisKg: 0.5, dosisDewasa: 20, sediaanMg: 20, sediaanMl: 1 },
  { id: '79', kategori: 'Kardiovaskular (Anti-Kolesterol)', nama: 'Atorvastatin', dosisPerKg: 0.2, maxDosisKg: 0.8, dosisDewasa: 20, sediaanMg: 20, sediaanMl: 1 },

  // Oral - Suplemen & Vitamin
  { id: '55', kategori: 'Vitamin & Mineral', nama: 'Vitamin C (Ascorbic Acid)', dosisPerKg: 5, maxDosisKg: 10, dosisDewasa: 500, sediaanMg: 500, sediaanMl: 1 },
  { id: '56', kategori: 'Vitamin & Mineral', nama: 'Zinc Sulfate', dosisPerKg: 1, maxDosisKg: 2, dosisDewasa: 20, sediaanMg: 20, sediaanMl: 5 },
  { id: '80', kategori: 'Vitamin & Mineral', nama: 'Folic Acid', dosisPerKg: 0.1, maxDosisKg: 0.5, dosisDewasa: 1, sediaanMg: 1, sediaanMl: 1 },
  { id: '81', kategori: 'Vitamin & Mineral', nama: 'Calcium Carbonate', dosisPerKg: 10, maxDosisKg: 25, dosisDewasa: 500, sediaanMg: 500, sediaanMl: 1 },

  // --- OBAT INJEKSI (IV/IM LENGKAP + AMIKACIN) ---
  { id: '20', kategori: 'Injeksi (Antibiotik)', nama: 'Ceftriaxone Injeksi', dosisPerKg: 50, maxDosisKg: 100, dosisDewasa: 1000, sediaanMg: 1000, sediaanMl: 10 },
  { id: '57', kategori: 'Injeksi (Antibiotik)', nama: 'Cefotaxime Injeksi', dosisPerKg: 50, maxDosisKg: 150, dosisDewasa: 1000, sediaanMg: 1000, sediaanMl: 10 },
  { id: '58', kategori: 'Injeksi (Antibiotik)', nama: 'Gentamicin Injeksi', dosisPerKg: 5, maxDosisKg: 7.5, dosisDewasa: 80, sediaanMg: 80, sediaanMl: 2 },
  { id: '83', kategori: 'Injeksi (Antibiotik)', nama: 'Amikacin Injeksi', dosisPerKg: 15, maxDosisKg: 20, dosisDewasa: 500, sediaanMg: 250, sediaanMl: 2 },
  { id: '84', kategori: 'Injeksi (Antibiotik)', nama: 'Vancomycin Injeksi', dosisPerKg: 10, maxDosisKg: 15, dosisDewasa: 1000, sediaanMg: 500, sediaanMl: 10 },
  { id: '85', kategori: 'Injeksi (Antibiotik)', nama: 'Piperacillin / Tazobactam Injeksi', dosisPerKg: 50, maxDosisKg: 100, dosisDewasa: 4500, sediaanMg: 4500, sediaanMl: 20 },
  { id: '59', kategori: 'Injeksi (Antibiotik)', nama: 'Meropenem Injeksi', dosisPerKg: 20, maxDosisKg: 40, dosisDewasa: 1000, sediaanMg: 1000, sediaanMl: 10 },

  { id: '21', kategori: 'Injeksi (Analgesik)', nama: 'Ketorolac Injeksi', dosisPerKg: 0.5, maxDosisKg: 1, dosisDewasa: 30, sediaanMg: 30, sediaanMl: 1 },
  { id: '64', kategori: 'Injeksi (Analgesik)', nama: 'Tramadol Injeksi', dosisPerKg: 1, maxDosisKg: 2, dosisDewasa: 50, sediaanMg: 100, sediaanMl: 2 },
  { id: '86', kategori: 'Injeksi (Analgesik Opioid)', nama: 'Fentanyl Injeksi', dosisPerKg: 0.001, maxDosisKg: 0.003, dosisDewasa: 0.1, sediaanMg: 0.05, sediaanMl: 1 },
  { id: '87', kategori: 'Injeksi (Analgesik Opioid)', nama: 'Morphine Injeksi', dosisPerKg: 0.1, maxDosisKg: 0.2, dosisDewasa: 10, sediaanMg: 10, sediaanMl: 1 },

  { id: '22', kategori: 'Injeksi (Lambung)', nama: 'Omeprazole Injeksi', dosisPerKg: 0.5, maxDosisKg: 1, dosisDewasa: 40, sediaanMg: 40, sediaanMl: 10 },
  { id: '23', kategori: 'Injeksi (Lambung)', nama: 'Pantoprazole Injeksi', dosisPerKg: 0.5, maxDosisKg: 1, dosisDewasa: 40, sediaanMg: 40, sediaanMl: 10 },
  { id: '25', kategori: 'Injeksi (Anti-Mual)', nama: 'Ondansetron Injeksi', dosisPerKg: 0.15, maxDosisKg: 0.15, dosisDewasa: 8, sediaanMg: 4, sediaanMl: 2 },
  { id: '40', kategori: 'Injeksi (Spasmolitik)', nama: 'Hyoscine Injeksi (Buscopan)', dosisPerKg: 0.3, maxDosisKg: 0.5, dosisDewasa: 20, sediaanMg: 20, sediaanMl: 1 },

  { id: '24', kategori: 'Injeksi (Diuretik)', nama: 'Furosemide Injeksi', dosisPerKg: 1, maxDosisKg: 2, dosisDewasa: 40, sediaanMg: 20, sediaanMl: 2 },
  { id: '26', kategori: 'Injeksi (Saraf/Anti-Kejang)', nama: 'Diazepam Injeksi', dosisPerKg: 0.3, maxDosisKg: 0.5, dosisDewasa: 5, sediaanMg: 10, sediaanMl: 2 },
  { id: '82', kategori: 'Injeksi (Saraf/Anti-Kejang)', nama: 'Phenytoin Injeksi', dosisPerKg: 5, maxDosisKg: 15, dosisDewasa: 100, sediaanMg: 100, sediaanMl: 2 },
  { id: '27', kategori: 'Injeksi (Kortikosteroid)', nama: 'Dexamethasone Injeksi', dosisPerKg: 0.1, maxDosisKg: 0.3, dosisDewasa: 5, sediaanMg: 5, sediaanMl: 1 },
  { id: '28', kategori: 'Injeksi (Antihistamin)', nama: 'Diphenhydramine Injeksi', dosisPerKg: 1, maxDosisKg: 1.25, dosisDewasa: 10, sediaanMg: 10, sediaanMl: 1 },

  // Injeksi Khusus IGD / ICU / OK
  { id: '60', kategori: 'Injeksi (Emergensi)', nama: 'Atropine Sulfate Injeksi', dosisPerKg: 0.02, maxDosisKg: 0.02, dosisDewasa: 0.5, sediaanMg: 0.25, sediaanMl: 1 },
  { id: '61', kategori: 'Injeksi (Jantung/Aritmia)', nama: 'Amiodarone Injeksi', dosisPerKg: 5, maxDosisKg: 5, dosisDewasa: 150, sediaanMg: 150, sediaanMl: 3 },
  { id: '62', kategori: 'Injeksi (Anestesi)', nama: 'Propofol Injeksi (1%)', dosisPerKg: 2, maxDosisKg: 2.5, dosisDewasa: 100, sediaanMg: 200, sediaanMl: 20 },
  { id: '88', kategori: 'Injeksi (Anestesi)', nama: 'Ketamine Injeksi', dosisPerKg: 2, maxDosisKg: 4.5, dosisDewasa: 50, sediaanMg: 100, sediaanMl: 2 },
  { id: '63', kategori: 'Injeksi (Sedasi)', nama: 'Midazolam Injeksi', dosisPerKg: 0.05, maxDosisKg: 0.1, dosisDewasa: 5, sediaanMg: 5, sediaanMl: 1 },
  { id: '89', kategori: 'Injeksi (Pelumpuh Otot)', nama: 'Rocuronium Injeksi', dosisPerKg: 0.6, maxDosisKg: 1.2, dosisDewasa: 50, sediaanMg: 50, sediaanMl: 5 },

  // Injeksi Vasoaktif & Antikoagulan
  { id: '29', kategori: 'Injeksi (Vasoaktif)', nama: 'Epinephrine Injeksi', dosisPerKg: 0.01, maxDosisKg: 0.01, dosisDewasa: 1, sediaanMg: 1, sediaanMl: 1 },
  { id: '30', kategori: 'Injeksi (Vasoaktif)', nama: 'Norepinephrine Injeksi', dosisPerKg: 0.01, maxDosisKg: 0.05, dosisDewasa: 4, sediaanMg: 4, sediaanMl: 4 },
  { id: '65', kategori: 'Injeksi (Vasoaktif)', nama: 'Dobutamine Injeksi', dosisPerKg: 5, maxDosisKg: 20, dosisDewasa: 250, sediaanMg: 250, sediaanMl: 5 },
  { id: '66', kategori: 'Injeksi (Vasoaktif)', nama: 'Dopamine Injeksi', dosisPerKg: 5, maxDosisKg: 20, dosisDewasa: 200, sediaanMg: 200, sediaanMl: 5 },
  { id: '90', kategori: 'Injeksi (Antikoagulan)', nama: 'Enoxaparin Injeksi (LMWH)', dosisPerKg: 1, maxDosisKg: 1.5, dosisDewasa: 40, sediaanMg: 40, sediaanMl: 0.4 },
  { id: '91', kategori: 'Injeksi (Antikoagulan)', nama: 'Heparin Sodium Injeksi', dosisPerKg: 50, maxDosisKg: 100, dosisDewasa: 5000, sediaanMg: 5000, sediaanMl: 1 },
];

// Database Interaksi Obat Sederhana
const DATABASE_INTERAKSI: { obat1: string; obat2: string; tingkat: 'Major' | 'Moderate'; deskripsi: string }[] = [
  { obat1: '2', obat2: '3', tingkat: 'Major', deskripsi: 'Ibuprofen dan Asam Mefenamat sama-sama golongan NSAID. Penggunaan bersamaan meningkatkan risiko perdarahan saluran cerna, tukak lambung, dan nefrotoksisitas secara signifikan.' },
  { obat1: '8', obat2: '15', tingkat: 'Major', deskripsi: 'Erythromycin dan Domperidone dapat meningkatkan risiko perpanjangan interval QT dan aritmia jantung serius (torsades de pointes).' },
  { obat1: '2', obat2: '18', tingkat: 'Moderate', deskripsi: 'Ibuprofen dan Dexamethasone bila digunakan bersama meningkatkan risiko iritasi lambung serta perdarahan gastrointestinal.' },
  { obat1: '3', obat2: '18', tingkat: 'Moderate', deskripsi: 'Asam Mefenamat dan Dexamethasone meningkatkan risiko efek samping gastrointestinal.' },
  { obat1: '8', obat2: '7', tingkat: 'Moderate', deskripsi: 'Erythromycin dan Azithromycin (sesama makrolid) dapat meningkatkan risiko gangguan irama jantung.' },
  { obat1: '31', obat2: '34', tingkat: 'Moderate', deskripsi: 'Amlodipine dapat meningkatkan kadar Simvastatin dalam darah, yang meningkatkan risiko miopati dan rhabdomyolysis. Dosis Simvastatin disarankan maks 20 mg/hari.' },
  { obat1: '37', obat2: '2', tingkat: 'Moderate', deskripsi: 'NSAID (Ibuprofen) dapat berinteraksi dengan Antibiotik Fluorokuinolon (Ciprofloxacin) dan berpotensi meningkatkan risiko stimulasi SSP serta kejang.' },
  { obat1: '37', obat2: '3', tingkat: 'Moderate', deskripsi: 'NSAID (Asam Mefenamat) dapat berinteraksi dengan Antibiotik Fluorokuinolon (Ciprofloxacin) dan berpotensi meningkatkan risiko kejang.' },
  { obat1: '32', obat2: '33', tingkat: 'Moderate', deskripsi: 'ACE inhibitor (Captopril) dapat meningkatkan efek penurunan glukosa dari Metformin, meningkatkan risiko hipoglikemia.' },
  { obat1: '21', obat2: '41', tingkat: 'Major', deskripsi: 'Ketorolac dan Diclofenac adalah sesama NSAID. Kombinasi sangat dilarang karena dapat menyebabkan pendarahan lambung parah dan gagal ginjal akut.' },
  { obat1: '43', obat2: '8', tingkat: 'Moderate', deskripsi: 'Clindamycin dan Erythromycin dapat saling mengantagonis (melawan) efek antibakteri satu sama lain karena mengikat pada subunit ribosom yang sama.' },
  { obat1: '83', obat2: '58', tingkat: 'Major', deskripsi: 'Amikacin dan Gentamicin adalah sesama aminoglikosida. Penggunaan bersamaan meningkatkan risiko nefrotoksisitas (kerusakan ginjal) dan ototoksisitas secara drastis.' },
];

type TabType = 'bb' | 'umur' | 'sirup' | 'puyer' | 'injeksi' | 'tpm' | 'bsa' | 'ginjal' | 'syringe' | 'interaksi' | 'kapsul' | 'quiz';
type SoalQuiz = { beratBadan: number; dosisPerKg: number; jawabanBenar: number };

type KapsulItem = {
  id: string;
  masterId: string;
  nama: string;
  dosisPerKapsul: string;
  kandunganTablet: string;
  pencarianMaster?: string;
  isDropdownOpen?: boolean;
};

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
  { id: 'injeksi', label: 'Injeksi' },
  { id: 'tpm', label: 'Infus' },
  { id: 'bsa', label: 'BSA' },
  { id: 'ginjal', label: 'Ginjal' },
  { id: 'syringe', label: 'Syringe' },
  { id: 'interaksi', label: 'Interaksi' },
  { id: 'kapsul', label: 'Kapsul' },
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

  // State Parameter Dasar
  const [umur, setUmur] = useState<string>('');
  const [dosisDewasa, setDosisDewasa] = useState<string>('');
  const [beratBadan, setBeratBadan] = useState<string>('');
  const [dosisPerKg, setDosisPerKg] = useState<string>('');

  // State Sirup
  const [dosisPermintaan, setDosisPermintaan] = useState<string>('');
  const [dosisSediaan, setDosisSediaan] = useState<string>('');
  const [volumeSediaan, setVolumeSediaan] = useState<string>('');

  // State Injeksi (IV/IM)
  const [mintaInjeksi, setMintaInjeksi] = useState<string>('');
  const [sediaInjeksi, setSediaInjeksi] = useState<string>('');
  const [volPelarutInjeksi, setVolPelarutInjeksi] = useState<string>('');

  // State Puyer
  const [dosisPerBungkus, setDosisPerBungkus] = useState<string>('');
  const [jumlahBungkus, setJumlahBungkus] = useState<string>('');
  const [dosisTablet, setDosisTablet] = useState<string>('');

  // State Infus TPM
  const [volumeInfus, setVolumeInfus] = useState<string>('');
  const [waktuInfus, setWaktuInfus] = useState<string>('');
  const [faktorTetes, setFaktorTetes] = useState<string>('20');

  // State BSA
  const [tinggiBSA, setTinggiBSA] = useState<string>('');
  const [beratBSA, setBeratBSA] = useState<string>('');
  const [dosisPerM2, setDosisPerM2] = useState<string>('');

  // State CrCl (Ginjal)
  const [umurGinjal, setUmurGinjal] = useState<string>('');
  const [beratGinjal, setBeratGinjal] = useState<string>('');
  const [serumKreatinin, setSerumKreatinin] = useState<string>('');
  const [jenisKelaminGinjal, setJenisKelaminGinjal] = useState<'laki' | 'perempuan'>('laki');

  // State Syringe Pump
  const [beratSyringe, setBeratSyringe] = useState<string>('');
  const [dosisSyringe, setDosisSyringe] = useState<string>('');
  const [massaObatSyringe, setMassaObatSyringe] = useState<string>('4');
  const [volumeSpuit, setVolumeSpuit] = useState<string>('50');

  // State Interaksi Obat
  const [obatInteraksiA, setObatInteraksiA] = useState<string>('');
  const [obatInteraksiB, setObatInteraksiB] = useState<string>('');

  // State Kapsul Racikan Multi-Obat
  const [daftarObatKapsul, setDaftarObatKapsul] = useState<KapsulItem[]>([{ id: '1', masterId: '', nama: '', dosisPerKapsul: '', kandunganTablet: '', pencarianMaster: '', isDropdownOpen: false }]);
  const [jumlahKapsul, setJumlahKapsul] = useState<string>('');
  const [bobotTargetKapsul, setBobotTargetKapsul] = useState<string>('');

  // State Generator Etiket
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
      setSediaInjeksi('');
      setVolPelarutInjeksi('');
      setIsDropdownOpen(false);
      return;
    }

    setPilihanObat(obat.id);
    setPencarianObat(obat.nama);
    setIsDropdownOpen(false);

    setDosisPerKg(obat.dosisPerKg.toString());
    setDosisDewasa(obat.dosisDewasa.toString());

    // Autofill untuk sirup & injeksi
    setDosisSediaan(obat.sediaanMg.toString());
    setVolumeSediaan(obat.sediaanMl.toString());
    setSediaInjeksi(obat.sediaanMg.toString());
    setVolPelarutInjeksi(obat.sediaanMl.toString());

    setDosisTablet(obat.dosisDewasa.toString());
  };

  const tambahBarisObatKapsul = () => {
    setDaftarObatKapsul((prev) => [...prev, { id: Date.now().toString(), masterId: '', nama: '', dosisPerKapsul: '', kandunganTablet: '', pencarianMaster: '', isDropdownOpen: false }]);
  };

  const hapusBarisObatKapsul = (id: string) => {
    if (daftarObatKapsul.length > 1) {
      setDaftarObatKapsul((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const updateBarisObatKapsul = (id: string, field: keyof KapsulItem, value: any) => {
    setDaftarObatKapsul((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
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
    } else if (item.tipeTab === 'injeksi') {
      setMintaInjeksi(p.mintaInjeksi);
      setSediaInjeksi(p.sediaInjeksi);
      setVolPelarutInjeksi(p.volPelarutInjeksi);
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
    } else if (item.tipeTab === 'ginjal') {
      setUmurGinjal(p.umurGinjal);
      setBeratGinjal(p.beratGinjal);
      setSerumKreatinin(p.serumKreatinin);
      setJenisKelaminGinjal(p.jenisKelaminGinjal as 'laki' | 'perempuan');
    } else if (item.tipeTab === 'syringe') {
      setBeratSyringe(p.beratSyringe);
      setDosisSyringe(p.dosisSyringe);
      setMassaObatSyringe(p.massaObatSyringe);
      setVolumeSpuit(p.volumeSpuit);
    } else if (item.tipeTab === 'interaksi') {
      setObatInteraksiA(p.obatInteraksiA);
      setObatInteraksiB(p.obatInteraksiB);
    } else if (item.tipeTab === 'kapsul') {
      if (p.daftarObatKapsul) {
        try {
          const parsed = JSON.parse(p.daftarObatKapsul);
          const mapped = parsed.map((i: any) => ({ ...i, pencarianMaster: i.nama, isDropdownOpen: false }));
          setDaftarObatKapsul(mapped);
        } catch (e) {}
      }
      setJumlahKapsul(p.jumlahKapsul || '');
      setBobotTargetKapsul(p.bobotTargetKapsul || '');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  let hasil: number | null = null;
  let satuanHasil = 'mg';
  let warningDosis: string | null = null;
  let errorMsg = '';
  let subInfoText = '';
  let interaksiResult: { tingkat: 'Major' | 'Moderate' | 'Aman'; deskripsi: string } | null = null;

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
  } else if (activeTab === 'injeksi') {
    satuanHasil = 'ml';
    const nMinta = parseFloat(mintaInjeksi);
    const nSedia = parseFloat(sediaInjeksi);
    const nVol = parseFloat(volPelarutInjeksi);
    if (!isNaN(nMinta) && !isNaN(nSedia) && !isNaN(nVol) && nSedia > 0 && nVol > 0) {
      hasil = hitungVolumeInjeksi(nMinta, nSedia, nVol);
    } else if (mintaInjeksi !== '' || sediaInjeksi !== '' || volPelarutInjeksi !== '') {
      errorMsg = 'Mohon lengkapi data injeksi dengan angka yang valid (> 0).';
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
  } else if (activeTab === 'ginjal') {
    satuanHasil = 'ml/min';
    const nUmurG = parseFloat(umurGinjal);
    const nBeratG = parseFloat(beratGinjal);
    const nScr = parseFloat(serumKreatinin);
    if (!isNaN(nUmurG) && !isNaN(nBeratG) && !isNaN(nScr) && nUmurG > 0 && nBeratG > 0 && nScr > 0) {
      hasil = hitungCrCl(nUmurG, nBeratG, nScr, jenisKelaminGinjal);

      if (hasil >= 90) subInfoText = 'Fungsi Ginjal: Normal (Stage 1)';
      else if (hasil >= 60) subInfoText = 'Fungsi Ginjal: Penurunan Ringan (Stage 2)';
      else if (hasil >= 30) subInfoText = 'Fungsi Ginjal: Penurunan Sedang (Stage 3) - Wajib Adjust Dosis';
      else if (hasil >= 15) subInfoText = 'Fungsi Ginjal: Penurunan Berat (Stage 4) - Wajib Adjust Dosis Berat';
      else subInfoText = 'Fungsi Ginjal: Gagal Ginjal / ESRD (Stage 5)';
    } else if (umurGinjal !== '' || beratGinjal !== '' || serumKreatinin !== '') {
      errorMsg = 'Mohon lengkapi data fungsi ginjal dengan angka valid (> 0).';
    }
  } else if (activeTab === 'syringe') {
    satuanHasil = 'ml/jam';
    const nBeratS = parseFloat(beratSyringe);
    const nDosisS = parseFloat(dosisSyringe);
    const nMassaS = parseFloat(massaObatSyringe);
    const nVolS = parseFloat(volumeSpuit);
    if (!isNaN(nBeratS) && !isNaN(nDosisS) && !isNaN(nMassaS) && !isNaN(nVolS) && nBeratS > 0 && nDosisS > 0 && nMassaS > 0 && nVolS > 0) {
      hasil = hitungSyringePump(nBeratS, nDosisS, nMassaS, nVolS);
      const konsentrasi = (nMassaS * 1000) / nVolS;
      subInfoText = `Konsentrasi Spuit: ${konsentrasi.toFixed(2)} mcg/ml`;
    } else if (beratSyringe !== '' || dosisSyringe !== '' || massaObatSyringe !== '' || volumeSpuit !== '') {
      errorMsg = 'Mohon lengkapi parameter syringe pump dengan angka valid (> 0).';
    }
  } else if (activeTab === 'interaksi') {
    satuanHasil = 'status';
    if (obatInteraksiA && obatInteraksiB) {
      if (obatInteraksiA === obatInteraksiB) {
        errorMsg = 'Pilih dua obat yang berbeda untuk pengecekan interaksi.';
      } else {
        const found = DATABASE_INTERAKSI.find((i) => (i.obat1 === obatInteraksiA && i.obat2 === obatInteraksiB) || (i.obat1 === obatInteraksiB && i.obat2 === obatInteraksiA));
        if (found) {
          interaksiResult = { tingkat: found.tingkat, deskripsi: found.deskripsi };
          hasil = found.tingkat === 'Major' ? 2 : 1;
        } else {
          interaksiResult = { tingkat: 'Aman', deskripsi: 'Tidak ditemukan interaksi mayor atau moderate di antara kedua obat ini dalam database referensi standar kami.' };
          hasil = 0;
        }
      }
    } else {
      errorMsg = 'Silakan pilih kedua obat yang ingin dianalisis.';
    }
  } else if (activeTab === 'kapsul') {
    satuanHasil = 'mg/kps';
    const nJmlKapsul = parseFloat(jumlahKapsul);
    const nBobotTarget = parseFloat(bobotTargetKapsul);

    if (!isNaN(nJmlKapsul) && nJmlKapsul > 0 && daftarObatKapsul.length > 0) {
      let totalAktifPerKps = 0;
      let isValid = true;

      for (const obat of daftarObatKapsul) {
        const dKps = parseFloat(obat.dosisPerKapsul);
        const kTab = parseFloat(obat.kandunganTablet);
        if (isNaN(dKps) || isNaN(kTab) || kTab <= 0 || dKps <= 0) {
          isValid = false;
        } else {
          totalAktifPerKps += dKps;
        }
      }

      if (isValid) {
        hasil = totalAktifPerKps;
        let extraInfo = `Total Zat Aktif per Kapsul: ${totalAktifPerKps} mg`;
        if (!isNaN(nBobotTarget) && nBobotTarget > 0) {
          if (nBobotTarget >= totalAktifPerKps) {
            const slPerKps = nBobotTarget - totalAktifPerKps;
            const totalSL = slPerKps * nJmlKapsul;
            extraInfo += ` | Tambahan SL: ${slPerKps.toFixed(1)} mg/kps (Total SL: ${totalSL.toFixed(1)} mg)`;
          } else {
            errorMsg = '⚠️ Target bobot 1 kapsul lebih kecil dari total zat aktif per kapsul!';
          }
        }
        subInfoText = extraInfo;
      } else {
        errorMsg = 'Mohon lengkapi semua data dosis dan kandungan tablet obat kapsul dengan valid (> 0).';
      }
    } else if (jumlahKapsul !== '') {
      errorMsg = 'Mohon isi jumlah kapsul yang akan dibuat dengan benar (> 0).';
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
      } else if (activeTab === 'injeksi') {
        labelTipe = 'Injeksi (IV/IM)';
        detail = `Minta: ${mintaInjeksi}mg | Sedia: ${sediaInjeksi}mg/${volPelarutInjeksi}ml`;
        payload = { mintaInjeksi, sediaInjeksi, volPelarutInjeksi, pilihanObat };
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
      } else if (activeTab === 'ginjal') {
        labelTipe = 'Klirens Kreatinin (CrCl)';
        detail = `Umur: ${umurGinjal}thn | BB: ${beratGinjal}kg | Scr: ${serumKreatinin}mg/dL | ${jenisKelaminGinjal}`;
        payload = { umurGinjal, beratGinjal, serumKreatinin, jenisKelaminGinjal };
      } else if (activeTab === 'syringe') {
        labelTipe = 'Syringe Pump Vasoaktif';
        detail = `BB: ${beratSyringe}kg | Dosis: ${dosisSyringe}mcg/kg/min | Massa: ${massaObatSyringe}mg / ${volumeSpuit}ml`;
        payload = { beratSyringe, dosisSyringe, massaObatSyringe, volumeSpuit };
      } else if (activeTab === 'interaksi') {
        labelTipe = 'Interaksi Obat';
        const namaA = MASTER_OBAT.find((o) => o.id === obatInteraksiA)?.nama || '';
        const namaB = MASTER_OBAT.find((o) => o.id === obatInteraksiB)?.nama || '';
        detail = `Obat A: ${namaA} vs Obat B: ${namaB}`;
        payload = { obatInteraksiA, obatInteraksiB };
      } else if (activeTab === 'kapsul') {
        labelTipe = 'Kapsul Racikan';
        detail = `${jumlahKapsul} kapsul | ${daftarObatKapsul.length} macam obat`;
        const cleanKapsul = daftarObatKapsul.map(({ pencarianMaster, isDropdownOpen, ...rest }) => rest);
        payload = {
          daftarObatKapsul: JSON.stringify(cleanKapsul),
          jumlahKapsul,
          bobotTargetKapsul,
        };
      }

      const namaObat = pilihanObat && activeTab !== 'bsa' && activeTab !== 'ginjal' && activeTab !== 'syringe' && activeTab !== 'interaksi' && activeTab !== 'kapsul' ? MASTER_OBAT.find((o) => o.id === pilihanObat)?.nama : '';
      const fullDetail = namaObat ? `[${namaObat}] ${detail}` : detail;
      const signature = `${activeTab}-${fullDetail}-${formattedHasil}`;

      if (signature !== lastSavedSignature.current) {
        lastSavedSignature.current = signature;
        const itemBaru: RiwayatItem = {
          id: Date.now(),
          tipeTab: activeTab,
          labelTipe,
          detail: fullDetail,
          hasil: interaksiResult ? interaksiResult.tingkat : formattedHasil,
          satuan: activeTab === 'interaksi' ? 'Tingkat' : satuanHasil,
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
    mintaInjeksi,
    sediaInjeksi,
    volPelarutInjeksi,
    dosisPerBungkus,
    jumlahBungkus,
    dosisTablet,
    volumeInfus,
    waktuInfus,
    faktorTetes,
    tinggiBSA,
    beratBSA,
    dosisPerM2,
    umurGinjal,
    beratGinjal,
    serumKreatinin,
    jenisKelaminGinjal,
    beratSyringe,
    dosisSyringe,
    massaObatSyringe,
    volumeSpuit,
    obatInteraksiA,
    obatInteraksiB,
    daftarObatKapsul,
    jumlahKapsul,
    bobotTargetKapsul,
    interaksiResult,
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

  const butuhPilihanObat = activeTab === 'bb' || activeTab === 'umur' || activeTab === 'sirup' || activeTab === 'injeksi' || activeTab === 'puyer';

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
      className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100' : 'bg-gradient-to-br from-indigo-50 to-slate-100 text-slate-800'} font-sans transition-colors duration-300`}
    >
      <div className="flex-grow flex items-center justify-center p-4 sm:p-6">
        <div
          className={`w-full max-w-xl ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-indigo-950/50' : 'bg-white border-white shadow-xl shadow-indigo-100/50'} p-6 sm:p-8 rounded-[2rem] border transition-colors duration-300 relative`}
        >
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
          <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1 p-1 ${isDarkMode ? 'bg-slate-800/80' : 'bg-slate-100'} rounded-xl mb-6`}>
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
                      placeholder="Ketik nama obat (contoh: Amikacin, Paracetamol)..."
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

              {activeTab === 'injeksi' && (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Dosis Obat yang Diminta (mg / mcg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={mintaInjeksi}
                      onChange={(e) => setMintaInjeksi(e.target.value)}
                      className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                      placeholder="Contoh: 250"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Sediaan Vial/Ampul (mg / mcg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={sediaInjeksi}
                        onChange={(e) => setSediaInjeksi(e.target.value)}
                        className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                        placeholder="Contoh: 250 (Amikacin)"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Volume Pelarut (ml)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={volPelarutInjeksi}
                        onChange={(e) => setVolPelarutInjeksi(e.target.value)}
                        className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                        placeholder="Contoh: 2"
                      />
                    </div>
                  </div>
                  <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} italic`}>*Pastikan satuan dosis yang diminta sama dengan satuan dosis sediaan (contoh: sama-sama dalam satuan mg).</p>
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

              {activeTab === 'ginjal' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Umur Pasien (Tahun)</label>
                      <input
                        type="number"
                        step="1"
                        value={umurGinjal}
                        onChange={(e) => setUmurGinjal(e.target.value)}
                        className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                        placeholder="Contoh: 55"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Berat Badan (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={beratGinjal}
                        onChange={(e) => setBeratGinjal(e.target.value)}
                        className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                        placeholder="Contoh: 65"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Serum Kreatinin (mg/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={serumKreatinin}
                        onChange={(e) => setSerumKreatinin(e.target.value)}
                        className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                        placeholder="Contoh: 1.2"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Jenis Kelamin</label>
                      <select
                        value={jenisKelaminGinjal}
                        onChange={(e) => setJenisKelaminGinjal(e.target.value as 'laki' | 'perempuan')}
                        className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium cursor-pointer`}
                      >
                        <option value="laki">Laki-laki</option>
                        <option value="perempuan">Perempuan (Koreksi 0.85)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'syringe' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Berat Pasien (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={beratSyringe}
                        onChange={(e) => setBeratSyringe(e.target.value)}
                        className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                        placeholder="Contoh: 60"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Dosis Target (mcg/kg/min)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={dosisSyringe}
                        onChange={(e) => setDosisSyringe(e.target.value)}
                        className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                        placeholder="Contoh: 0.1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Jumlah Obat dlm Spuit (mg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={massaObatSyringe}
                        onChange={(e) => setMassaObatSyringe(e.target.value)}
                        className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                        placeholder="Contoh: 4 (Norepi)"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Volume Total Spuit (ml)</label>
                      <input
                        type="number"
                        step="1"
                        value={volumeSpuit}
                        onChange={(e) => setVolumeSpuit(e.target.value)}
                        className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                        placeholder="Contoh: 50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'interaksi' && (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Pilih Obat Pertama (Obat A)</label>
                    <select
                      value={obatInteraksiA}
                      onChange={(e) => setObatInteraksiA(e.target.value)}
                      className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium cursor-pointer`}
                    >
                      <option value="">-- Pilih Obat A --</option>
                      {MASTER_OBAT.map((obat) => (
                        <option key={`a-${obat.id}`} value={obat.id}>
                          {obat.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Pilih Obat Kedua (Obat B)</label>
                    <select
                      value={obatInteraksiB}
                      onChange={(e) => setObatInteraksiB(e.target.value)}
                      className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium cursor-pointer`}
                    >
                      <option value="">-- Pilih Obat B --</option>
                      {MASTER_OBAT.map((obat) => (
                        <option key={`b-${obat.id}`} value={obat.id}>
                          {obat.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'kapsul' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className={`block text-sm font-bold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-900'}`}>💊 Daftar Komposisi Obat dalam Kapsul</label>
                    <button type="button" onClick={tambahBarisObatKapsul} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                      + Tambah Obat Lain
                    </button>
                  </div>

                  <div className="space-y-3">
                    {daftarObatKapsul.map((item, index) => {
                      const searchVal = item.pencarianMaster !== undefined ? item.pencarianMaster : item.nama;
                      const filteredMaster = MASTER_OBAT.filter((o) => o.nama.toLowerCase().includes(searchVal.toLowerCase()) || o.kategori.toLowerCase().includes(searchVal.toLowerCase()));

                      return (
                        <div key={item.id} className={`p-4 ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'} border rounded-xl space-y-3 relative`}>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-indigo-500">Komposisi Obat #{index + 1}</span>
                            {daftarObatKapsul.length > 1 && (
                              <button type="button" onClick={() => hapusBarisObatKapsul(item.id)} className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-0.5 bg-red-100/50 rounded-md">
                                Hapus
                              </button>
                            )}
                          </div>

                          {/* Searchbox Master Obat */}
                          <div className="relative">
                            <label className={`block text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-1`}>🔍 Cari Master Obat (Ketik untuk Filter)</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={searchVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateBarisObatKapsul(item.id, 'pencarianMaster', val);
                                  updateBarisObatKapsul(item.id, 'isDropdownOpen', true);
                                  updateBarisObatKapsul(item.id, 'nama', val);
                                  if (val === '') {
                                    updateBarisObatKapsul(item.id, 'masterId', '');
                                  }
                                }}
                                onFocus={() => updateBarisObatKapsul(item.id, 'isDropdownOpen', true)}
                                placeholder="Ketik nama obat (contoh: Paracetamol)..."
                                className={`w-full p-2.5 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'} border rounded-lg text-xs font-semibold outline-none shadow-sm`}
                              />
                              {searchVal && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDaftarObatKapsul((prev) => prev.map((i) => (i.id === item.id ? { ...i, masterId: '', nama: '', pencarianMaster: '', kandunganTablet: '', isDropdownOpen: false } : i)));
                                  }}
                                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-400'} text-xs font-bold px-1.5 py-0.5 rounded-md`}
                                  title="Reset Pilihan"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {item.isDropdownOpen && (
                              <div
                                className={`absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-700 divide-slate-800' : 'bg-white border-slate-200 divide-slate-100'} border rounded-xl shadow-lg divide-y`}
                              >
                                {filteredMaster.length > 0 ? (
                                  filteredMaster.map((obat) => (
                                    <div
                                      key={obat.id}
                                      onClick={() => {
                                        setDaftarObatKapsul((prev) =>
                                          prev.map((i) => {
                                            if (i.id === item.id) {
                                              return {
                                                ...i,
                                                masterId: obat.id,
                                                nama: obat.nama,
                                                pencarianMaster: obat.nama,
                                                kandunganTablet: obat.dosisDewasa.toString(),
                                                isDropdownOpen: false,
                                              };
                                            }
                                            return i;
                                          }),
                                        );
                                      }}
                                      className={`p-2.5 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-indigo-50'} cursor-pointer flex justify-between items-center text-xs transition-colors`}
                                    >
                                      <div>
                                        <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{obat.nama}</p>
                                        <p className="text-[10px] text-slate-400">{obat.kategori}</p>
                                      </div>
                                      <span className={`text-[10px] font-semibold ${isDarkMode ? 'text-indigo-300 bg-indigo-950/80' : 'text-indigo-600 bg-indigo-50'} px-2 py-0.5 rounded-md`}>{obat.dosisDewasa} mg</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-2.5 text-[11px] text-slate-500 text-center">Obat tidak ditemukan</div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className={`block text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-1`}>Dosis Zat Aktif / Kapsul (mg)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={item.dosisPerKapsul}
                                onChange={(e) => updateBarisObatKapsul(item.id, 'dosisPerKapsul', e.target.value)}
                                placeholder="Contoh: 150"
                                className={`w-full p-2.5 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-lg text-xs font-medium outline-none`}
                              />
                            </div>
                            <div>
                              <label className={`block text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-1`}>Kandungan 1 Tablet Sumber (mg)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={item.kandunganTablet}
                                onChange={(e) => updateBarisObatKapsul(item.id, 'kandunganTablet', e.target.value)}
                                placeholder="Contoh: 500"
                                className={`w-full p-2.5 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-lg text-xs font-medium outline-none`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Jumlah Kapsul Dibuat</label>
                      <input
                        type="number"
                        step="1"
                        value={jumlahKapsul}
                        onChange={(e) => setJumlahKapsul(e.target.value)}
                        placeholder="Contoh: 30"
                        className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>Target Bobot 1 Kapsul (mg, Pengisi SL)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bobotTargetKapsul}
                        onChange={(e) => setBobotTargetKapsul(e.target.value)}
                        placeholder="Contoh: 300"
                        className={`w-full p-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`}
                      />
                    </div>
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

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3.5 rounded-xl hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-200/20 transform active:scale-[0.98]"
              >
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
              <div
                className={`p-6 rounded-2xl text-center shadow-lg text-white transform transition-all ${
                  activeTab === 'interaksi' && interaksiResult?.tingkat === 'Major'
                    ? 'bg-gradient-to-br from-red-600 to-rose-700 shadow-red-200/20'
                    : activeTab === 'interaksi' && interaksiResult?.tingkat === 'Moderate'
                      ? 'bg-gradient-to-br from-amber-600 to-orange-600 shadow-amber-200/20'
                      : activeTab === 'interaksi' && interaksiResult?.tingkat === 'Aman'
                        ? 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-emerald-200/20'
                        : 'bg-gradient-to-br from-indigo-600 to-violet-600 shadow-indigo-200/20'
                }`}
              >
                {subInfoText && activeTab !== 'interaksi' && <p className="text-indigo-200 font-semibold mb-1 text-xs tracking-wide">{subInfoText}</p>}
                <p className="text-indigo-100 font-semibold mb-1 text-sm uppercase tracking-wider">
                  {activeTab === 'puyer'
                    ? 'Ambil & Gerus'
                    : activeTab === 'sirup'
                      ? 'Berikan Sebanyak'
                      : activeTab === 'injeksi'
                        ? 'Ambil & Suntikkan (Spuit)'
                        : activeTab === 'tpm'
                          ? 'Kecepatan Tetesan'
                          : activeTab === 'bsa'
                            ? 'Dosis Total Berdasarkan BSA'
                            : activeTab === 'ginjal'
                              ? 'Estimasi Klirens Kreatinin (CrCl)'
                              : activeTab === 'syringe'
                                ? 'Kecepatan Syringe Pump'
                                : activeTab === 'interaksi'
                                  ? 'Status Interaksi Obat'
                                  : activeTab === 'kapsul'
                                    ? 'Total Zat Aktif per Kapsul'
                                    : 'Dosis Sekali Minum'}
                </p>
                <p className="text-5xl font-black tracking-tight">
                  {activeTab === 'interaksi' ? interaksiResult?.tingkat : Number.isInteger(hasil) ? hasil : hasil.toFixed(2)}
                  {activeTab !== 'interaksi' && <span className="text-xl font-medium opacity-80">{satuanHasil}</span>}
                </p>
                {activeTab === 'interaksi' && interaksiResult && <p className="mt-3 text-xs sm:text-sm font-medium leading-relaxed bg-black/20 p-3 rounded-xl">{interaksiResult.deskripsi}</p>}

                {/* Rincian Tablet untuk Kapsul Multi-Obat */}
                {activeTab === 'kapsul' && (
                  <div className="mt-4 pt-4 border-t border-white/20 text-left space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">Rincian Tablet yang Harus Digerus:</p>
                    <div className="space-y-1.5">
                      {daftarObatKapsul.map((item, idx) => {
                        const dKps = parseFloat(item.dosisPerKapsul);
                        const kTab = parseFloat(item.kandunganTablet);
                        const nJml = parseFloat(jumlahKapsul);
                        if (!isNaN(dKps) && !isNaN(kTab) && !isNaN(nJml) && kTab > 0) {
                          const totalMg = dKps * nJml;
                          const tabReq = totalMg / kTab;
                          const formattedTab = Number.isInteger(tabReq) ? tabReq.toString() : tabReq.toFixed(2);
                          return (
                            <div key={item.id} className="flex justify-between items-center text-xs bg-black/20 px-3 py-1.5 rounded-lg">
                              <span className="font-semibold">
                                {idx + 1}. {item.nama || `Obat #${idx + 1}`} ({dKps} mg/kps)
                              </span>
                              <span className="font-black text-indigo-200">
                                {formattedTab} tablet ({totalMg} mg total)
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* --- GENERATOR TEKS ETIKET RESEP --- */}
              {activeTab !== 'ginjal' && activeTab !== 'syringe' && activeTab !== 'interaksi' && (
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
              )}
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
      </div>

      {/* --- FOOTER --- */}
      <footer className="max-w-6xl mx-auto w-full mt-12 pt-6 border-t border-gray-200 dark:border-slate-800 text-center pb-4">
        <p className="text-gray-500 dark:text-slate-400 text-sm flex items-center justify-center gap-1.5">
          <span>Built with</span>
          <span className="text-red-500 animate-pulse">❤️</span>
          <span>by</span>
          <span className="font-bold text-blue-600 dark:text-blue-400 tracking-wide">by Ayangnya Laila</span>
        </p>
        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 font-medium tracking-wider uppercase">© {new Date().getFullYear()} All rights reserved.</p>
      </footer>
    </main>
  );
}
