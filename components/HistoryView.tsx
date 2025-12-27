import React, { useState } from 'react';
import { HistoryEntry, CartItem, Product, BoardDimensions } from '../types';
import { ArrowLeft, Calendar, Package, Trash2, History as HistoryIcon, Hash, Box, PenSquare, Loader2 } from 'lucide-react';
import CartEditModal from './CartEditModal';
import { calculateStats } from '../services/geminiService';
import { updateSheetEntry } from '../services/sheetService';
import { AppSettings } from '../App';

interface HistoryViewProps {
  history: HistoryEntry[];
  onBack: () => void;
  onClearHistory: () => void;
  settings?: AppSettings;
  onUpdateHistoryEntry?: (entry: HistoryEntry) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onBack, onClearHistory, settings, onUpdateHistoryEntry }) => {
  const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Helper to parse dimensions string "LxWxT"
  const parseDimensions = (dimsStr: string, id: string, batchNumber: string): BoardDimensions => {
    const [l, w, t] = dimsStr.split('x').map(Number);
    return {
      id: id,
      length: l || 0,
      width: w || 0,
      thickness: t || 0,
      batchNumber: batchNumber
    };
  };

  const isToday = (timestampStr: string) => {
    const today = new Date().toLocaleDateString('ru-RU');
    // timestampStr is formatted 'dd.mm.yyyy, hh:mm:ss' or similar. 
    // We check if it starts with today's date.
    return timestampStr.startsWith(today);
  };

  const handleEditClick = (entry: HistoryEntry) => {
    // Only allow editing if cart data exists
    if (entry.cart && entry.cart.length >= 0) {
      setEditingEntry(entry);
    } else {
      alert("Данные о составе этой партии устарели и не могут быть отредактированы.");
    }
  };

  const handleCartUpdate = (product: Product, delta: number) => {
    if (!editingEntry) return;

    let newCart: CartItem[] = [];
    const prevCart = editingEntry.cart;

    const existing = prevCart.find(item => item.product.id === product.id);
    if (existing) {
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        newCart = prevCart.filter(item => item.product.id !== product.id);
      } else {
        newCart = prevCart.map(item =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
    } else if (delta > 0) {
      newCart = [...prevCart, { product, quantity: 1 }];
    } else {
      newCart = prevCart;
    }

    setEditingEntry({ ...editingEntry, cart: newCart });
  };

  const handleCartRemove = (productId: string) => {
    if (!editingEntry) return;
    const newCart = editingEntry.cart.filter(item => item.product.id !== productId);
    setEditingEntry({ ...editingEntry, cart: newCart });
  };

  const handleCartClear = () => {
    if (!editingEntry) return;
    setEditingEntry({ ...editingEntry, cart: [] });
  };

  const handleSaveEdit = async () => {
    if (!editingEntry || !onUpdateHistoryEntry || !settings) return;
    setIsUpdating(true);

    try {
      // 1. Recalculate stats or check if empty
      const isEmpty = editingEntry.cart.length === 0;

      let success = false;

      if (isEmpty) {
        // Special case: Soft Delete
        const { deleteEntry } = await import('../services/sheetService');
        success = await deleteEntry(editingEntry.boardId, settings.googleSheetUrl);

        if (success) {
          // Update local state to show it's deleted or remove it?
          // User request implies it's "0 items" but logic says "soft delete". 
          // If soft deleted, it might be filtered out or shown as deleted.
          // Let's remove it from local history to reflect "deleted" state immediately for user.
          // Or if the requirement is to keep it visible but 0, then we shouldn't use deleteEntry?
          // Request says: "считаем что это соответствует операции удаления и нам необходимо выполнить soft delete"
          // So we delete it.
          // But we also want to remove it from the list or update it to be 0? 
          // Usually delete means remove from list.
          // However, to keep it consistent with "soft delete", we might just remove it from UI history array via callback?
          // Actually, let's treat it as an update with 0 items locally, but in sheet it is deleted.
          // But wait, if we delete it in sheet, next fetch won't return it (if we filter).
          // Let's just remove it from the local list since it's "deleted".

          // To do this, we might need a way to tell parent to remove it.
          // onUpdateHistoryEntry currently updates. We might need onDeleteHistoryEntry?
          // Or we pass a special "deleted" flag in updatedEntry.

          const updatedEntry: HistoryEntry = {
            ...editingEntry,
            earnings: 0,
            yieldPercentage: 0,
            itemCount: 0,
            cart: [] // Empty cart
          };
          // Ideally we should remove it from the list
          // For now, let's update it to 0. If data is refetched, it will disappear (if filtered).
          onUpdateHistoryEntry(updatedEntry);
        }
      } else {
        const boardDims = parseDimensions(editingEntry.boardDims, editingEntry.boardId, editingEntry.batchNumber);
        const stats = calculateStats(boardDims, editingEntry.cart);

        const analysisResult = {
          earnings: stats.earnings,
          yieldPercentage: stats.yieldPercentage,
          boardVolumeM3: stats.boardVolumeM3,
          productsVolumeM3: stats.productsVolumeM3,
          message: "Обновлено вручную",
          motivationalQuote: ""
        };

        // 2. Update Google Sheet
        success = await updateSheetEntry(
          editingEntry.boardId,
          editingEntry.batchNumber,
          editingEntry.cart,
          analysisResult,
          settings.googleSheetUrl
        );

        if (success) {
          // 3. Update Local State
          const updatedEntry: HistoryEntry = {
            ...editingEntry,
            earnings: stats.earnings,
            yieldPercentage: stats.yieldPercentage,
            itemCount: editingEntry.cart.reduce((a, c) => a + c.quantity, 0)
          };
          onUpdateHistoryEntry(updatedEntry);
        }
      }

      if (success) {
        setEditingEntry(null);
      } else {
        alert("Не удалось обновить таблицу Google. Проверьте соединение.");
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка при сохранении изменений.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full bg-[#18181b] animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <HistoryIcon className="text-orange-500" size={24} />
              История партий
            </h1>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Очистить всю историю? Это действие нельзя отменить.')) {
                  onClearHistory();
                }
              }}
              className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <HistoryIcon size={48} className="mb-4 opacity-20" />
              <p>История пуста</p>
              <p className="text-sm opacity-60">Сохраненные партии появятся здесь</p>
            </div>
          ) : (
            history.map((entry) => {
              const editable = isToday(entry.timestamp);
              return (
                <div key={entry.id} className="bg-[#27272a] rounded-xl p-4 border border-zinc-800 shadow-sm relative">
                  {/* Top Row: Batch, Date, Earnings */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-zinc-800 p-2 rounded-lg text-zinc-400">
                        <Package size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          Партия {entry.batchNumber}
                          {editable && (
                            <span className="text-[10px] bg-green-900/40 text-green-400 px-1.5 rounded border border-green-800">Сегодня</span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 flex items-center gap-1">
                          <Calendar size={10} />
                          {entry.timestamp}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-500">+{entry.earnings} ₽</div>
                    </div>
                  </div>

                  {/* ID and Volume Info */}
                  <div className="flex items-center gap-4 mb-3 text-xs text-zinc-500 px-1">
                    <div className="flex items-center gap-1">
                      <Hash size={12} />
                      ID: {entry.boardId || entry.id.slice(-6)}
                    </div>
                    {entry.boardVolume && (
                      <div className="flex items-center gap-1">
                        <Box size={12} />
                        {typeof entry.boardVolume === 'number' ? entry.boardVolume.toFixed(4) : entry.boardVolume} м³
                      </div>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 text-sm bg-zinc-800/50 rounded-lg p-2">
                    <div className="text-center border-r border-zinc-700">
                      <div className="text-zinc-500 text-xs mb-1">Доска</div>
                      <div className="font-medium text-zinc-300 text-xs">{entry.boardDims}</div>
                    </div>
                    <div className="text-center border-r border-zinc-700">
                      <div className="text-zinc-500 text-xs mb-1">Изделий</div>
                      <div className="font-medium text-white">{entry.itemCount} шт</div>
                    </div>
                    <div className="text-center">
                      <div className="text-zinc-500 text-xs mb-1">КПД</div>
                      <div className={`font-medium ${entry.yieldPercentage > 70 ? 'text-green-400' : 'text-orange-400'}`}>
                        {entry.yieldPercentage}%
                      </div>
                    </div>
                  </div>

                  {/* Edit Button (Only for today's entries) */}
                  {editable && onUpdateHistoryEntry && (
                    <button
                      onClick={() => handleEditClick(entry)}
                      className="mt-3 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <PenSquare size={14} />
                      Редактировать состав
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingEntry && (
        <div className="relative z-50">
          <CartEditModal
            isOpen={true}
            onClose={() => setEditingEntry(null)}
            cart={editingEntry.cart || []}
            onUpdateCart={handleCartUpdate}
            onRemoveItem={handleCartRemove}
            onClearCart={handleCartClear}
          />
          {/* Override modal footer with Save action for history */}
          <div className="fixed bottom-0 left-0 right-0 p-4 z-[60] flex justify-center pointer-events-none">
            <div className="w-full max-w-lg bg-[#18181b] p-4 rounded-t-2xl border-t border-zinc-800 shadow-2xl pointer-events-auto flex gap-3">
              <button
                onClick={() => setEditingEntry(null)}
                disabled={isUpdating}
                className="px-6 py-3 bg-zinc-800 text-white rounded-xl font-bold"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isUpdating ? <Loader2 className="animate-spin" /> : null}
                Сохранить изменения
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HistoryView;