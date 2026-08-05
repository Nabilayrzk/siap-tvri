import React, { useState } from 'react';
import { EquipmentRequest } from '../types';
import { Search, FileText, X, CheckCircle, Clock, XCircle, FileDown, Building, Calendar, Package } from 'lucide-react';
import { generateAndDownloadDocx } from '../utils/docxExport';

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: EquipmentRequest[];
}

export const TrackingModal: React.FC<TrackingModalProps> = ({
  isOpen,
  onClose,
  requests,
}) => {
  if (!isOpen) return null;

  const [searchNumber, setSearchNumber] = useState('');
  const [selectedReq, setSelectedReq] = useState<EquipmentRequest | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const matchedRequests = requests.filter((r) => {
    if (!searchNumber.trim()) return true;
    const q = searchNumber.toLowerCase().trim();
    return (
      r.requestNumber.toLowerCase().includes(q) ||
      r.requesterName.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Lacak Status Permintaan (TPB)</h3>
              <p className="text-[11px] text-slate-400">Pantau status persetujuan & pengambilan barang</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berdasarkan Nomor TPB (contoh: TPB/2026/08/001) atau nama pemohon..."
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold text-slate-900"
            />
          </div>

          {/* List of Matched Requests */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
              Daftar Pengajuan Permintaan ({matchedRequests.length})
            </h4>

            {matchedRequests.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold">Pengajuan TPB tidak ditemukan</p>
                <p className="text-[11px]">Pastikan Nomor TPB atau Nama Pemohon yang dimasukkan sudah sesuai.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {matchedRequests.map((req) => {
                  const isApproved = req.status === 'Disetujui';
                  const isPending = req.status === 'Menunggu';

                  return (
                    <div
                      key={req.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isApproved
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : isPending
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5 mb-2.5">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-900">
                              {req.requestNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                isApproved
                                  ? 'bg-emerald-600 text-white'
                                  : isPending
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-rose-500 text-white'
                              }`}
                            >
                              {isApproved ? 'DISETUJUI' : req.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {req.requesterName} • {req.department}
                          </p>
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{req.requestDate}</span>
                        </div>
                      </div>

                      {/* Items Summary */}
                      <div className="mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Barang Diminta:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {req.items.map((it, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800"
                            >
                              {it.itemName} ({it.quantity} {it.unit})
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Status Pickup Instructions */}
                      {isApproved && (
                        <div className="bg-emerald-100/70 border border-emerald-300 p-2.5 rounded-lg text-emerald-900 mb-3 text-[11px]">
                          <strong className="font-bold flex items-center gap-1 text-emerald-800">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Barang Siap Diambil!
                          </strong>
                        </div>
                      )}

                      {/* Download Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                        <button
                          onClick={async () => {
                            try {
                              setIsExporting(true);
                              await generateAndDownloadDocx(req);
                            } catch (e) {
                              console.error(e);
                              alert('Gagal mengunduh file TPB');
                            } finally {
                              setIsExporting(false);
                            }
                          }}
                          disabled={isExporting}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>Unduh Form TPB (.docx)</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
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
