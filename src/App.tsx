import React, { useState, useEffect } from 'react';
import {
  EquipmentItem,
  EquipmentRequest,
  CartItem,
  RequestStatus,
  AdminUser
} from './types';
import {
  INITIAL_CATEGORIES,
  INITIAL_ITEMS,
  INITIAL_REQUESTS
} from './data/initialData';
import {
  subscribeToItems,
  subscribeToRequests,
  subscribeToAdmins,
  saveAdminDb,
  submitRequestAtomic,
  updateRequestStatusAtomic,
  deleteRequestAtomic,
  updateItemStockDb,
  saveItemDb,
  deleteItemDb,
  clearAllItemsDb,
  clearAllRequestsAtomic,
  resetDatabaseDb,
  safeSetLocalStorage
} from './lib/firebaseService';
import { Header } from './components/Header';
import { ItemCatalog } from './components/ItemCatalog';
import { ItemDetailModal } from './components/ItemDetailModal';
import { RequestCartModal } from './components/RequestCartModal';
import { AdminPanel } from './components/AdminPanel';
import { RequestDetailModal } from './components/RequestDetailModal';
import { EditItemModal } from './components/EditItemModal';
import { AdminAuthPage } from './components/AdminAuthPage';
import { TrackingModal } from './components/TrackingModal';
import { ShoppingBag, ShieldAlert } from 'lucide-react';

export default function App() {
  // URL Path Routing state: '/' or '/siap' (Pemohon) vs '/admin' or '/siap/admin' (Admin)
  const checkIsAdminPath = () => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return path.includes('/admin') || hash.includes('admin');
  };

  const [isAdmin, setIsAdmin] = useState<boolean>(() => checkIsAdminPath());

  const changeRoute = (toAdmin: boolean) => {
    const currentPath = window.location.pathname.toLowerCase();
    const isSiapPrefix = currentPath.startsWith('/siap');
    let targetPath = toAdmin ? '/admin' : '/';
    if (isSiapPrefix) {
      targetPath = toAdmin ? '/siap/admin' : '/siap';
    }
    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState({}, '', targetPath);
    }
    setIsAdmin(toAdmin);
  };

  // Registered Admin Accounts List in LocalStorage
  const [registeredAdmins, setRegisteredAdmins] = useState<(AdminUser & { passwordHash: string })[]>(() => {
    const saved = localStorage.getItem('siperlan_registered_admins');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    // Starts empty - user registers their own real admin account
    return [];
  });

  // Current Active Admin Login Session
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('siperlan_active_admin');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState<boolean>(false);

  // Real-time items and requests from Firestore
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('siperlan_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals and error states
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<EquipmentItem | null>(null);
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<EquipmentRequest | null>(null);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState<boolean>(false);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  // Synchronize clean URL path routing (/ for Pemohon, /admin for Admin)
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdmin(checkIsAdminPath());
    };

    // Auto-migrate legacy hash URLs if present (#admin -> /admin, #pemohon -> /)
    if (window.location.hash.toLowerCase().includes('admin')) {
      window.history.replaceState({}, '', '/admin');
    } else if (window.location.hash.toLowerCase().includes('pemohon')) {
      window.history.replaceState({}, '', '/');
    }

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Save registered admins list to localStorage
  useEffect(() => {
    safeSetLocalStorage('siperlan_registered_admins', JSON.stringify(registeredAdmins));
  }, [registeredAdmins]);

  // Save active admin session to localStorage
  useEffect(() => {
    if (currentAdminUser) {
      safeSetLocalStorage('siperlan_active_admin', JSON.stringify(currentAdminUser));
    } else {
      localStorage.removeItem('siperlan_active_admin');
    }
  }, [currentAdminUser]);

  // Subscribe to real-time Firestore database updates across all devices
  useEffect(() => {
    const handleFirestoreError = (err: any) => {
      const msg = err?.message || String(err);
      if (msg.includes('Quota exceeded') || msg.includes('resource-exhausted')) {
        setQuotaExceeded(true);
      }
    };

    const unsubscribeItems = subscribeToItems(
      INITIAL_ITEMS,
      (data) => setItems(data),
      handleFirestoreError
    );
    const unsubscribeRequests = subscribeToRequests(
      INITIAL_REQUESTS,
      (data) => setRequests(data),
      handleFirestoreError
    );
    const unsubscribeAdmins = subscribeToAdmins(
      (data) => setRegisteredAdmins(data),
      handleFirestoreError
    );

    return () => {
      unsubscribeItems();
      unsubscribeRequests();
      unsubscribeAdmins();
    };
  }, []);

  // Save cart to LocalStorage
  useEffect(() => {
    safeSetLocalStorage('siperlan_cart', JSON.stringify(cart));
  }, [cart]);

  // Admin auth handlers
  const handleAdminLoginSuccess = (admin: AdminUser) => {
    setCurrentAdminUser(admin);
    changeRoute(true);
  };

  const handleRegisterAdmin = (newAdmin: AdminUser & { passwordHash: string }) => {
    setRegisteredAdmins((prev) => [...prev, newAdmin]);
    saveAdminDb(newAdmin);
  };

  const handleAdminLogout = () => {
    setCurrentAdminUser(null);
    changeRoute(false);
  };

  // Cart operations
  const handleAddToCart = (item: EquipmentItem, quantity: number) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((c) => c.item.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const newQty = Math.min(item.stock, updated[existingIndex].quantity + quantity);
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
        return updated;
      } else {
        return [...prevCart, { item, quantity: Math.min(item.stock, quantity) }];
      }
    });
  };

  const handleUpdateCartQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.item.id === itemId ? { ...c, quantity: newQty } : c))
    );
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Submit new request with atomic Firestore transaction
  const handleSubmitRequest = async (
    requestData: Omit<EquipmentRequest, 'id' | 'requestNumber' | 'status' | 'createdAt'>
  ): Promise<EquipmentRequest> => {
    const newRequest = await submitRequestAtomic(requestData, requests);
    return newRequest;
  };

  // Admin Item CRUD with Firestore
  const handleSaveItem = async (itemData: EquipmentItem) => {
    await saveItemDb(itemData);
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteItemDb(itemId);
  };

  const handleUpdateStock = async (itemId: string, newStock: number) => {
    await updateItemStockDb(itemId, newStock);
  };

  // Admin Request Status Update with Firestore
  const handleUpdateStatus = async (
    requestId: string,
    status: RequestStatus,
    adminNotes?: string,
    adminSignature?: string
  ) => {
    const targetReq = requests.find((r) => r.id === requestId);
    if (!targetReq) return;

    if (status === 'Disetujui' && !adminSignature && !targetReq.adminSignature) {
      alert('Tanda Tangan Katim / Admin Perlengkapan wajib diisi sebelum menyetujui permintaan!');
      setSelectedRequestDetail(targetReq);
      return;
    }

    await updateRequestStatusAtomic(requestId, targetReq, status, adminNotes, adminSignature);
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data pengajuan SPB ini?')) {
      const targetReq = requests.find((r) => r.id === requestId);
      if (targetReq) {
        setRequests((prev) => {
          const updated = prev.filter((r) => r.id !== requestId);
          safeSetLocalStorage('siperlan_cached_requests', JSON.stringify(updated));
          return updated;
        });
        try {
          await deleteRequestAtomic(requestId, targetReq);
        } catch (e) {
          console.error('Error deleting request:', e);
        }
      }
    }
  };

  const handleClearAllRequests = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh riwayat SPB? Nomor urut SPB berikutnya akan otomatis dimulai kembali dari nomor 1.')) {
      const currentReqs = [...requests];
      setRequests([]);
      safeSetLocalStorage('siperlan_cached_requests', JSON.stringify([]));
      try {
        await clearAllRequestsAtomic(currentReqs);
      } catch (e) {
        console.error('Error clearing all requests:', e);
      }
    }
  };

  const handleClearAllItems = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus SELURUH daftar barang sampel? Anda dapat langsung memasukkan barang-barang asli baru melalui tombol "Tambah Barang Baru".')) {
      await clearAllItemsDb();
      setCart([]);
      localStorage.removeItem('siperlan_cart');
    }
  };

  const handleResetData = async () => {
    if (confirm('Apakah Anda yakin ingin mengembalikan data sampel ke kondisi awal di database server?')) {
      await resetDatabaseDb(INITIAL_ITEMS, INITIAL_REQUESTS);
      setCart([]);
      localStorage.removeItem('siperlan_cart');
    }
  };

  const pendingRequestsCount = requests.filter((r) => r.status === 'Menunggu').length;
  const totalCartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Header Bar */}
      <Header
        isAdmin={isAdmin}
        setIsAdmin={(value) => {
          changeRoute(value);
        }}
        cart={cart}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => setIsTrackingModalOpen(true)}
        pendingRequestCount={pendingRequestsCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAddItem={() => {
          setEditingItem(null);
          setIsEditItemModalOpen(true);
        }}
        currentAdminUser={currentAdminUser}
        onLogoutAdmin={handleAdminLogout}
      />

      {/* Firestore Quota Exceeded Notification Banner */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-900 text-xs sm:text-sm">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <strong className="font-semibold">Batas Kuota Harian Firestore Gratisan Tercapai:</strong>{' '}
                <span>Aplikasi saat ini secara otomatis menggunakan data lokal (offline cache). Kuota akan teriset otomatis dalam 24 jam.</span>
              </div>
            </div>
            <a
              href="https://console.firebase.google.com/project/googly-theme-7ds98/firestore/databases/ai-studio-sistemperlengkap-2c4676c7-c106-4e69-913c-abd555f2f0f7/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold whitespace-nowrap transition-colors"
            >
              Kelola Kuota Firestore &rarr;
            </a>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAdmin ? (
          /* PORTAL PEMOHON (Katalog & Form SPB) */
          <ItemCatalog
            items={items}
            categories={INITIAL_CATEGORIES}
            cart={cart}
            onAddToCart={handleAddToCart}
            onSelectItemDetail={(item) => setSelectedItemDetail(item)}
            searchQuery={searchQuery}
          />
        ) : !currentAdminUser ? (
          /* PORTAL ADMIN - HARUS LOGIN / DAFTAR AKUN ADMIN */
          <AdminAuthPage
            onLoginSuccess={handleAdminLoginSuccess}
            registeredAdmins={registeredAdmins}
            onRegisterAdmin={handleRegisterAdmin}
            onGoToPemohon={() => {
              changeRoute(false);
            }}
          />
        ) : (
          /* PORTAL ADMIN - DASHBOARD & KELOLA SPB (SUDAH LOGIN) */
          <AdminPanel
            items={items}
            requests={requests}
            searchQuery={searchQuery}
            onOpenEditItem={(item) => {
              setEditingItem(item);
              setIsEditItemModalOpen(true);
            }}
            onDeleteItem={handleDeleteItem}
            onUpdateStock={handleUpdateStock}
            onUpdateStatus={handleUpdateStatus}
            onOpenRequestDetail={(req) => setSelectedRequestDetail(req)}
            onResetData={handleResetData}
            onDeleteRequest={handleDeleteRequest}
            onClearAllRequests={handleClearAllRequests}
            onClearAllItems={handleClearAllItems}
            categories={INITIAL_CATEGORIES}
            currentAdminUser={currentAdminUser}
            onLogoutAdmin={handleAdminLogout}
          />
        )}
      </main>

      {/* Floating Action Button for Mobile User Cart */}
      {!isAdmin && totalCartCount > 0 && (
        <div className="fixed bottom-6 right-6 z-40 sm:hidden">
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center space-x-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm shadow-2xl shadow-blue-600/50 border border-blue-400/30"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Keranjang</span>
            <span className="bg-amber-400 text-slate-900 font-extrabold text-xs w-6 h-6 rounded-full flex items-center justify-center ml-1">
              {totalCartCount}
            </span>
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} SIAP TVRI - Sistem Informasi Aset Persediaan.</span>
          <span className="text-slate-500 font-medium">
            Tim Kerja Perlengkapan &amp; Urusan Dalam LPP TVRI
          </span>
        </div>
      </footer>

      {/* Modals */}
      <ItemDetailModal
        item={selectedItemDetail}
        onClose={() => setSelectedItemDetail(null)}
        onAddToCart={handleAddToCart}
        cartQuantity={
          selectedItemDetail
            ? cart.find((c) => c.item.id === selectedItemDetail.id)?.quantity || 0
            : 0
        }
      />

      <RequestCartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onSubmitRequest={handleSubmitRequest}
      />

      <RequestDetailModal
        request={selectedRequestDetail}
        onClose={() => setSelectedRequestDetail(null)}
        onUpdateStatus={handleUpdateStatus}
        isAdmin={isAdmin}
      />

      <EditItemModal
        item={editingItem}
        isOpen={isEditItemModalOpen}
        onClose={() => {
          setIsEditItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        categories={INITIAL_CATEGORIES}
      />

      <TrackingModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        requests={requests}
      />

    </div>
  );
}
