import React, { useState, useEffect } from 'react';
import { BoardDimensions, Partition } from '../types';
import { Ruler, ArrowRight, Package, Settings, History, Loader2, RefreshCcw, Info } from 'lucide-react';
import { fetchPartitions } from '../services/sheetService';
import { HelpModal } from './HelpModal';

interface BoardInputProps {
  onContinue: (dims: BoardDimensions) => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenWarehouse: () => void; // Starts Fetch Timer
  webappUrl: string;
  onBatchSelect: () => void; // Starts Measure Timer
  fetchStartTime?: number;
  measureStartTime?: number;
}

type BoardInputState = Omit<BoardDimensions, 'id'>;

const BoardInput: React.FC<BoardInputProps> = ({ onContinue, onOpenSettings, onOpenHistory, onOpenWarehouse, webappUrl, onBatchSelect, fetchStartTime, measureStartTime }) => {
  // ... (state remains same)
  const [dims, setDims] = useState<BoardInputState>({
    length: 2000,
    width: 150,
    thickness: 50,
    batchNumber: ''
  });
  const [error, setError] = useState<string>('');
  const [elapsedFetch, setElapsedFetch] = useState(0);




  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (fetchStartTime) {
      const update = () => {
        // If measure started, freeze time at separation point
        const end = measureStartTime || Date.now();
        setElapsedFetch(Math.round((end - fetchStartTime) / 1000));
      };

      update(); // Immediate

      // Only tick if not frozen
      if (!measureStartTime) {
        interval = setInterval(update, 1000);
      }
    } else {
      setElapsedFetch(0);
    }
    return () => clearInterval(interval);
  }, [fetchStartTime, measureStartTime]);

  const [lockedFields, setLockedFields] = useState({ length: false, width: false, thickness: false });
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // ... (handlers)



  // Initial Load
  useEffect(() => {
    if (webappUrl) {
      loadPartitions(webappUrl);
    }
  }, [webappUrl]);

  const loadPartitions = async (url: string) => {
    setIsLoading(true);
    try {
      const data = await fetchPartitions(url);
      // Filter open partitions (close !== TRUE or true)
      const openPartitions = data.filter(p => {
        const c = String(p.close).toLowerCase();
        return c !== 'true';
      });

      setPartitions(openPartitions);

      // Auto-select first if available and no batch selected
      if (openPartitions.length > 0 && !dims.batchNumber) {
        handleBatchSelect(openPartitions[0]);
      }
    } catch (e) {
      console.error("Failed to load partitions", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchSelect = (partition: Partition) => {
    // Auto-fill dims if present
    const newDims = { ...dims, batchNumber: String(partition.id) };
    const newLocked = { length: false, width: false, thickness: false };

    if (partition.length) { newDims.length = Number(partition.length); newLocked.length = true; }
    if (partition.width) { newDims.width = Number(partition.width); newLocked.width = true; }
    if (partition.thickness) { newDims.thickness = Number(partition.thickness); newLocked.thickness = true; }

    setDims(newDims);
    setLockedFields(newLocked);

    // Call parent handler to mark start of measure phase
    if (onBatchSelect) onBatchSelect();
  };

  const handleChange = (field: keyof BoardInputState, value: string) => {
    if (field === 'batchNumber') {
      const p = partitions.find(x => String(x.id) === value);
      if (p) {
        handleBatchSelect(p);
      } else {
        setDims(prev => ({ ...prev, [field]: value }));
        setLockedFields({ length: false, width: false, thickness: false }); // Reset locks if manual or unknown
      }
    } else {
      const num = parseInt(value, 10);
      setDims(prev => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
    }
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dims.length <= 0 || dims.width <= 0 || dims.thickness <= 0) {
      setError('Все размеры должны быть больше 0');
      return;
    }
    if (!dims.batchNumber.trim()) {
      setError('Выберите номер партии');
      return;
    }

    // Generate unique ID based on timestamp
    const newBoard: BoardDimensions = {
      ...dims,
      id: Date.now().toString()
    };

    onContinue(newBoard);
  };

  return (
    <div className="flex flex-col h-full justify-center px-6 max-w-md mx-auto w-full relative">

      {/* Header Actions */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <button
          onClick={onOpenHistory}
          className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 rounded-full"
          title="История"
        >
          <History size={24} />
        </button>
        <button
          onClick={onOpenSettings}
          className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 rounded-full"
          title="Настройки"
        >
          <Settings size={24} />
        </button>
        <button
          onClick={() => setShowHelp(true)}
          className="p-2 text-zinc-500 hover:text-orange-400 transition-colors bg-zinc-800/50 rounded-full"
          title="Справка"
        >
          <Info size={24} />
        </button>
      </div>

      <div className="text-center mb-8">
        <div className="bg-orange-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
          <Ruler size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Новая доска</h1>
        <p className="text-zinc-400">Введите параметры необрезной доски</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Batch Number Selection */}
        <div className="relative">
          <label className="block text-sm font-medium text-zinc-400 mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2"><Package size={16} /> Номер партии</div>
            {/* Refresh Button */}
            <button type="button" onClick={() => loadPartitions(webappUrl)} className="text-orange-500 hover:text-orange-400 text-xs flex items-center gap-1">
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
              Обновить
            </button>
          </label>

          {partitions.length > 0 ? (
            <select
              value={dims.batchNumber}
              onChange={(e) => handleChange('batchNumber', e.target.value)}
              className="w-full bg-[#27272a] border border-zinc-700 rounded-xl p-4 text-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-white appearance-none"
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
              placeholder="Загрузка списка..."
              disabled={isLoading}
              className="w-full bg-[#27272a] border border-zinc-700 rounded-xl p-4 text-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-white placeholder-zinc-600"
            />
          )}

          {partitions.length === 0 && !isLoading && (
            <p className="text-xs text-red-400 mt-1">Список партий пуст или не загружен. Проверьте URL.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1 flex justify-between">
            Длина (мм)
            {lockedFields.length && <span className="text-xs text-orange-500">Авто</span>}
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={dims.length}
            onChange={(e) => handleChange('length', e.target.value)}
            disabled={lockedFields.length}
            className={`w-full bg-[#27272a] border border-zinc-700 rounded-xl p-4 text-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-white ${lockedFields.length ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1 flex justify-between">
              Ширина (мм)
              {lockedFields.width && <span className="text-xs text-orange-500">Авто</span>}
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={dims.width}
              onChange={(e) => handleChange('width', e.target.value)}
              disabled={lockedFields.width}
              className={`w-full bg-[#27272a] border border-zinc-700 rounded-xl p-4 text-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-white ${lockedFields.width ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1 flex justify-between">
              Толщина (мм)
              {lockedFields.thickness && <span className="text-xs text-orange-500">Авто</span>}
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={dims.thickness}
              onChange={(e) => handleChange('thickness', e.target.value)}
              disabled={lockedFields.thickness}
              className={`w-full bg-[#27272a] border border-zinc-700 rounded-xl p-4 text-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-white ${lockedFields.thickness ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => {
              setDims({ length: 0, width: 0, thickness: 0, batchNumber: '' });
              setLockedFields({ length: false, width: false, thickness: false });
              setError('');
              onOpenWarehouse();
            }}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 duration-200"
          >
            <div className="flex items-center gap-2">
              <Package size={20} />
              <span>На склад</span>
            </div>
            {fetchStartTime && (
              <span className="text-sm font-mono text-zinc-300 bg-zinc-800/50 px-2 rounded">
                {Math.floor(elapsedFetch / 60)}:{String(elapsedFetch % 60).padStart(2, '0')}
              </span>
            )}
          </button>

          <button
            type="submit"
            className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-orange-500/20"
          >
            <span>Начать учет</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </form>
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Новая доска">
        <p>
          <strong className="text-white block mb-1">Номер партии:</strong>
          Выберите активную партию из списка. Это автоматически заполнит размеры, если они заданы.
        </p>
        <p>
          <strong className="text-white block mb-1">Размеры (ДхШхТ):</strong>
          Укажите параметры <b>необрезной доски</b> в мм. Поля блокируются при авто-заполнении.
        </p>
        <p>
          <strong className="text-white block mb-1">Кнопки:</strong>
          <b>На склад</b> - просмотр текущего состояния тележки без создания новой доски.<br />
          <b>Начать учет</b> - перейти к добавлению продукции для этой доски.
        </p>
      </HelpModal>
    </div>
  );
};

export default BoardInput;