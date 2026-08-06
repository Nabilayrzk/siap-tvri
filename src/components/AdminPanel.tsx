import React, { useState } from 'react';
import {
  EquipmentItem,
  EquipmentRequest,
  RequestStatus,
  AdminUser
} from '../types';
import {
  FileText,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Plus,
  FileDown,
  Edit2,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Sliders,
  Eye,
  Check,
  History,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  User,
  Building
} from 'lucide-react';
import { generateAndDownloadDocx } from '../utils/docxExport';

interface AdminPanelProps {
  items: EquipmentItem[];
  requests: EquipmentRequest[];
  onOpenEditItem: (item: EquipmentItem | null) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateStock: (itemId: string, newStock: number) => void;
  onUpdateStatus: (requestId: string, status: RequestStatus, adminNotes?: string) => void;
  onOpenRequestDetail: (request: EquipmentRequest) => void;
  onResetData: () => void;
  onDeleteRequest?: (requestId: string) => void;
  onClearAllRequests?: () => void;
  onClearAllItems?: () => void;
  categories: string[];
  searchQuery?: string;
  currentAdminUser?: AdminUser | null;
  onLogoutAdmin?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  items,
  requests,
  onOpenEditItem,
  onDeleteItem,
  onUpdateStock,
  onUpdateStatus,
  onOpenRequestDetail,
  onResetData,
  onDeleteRequest,
  onClearAllRequests,
  onClearAllItems,
  categories,
  searchQuery = '',
  currentAdminUser,
  onLogoutAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'inventory' | 'history'>('requests');
  
  // Requests Tab Filter
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [requestSearch, setRequestSearch] = useState<string>('');

  // Inventory Tab Filter
  const [inventorySearch, setInventorySearch] = useState<string>('');
  const [inventoryCatFilter, setInventoryCatFilter] = useState<string>('Semua');
  const [inventoryStockFilter, setInventoryStockFilter] = useState<'all' | 'available' | 'low' | 'empty'>('all');

  // History Modal & Filter State
  const [historySearch, setHistorySearch] = useState<string>('');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<EquipmentItem | null>(null);

  // Helper to compile detailed movement logs for a specific item
  const getItemMovementLogs = (item: EquipmentItem) => {
    const logs: Array<{
      id: string;
      type: 'IN' | 'OUT';
      date: string;
      title: string;
      subtitle: string;
      qty: number;
      unit: string;
      requestNumber?: string;
      purpose?: string;
      department?: string;
      requesterName?: string;
    }> = [];

    // Outgoing requests that were approved
    const approvedItemReqs = requests
      .filter((r) => r.status === 'Disetujui' && r.items.some((it) => it.itemId === item.id))
      .sort((a, b) => new Date(b.approvedAt || b.requestDate).getTime() - new Date(a.approvedAt || a.requestDate).getTime());

    approvedItemReqs.forEach((r) => {
      const matchedSpec = r.items.find((it) => it.itemId === item.id);
      const qty = matchedSpec ? matchedSpec.quantity : 0;
      const rawDate = r.approvedAt || r.requestDate;
      let formattedDate = rawDate;
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          formattedDate = `${day}/${month}/${year}`;
        }
      } catch {
        // fallback
      }

      logs.push({
        id: `out-${r.id}`,
        type: 'OUT',
        date: formattedDate,
        title: `Pengeluaran Barang (${r.requestNumber})`,
        subtitle: `Pemohon: ${r.requesterName} (${r.department})`,
        qty,
        unit: item.unit || 'pcs',
        requestNumber: r.requestNumber,
        purpose: r.purpose,
        department: r.department,
        requesterName: r.requesterName,
      });
    });

    // Incoming stock entry log
    const totalOut = approvedItemReqs.reduce((acc, r) => {
      const spec = r.items.find((it) => it.itemId === item.id);
      return acc + (spec ? spec.quantity : 0);
    }, 0);
    const initialIn = (item as any).lastAddedQty || (item.stock + totalOut);

    if (initialIn > 0) {
      logs.push({
        id: `in-initial-${item.id}`,
        type: 'IN',
        date: 'Penerimaan Awal',
        title: 'Input / Penambahan Stok Barang',
        subtitle: 'Mutasi Masuk Gudang Perlengkapan',
        qty: initialIn,
        unit: item.unit || 'pcs',
      });
    }

    return logs;
  };

  // Stats calculation
  const pendingCount = requests.filter((r) => r.status === 'Menunggu').length;
  const approvedCount = requests.filter((r) => r.status === 'Disetujui').length;
  const lowStockItems = items.filter((i) => i.stock <= (i.minStockAlert || 3));
  const totalStockUnit = items.reduce((acc, curr) => acc + curr.stock, 0);

  // Helper to calculate total units currently borrowed/taken (Disetujui) for each item
  const getBorrowedQty = (itemId: string) => {
    let total = 0;
    requests
      .filter((r) => r.status === 'Disetujui')
      .forEach((r) => {
        r.items.forEach((item) => {
          if (item.itemId === itemId) {
            total += item.quantity;
          }
        });
      });
    return total;
  };

  // Helper to format/get latest activity for an item
  const getItemActivity = (item: EquipmentItem) => {
    // Find approved requests containing this item
    const approvedItemRequests = requests
      .filter((r) => r.status === 'Disetujui' && r.items.some((it) => it.itemId === item.id))
      .sort((a, b) => new Date(b.approvedAt || b.requestDate).getTime() - new Date(a.approvedAt || a.requestDate).getTime());

    if (approvedItemRequests.length > 0) {
      const latestReq = approvedItemRequests[0];
      const matchedSpec = latestReq.items.find((it) => it.itemId === item.id);
      const qty = matchedSpec ? matchedSpec.quantity : 0;
      const rawDate = latestReq.approvedAt || latestReq.requestDate;
      let formattedDate = rawDate;
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          formattedDate = `${day}/${month}/${year}`;
        }
      } catch {
        // fallback
      }
      return `${formattedDate} (Keluar ${qty} - ${latestReq.department || 'Pemohon'})`;
    }

    // If no outgoing requests, show entry activity if stock exists
    if (item.stock > 0) {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      return `${day}/${month}/${year} (Masuk ${item.stock})`;
    }

    return 'Belum ada transaksi';
  };

  // Filtered requests
  const effectiveRequestQuery = (searchQuery || requestSearch).trim().toLowerCase();
  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'Semua' || r.status === statusFilter;
    const matchesSearch =
      !effectiveRequestQuery ||
      r.requestNumber.toLowerCase().includes(effectiveRequestQuery) ||
      r.requesterName.toLowerCase().includes(effectiveRequestQuery) ||
      r.department.toLowerCase().includes(effectiveRequestQuery) ||
      r.purpose.toLowerCase().includes(effectiveRequestQuery) ||
      r.items.some((it) => it.itemName.toLowerCase().includes(effectiveRequestQuery));
    return matchesStatus && matchesSearch;
  });

  // Filtered inventory
  const effectiveInventoryQuery = (searchQuery || inventorySearch).trim().toLowerCase();
  const filteredInventory = items.filter((i) => {
    const matchesSearch =
      !effectiveInventoryQuery ||
      i.name.toLowerCase().includes(effectiveInventoryQuery) ||
      i.code.toLowerCase().includes(effectiveInventoryQuery) ||
      i.category.toLowerCase().includes(effectiveInventoryQuery) ||
      (i.location && i.location.toLowerCase().includes(effectiveInventoryQuery));

    let matchesStock = true;
    if (inventoryStockFilter === 'available') matchesStock = i.stock > 0;
    else if (inventoryStockFilter === 'low') matchesStock = i.stock > 0 && i.stock <= (i.minStockAlert || 3);
    else if (inventoryStockFilter === 'empty') matchesStock = i.stock === 0;

    const matchesCat = inventoryCatFilter === 'Semua' || i.category === inventoryCatFilter;

    return matchesSearch && matchesStock && matchesCat;
  });

  return (
    <div className="space-y-6">

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Permintaan Pending */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Menunggu Otorisasi</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{pendingCount}</span>
              <span className="text-xs text-amber-600 font-bold">TPB Pending</span>
            </div>
          </div>
        </div>

        {/* Card 2: Permintaan Disetujui */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Permintaan Disetujui</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{approvedCount}</span>
              <span className="text-xs text-emerald-600 font-bold">TPB Selesai</span>
            </div>
          </div>
        </div>

        {/* Card 3: Stok Kritis */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Stok Kritis / Habis</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{lowStockItems.length}</span>
              <span className="text-xs text-rose-600 font-bold">Item Kritis</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Jenis Barang */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Total Jenis Barang</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{items.length}</span>
              <span className="text-xs text-slate-500 font-medium">({totalStockUnit} total unit)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-4">
        
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'requests'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Kelola Permintaan({requests.length})</span>
              {pendingCount > 0 && (
                <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'inventory'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Kelola Stok Inventaris ({items.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Riwayat Stok</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenEditItem(null)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Barang Baru</span>
            </button>
          </div>
        </div>

        {/* TAB 1: KELOLA PERMINTAAN */}
        {activeTab === 'requests' && (
          <div className="space-y-4 min-h-[420px]">
            
            {/* Filters Bar */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Cari no. tpb, nama pemohon, atau divisi..."
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="w-full max-w-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Status Filter Buttons & Clear TPB History */}
              <div className="flex items-center space-x-2 shrink-0 flex-wrap sm:flex-nowrap gap-y-2">
                <div className="flex items-center space-x-1 shrink-0">
                  {['Semua', 'Menunggu', 'Disetujui'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                        statusFilter === st
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {onClearAllRequests && requests.length > 0 && (
                  <button
                    onClick={onClearAllRequests}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap"
                    title="Kosongkan semua pengajuan dan reset nomor TPB kembali ke 1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset / Kosongkan TPB</span>
                  </button>
                )}
              </div>
            </div>

            {/* Table of Requests */}
            {filteredRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 min-h-[280px] flex flex-col items-center justify-center">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-xs text-slate-600">Tidak ada pengajuan barang yang cocok.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs min-h-[280px]">
                <table className="w-full text-xs">
                  <thead className="bg-slate-900 text-white font-semibold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 text-center w-48">No. TPB</th>
                      <th className="py-3 px-4 text-center w-28">Tanggal</th>
                      <th className="py-3 px-4 text-center w-40">Pemohon & Divisi</th>
                      <th className="py-3 px-4 text-center">Jenis & Item</th>
                      <th className="py-3 px-4 text-center w-28">Status</th>
                      <th className="py-3 px-4 text-center w-24">Lihat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredRequests.map((req) => {
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-slate-900">
                            {req.requestNumber}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-900 font-medium">
                            {req.requestDate}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold text-slate-900 block">{req.requesterName}</span>
                            <span className="text-[11px] text-slate-700">{req.department}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center">
                              <p className="text-[11px] font-semibold text-slate-800 text-center truncate max-w-[280px]">
                                {req.items.map((i) => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ')}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center space-x-1 ${
                                req.status === 'Disetujui'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800 animate-pulse'
                              }`}
                            >
                              <span>{req.status}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              
                              {/* Open Detail */}
                              <button
                                onClick={() => onOpenRequestDetail(req)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                                title="Lihat Detail & Otorisasi"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Download Word Document */}
                              {/* <button
                                onClick={() => generateAndDownloadDocx(req)}
                                className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                                title="Unduh Dokumen Word (.docx)"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                                <span>Word (.docx)</span>
                              </button> */}

                              {/* Approve / Authorize Action if Pending */}
                              {req.status === 'Menunggu' && (
                                <button
                                  onClick={() => {
                                    if (!req.adminSignature) {
                                      alert('Tanda Tangan Katim wajib diisi sebelum menyetujui permintaan!');
                                      onOpenRequestDetail(req);
                                    } else {
                                      onUpdateStatus(req.id, 'Disetujui', 'Disetujui oleh Admin', req.adminSignature);
                                    }
                                  }}
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                                  title="Otorisasi & Tanda Tangan TPB"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete Request Record */}
                              {onDeleteRequest && (
                                <button
                                  onClick={() => onDeleteRequest(req.id)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                                  title="Hapus Data Pengajuan Ini"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}

                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: KELOLA STOK BARANG */}
        {activeTab === 'inventory' && (
          <div className="space-y-4 min-h-[450px]">
            
            {/* Unified Filter & Search Bar */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
              
              {/* Search Box */}
              <div className="flex items-center space-x-2 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Cari kode barang, nama barang..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="w-full max-w-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Status Stock Filter Controls */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none shrink-0">
                <div className="flex items-center space-x-1 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1 hidden xl:block" />
                  <button
                    onClick={() => setInventoryStockFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                      inventoryStockFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Semua ({items.length})
                  </button>
                  <button
                    onClick={() => setInventoryStockFilter('available')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                      inventoryStockFilter === 'available'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    Tersedia ({items.filter((i) => i.stock > 0).length})
                  </button>
                  <button
                    onClick={() => setInventoryStockFilter('low')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                      inventoryStockFilter === 'low'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    Hampir Habis ({items.filter((i) => i.stock > 0 && i.stock <= (i.minStockAlert || 3)).length})
                  </button>
                  <button
                    onClick={() => setInventoryStockFilter('empty')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                      inventoryStockFilter === 'empty'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    Stok Habis ({items.filter((i) => i.stock === 0).length})
                  </button>
                </div>

                <div className="text-slate-500 text-xs font-medium whitespace-nowrap shrink-0 hidden xl:block pl-2 border-l border-slate-200">
                  Menampilkan <span className="font-bold text-slate-800">{filteredInventory.length}</span> jenis barang
                </div>
              </div>

            </div>

            {/* Inventory Table */}
            {filteredInventory.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 min-h-[280px] flex flex-col items-center justify-center">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-xs text-slate-600">Tidak ada barang inventaris yang cocok.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs min-h-[280px]">
                <table className="w-full text-xs">
                <thead className="bg-slate-900 text-white font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-16 text-center">Foto</th>
                    <th className="py-3 px-4 w-44 text-left">Kode Barang</th>
                    <th className="py-3 px-4 text-left">Nama Barang</th>
                    <th className="py-3 px-3 w-28 text-center">Satuan</th>
                    <th className="py-3 px-4 w-36 text-center">Stok</th>
                    <th className="py-3 px-4 w-24 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredInventory.map((item) => {
                    const isLow = item.stock <= (item.minStockAlert || 3);
                    const isEmpty = item.stock === 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 text-center">
                          <div className="flex justify-center">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                  const sibling = (e.target as HTMLElement).nextElementSibling;
                                  if (sibling) sibling.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 ${item.imageUrl ? 'hidden' : ''}`}>
                              <Package className="w-5 h-5" />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-left font-bold text-slate-800">
                          {item.code}
                        </td>
                        <td className="py-3 px-4 text-left">
                          <span className="font-bold text-slate-900 block">{item.name}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-xs inline-block capitalize">
                            {item.unit || 'pcs'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                              isEmpty
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : isLow
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {item.stock} {item.unit || 'pcs'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => onOpenEditItem(item)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                              title="Edit Data Barang"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Hapus barang ${item.name} dari inventaris?`)) {
                                  onDeleteItem(item.id);
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                              title="Hapus Barang"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}

          </div>
        )}

        {/* TAB 3: RIWAYAT STOK */}
        {activeTab === 'history' && (
          <div className="space-y-4 min-h-[450px]">
            
            {/* Filter & Search for History */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Cari nama barang atau kode barang..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full max-w-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="text-slate-500 text-xs font-medium whitespace-nowrap shrink-0">
                Riwayat & mutasi stok barang
              </div>
            </div>

            {/* Status Stock Filter Controls */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none shrink-0">
                <div className="flex items-center space-x-1 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1 hidden xl:block" />
                  <button
                    onClick={() => setInventoryStockFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                      inventoryStockFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Semua ({items.length})
                  </button>
                  <button
                    onClick={() => setInventoryStockFilter('available')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                      inventoryStockFilter === 'available'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    Tersedia ({items.filter((i) => i.stock > 0).length})
                  </button>
                  <button
                    onClick={() => setInventoryStockFilter('low')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                      inventoryStockFilter === 'low'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    Hampir Habis ({items.filter((i) => i.stock > 0 && i.stock <= (i.minStockAlert || 3)).length})
                  </button>
                  <button
                    onClick={() => setInventoryStockFilter('empty')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                      inventoryStockFilter === 'empty'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    Stok Habis ({items.filter((i) => i.stock === 0).length})
                  </button>
                </div>

                <div className="text-slate-500 text-xs font-medium whitespace-nowrap shrink-0 hidden xl:block pl-2 border-l border-slate-200">
                  Menampilkan <span className="font-bold text-slate-800">{filteredInventory.length}</span> jenis barang
                </div>
              </div>
              
            {/* History Table */}
            {(() => {
              const filteredHistory = items.filter((item) => {
                const q = (searchQuery || historySearch).trim().toLowerCase();
                if (!q) return true;
                return (
                  item.name.toLowerCase().includes(q) ||
                  item.code.toLowerCase().includes(q) ||
                  item.category.toLowerCase().includes(q)
                );
              });

              if (filteredHistory.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 min-h-[280px] flex flex-col items-center justify-center">
                    <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-xs text-slate-600">Tidak ada data riwayat barang yang cocok.</p>
                  </div>
                );
              }

              return (
                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs min-h-[280px]">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900 text-white font-semibold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-3 px-3 w-14 text-center">Foto</th>
                        <th className="py-3 px-4 w-40 text-left">Kode Barang</th>
                        <th className="py-3 px-4 text-left">Nama Barang</th>
                        <th className="py-3 px-3 w-32 text-center">Masuk</th>
                        <th className="py-3 px-3 w-32 text-center">Keluar</th>
                        <th className="py-3 px-4 w-28 text-center">Stok</th>
                        <th className="py-3 px-4 w-40 text-center">Riwayat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredHistory.map((item) => {
                        const logs = getItemMovementLogs(item);
                        const totalOut = getBorrowedQty(item.id);
                        const totalIn = (item as any).lastAddedQty || (item.stock + totalOut);
                        const unitStr = item.unit || 'pcs';

                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3 text-center">
                              <div className="flex justify-center">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                      const sibling = (e.target as HTMLElement).nextElementSibling;
                                      if (sibling) sibling.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                <div className={`w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 ${item.imageUrl ? 'hidden' : ''}`}>
                                  <Package className="w-5 h-5" />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-left font-bold text-slate-800">
                              {item.code}
                            </td>
                            <td className="py-3 px-4 text-left font-bold text-slate-900">
                              {item.name}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                                totalIn > 0 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                {totalIn > 0 ? `+${totalIn} ${unitStr}` : `0 ${unitStr}`}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                                totalOut > 0 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                {totalOut > 0 ? `-${totalOut} ${unitStr}` : `0 ${unitStr}`}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-800">
                              {item.stock} {unitStr}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => setSelectedHistoryItem(item)}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-all inline-flex items-center space-x-1.5 shadow-2xs hover:shadow-xs"
                                title="Buka pop-up riwayat mutasi barang"
                              >
                                <History className="w-3.5 h-3.5 text-blue-600" />
                                <span>Lihat Riwayat ({logs.length})</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

          </div>
        )}

      </div>

      {/* POP-UP MODAL: DETAIL RIWAYAT BARANG */}
      {selectedHistoryItem && (() => {
        const itemLogs = getItemMovementLogs(selectedHistoryItem);
        const totalOut = getBorrowedQty(selectedHistoryItem.id);
        const totalIn = (selectedHistoryItem as any).lastAddedQty || (selectedHistoryItem.stock + totalOut);
        const unitStr = selectedHistoryItem.unit || 'pcs';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    {selectedHistoryItem.imageUrl ? (
                      <img
                        src={selectedHistoryItem.imageUrl}
                        alt={selectedHistoryItem.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded" style={{ fontFamily: 'Arial, sans-serif' }}>
                        {selectedHistoryItem.code}
                      </span>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {selectedHistoryItem.category}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      Riwayat Mutasi: {selectedHistoryItem.name}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedHistoryItem(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Stats Bar */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 grid grid-cols-3 gap-3 text-center">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Total Masuk</span>
                  <span className="text-sm font-bold text-emerald-600">+{totalIn} {unitStr}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Total Keluar</span>
                  <span className="text-sm font-bold text-rose-600">-{totalOut} {unitStr}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block">Stok Saat Ini</span>
                  <span className="text-sm font-bold text-slate-900">{selectedHistoryItem.stock} {unitStr}</span>
                </div>
              </div>

              {/* Timeline Logs List */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                    <History className="w-4 h-4 text-blue-600" />
                    <span>Daftar Transaksi Pergerakan Barang</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">{itemLogs.length} Catatan Log</span>
                </div>

                {itemLogs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-semibold">Belum ada catatan mutasi untuk barang ini.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-200 ml-4 space-y-5 my-2 pl-5">
                    {itemLogs.map((log) => {
                      const isOut = log.type === 'OUT';

                      return (
                        <div key={log.id} className="relative group">
                          {/* Circle Dot Icon */}
                          <div
                            className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs shadow-xs ${
                              isOut ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                          >
                            {isOut ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            )}
                          </div>

                          {/* Log Content Card */}
                          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mb-1 ${
                                    isOut ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {isOut ? 'Keluar / Diambil' : 'Masuk / Input Stok'}
                                </span>
                                <h5 className="font-bold text-slate-900 text-xs">{log.title}</h5>
                                <p className="text-[11px] text-slate-600 mt-0.5">{log.subtitle}</p>
                              </div>

                              <div className="text-right shrink-0">
                                <span
                                  className={`text-sm font-black block ${
                                    isOut ? 'text-rose-600' : 'text-emerald-600'
                                  }`}
                                >
                                  {isOut ? `-${log.qty}` : `+${log.qty}`} {log.unit}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                                  {log.date}
                                </span>
                              </div>
                            </div>

                            {log.purpose && (
                              <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex items-start space-x-1">
                                <span className="font-semibold text-slate-700">Tujuan:</span>
                                <span className="italic text-slate-600">{log.purpose}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
                <button
                  onClick={() => setSelectedHistoryItem(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  Tutup Pop-Up
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
