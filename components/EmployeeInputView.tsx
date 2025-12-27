import React, { useState, useEffect, useRef } from 'react';
import { BoardDimensions, CartItem, Product, Partition, HistoryEntry, KPISettings } from '../types';
import { AppSettings } from '../App';
import { Package, Settings, History, Loader2, RefreshCcw, Info, Plus, Minus, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchPartitions, fetchSettings, saveToGoogleSheet } from '../services/sheetService';
import { analyzeYield } from '../services/geminiService';
import { HelpModal } from './HelpModal';

interface EmployeeInputViewProps {
  products: Product[];
  cart: CartItem[];
  onUpdateCart: (product: Product, delta: number) => void;
  onClearCart?: () => void;
  settings: AppSettings;
  webappUrl: string;
  executor?: string;
  onSaveSuccess?: (entry: HistoryEntry) => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

type BoardInputState = Omit<BoardDimensions, 'id'>;

const EmployeeInputView: React.FC<EmployeeInputViewProps> = ({
  products,
  cart,
  onUpdateCart,
  onClearCart,
  settings,
  webappUrl,
  executor,
  onSaveSuccess,
  onOpenSettings,
  onOpenHistory,
}) => {
  const [dims, setDims] = useState<BoardInputState>(() => {
    // Load last selected batch from localStorage
    const savedBatch = localStorage.getItem('employeeLastBatch');
    return {
      length: 2000,
      width: 150,
      thickness: 50,
      batchNumber: savedBatch || '',
    };
  });
  const [error, setError] = useState<string>('');
  const [lockedFields, setLockedFields] = useState({ length: false, width: false, thickness: false });
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedBoardId, setSavedBoardId] = useState<string>('');
  const [showSelectBatchModal, setShowSelectBatchModal] = useState(false);
  const [selectedUnitCost, setSelectedUnitCost] = useState<number>(0);
  const [kpiValue, setKpiValue] = useState<number>(0);
  const [successEmoji, setSuccessEmoji] = useState<string>('😊');
  const [defaultKPISettings, setDefaultKPISettings] = useState<KPISettings | null>(null);
  const [selectedPartition, setSelectedPartition] = useState<Partition | null>(null);
  const widthInputRef = useRef<HTMLInputElement>(null);
  const previousBatchNumberRef = useRef<string>('');

  // Default KPI settings (fallback if not loaded from sheet)
  const DEFAULT_KPI_SETTINGS: KPISettings = {
    good: {
      emoji: '🟢',
      threshold: 1.5,
      send: false,
      condition: '>='
    },
    ok: {
      emoji: '🟡',
      threshold: 1.2,
      send: false,
      condition: '>='
    },
    bad: {
      emoji: '🟠',
      threshold: 1.0,
      send: false,
      condition: '<'
    },
    'very bad': {
      emoji: '🔴',
      threshold: 0.5,
      send: true,
      condition: '<'
    }
  };

  // Load partitions and settings on mount
  useEffect(() => {
    if (webappUrl) {
      loadPartitions(webappUrl);
      loadDefaultKPISettings(webappUrl);
    }
  }, [webappUrl]);

  // Auto-close success modal after 5 seconds
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
        setSavedBoardId('');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  // Auto-close select batch modal after 5 seconds
  useEffect(() => {
    if (showSelectBatchModal) {
      const timer = setTimeout(() => {
        setShowSelectBatchModal(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showSelectBatchModal]);

  // Focus width input after batch selection
  useEffect(() => {
    // Check if batch number changed (not initial load) and width is not locked
    const prevBatch = previousBatchNumberRef.current;
    const currentBatch = dims.batchNumber;
    
    // Only focus if batch changed from one value to another (not from empty to first value on mount)
    if (currentBatch && prevBatch && currentBatch !== prevBatch && !lockedFields.width) {
      // Use setTimeout to ensure the DOM is updated
      const timer = setTimeout(() => {
        if (widthInputRef.current) {
          widthInputRef.current.focus();
          widthInputRef.current.select();
        }
      }, 100);
      
      previousBatchNumberRef.current = currentBatch;
      return () => clearTimeout(timer);
    }
    
    // Update ref for next comparison
    if (currentBatch) {
      previousBatchNumberRef.current = currentBatch;
    }
  }, [dims.batchNumber, lockedFields.width]);

  // Load default KPI settings from "Настройки" sheet
  const loadDefaultKPISettings = async (url: string) => {
    try {
      const settingsData = await fetchSettings(url);
      // Find the setting with key="bad_good_kpi"
      const kpiSetting = settingsData.find((s: any) => s.key === 'bad_good_kpi');
      if (kpiSetting && kpiSetting.value) {
        try {
          const parsed = JSON.parse(kpiSetting.value);
          setDefaultKPISettings(parsed as KPISettings);
        } catch (e) {
          console.error('Failed to parse KPI settings:', e);
          setDefaultKPISettings(DEFAULT_KPI_SETTINGS);
        }
      } else {
        setDefaultKPISettings(DEFAULT_KPI_SETTINGS);
      }
    } catch (e) {
      console.error('Failed to load KPI settings:', e);
      setDefaultKPISettings(DEFAULT_KPI_SETTINGS);
    }
  };

  // Get active KPI settings (from partition or default)
  const getActiveKPISettings = (): KPISettings => {
    // First try to get from selected partition
    if (selectedPartition?.bad_good_kpi) {
      try {
        return JSON.parse(selectedPartition.bad_good_kpi) as KPISettings;
      } catch (e) {
        console.error('Failed to parse partition KPI settings:', e);
      }
    }
    // Fall back to default settings from sheet
    return defaultKPISettings || DEFAULT_KPI_SETTINGS;
  };

  // Check KPI condition
  const checkKPICondition = (kpi: number, condition: string, threshold: number): boolean => {
    switch (condition) {
      case '>=':
        return kpi >= threshold;
      case '<=':
        return kpi <= threshold;
      case '>':
        return kpi > threshold;
      case '<':
        return kpi < threshold;
      default:
        return false;
    }
  };

  // Get emoji and shouldSend for a given KPI value
  const getKPIDetails = (kpi: number): { emoji: string; shouldSend: boolean } => {
    const kpiSettings = getActiveKPISettings();
    
    // Check conditions in order of priority:
    // 1. good (KPI >= 1.5) - highest threshold with >=
    // 2. ok (KPI >= 1.2) - medium threshold with >=
    // 3. very bad (KPI < 0.5) - lowest threshold with < (more specific)
    // 4. bad (KPI < 1.0) - higher threshold with < (less specific)
    
    // Check good first (>= 1.5)
    if (checkKPICondition(kpi, kpiSettings.good.condition, kpiSettings.good.threshold)) {
      return { emoji: kpiSettings.good.emoji, shouldSend: kpiSettings.good.send };
    }
    
    // Check ok (>= 1.2)
    if (checkKPICondition(kpi, kpiSettings.ok.condition, kpiSettings.ok.threshold)) {
      return { emoji: kpiSettings.ok.emoji, shouldSend: kpiSettings.ok.send };
    }
    
    // Check very bad (< 0.5) before bad, because it's more specific
    if (checkKPICondition(kpi, kpiSettings['very bad'].condition, kpiSettings['very bad'].threshold)) {
      return { emoji: kpiSettings['very bad'].emoji, shouldSend: kpiSettings['very bad'].send };
    }
    
    // Check bad (< 1.0) - this catches values between 0.5 and 1.0
    if (checkKPICondition(kpi, kpiSettings.bad.condition, kpiSettings.bad.threshold)) {
      return { emoji: kpiSettings.bad.emoji, shouldSend: kpiSettings.bad.send };
    }
    
    // Fallback to bad (for values between 1.0 and 1.2 that don't match any condition)
    return { emoji: kpiSettings.bad.emoji, shouldSend: kpiSettings.bad.send };
  };

  const loadPartitions = async (url: string) => {
    setIsLoading(true);
    try {
      const data = await fetchPartitions(url);
      const openPartitions = data.filter(p => {
        const c = String(p.close).toLowerCase();
        return c !== 'true';
      });

      setPartitions(openPartitions);

      // Try to restore last selected batch from localStorage
      if (openPartitions.length > 0) {
        const savedBatchId = localStorage.getItem('employeeLastBatch');
        if (savedBatchId) {
          const savedPartition = openPartitions.find(p => String(p.id) === savedBatchId);
          if (savedPartition) {
            // Restore saved batch
            setDims(prev => {
              const newDims = { ...prev, batchNumber: String(savedPartition.id) };
              const newLocked = { length: false, width: false, thickness: false };
              
              if (savedPartition.length) {
                newDims.length = Number(savedPartition.length);
                newLocked.length = true;
              }
              if (savedPartition.width) {
                newDims.width = Number(savedPartition.width);
                newLocked.width = true;
              }
              if (savedPartition.thickness) {
                newDims.thickness = Number(savedPartition.thickness);
                newLocked.thickness = true;
              }
              
              // Restore unit_cost
              if (savedPartition.unit_cost !== undefined) {
                setSelectedUnitCost(Number(savedPartition.unit_cost));
              }
              
              // Restore selected partition for KPI settings
              setSelectedPartition(savedPartition);
              
              setLockedFields(newLocked);
              return newDims;
            });
          } else {
            // Saved batch not found, show modal to select
            setShowSelectBatchModal(true);
          }
        } else {
          // No batch saved, show modal to select
          setShowSelectBatchModal(true);
        }
      }
    } catch (e) {
      console.error('Failed to load partitions', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchSelect = (partition: Partition) => {
    const newDims = { ...dims, batchNumber: String(partition.id) };
    const newLocked = { length: false, width: false, thickness: false };

    if (partition.length) {
      newDims.length = Number(partition.length);
      newLocked.length = true;
    }
    if (partition.width) {
      newDims.width = Number(partition.width);
      newLocked.width = true;
    }
    if (partition.thickness) {
      newDims.thickness = Number(partition.thickness);
      newLocked.thickness = true;
    }

    setDims(newDims);
    setLockedFields(newLocked);
    
    // Save unit_cost from partition
    if (partition.unit_cost !== undefined) {
      setSelectedUnitCost(Number(partition.unit_cost));
    }
    
    // Save selected partition for KPI settings
    setSelectedPartition(partition);
    
    // Save last selected batch to localStorage
    localStorage.setItem('employeeLastBatch', String(partition.id));
    
    // Close select batch modal if it's open
    setShowSelectBatchModal(false);
    
    // Focus width input after state update, but only if width is not locked
    if (!partition.width && widthInputRef.current) {
      setTimeout(() => {
        if (widthInputRef.current) {
          widthInputRef.current.focus();
          widthInputRef.current.select();
        }
      }, 150);
    }
  };

  const handleChange = (field: keyof BoardInputState, value: string) => {
    if (field === 'batchNumber') {
      const p = partitions.find(x => String(x.id) === value);
      if (p) {
        handleBatchSelect(p);
      } else {
        setDims(prev => ({ ...prev, [field]: value }));
        setLockedFields({ length: false, width: false, thickness: false });
      }
    } else {
      const num = parseInt(value, 10);
      setDims(prev => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
    }
    setError('');
  };

  const getQuantity = (productId: string) => {
    return cart.find(item => item.product.id === productId)?.quantity || 0;
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Get grid columns class based on settings
  const getGridColumnsClass = (): string => {
    const columns = settings.gridColumns || 6;
    const columnMap: Record<number, string> = {
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
      5: 'lg:grid-cols-5',
      6: 'lg:grid-cols-6',
    };
    return columnMap[columns] || 'lg:grid-cols-6';
  };

  // Calculate current KPI based on board dimensions, cart, and unit cost
  const calculateCurrentKPI = (): number => {
    if (!selectedUnitCost || dims.length <= 0 || dims.width <= 0 || dims.thickness <= 0 || cart.length === 0) {
      return 0;
    }

    // Calculate board volume in m³
    const boardVolumeMm3 = dims.length * dims.width * dims.thickness;
    const boardVolumeM3 = boardVolumeMm3 / 1e9;

    // Calculate board cost
    const boardCost = selectedUnitCost * boardVolumeM3;

    if (boardCost <= 0) {
      return 0;
    }

    // Calculate total cost of all products
    const totalCost = cart.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);

    // Calculate KPI
    return totalCost / boardCost;
  };

  const currentKPI = calculateCurrentKPI();

  // Function to send Telegram notification
  const sendTelegramNotification = async (kpi: number, totalCost: number, batchNumber: string, emoji: string) => {
    const telegramToken = (import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN;
    const telegramChatId = (import.meta as any).env?.VITE_TELEGRAM_CHAT_ID;

    if (!telegramToken || !telegramChatId) {
      console.warn('Telegram credentials not configured');
      return;
    }

    try {
      // Определяем статус на основе KPI для текста сообщения согласно требованиям:
      // 😊 если KPI ≥ 1.5 (хорошо)
      // 😐 если 1.2 ≤ KPI < 1.5 (средне)
      // 😠 если KPI < 1.0 (плохо)
      let statusText = '';
      if (kpi >= 1.5) {
        statusText = 'хорошо';
      } else if (kpi >= 1.2 && kpi < 1.5) {
        statusText = 'средне';
      } else if (kpi < 1.0) {
        statusText = 'плохо';
      } else {
        // Для значений между 1.0 и 1.2 (не попадает в категории выше)
        statusText = 'плохо';
      }

      const message = `${emoji} KPI: ${kpi.toFixed(2)} (${statusText})\n\nПартия: ${batchNumber}\nОбщая стоимость: ${totalCost.toFixed(2)} ₽`;
      
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
        }),
      });
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
    }
  };

  const handleSave = async () => {
    // Validation
    if (dims.length <= 0 || dims.width <= 0 || dims.thickness <= 0) {
      setError('Все размеры должны быть больше 0');
      return;
    }
    if (!dims.batchNumber.trim()) {
      setError('Выберите номер партии');
      return;
    }
    if (cart.length === 0) {
      setError('Добавьте хотя бы одно изделие');
      return;
    }

    // Check if URL is set
    if (!settings.googleSheetUrl) {
      const confirmSettings = window.confirm(
        "⚠️ Webhook URL не настроен!\n\nДанные не будут отправлены в Google Таблицу.\n\nНажмите 'ОК', чтобы перейти в настройки и добавить URL, или 'Отмена', чтобы отменить сохранение."
      );

      if (confirmSettings) {
        onOpenSettings();
        return;
      }
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Create board object
      const board: BoardDimensions = {
        ...dims,
        id: Date.now().toString(),
      };

      // Analyze yield
      const analysisResult = await analyzeYield(board, cart, settings.isAiAnalysisEnabled);

      // Calculate costs and KPI
      const boardVolumeM3 = analysisResult.boardVolumeM3;
      const boardCost = selectedUnitCost * boardVolumeM3;
      
      // Calculate total cost of all products
      const totalCost = cart.reduce((sum, item) => {
        return sum + (item.product.price * item.quantity);
      }, 0);
      
      // Calculate KPI (efficiency coefficient)
      const kpi = boardCost > 0 ? totalCost / boardCost : 0;
      setKpiValue(kpi);

      // Determine emoji and shouldSend based on KPI using settings
      const kpiDetails = getKPIDetails(kpi);
      setSuccessEmoji(kpiDetails.emoji);

      // Send Telegram notification if configured in settings
      if (kpiDetails.shouldSend) {
        await sendTelegramNotification(kpi, totalCost, board.batchNumber, kpiDetails.emoji);
      }

      // Save to Google Sheet with minimal timeStats
      const timeStats = {
        durationFetch: 0,
        durationMeasure: 0,
        durationSawing: 0,
      };

      await saveToGoogleSheet(
        board,
        cart,
        analysisResult,
        settings.googleSheetUrl,
        executor,
        timeStats,
        selectedUnitCost,
        boardCost,
        kpi
      );

      // Create history entry
      const historyEntry: HistoryEntry = {
        id: board.id,
        timestamp: new Date().toLocaleString('ru-RU'),
        batchNumber: board.batchNumber,
        earnings: analysisResult.earnings,
        yieldPercentage: analysisResult.yieldPercentage,
        itemCount: cart.reduce((acc, item) => acc + item.quantity, 0),
        boardDims: `${board.length}x${board.width}x${board.thickness}`,
        boardId: board.id,
        boardVolume: analysisResult.boardVolumeM3,
        cart: [...cart],
        timeStats: {
          durationFetch: 0,
          durationMeasure: 0,
          durationSawing: 0,
        },
      };

      // Success - reset form
      setDims({
        length: 2000,
        width: 150,
        thickness: 50,
        batchNumber: '',
      });
      setLockedFields({ length: false, width: false, thickness: false });

      // Clear cart through parent
      if (onClearCart) {
        onClearCart();
      } else {
        // Fallback: clear manually if onClearCart not provided
        cart.forEach(item => {
          for (let i = 0; i < item.quantity; i++) {
            onUpdateCart(item.product, -1);
          }
        });
      }

      // Show success modal
      setSavedBoardId(board.id);
      setShowSuccessModal(true);

      if (onSaveSuccess) {
        onSaveSuccess(historyEntry);
      }
    } catch (error: any) {
      console.error(error);
      setError('Ошибка при сохранении: ' + (error.message || error));
      alert('Ошибка при сохранении: ' + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#18181b] text-white pb-24">
      {/* Header Actions */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
        <h1 className="text-xl font-bold">Учет доски</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHistory}
            className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 rounded-full"
            title="История"
          >
            <History size={20} />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 rounded-full"
            title="Настройки"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 text-zinc-500 hover:text-orange-400 transition-colors bg-zinc-800/50 rounded-full"
            title="Справка"
          >
            <Info size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Board Input Fields - In one row */}
        <div className="mb-6">
          <div className="bg-[#27272a] rounded-xl p-4 border border-zinc-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Batch Number */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1">
                  <Package size={12} /> Партия
                  <button
                    type="button"
                    onClick={() => loadPartitions(webappUrl)}
                    className="ml-auto text-orange-500 hover:text-orange-400 text-xs flex items-center gap-1"
                  >
                    {isLoading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCcw size={10} />}
                  </button>
                </label>
                {partitions.length > 0 ? (
                  <select
                    value={dims.batchNumber}
                    onChange={(e) => handleChange('batchNumber', e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-700 rounded-lg p-2 text-sm focus:outline-none focus:border-orange-500 transition-colors text-white appearance-none"
                  >
                    <option value="" disabled>Выберите партию</option>
                    {partitions.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.id} {p.date ? `(${new Date(p.date).toLocaleDateString()})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={dims.batchNumber}
                    onChange={(e) => handleChange('batchNumber', e.target.value)}
                    placeholder="Загрузка..."
                    disabled={isLoading}
                    className="w-full bg-[#18181b] border border-zinc-700 rounded-lg p-2 text-sm focus:outline-none focus:border-orange-500 transition-colors text-white placeholder-zinc-600"
                  />
                )}
              </div>

              {/* Length */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 flex justify-between">
                  Длина (мм)
                  {lockedFields.length && <span className="text-xs text-orange-500">Авто</span>}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  step="10"
                  value={dims.length || ''}
                  onChange={(e) => handleChange('length', e.target.value)}
                  disabled={lockedFields.length}
                  className={`w-full bg-[#18181b] border border-zinc-700 rounded-lg p-2 text-sm focus:outline-none focus:border-orange-500 transition-colors text-white ${lockedFields.length ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>

              {/* Width */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 flex justify-between">
                  Ширина (мм)
                  {lockedFields.width && <span className="text-xs text-orange-500">Авто</span>}
                </label>
                <input
                  ref={widthInputRef}
                  type="number"
                  inputMode="numeric"
                  step="10"
                  value={dims.width || ''}
                  onChange={(e) => handleChange('width', e.target.value)}
                  disabled={lockedFields.width}
                  className={`w-full bg-[#18181b] border border-zinc-700 rounded-lg p-2 text-sm focus:outline-none focus:border-orange-500 transition-colors text-white ${lockedFields.width ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>

              {/* Thickness */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 flex justify-between">
                  Толщина (мм)
                  {lockedFields.thickness && <span className="text-xs text-orange-500">Авто</span>}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={dims.thickness || ''}
                  onChange={(e) => handleChange('thickness', e.target.value)}
                  disabled={lockedFields.thickness}
                  className={`w-full bg-[#18181b] border border-zinc-700 rounded-lg p-2 text-sm focus:outline-none focus:border-orange-500 transition-colors text-white ${lockedFields.thickness ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs mt-2 text-center bg-red-500/10 p-2 rounded-lg">{error}</p>
            )}
          </div>
        </div>

        {/* Product Grid */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            Каталог продукции
            {totalItems > 0 && (
              <span className="text-sm font-normal text-zinc-400">
                ({totalItems} {totalItems === 1 ? 'изделие' : totalItems < 5 ? 'изделия' : 'изделий'})
              </span>
            )}
          </h2>

          <div className={`grid grid-cols-2 md:grid-cols-3 ${getGridColumnsClass()} gap-3 sm:gap-4`}>
            {products.map((product) => {
              const qty = getQuantity(product.id);
              return (
                <div
                  key={product.id}
                  className="bg-[#27272a] rounded-2xl overflow-hidden flex flex-col shadow-sm border border-zinc-800"
                >
                  {/* Product Image */}
                  <div 
                    className="relative h-32 w-full bg-zinc-800 cursor-pointer"
                    onClick={() => onUpdateCart(product, 1)}
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600 hover:bg-zinc-700 transition-colors">
                        <span className="text-xs">Нет фото</span>
                      </div>
                    )}
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
        </div>
      </div>

      {/* Fixed Bottom Save Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#18181b] border-t border-zinc-800 p-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-md">
        <button
          onClick={handleSave}
          disabled={isSaving || totalItems === 0}
          className={`w-full font-bold py-4 rounded-xl flex items-center justify-start gap-2 pl-4 pr-4 transition-all shadow-lg active:scale-95 ${
            isSaving || totalItems === 0
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Сохранение...</span>
            </>
          ) : (
            <>
              <Save size={20} />
              <span>Сохранить</span>
              {currentKPI > 0 && (() => {
                const currentKPIDetails = getKPIDetails(currentKPI);
                return (
                  <span className="ml-auto bg-white/20 px-2 py-1 rounded text-sm font-mono flex items-center gap-1">
                    <span>{currentKPIDetails.emoji}</span>
                    <span>KPI: {currentKPI.toFixed(2)}</span>
                  </span>
                );
              })()}
            </>
          )}
        </button>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#27272a] p-6 rounded-2xl w-full max-w-sm border border-zinc-700 shadow-2xl relative animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="text-6xl mb-4">
                {successEmoji}
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Успешно сохранено</h3>
              <p className="text-zinc-300 text-sm">
                Доска с id <span className="font-bold text-orange-500">{savedBoardId}</span> сохранена успешно
              </p>
              {kpiValue > 0 && (
                <p className="text-zinc-400 text-xs mt-2">
                  {successEmoji} KPI: <span className="font-bold">{kpiValue.toFixed(2)}</span>
                  {' '}
                  {kpiValue >= 1.5 ? (
                    <span className="ml-1 text-zinc-500">(хорошо)</span>
                  ) : kpiValue >= 1.2 && kpiValue < 1.5 ? (
                    <span className="ml-1 text-zinc-500">(средне)</span>
                  ) : kpiValue < 1.0 ? (
                    <span className="ml-1 text-zinc-500">(плохо)</span>
                  ) : (
                    <span className="ml-1 text-zinc-500">(плохо)</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Select Batch Modal */}
      {showSelectBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#27272a] p-6 rounded-2xl w-full max-w-sm border border-zinc-700 shadow-2xl relative animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="bg-orange-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={32} className="text-orange-500" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Выберите партию</h3>
              <p className="text-zinc-300 text-sm">
                Пожалуйста, выберите партию для продолжения работы
              </p>
            </div>
          </div>
        </div>
      )}

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Учет доски">
        <p>
          <strong className="text-white block mb-1">Поля доски:</strong>
          Выберите партию и введите параметры необрезной доски. Поля могут автоматически заполняться при выборе партии.
        </p>
        <p>
          <strong className="text-white block mb-1">Выбор продукции:</strong>
          Нажмите "В РАБОТУ", чтобы добавить изделие. Регулируйте количество кнопками +/-.
        </p>
        <p>
          <strong className="text-white block mb-1">Сохранение:</strong>
          После ввода всех данных нажмите кнопку "Сохранить" внизу экрана. Данные будут отправлены на webhook.
        </p>
      </HelpModal>
    </div>
  );
};

export default EmployeeInputView;

