import React, { useState } from 'react';
import {
  EquipmentItem,
  CartItem
} from '../types';
import {
  Eye,
  Plus,
  Check,
  Package,
  AlertTriangle,
  XCircle,
  MapPin,
  Layers,
  Filter
} from 'lucide-react';

interface ItemCatalogProps {
  items: EquipmentItem[];
  categories: string[];
  cart: CartItem[];
  onAddToCart: (item: EquipmentItem, quantity: number) => void;
  onSelectItemDetail: (item: EquipmentItem) => void;
  searchQuery: string;
}

export const ItemCatalog: React.FC<ItemCatalogProps> = ({
  items,
  categories,
  cart,
  onAddToCart,
  onSelectItemDetail,
  searchQuery,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  // Filter items based on search and category
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'Semua' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getItemCartQuantity = (itemId: string) => {
    const found = cart.find((c) => c.item.id === itemId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="space-y-6">

      {/* Grid of Equipment Items */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">Barang tidak ditemukan</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Tidak ada barang perlengkapan yang sesuai dengan kata kunci atau filter status yang Anda pilih.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map((item) => {
            const inCartQty = getItemCartQuantity(item.id);
            const isOutOfStock = item.stock === 0;
            const isLowStock = item.stock > 0 && item.stock <= (item.minStockAlert || 3);

            return (
              <div
                key={item.id}
                className={`group bg-white rounded-xl border transition-all duration-200 flex flex-col overflow-hidden hover:shadow-lg ${
                  isOutOfStock
                    ? 'border-slate-200 opacity-80'
                    : isLowStock
                    ? 'border-amber-200 hover:border-amber-400'
                    : 'border-slate-200 hover:border-blue-400'
                }`}
              >
                {/* Image Container */}
                <div className="relative h-48 bg-slate-50 overflow-hidden flex items-center justify-center p-2">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const sibling = (e.target as HTMLElement).nextElementSibling;
                        if (sibling) sibling.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`flex flex-col items-center justify-center text-slate-300 space-y-1 ${item.imageUrl ? 'hidden' : ''}`}>
                    <Package className="w-12 h-12 stroke-1" />
                    <span className="text-[10px] text-slate-400 font-medium">Tanpa Foto</span>
                  </div>
            
                  {/* Quick Detail Overlay Button */}
                  <button
                    onClick={() => onSelectItemDetail(item)}
                    className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Lihat Detail Barang"
                  >
                    <span className="bg-white/90 hover:bg-white text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center space-x-1 transform translate-y-2 group-hover:translate-y-0 transition-all">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Detail</span>
                    </span>
                  </button>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
          
                    {/* Name */}
                    <h4 className="font-bold text-slate-800 text-sm line-clamp-2 hover:text-blue-600 transition-colors">
                      {item.name}
                    </h4>
                  </div>

                  {/* Actions / Cart Controls */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 block">Ketersediaan</span>
                      <span className="text-xs font-extrabold text-slate-800">
                        {item.stock} {item.unit}
                      </span>
                    </div>

                    {/* Add to Request Button */}
                    {isOutOfStock ? (
                      <button
                        disabled
                        className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-lg cursor-not-allowed border border-slate-200"
                      >
                        Tidak Tersedia
                      </button>
                    ) : (
                      <button
                        onClick={() => onAddToCart(item, 1)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                          inCartQty > 0
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          {inCartQty > 0 ? `Dipilih (${inCartQty})` : 'Pilih'}
                        </span>
                      </button>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
