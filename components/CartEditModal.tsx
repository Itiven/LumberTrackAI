import React from 'react';
import { CartItem, Product } from '../types';
import { X, Trash2, Plus, Minus, PackageX } from 'lucide-react';

interface CartEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateCart: (product: Product, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  boardId?: string;
}

const CartEditModal: React.FC<CartEditModalProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateCart,
  onRemoveItem,
  onClearCart,
  boardId
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#18181b] w-full max-w-lg h-[85vh] sm:h-auto sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl flex flex-col border border-zinc-800 shadow-2xl animate-in slide-in-from-bottom duration-300">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">
            {boardId ? `Доска № ${boardId}` : 'Изделия партии'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-10">
              <PackageX size={48} className="mb-4 opacity-50" />
              <p>Список пуст</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="bg-[#27272a] p-3 rounded-xl border border-zinc-800 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate">{item.product.name}</h3>
                  <div className="text-xs text-zinc-400">
                    {item.product.dimensions.length}x{item.product.dimensions.width} мм
                  </div>
                  <div className="text-sm font-medium text-green-500 mt-1">
                    {item.product.price} ₽/шт
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Controls */}
                  <div className="flex items-center bg-zinc-800 rounded-lg p-1">
                    <button
                      onClick={() => onUpdateCart(item.product, -1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-zinc-700 rounded-md text-white transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-bold text-white">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateCart(item.product, 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-zinc-700 rounded-md text-white transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Delete Btn */}
                  <button
                    onClick={() => onRemoveItem(item.product.id)}
                    className="p-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex gap-3">
          {cart.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Удалить все изделия из этой партии?')) {
                  onClearCart();
                }
              }}
              className="px-4 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-colors"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors active:scale-95"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartEditModal;