import React, { useState } from 'react';
import { CartItem, EquipmentRequest, RequestType } from '../types';
import { SignaturePad } from './SignaturePad';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Send,
  Calendar,
  User,
  Building,
  Phone,
  IdCard,
  Mail,
  FileText,
  Package,
  CheckCircle,
  FileDown
} from 'lucide-react';
import { generateAndDownloadDocx } from '../utils/docxExport';

interface RequestCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (itemId: string, newQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onSubmitRequest: (requestData: Omit<EquipmentRequest, 'id' | 'requestNumber' | 'status' | 'createdAt'>) => Promise<EquipmentRequest> | EquipmentRequest;
}

export const RequestCartModal: React.FC<RequestCartModalProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onSubmitRequest,
}) => {
  if (!isOpen) return null;

  const [requesterName, setRequesterName] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [nip, setNip] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [requesterSignature, setRequesterSignature] = useState<string | null>(null);
  const [sigError, setSigError] = useState(false);

  const [createdRequest, setCreatedRequest] = useState<EquipmentRequest | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!requesterName || !department) {
      alert('Mohon lengkapi Nama Pemohon dan Unit Kerja.');
      return;
    }

    if (!requesterSignature) {
      setSigError(true);
      alert('Tanda Tangan Pemohon wajib diisi sebelum mengirimkan permintaan barang!');
      return;
    }
    setSigError(false);

    const itemsSpec = cart.map((c) => ({
      itemId: c.item.id,
      itemCode: c.item.code,
      itemName: c.item.name,
      quantity: c.quantity,
      unit: c.item.unit,
    }));

    try {
      const newReq = await onSubmitRequest({
        requesterName,
        department,
        position: position || 'Staff',
        nip: nip || '-',
        email: '-',
        phone: phone || '-',
        requestType: 'Permintaan',
        requestDate,
        purpose: purpose || 'Permintaan Barang Perlengkapan Operasional',
        items: itemsSpec,
        requesterSignature: requesterSignature || undefined,
      });

      setCreatedRequest(newReq);
      onClearCart();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('STOK_INSUFFICIENT')) {
        alert(msg.replace('STOK_INSUFFICIENT: ', 'Pengajuan Gagal: '));
      } else {
        alert(`Gagal mengirimkan pengajuan: ${msg || 'Terjadi kesalahan pada koneksi database.'}`);
      }
    }
  };

  const handleDownloadWord = async () => {
    if (createdRequest) {
      await generateAndDownloadDocx(createdRequest);
    }
  };

  const handleFinish = () => {
    setCreatedRequest(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white h-full w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden animate-slide-left">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-base">Keranjang & Form Permintaan Barang</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Success Screen after submission */}
          {createdRequest ? (
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle className="w-12 h-12" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Permintaan Berhasil Dikirim
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-3">
                  {createdRequest.requestNumber}
                </h3>
                <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                  Pengajuan barang perlengkapan Anda telah masuk ke sistem dan menunggu verifikasi dari Petugas Perlengkapan.
                </p>
              </div>

              {/* Box Info */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="grid grid-cols-[100px_16px_1fr] items-center">
                  <span className="text-slate-500">Pemohon</span>
                  <span className="text-slate-400 font-semibold">:</span>
                  <span className="font-bold text-slate-800 text-right">{createdRequest.requesterName}</span>
                </div>
                <div className="grid grid-cols-[100px_16px_1fr] items-center">
                  <span className="text-slate-500">Unit Kerja</span>
                  <span className="text-slate-400 font-semibold">:</span>
                  <span className="font-bold text-slate-800 text-right">{createdRequest.department}</span>
                </div>
                <div className="grid grid-cols-[100px_16px_1fr] items-center">
                  <span className="text-slate-500">Jumlah Barang</span>
                  <span className="text-slate-400 font-semibold">:</span>
                  <span className="font-bold text-slate-800 text-right">{createdRequest.items.length}</span>
                </div>
              </div>

              {/* Download Word Button */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleDownloadWord}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2 transition-all"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Unduh Dokumen Word (.docx)</span>
                </button>
                <button
                  onClick={handleFinish}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm rounded-xl transition-all"
                >
                  Kembali ke Katalog
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Selected Items List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <span>Daftar Barang Diminta ({cart.length})</span>
                  </h3>
                  {cart.length > 0 && (
                    <button
                      onClick={onClearCart}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Kosongkan</span>
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="bg-slate-50 rounded-xl p-8 text-center border border-dashed border-slate-300">
                    <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-600">Keranjang request masih kosong</p>
                    <p className="text-xs text-slate-400 mt-1">Pilih barang dari katalog perlengkapan terlebih dahulu.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(({ item, quantity }) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 gap-3"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover bg-white shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-blue-600 font-bold block">
                            {item.code}
                          </span>
                          <h4 className="font-semibold text-xs text-slate-800 truncate">{item.name}</h4>
                          <span className="text-[11px] text-slate-500">
                            Stok Tersedia: {item.stock} {item.unit}
                          </span>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <div className="flex items-center space-x-1 bg-white border border-slate-300 rounded-lg p-1">
                            <button
                              onClick={() => onUpdateQuantity(item.id, quantity - 1)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold w-6 text-center">{quantity}</span>
                            <button
                              onClick={() => onUpdateQuantity(item.id, Math.min(item.stock, quantity + 1))}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600"
                              disabled={quantity >= item.stock}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-xs font-semibold text-slate-500 min-w-[28px]">
                            {item.unit}
                          </span>
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Hapus dari daftar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Permintaan */}
              {cart.length > 0 && (
                <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-200">
                  
                  {/* Tipe Form (Read-only Indicator) */}
                  <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Tipe Pengajuan</span>
                      <span className="text-xs font-extrabold text-blue-900">Tanda Permintaan Barang</span>
                    </div>
                  </div>

                  {/* Requester Information */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                      Informasi Pemohon & Unit Kerja
                    </h4>

                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">
                        Nama Lengkap Pemohon 
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="contoh: Jumadi, S.Sn"
                          value={requesterName}
                          onChange={(e) => setRequesterName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">
                          Unit Kerja 
                        </label>
                        <div className="relative">
                          <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                          <select
                            required
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                          >
                            <option value="" disabled>-- Pilih Unit Kerja --</option>
                            <option value="Berita">Berita</option>
                            <option value="Keuangan">Keuangan</option>
                            <option value="Konten Media Baru">Konten Media Baru</option>
                            <option value="Pengembangan Usaha">Pengembangan Usaha</option>
                            <option value="Program">Program</option>
                            <option value="Program (Dokpus)">Program (Dokpus)</option>
                            <option value="Program (Tata Artistik, Dekorasi & Properti)">Program (Tata Artistik, Dekorasi & Properti)</option>
                            <option value="Program  (Tata Rias)">Program (Tata Rias)</option>
                            <option value="Promo">Promo</option>
                            <option value="Sekretariat">Sekretariat</option>
                            <option value="Tata Usaha">Tata Usaha</option>
                            <option value="Teknik">Teknik</option>
                            <option value="Umum (SDM)">Umum (SDM)</option>
                            <option value="Umum (BMN/Perlengkapan)">Umum (BMN/Perlengkapan)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">
                          NIP
                        </label>
                        <div className="relative">
                          <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Masukkan NIP"
                            value={nip}
                            onChange={(e) => setNip(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dates & Phone */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">
                          Tanggal Pengajuan
                        </label>
                        <div className="relative">
                          <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="date"
                            value={requestDate}
                            onChange={(e) => setRequestDate(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">
                          No. HP / WhatsApp
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            placeholder="contoh: 0812xxxxxx"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Purpose */}
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">
                        Keperluan / Catatan
                      </label>
                      <div className="relative">
                        <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <textarea
                          rows={2}
                          placeholder="Jelaskan keperluan permintaan barang..."
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        ></textarea>
                      </div>
                    </div>

                    {/* Signature Pad Pemohon */}
                    <div className="pt-2">
                      <SignaturePad
                        label="Tanda Tangan Pemohon"
                        value={requesterSignature || undefined}
                        onChange={(sig) => {
                          setRequesterSignature(sig);
                          if (sig) setSigError(false);
                        }}
                        required={true}
                        error={sigError}
                      />
                    </div>

                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all"
                    >
                      <Send className="w-4 h-4" />
                      <span>Kirim Permintaan Ke Admin</span>
                    </button>
                  </div>

                </form>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

