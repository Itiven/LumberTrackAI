import React, { useState } from 'react';
import { AnalysisResult, BoardDimensions, CartItem, LeaderboardEntry, Product, HistoryEntry } from '../types';
import { ArrowLeft, RefreshCw, Save, CheckCircle2, Loader2, Coins, Trophy, TrendingUp, PieChart, PenSquare, Box, AlertTriangle, Settings, History, Info } from 'lucide-react';
import { saveToGoogleSheet } from '../services/sheetService';
import { AppSettings } from '../App';
import CartEditModal from './CartEditModal';
import { HelpModal } from './HelpModal';

// ... AnalysisViewProps interface ...
interface AnalysisViewProps {
  board: BoardDimensions;
  cart: CartItem[];
  result: AnalysisResult;
  dailyTotal: number;
  leaderboard: LeaderboardEntry[];
  onBack: () => void;
  onReset: () => void;
  settings: AppSettings;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onUpdateCart: (product: Product, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onSaveSuccess: (entry: HistoryEntry) => void;
  executor?: string;
  timers: { startFetch?: number; startMeasure?: number; startSaw?: number; }; // New prop
}

const AnalysisView: React.FC<AnalysisViewProps> = ({
  board, cart, result, dailyTotal, leaderboard,
  onBack, onReset, settings, onOpenSettings, onOpenHistory,
  onUpdateCart, onRemoveItem, onClearCart, onSaveSuccess, executor, timers
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // ... (validation and color logic same)
  const isYieldLow = result.yieldPercentage < settings.minYield;
  const isYieldHigh = result.yieldPercentage > settings.maxYield;
  const isYieldInvalid = isYieldLow || isYieldHigh;
  const canSave = !isSaved && (!settings.isYieldControlEnabled || !isYieldInvalid);

  let yieldTextColor = 'text-white';
  if (isYieldLow) yieldTextColor = 'text-zinc-500';
  if (isYieldHigh) yieldTextColor = 'text-red-500';

  const handleSave = async () => {
    // Check if URL is set
    if (!settings.googleSheetUrl) {
      const confirmSettings = window.confirm(
        "⚠️ Webhook URL не настроен!\n\nДанные не будут отправлены в Google Таблицу и сохранятся только в истории приложения на этом устройстве.\n\nНажмите 'ОК', чтобы перейти в настройки и добавить URL, или 'Отмена', чтобы сохранить только локально."
      );

      if (confirmSettings) {
        onOpenSettings();
        return;
      }
    }

    setIsSaving(true);
    try {
      // Calculate Stats
      const now = Date.now();
      const t = timers || {}; // Safeguard

      // Fallbacks
      const fetchEnd = t.startMeasure || t.startSaw || now;
      // measureEnd is now the start of Analysis (sawing finished)
      // If startAnalysis is missing (legacy), use now.
      // Note: "durationMeasure" is now the Production (ProductGrid) time.
      const productionEnd = (t as any).startAnalysis || now; // t cast to any to access dynamic prop if needed, or update interface

      // Calculate durations
      const durationFetch = t.startFetch ? Math.round((fetchEnd - t.startFetch) / 1000) : 0;

      // NEW: durationMeasure = Time in ProductGrid (Start Accounting -> Review)
      const durationMeasure = t.startSaw ? Math.round((productionEnd - t.startSaw) / 1000) : 0;

      // durationSawing = Time in Analysis? Or just 0? Leaving as Analysis time for now.
      const durationSawing = (t as any).startAnalysis ? Math.round((now - (t as any).startAnalysis) / 1000) : 0;

      const timeStats = {
        durationFetch,
        durationMeasure,
        durationSawing
      };

      await saveToGoogleSheet(board, cart, result, settings.googleSheetUrl, executor, timeStats);
      setIsSaved(true);

      // Create history entry
      const historyEntry: HistoryEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('ru-RU'),
        batchNumber: board.batchNumber,
        earnings: result.earnings,
        yieldPercentage: result.yieldPercentage,
        itemCount: cart.reduce((acc, item) => acc + item.quantity, 0),
        boardDims: `${board.length}x${board.width}x${board.thickness}`,
        boardId: board.id,
        boardVolume: result.boardVolumeM3,
        cart: [...cart],
        timeStats // Add to history
      };

      onSaveSuccess(historyEntry);

    } catch (error: any) {
      console.error(error);
      alert("Ошибка при сохранении: " + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.earnings - a.earnings);

  return (
    <>
      <div className="flex flex-col h-full bg-[#18181b]">
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <ArrowLeft size={24} />
              <span className="text-sm font-medium">Назад</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <h2 className="text-lg font-bold">Итог</h2>
                <span className="text-xs text-zinc-500 block">Партия №{board.batchNumber}</span>
              </div>
              <div className="flex items-center gap-1">
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

          {/* ... (rest of render content) ... */}

          {/* Adaptive Layout: Grid on tablet+ */}
          <div className="md:grid md:grid-cols-2 md:gap-8">
            {/* Left Column (on tablet) */}
            <div className="space-y-6">
              {/* Current Earnings Card */}
              <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 text-center shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Coins size={100} />
                </div>
                <p className="text-green-100 font-medium mb-1">Вы заработали</p>
                <div className="text-5xl font-bold text-white mb-2">{result.earnings} ₽</div>

                <div className="flex items-center justify-center gap-4 mt-4 bg-black/20 rounded-xl p-3 backdrop-blur-sm">
                  <div className="text-left px-2 border-r border-white/20 pr-4">
                    <span className="block text-xs text-green-200">КПД (Выход)</span>
                    <span className={`text-xl font-bold ${yieldTextColor}`}>
                      {result.yieldPercentage}%
                    </span>
                  </div>
                  <div className="text-left px-2">
                    <span className="block text-xs text-green-200 flex items-center gap-1">
                      <Box size={10} />
                      Объем (м³)
                    </span>
                    <span className="text-lg font-bold text-white">
                      {result.productsVolumeM3.toFixed(3)}
                    </span>
                  </div>
                </div>

                {/* Error Message if Invalid */}
                {isYieldInvalid && settings.isYieldControlEnabled && (
                  <div className="mt-3 bg-red-500/30 border border-red-500/50 rounded-lg p-2 text-sm text-white flex items-center justify-center gap-2">
                    <AlertTriangle size={16} />
                    <span>
                      {isYieldHigh ? 'Выход превышает норму!' : 'Выход ниже нормы!'}
                    </span>
                  </div>
                )}

                <p className="mt-4 text-green-50 text-sm opacity-90 border-t border-white/20 pt-3 italic">
                  "{result.message}"
                </p>
              </div>

              {/* Daily Total & Leaderboard (Compact) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#27272a] p-4 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <TrendingUp size={16} />
                    <span className="text-xs uppercase">За сегодня</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{dailyTotal} ₽</div>
                </div>

                {/* Mini Leaderboard Top 1 */}
                <div className="bg-[#27272a] p-4 rounded-xl border border-zinc-800 relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-yellow-500/20">
                    <Trophy size={40} />
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <Trophy size={16} className="text-yellow-500" />
                    <span className="text-xs uppercase">Лидер</span>
                  </div>
                  <div className="truncate text-white font-bold text-sm mt-1">
                    {sortedLeaderboard[0].name}
                  </div>
                  <div className="text-yellow-500 font-bold">
                    {sortedLeaderboard[0].earnings} ₽
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (on tablet) */}
            <div className="mt-6 md:mt-0 flex flex-col h-full">
              {/* Breakdown List of Items */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-zinc-300">
                  <PieChart size={18} />
                  <h3 className="font-bold">Доска № {board.id}</h3>
                </div>
                {!isSaved && (
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-xs text-orange-500 flex items-center gap-1 hover:text-orange-400 bg-orange-500/10 px-2 py-1 rounded-md"
                  >
                    <PenSquare size={12} />
                    Изменить
                  </button>
                )}
              </div>

              <div className="bg-[#27272a] rounded-xl overflow-hidden divide-y divide-zinc-800 border border-zinc-800 md:flex-1 md:flex md:flex-col">
                <div className="md:flex-1 md:overflow-y-auto md:max-h-[300px] lg:max-h-[400px]">
                  {cart.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">
                      Нет изделий
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.product.id} className="flex justify-between items-center p-4">
                        <div>
                          <div className="font-medium text-white">{item.product.name}</div>
                          <div className="text-xs text-zinc-400">
                            {item.product.dimensions.length}x{item.product.dimensions.width} мм
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">{item.quantity} шт</div>
                          <div className="text-xs text-green-400">
                            +{item.quantity * item.product.price} ₽
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 bg-zinc-800/50 flex justify-between items-center text-sm border-t border-zinc-800">
                  <span className="text-zinc-400">Всего изделий:</span>
                  <span className="font-bold text-white">{cart.reduce((a, c) => a + c.quantity, 0)} шт</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Fixed Bottom Action Area */}
        <div className="p-4 bg-[#18181b] border-t border-zinc-800">
          <div className="space-y-3 md:flex md:space-y-0 md:gap-4 md:max-w-2xl md:mx-auto">
            <div className="w-full">
              {!isSaved ? (
                <button
                  onClick={handleSave}
                  disabled={!canSave || isSaving}
                  className={`w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95
                    ${!canSave
                      ? 'bg-red-500/20 text-red-400 border border-red-500/20 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'}
                  `}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Сохранение...</span>
                    </>
                  ) : !canSave && settings.isYieldControlEnabled && isYieldInvalid ? (
                    <>
                      <AlertTriangle size={20} />
                      <span>Ошибка выхода</span>
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      <span>Учесть заработок</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="w-full bg-green-600/20 border border-green-600/50 text-green-400 font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle2 size={20} />
                  <span>Сохранено! +{result.earnings} ₽</span>
                </div>
              )}
            </div>

            <button
              onClick={onReset}
              disabled={!isSaved}
              className={`w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-transform ${!isSaved ? 'bg-zinc-800 text-zinc-500' : 'bg-orange-500 hover:bg-orange-600 text-white active:scale-95'}`}
            >
              <RefreshCw size={20} />
              <span>Следующая доска</span>
            </button>
          </div>
        </div>
      </div>

      <CartEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        cart={cart}
        onUpdateCart={onUpdateCart}
        onRemoveItem={onRemoveItem}
        onClearCart={() => {
          onClearCart();
          setIsEditModalOpen(false);
        }}
        boardId={board.id}
      />

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Результаты">
        <p>
          <strong className="text-white block mb-1">Итоговые цифры:</strong>
          Ваш заработок и КПД переработки. Если КПД вне нормы (красный/серый цвет), сохранение может быть заблокировано.
        </p>
        <p>
          <strong className="text-white block mb-1">Кнопки:</strong>
          <b>Учесть заработок</b> - отправить данные в общую таблицу и сохранить в историю.<br />
          <b>Следующая доска</b> - сбросить текущие данные и начать новую доску (доступно после сохранения).
        </p>
        <p>
          <strong className="text-white block mb-1">Редактирование:</strong>
          Нажмите "Изменить", чтобы скорректировать список продукции, если допущена ошибка.
        </p>
      </HelpModal>
    </>
  );
}; // End Component

export default AnalysisView;