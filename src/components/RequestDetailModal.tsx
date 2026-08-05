import React, { useState } from 'react';
import { EquipmentRequest, RequestStatus } from '../types';
import { SignaturePad } from './SignaturePad';
import {
  X,
  FileDown,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  User,
  Building,
  Phone,
  Mail,
  Calendar,
  FileText,
  Printer,
  ShieldCheck,
  PenTool
} from 'lucide-react';
import { generateAndDownloadDocx, generateBonKeluarDocx } from '../utils/docxExport';

interface RequestDetailModalProps {
  request: EquipmentRequest | null;
  onClose: () => void;
  onUpdateStatus: (requestId: string, status: RequestStatus, adminNotes?: string, adminSignature?: string) => void;
  isAdmin: boolean;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  request,
  onClose,
  onUpdateStatus,
  isAdmin,
}) => {
  if (!request) return null;

  const [notes, setNotes] = useState(request.adminNotes || '');
  const [adminSignature, setAdminSignature] = useState<string | null>(request.adminSignature || null);
  const [adminSigError, setAdminSigError] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const handleDownloadWord = async () => {
    try {
      setIsExporting(true);
      await generateAndDownloadDocx(request);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat dokumen Word.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleApprove = async () => {
    if (!adminSignature) {
      setAdminSigError(true);
      alert('Tanda Tangan Katim wajib diisi sebelum menyetujui permintaan!');
      return;
    }
    setAdminSigError(false);
    setIsApproving(true);
    try {
      await onUpdateStatus(
        request.id,
        'Disetujui',
        notes || 'Permintaan barang disetujui.',
        adminSignature || undefined
      );
      setIsApproving(false);
      setIsApproved(true);
      setTimeout(() => {
        setIsApproved(false);
        onClose();
      }, 750);
    } catch (err) {
      console.error(err);
      setIsApproving(false);
    }
  };

  const handleReject = () => {
    onUpdateStatus(request.id, 'Ditolak', notes || 'Mohon maaf, permintaan belum dapat dipenuhi.', adminSignature || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-blue-300">
                  {request.requestNumber}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    request.status === 'Disetujui'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {request.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Formulir Permintaan Barang 
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Document Header Banner */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Jenis Transaksi
              </span>
              <span className="text-sm font-extrabold text-blue-700 block">
                TANDA PERMINTAAN BARANG (TPB)
              </span>
              {request.status === 'Disetujui' && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Barang Siap Diambil
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={handleDownloadWord}
                disabled={isExporting}
                className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                title="Unduh Form TPB"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Unduh TPB (.docx)</span>
              </button>

              {request.status === 'Disetujui' && (
                <button
                  onClick={async () => {
                    try {
                      setIsExporting(true);
                      await generateBonKeluarDocx(request);
                    } catch (e) {
                      console.error(e);
                      alert('Gagal mengunduh Bon Barang Keluar');
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                  title="Unduh Bon Barang Keluar (BKB)"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Unduh Bon Keluar (.docx)</span>
                </button>
              )}
            </div>
          </div>

          {/* Pemohon Info Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. Data Pemohon & Kontak
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/80 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Nama Pemohon</span>
                  <span className="font-bold text-slate-800">{request.requesterName}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Divisi</span>
                  <span className="font-bold text-slate-800">
                    {request.department}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-400 block text-[10px]">No. HP / WhatsApp</span>
                  <span className="font-bold text-slate-800">{request.phone}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2 border-t sm:border-t-0 sm:pt-0 border-slate-200">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Tanggal Pengajuan</span>
                  <span className="font-bold text-slate-800">{request.requestDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Requested Items Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              2. Rincian Barang Diminta ({request.items.length})
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-semibold">
                  <tr>
                    <th className="p-3 w-12 text-center">No</th>
                    <th className="p-3">Kode</th>
                    <th className="p-3">Nama Barang</th>
                    <th className="p-3 text-center">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {request.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="p-3 font-semibold text-blue-600">{item.itemCode}</td>
                      <td className="p-3 font-semibold text-slate-800">{item.itemName}</td>
                      <td className="p-3 text-center font-bold text-slate-900">
                        {item.quantity} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              3. Alasan / Keperluan & Tanda Tangan Pemohon
            </h4>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
              {request.purpose || 'Tidak mencantumkan keperluan khusus.'}
            </div>

            {/* Signature Pemohon Display */}
            <div className="pt-1">
              <SignaturePad
                label={`Tanda Tangan Pemohon`}
                value={request.requesterSignature}
                onChange={() => {}}
                readOnly={true}
              />
            </div>
          </div>

          {/* Admin Approval Control Box */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Keterangan Admin & Approval</span>
            </h4>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Catatan / Keterangan Admin
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Masukkan catatan persetujuan..."
                disabled={!isAdmin || request.status !== 'Menunggu'}
                className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-600"
              ></textarea>
            </div>

            {/* Admin Signature Pad */}
            <div className="pt-2">
              <SignaturePad
                label="Tanda Tangan Katim"
                value={adminSignature || undefined}
                onChange={(sig) => {
                  setAdminSignature(sig);
                  if (sig) setAdminSigError(false);
                }}
                readOnly={!isAdmin || request.status !== 'Menunggu'}
                required={isAdmin && request.status === 'Menunggu'}
                error={adminSigError}
              />
            </div>

            {/* Approval Actions - Only show button if status is still 'Menunggu' and user is admin */}
            {isAdmin && request.status === 'Menunggu' && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={handleApprove}
                  disabled={isApproving || isApproved}
                  className={`flex-1 min-w-[140px] py-2.5 px-4 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 transition-all ${
                    isApproved
                      ? 'bg-emerald-600 shadow-emerald-600/30 scale-102 ring-2 ring-emerald-400'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/20'
                  }`}
                >
                  {isApproved ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-white" />
                      <span>Disetujui!</span>
                    </>
                  ) : isApproving ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin text-white" />
                      <span>Proses Menyetujui...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Setujui Permintaan</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleReject}
                  className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Tolak</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            Dibuat pada: {new Date(request.createdAt).toLocaleString('id-ID')}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
