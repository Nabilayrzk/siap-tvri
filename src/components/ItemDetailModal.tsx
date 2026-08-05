import React, { useState } from 'react';
import { EquipmentItem } from '../types';
import { X, MapPin, Tag, Plus, Minus, Check, ShoppingBag, ShieldAlert, Package } from 'lucide-react';

interface ItemDetailModalProps {
  item: EquipmentItem | null;
  onClose: () => void;
  onAddToCart: (item: EquipmentItem, quantity: number) => void;
  cartQuantity: number;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  onClose,
  onAddToCart,
  cartQuantity,
}) => {
  if (!item) return null;

  const [qty, setQty] = useState<number>(cartQuantity > 0 ? cartQuantity : 1);

  const isOutOfStock = item.stock === 0;

  const handleAdd = () => {
    if (qty > item.stock) return;
    onAddToCart(item, qty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-blue-300 border border-slate-700 font-semibold">
              {item.code}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Photo */}
          <div className="relative h-72 sm:h-80 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center p-2">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const sibling = (e.target as HTMLElement).nextElementSibling;
                  if (sibling) sibling.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`flex flex-col items-center justify-center text-slate-300 space-y-1 ${item.imageUrl ? 'hidden' : ''}`}>
              <Package className="w-16 h-16 stroke-1" />
              <span className="text-xs text-slate-400 font-medium">Tanpa Foto Barang</span>
            </div>

            <div className="absolute top-3 right-3">
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full shadow-md ${
                  isOutOfStock
                    ? 'bg-rose-600 text-white'
                    : item.stock <= (item.minStockAlert || 3)
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                Stok: {item.stock} {item.unit}
              </span>
            </div>
          </div>

          {/* Title */}
          <div>
            <h3 className="text-xl font-bold text-slate-900">{item.name}</h3>
          </div>

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-semibold text-slate-800">Jumlah:</span>
              <div className="flex items-center space-x-3 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-700"
                  disabled={qty <= 1}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-sm text-slate-900 w-8 text-center">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(item.stock, qty + 1))}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-700"
                  disabled={qty >= item.stock}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
          {isOutOfStock ? (
            <button
              disabled
              className="px-5 py-2 text-xs font-bold text-slate-400 bg-slate-200 rounded-lg cursor-not-allowed"
            >
              Stok Habis
            </button>
          ) : (
            <button
              onClick={handleAdd}
              className="flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md shadow-blue-500/20"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>
                {cartQuantity > 0 ? 'Update Keranjang' : 'Tambah ke Keranjang Request'}
              </span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
