
import React, { useState, useEffect } from 'react';
import { Product, CartItem, BoardDimensions } from '../types';
import { Plus, Minus, ArrowRight, ArrowLeft, Coins, Settings, History, Archive, AlertCircle } from 'lucide-react';
import { calculateStats } from '../services/geminiService'; // Import calculation logic

interface ProductGridProps {
  products: Product[];
  cart: CartItem[];
  onUpdateCart: (product: Product, delta: number) => void;
  onReview: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onBack: () => void;
  board: BoardDimensions | null; // Add board prop
  startTime?: number;
}

import { HelpModal } from './HelpModal';
import { Info } from 'lucide-react';

const ProductGrid: React.FC<ProductGridProps> = ({
  products, cart, onUpdateCart, onReview, onOpenSettings, onOpenHistory, onBack, board, startTime
}) => {
  const [showHelp, setShowHelp] = useState(false); // Add state
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime) {
      setElapsed(Math.round((Date.now() - startTime) / 1000));
      interval = setInterval(() => {
        setElapsed(Math.round((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [startTime]);

  const getQuantity = (productId: string) => {
    return cart.find(item => item.product.id === productId)?.quantity || 0;
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Calculate real-time stats
  const calculateLocalStats = () => {
    // Basic product stats (always possible)
    const productStats = cart.reduce((acc, item) => {
      const pVol = item.product.dimensions.length *
        item.product.dimensions.width *
        item.product.dimensions.thickness;
      return {
        earnings: acc.earnings + (item.product.price * item.quantity),
        volumeMm3: acc.volumeMm3 + (pVol * item.quantity)
      };
    }, { earnings: 0, volumeMm3: 0 });

    if (!board) {
      return {
        earnings: productStats.earnings,
        boardVolumeM3: 0,
        productsVolumeM3: productStats.volumeMm3 / 1e9,
        yieldPercentage: 0
      };
    }

    return calculateStats(board, cart);
  };

  const stats = calculateLocalStats();
  const estimatedEarnings = stats.earnings;

  return (
    <div className="pb-24 px-4 pt-4">
      <div className="flex flex-col gap-2 mb-4 sticky top-0 bg-[#18181b] z-10 py-2 border-b border-zinc-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                Каталог
                {startTime && (
                  <span className="text-lg font-mono text-orange-500 bg-zinc-800/50 px-2 py-0.5 rounded">
                    {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
                  </span>
                )}
                {board && (
                  <span className="text-xs font-normal text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Archive size={10} />
                    Партия #{board.batchNumber}
                  </span>
                )}
              </h2>
              {/* Stats ... */}
              {board && (
                <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                  <span title="ID Доски">ID: {board.id.slice(-4)}</span>
                  <span className="text-zinc-600">|</span>
                  <span title="Объем продукции / Объем доски">
                    <span className={stats.productsVolumeM3 > stats.boardVolumeM3 ? "text-red-500" : "text-blue-400"}>
                      {stats.productsVolumeM3.toFixed(4)}
                    </span>
                    <span className="text-zinc-500"> / </span>
                    <span>{stats.boardVolumeM3.toFixed(4)} м³</span>
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenHistory}
              className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 rounded-full"
            >
              <History size={20} />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 rounded-full"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 text-zinc-500 hover:text-orange-400 transition-colors bg-zinc-800/50 rounded-full"
            >
              <Info size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Content ... (lines 84-154) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {products.map((product) => {
          const qty = getQuantity(product.id);
          return (
            <div key={product.id} className="bg-[#27272a] rounded-2xl overflow-hidden flex flex-col shadow-sm border border-zinc-800">
              {/* Product Image */}
              <div className="relative h-32 w-full bg-zinc-800">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover opacity-80"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=No+Image';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                    <span className="text-xs">Нет фото</span>
                  </div>
                )}
                {/* Price Tag */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                  <div className="text-white font-bold text-lg flex items-center gap-1">
                    {product.price} ₽
                  </div>
                </div>

                {qty > 0 && (
                  <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                    x{qty}
                  </div>
                )}
              </div>

              <div className="p-3 flex flex-col flex-grow">
                <h3 className="font-semibold text-sm leading-tight mb-1">{product.name}</h3>
                <p className="text-zinc-400 text-xs mb-3">
                  {product.dimensions.length}x{product.dimensions.width} мм
                </p>

                <div className="mt-auto">
                  {qty === 0 ? (
                    <button
                      onClick={() => onUpdateCart(product, 1)}
                      className="w-full bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-white py-2 rounded-lg text-sm font-bold transition-colors"
                    >
                      В РАБОТУ
                    </button>
                  ) : (
                    <div className="flex items-center justify-between bg-zinc-800 rounded-lg p-1">
                      <button
                        onClick={() => onUpdateCart(product, -1)}
                        className="w-8 h-8 flex items-center justify-center bg-zinc-700 rounded-md text-white active:bg-zinc-600"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-bold text-white">{qty}</span>
                      <button
                        onClick={() => onUpdateCart(product, 1)}
                        className="w-8 h-8 flex items-center justify-center bg-green-600 rounded-md text-white active:bg-green-500"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Action Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-md">
          <button
            onClick={onReview}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-between px-6 shadow-lg shadow-green-900/20 transition-all active:scale-95"
          >
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium opacity-90 flex items-center gap-2">
                Изделий: {totalItems}
                <span className="text-green-200 text-xs bg-green-700/50 px-1.5 py-0.5 rounded">
                  {stats.productsVolumeM3.toFixed(4)} / {stats.boardVolumeM3.toFixed(4)} м³
                </span>
              </span>
              <span className="text-lg leading-none">Итог: {estimatedEarnings} ₽</span>
            </div>
            <div className="bg-white/20 p-2 rounded-full">
              <Coins size={20} />
            </div>
          </button>
        </div>
      )}

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Каталог">
        <p>
          <strong className="text-white block mb-1">Выбор продукции:</strong>
          Нажмите "В РАБОТУ", чтобы добавить изделие. Регулируйте количество кнопками +/-.
        </p>
        <p>
          <strong className="text-white block mb-1">Статистика доски:</strong>
          Сверху отображается объем продукции по сравнению с объемом исходной доски.
        </p>
        <p>
          <strong className="text-white block mb-1">Завершение:</strong>
          Когда закончите набор, нажмите зеленую кнопку снизу для перехода к анализу.
        </p>
      </HelpModal>
    </div>
  );
}; // End Component

export default ProductGrid;