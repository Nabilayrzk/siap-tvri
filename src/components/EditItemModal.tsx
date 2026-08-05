import React, { useState, useEffect } from 'react';
import { EquipmentItem } from '../types';
import { X, PackagePlus, Image, Hash, Save, Upload, Check, RefreshCw, Plus, Minus, FileDown, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { generateBonMasukDocx } from '../utils/docxExport';

/**
 * Compresses an image file client-side before storing to prevent exceeding Firestore's 1MB document limit.
 */
const compressImageFile = (file: File, maxWidth = 500, maxHeight = 500, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

interface EditItemModalProps {
  item: EquipmentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: EquipmentItem) => void;
  categories: string[];
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  categories,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(item);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[1] || 'Alat Tulis Kantor (ATK)');
  const [stock, setStock] = useState(10);
  const [unit, setUnit] = useState('Botol');
  const [urlText, setUrlText] = useState('');
  const [uploadedFile, setUploadedFile] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [minStockAlert, setMinStockAlert] = useState(3);
  const [bonMasukKeterangan, setBonMasukKeterangan] = useState('');
  const [bonMasukSupplier, setBonMasukSupplier] = useState('');
  const [bonMasukNo, setBonMasukNo] = useState('');
  const [showBonMasukOptions, setShowBonMasukOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(false);
    setIsSaving(false);
    if (item) {
      setCode(item.code || '');
      setName(item.name || '');
      setCategory(item.category || categories[1] || 'Alat Tulis Kantor (ATK)');
      setStock(item.stock ?? 10);
      setUnit(item.unit || 'Botol');
      setDescription(item.description || '');
      setLocation(item.location || 'Gudang Utama Perlengkapan');
      setMinStockAlert(item.minStockAlert ?? 3);

      if (item.imageUrl && item.imageUrl.startsWith('data:')) {
        setUploadedFile(item.imageUrl);
        setUrlText('');
      } else {
        setUrlText(item.imageUrl || '');
        setUploadedFile('');
      }
    } else {
      setCode(`PRK-${Math.floor(100 + Math.random() * 900)}`);
      setName('');
      setCategory(categories[1] || 'Alat Tulis Kantor (ATK)');
      setStock(10);
      setUnit('Botol');
      setUrlText('');
      setUploadedFile('');
      setDescription('');
      setLocation('Gudang Utama Perlengkapan');
      setMinStockAlert(3);
    }
  }, [item, isOpen, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      alert('Mohon isi Nama Barang dan Kode Barang.');
      return;
    }

    setIsSaving(true);
    try {
      const finalImageUrl = uploadedFile ? uploadedFile : urlText.trim();

      const newItemData: EquipmentItem = {
        id: item ? item.id : `item-${Date.now()}`,
        code: code.trim(),
        name: name.trim(),
        category,
        stock: Number(stock),
        unit,
        imageUrl: finalImageUrl,
        description: description || '',
        location: location || 'Gudang Utama Perlengkapan',
        minStockAlert: Number(minStockAlert),
      };

      await onSave(newItemData);
      setIsSaving(false);
      setIsSaved(true);

      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 750);
    } catch (err) {
      console.error('Gagal menyimpan barang:', err);
      alert('Terjadi kesalahan saat menyimpan barang. Silakan coba lagi.');
      setIsSaving(false);
    }
  };

  const currentPreviewImage = uploadedFile || urlText.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <PackagePlus className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">
              {isEditing ? 'Edit Barang Perlengkapan' : 'Tambah Barang Baru ke Inventaris'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">Kode Barang *</label>
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="misal: PRK-328"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">Nama Barang Perlengkapan *</label>
            <input
              type="text"
              required
              placeholder="misal: Tinta Stempel Cap Polos"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
            />
          </div>

          {/* 3-Column Inputs with Uniform Styling */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Jumlah Stok *</label>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setStock(Math.max(0, stock - 1))}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold flex items-center justify-center border border-slate-300 shrink-0 text-sm transition-colors"
                  title="Kurangi 1"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  required
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(Math.max(0, Number(e.target.value)))}
                  className="w-full px-2 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setStock(stock + 1)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold flex items-center justify-center border border-slate-300 shrink-0 text-sm transition-colors"
                  title="Tambah 1"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Satuan *</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              >
                <option value="Botol">Botol</option>
                <option value="Buah">Buah</option>
                <option value="Doos">Doos</option>
                <option value="Dos">Dos</option>
                <option value="Hanger">Hanger</option>
                <option value="Lembar">Lembar</option>
                <option value="Pak">Pak</option>
                <option value="Pcs">Pcs</option>
                <option value="Rim">Rim</option>
                <option value="Roll">Roll</option>
                <option value="Unit">Unit</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Batas Warning Stok</label>
              <input
                type="number"
                min={1}
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
          
          {/* Image Selection & Direct Upload */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">
              Foto Barang
            </label>
            
            <div className="flex items-center gap-2 mb-2">
              <label className="cursor-pointer px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl border border-blue-200 text-xs flex items-center gap-1.5 shrink-0 transition-colors">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Upload Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const compressedBase64 = await compressImageFile(file);
                        setUploadedFile(compressedBase64);
                        setUrlText('');
                      } catch (err) {
                        console.error('Gagal memproses gambar:', err);
                        alert('Gagal memproses file foto. Coba pilih file foto lain.');
                      }
                    }
                  }}
                />
              </label>

              <div className="relative flex-1">
                <Image className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Atau tempel URL gambar (https://...)"
                  disabled={Boolean(uploadedFile)}
                  value={uploadedFile ? '[Foto File Ter-Upload]' : urlText}
                  onChange={(e) => {
                    if (!uploadedFile) {
                      setUrlText(e.target.value);
                    }
                  }}
                  className={`w-full pl-9 pr-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs truncate ${
                    uploadedFile
                      ? 'bg-slate-100 text-slate-500 border-slate-200 italic'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>

            {/* Preview image if available */}
            {currentPreviewImage ? (
              <div className="mt-2 flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <img
                  src={currentPreviewImage}
                  alt="Preview"
                  className="w-12 h-12 object-cover rounded-lg border border-slate-300 shrink-0 bg-white"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">Pratinjau Foto Barang</p>
                  <p className="text-[10px] text-slate-500">
                    {uploadedFile ? 'Foto Lokal (Diunggah dari File)' : 'URL Link Gambar Web'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedFile('');
                    setUrlText('');
                  }}
                  className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 font-semibold text-xs px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors"
                >
                  Hapus Foto
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                Kosongkan jika barang tidak memiliki foto.
              </p>
            )}
          </div>

          {/* Bon Masuk Options Section */}
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowBonMasukOptions(!showBonMasukOptions)}
              className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors text-slate-800"
            >
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Pengaturan Opsi Cetak Bon Barang Masuk (BBM)</span>
              </div>
              <div className="flex items-center space-x-1 text-[11px] text-blue-600 font-bold">
                <span>{showBonMasukOptions ? 'Sembunyikan Opsi' : 'Atur Nomor & Supplier'}</span>
                {showBonMasukOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {showBonMasukOptions && (
              <div className="mt-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 text-xs">
                {/* Header Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      No. Urut Bon Masuk
                    </label>
                    <input
                      type="text"
                      value={bonMasukNo}
                      onChange={(e) => setBonMasukNo(e.target.value)}
                      placeholder="Kosongkan jika otomatis"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Diterima Dari (Supplier/Asal)
                    </label>
                    <input
                      type="text"
                      value={bonMasukSupplier}
                      onChange={(e) => setBonMasukSupplier(e.target.value)}
                      placeholder="Kosongkan jika strip (-)"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Keterangan Bon (Opsional)
                    </label>
                    <input
                      type="text"
                      value={bonMasukKeterangan}
                      onChange={(e) => setBonMasukKeterangan(e.target.value)}
                      placeholder="Kosongkan jika tidak ada"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={async () => {
                if (!code || !name) {
                  alert('Isi Nama Barang dan Kode Barang terlebih dahulu untuk mencetak Bon Barang Masuk.');
                  return;
                }
                try {
                  await generateBonMasukDocx(
                    { code, name, category, stock: Number(stock), unit, location },
                    Number(stock) || 1,
                    bonMasukSupplier.trim(),
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    bonMasukKeterangan.trim(),
                    bonMasukNo.trim()
                  );
                  if (bonMasukNo.trim()) {
                    const currentNum = parseInt(bonMasukNo.trim(), 10);
                    if (!isNaN(currentNum)) {
                      const nextNum = (currentNum + 1).toString();
                      setBonMasukNo(nextNum);
                      localStorage.setItem('last_bon_masuk_seq', nextNum);
                    }
                  }
                } catch (e) {
                  console.error(e);
                  alert('Gagal membuat Bon Barang Masuk');
                }
              }}
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs border border-blue-200 transition-colors flex items-center space-x-1.5"
              title="Unduh Bon Barang Masuk (BMB) dalam format Word"
            >
              <FileDown className="w-4 h-4 text-blue-600" />
              <span>Cetak Bon Masuk (.docx)</span>
            </button>

            <div className="flex items-center space-x-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isSaved}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl text-xs transition-colors disabled:opacity-40"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving || isSaved}
                className={`px-5 py-2.5 text-white font-bold rounded-xl shadow-md flex items-center space-x-1.5 text-xs transition-all ${
                  isSaved
                    ? 'bg-emerald-600 shadow-emerald-600/30 scale-102 ring-2 ring-emerald-400'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/20'
                }`}
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                    <span>Tersimpan!</span>
                  </>
                ) : isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Data Barang</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

