import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { fetchSettings } from '../../services/sheetService';

interface WidthSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (width: number) => void;
  webhookUrl?: string;
}

interface BoardWidthConfig {
  min: number;
  max: number;
  step: number;
}

const DEFAULT_CONFIG: BoardWidthConfig = {
  min: 140,
  max: 500,
  step: 10
};

const WidthSelector: React.FC<WidthSelectorProps> = ({ isOpen, onClose, onSelect, webhookUrl }) => {
  const [config, setConfig] = useState<BoardWidthConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && webhookUrl) {
      loadConfig();
    }
  }, [isOpen, webhookUrl]);

  const loadConfig = async () => {
    if (!webhookUrl) {
      setConfig(DEFAULT_CONFIG);
      return;
    }

    setLoading(true);
    try {
      const settings = await fetchSettings(webhookUrl);
      const boardWidthSetting = settings.find((s: any) => s.key === 'boardWidth');
      
      if (boardWidthSetting && boardWidthSetting.value) {
        try {
          // Expected format: "140-500:10" or JSON: {"min": 140, "max": 500, "step": 10}
          const value = boardWidthSetting.value.trim();
          
          // Try JSON format first
          if (value.startsWith('{')) {
            const parsed = JSON.parse(value);
            setConfig({
              min: Number(parsed.min) || DEFAULT_CONFIG.min,
              max: Number(parsed.max) || DEFAULT_CONFIG.max,
              step: Number(parsed.step) || DEFAULT_CONFIG.step
            });
          } else if (value.includes('-') && value.includes(':')) {
            // Format: "140-500:10"
            const [range, stepStr] = value.split(':');
            const [min, max] = range.split('-').map(Number);
            setConfig({
              min: min || DEFAULT_CONFIG.min,
              max: max || DEFAULT_CONFIG.max,
              step: Number(stepStr) || DEFAULT_CONFIG.step
            });
          } else if (value.includes('-')) {
            // Format: "140-500" (default step 10)
            const [min, max] = value.split('-').map(Number);
            setConfig({
              min: min || DEFAULT_CONFIG.min,
              max: max || DEFAULT_CONFIG.max,
              step: DEFAULT_CONFIG.step
            });
          }
        } catch (e) {
          console.error('Failed to parse boardWidth config:', e);
          setConfig(DEFAULT_CONFIG);
        }
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    } catch (e) {
      console.error('Failed to load boardWidth settings:', e);
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  const generateWidths = (): number[] => {
    const widths: number[] = [];
    for (let i = config.min; i <= config.max; i += config.step) {
      widths.push(i);
    }
    return widths;
  };

  const widths = generateWidths();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#27272a] border border-zinc-700 rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 className="text-lg font-bold text-white">Выбор ширины доски (мм)</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-400">
              Загрузка настроек...
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {widths.map((width) => (
                <button
                  key={width}
                  onClick={() => {
                    onSelect(width);
                    onClose();
                  }}
                  className="bg-zinc-800 hover:bg-orange-500 hover:text-white border border-zinc-700 hover:border-orange-500 rounded-lg py-3 px-2 text-center text-sm font-medium text-zinc-300 transition-colors active:scale-95"
                >
                  {width}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-zinc-700 bg-zinc-800/50">
          <p className="text-xs text-zinc-500 text-center">
            Диапазон: {config.min} - {config.max} мм, шаг: {config.step} мм
          </p>
        </div>
      </div>
    </div>
  );
};

export default WidthSelector;


