import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export interface PeriodRange {
  startDate: Date;
  endDate: Date;
}

interface PeriodSelectorProps {
  onPeriodChange: (range: PeriodRange) => void;
  className?: string;
}

type PeriodOption = 
  | 'today' 
  | 'yesterday' 
  | 'thisWeek' 
  | 'lastWeek' 
  | 'thisMonth' 
  | 'lastMonth' 
  | 'thisQuarter' 
  | 'lastQuarter' 
  | 'thisYear' 
  | 'lastYear' 
  | 'custom';

interface PeriodOptionData {
  label: string;
  getRange: () => PeriodRange;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ onPeriodChange, className = '' }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('thisMonth');
  const [isOpen, setIsOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getToday = (): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const getPeriodRanges = (): Record<PeriodOption, PeriodOptionData> => {
    const today = getToday();
    
    return {
      today: {
        label: 'Сегодня',
        getRange: () => ({
          startDate: new Date(today),
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        })
      },
      yesterday: {
        label: 'Вчера',
        getRange: () => {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return {
            startDate: yesterday,
            endDate: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)
          };
        }
      },
      thisWeek: {
        label: 'Этот неделя',
        getRange: () => {
          const start = new Date(today);
          const day = start.getDay();
          const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday
          start.setDate(diff);
          
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          
          return { startDate: start, endDate: end };
        }
      },
      lastWeek: {
        label: 'Прошлая неделя',
        getRange: () => {
          const start = new Date(today);
          const day = start.getDay();
          const diff = start.getDate() - day - 6 + (day === 0 ? -6 : 1); // Last Monday
          start.setDate(diff);
          
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          
          return { startDate: start, endDate: end };
        }
      },
      thisMonth: {
        label: 'Этот месяц',
        getRange: () => {
          const start = new Date(today.getFullYear(), today.getMonth(), 1);
          const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          return { startDate: start, endDate: end };
        }
      },
      lastMonth: {
        label: 'Прошлый месяц',
        getRange: () => {
          const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
          return { startDate: start, endDate: end };
        }
      },
      thisQuarter: {
        label: 'Этот квартал',
        getRange: () => {
          const quarter = Math.floor(today.getMonth() / 3);
          const start = new Date(today.getFullYear(), quarter * 3, 1);
          const end = new Date(today.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
          return { startDate: start, endDate: end };
        }
      },
      lastQuarter: {
        label: 'Прошлый квартал',
        getRange: () => {
          const quarter = Math.floor(today.getMonth() / 3);
          const prevQuarter = quarter === 0 ? 3 : quarter - 1;
          const prevYear = quarter === 0 ? today.getFullYear() - 1 : today.getFullYear();
          const start = new Date(prevYear, prevQuarter * 3, 1);
          const end = new Date(prevYear, (prevQuarter + 1) * 3, 0, 23, 59, 59, 999);
          return { startDate: start, endDate: end };
        }
      },
      thisYear: {
        label: 'Этот год',
        getRange: () => {
          const start = new Date(today.getFullYear(), 0, 1);
          const end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
          return { startDate: start, endDate: end };
        }
      },
      lastYear: {
        label: 'Прошлый год',
        getRange: () => {
          const year = today.getFullYear() - 1;
          const start = new Date(year, 0, 1);
          const end = new Date(year, 11, 31, 23, 59, 59, 999);
          return { startDate: start, endDate: end };
        }
      },
      custom: {
        label: 'Произвольный период',
        getRange: () => {
          const start = customStartDate ? new Date(customStartDate) : today;
          const end = customEndDate ? new Date(customEndDate) : today;
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          return { startDate: start, endDate: end };
        }
      }
    };
  };

  const periods = getPeriodRanges();
  const selectedLabel = periods[selectedPeriod].label;

  const handlePeriodSelect = (period: PeriodOption) => {
    setSelectedPeriod(period);
    
    if (period === 'custom') {
      setIsOpen(true); // Keep open for custom date selection
    } else {
      setIsOpen(false);
      const range = periods[period].getRange();
      onPeriodChange(range);
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      const range = periods.custom.getRange();
      onPeriodChange(range);
      setIsOpen(false);
    }
  };

  // Initialize with default period
  React.useEffect(() => {
    if (selectedPeriod !== 'custom') {
      const range = periods[selectedPeriod].getRange();
      onPeriodChange(range);
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#27272a] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white hover:bg-zinc-700 transition-colors"
      >
        <Calendar size={16} />
        <span>{selectedLabel}</span>
        <ChevronDown size={16} className={isOpen ? 'rotate-180 transition-transform' : ''} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 bg-[#27272a] border border-zinc-700 rounded-xl shadow-xl z-50 min-w-[240px] overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {Object.entries(periods).map(([key, period]) => {
                if (key === 'custom') return null;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handlePeriodSelect(key as PeriodOption)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 transition-colors ${
                      selectedPeriod === key ? 'bg-orange-500/20 text-orange-400' : 'text-white'
                    }`}
                  >
                    {period.label}
                  </button>
                );
              })}
              
              {/* Custom Period */}
              <div className="border-t border-zinc-700">
                <button
                  type="button"
                  onClick={() => handlePeriodSelect('custom')}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 transition-colors ${
                    selectedPeriod === 'custom' ? 'bg-orange-500/20 text-orange-400' : 'text-white'
                  }`}
                >
                  {periods.custom.label}
                </button>
                
                {selectedPeriod === 'custom' && (
                  <div className="px-4 pb-4 space-y-2 bg-zinc-800/50">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">От</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">До</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCustomDateApply}
                      disabled={!customStartDate || !customEndDate}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                    >
                      Применить
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PeriodSelector;


