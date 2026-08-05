import React from 'react';
import { ShoppingBag, Shield, UserCheck, Search, PlusCircle, SearchCode, LogOut, User } from 'lucide-react';
import { CartItem, AdminUser } from '../types';
import { TvriLogo } from './TvriLogo';

interface HeaderProps {
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
  cart: CartItem[];
  onOpenCart: () => void;
  onOpenTracking?: () => void;
  pendingRequestCount: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenAddItem?: () => void;
  currentAdminUser?: AdminUser | null;
  onLogoutAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  setIsAdmin,
  cart,
  onOpenCart,
  onOpenTracking,
  pendingRequestCount,
  searchQuery,
  setSearchQuery,
  onOpenAddItem,
  currentAdminUser,
  onLogoutAdmin,
}) => {
  const totalCartItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white shadow-lg border-b border-blue-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 shrink-0">
            <TvriLogo className="w-10 h-10 drop-shadow-md" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white tracking-wide text-sm sm:text-base hidden sm:block">
                  SIAP TVRI
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isAdmin 
                    ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40' 
                    : 'bg-blue-500/30 text-blue-200 border border-blue-400/40'
                }`}>
                  {isAdmin ? 'PORTAL ADMIN' : 'PEMOHON'}
                </span>
              </div>
              <p className="text-[11px] text-blue-200/80 hidden sm:block">Sistem Informasi Aset Persediaan TVRI</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-2 sm:mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/70" />
              <input
                type="text"
                placeholder={isAdmin ? "Cari barang, no. tpb, atau nama..." : "Cari barang perlengkapan..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-blue-950/70 border border-blue-700/50 rounded-xl text-white placeholder-blue-200/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-200 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            
            {/* User Mode: Tracking, Admin Login & Cart Buttons */}
            {!isAdmin && (
              <>
                {onOpenTracking && (
                  <button
                    onClick={onOpenTracking}
                    className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white rounded-xl font-bold text-xs sm:text-sm transition-all border border-slate-700 shadow-sm"
                    title="Lacak status permintaan TPB yang sudah diajukan"
                  >
                    <SearchCode className="w-4 h-4 text-amber-400" />
                    <span className="hidden lg:inline">Lacak TPB</span>
                  </button>
                )}

                <button
                  onClick={() => setIsAdmin(true)}
                  className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20 border border-indigo-500/30"
                  title="Masuk ke Halaman Login Admin"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Login Admin</span>
                </button>

                <button
                  onClick={onOpenCart}
                  className="relative flex items-center space-x-2 px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-500/30 border border-blue-400/30"
                  id="cart-button"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="hidden sm:inline">Request</span>
                  {totalCartItems > 0 && (
                    <span className="ml-1 bg-amber-400 text-slate-900 font-extrabold text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                      {totalCartItems}
                    </span>
                  )}
                </button>
              </>
            )}

            {/* Admin Mode: Add Item Quick Button & Logged-In Admin Badge */}
            {isAdmin && (
              <>
                {onOpenAddItem && currentAdminUser && (
                  <button
                    onClick={onOpenAddItem}
                    className="hidden md:flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-500/20 border border-emerald-400/30"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Tambah Barang</span>
                  </button>
                )}

                {currentAdminUser && (
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-950/90 border border-indigo-700/60 rounded-xl text-xs">
                    <User className="w-3.5 h-3.5 text-indigo-300" />
                    <span className="font-bold text-indigo-100 max-w-[130px] truncate" title={currentAdminUser.name}>
                      {currentAdminUser.name}
                    </span>
                  </div>
                )}

                {currentAdminUser && onLogoutAdmin && (
                  <button
                    onClick={onLogoutAdmin}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition-all shadow-xs"
                    title="Keluar / Logout dari Akun Admin"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                )}
              </>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
