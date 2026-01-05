import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchUnpivotedReport } from '../../services/sheetService';
import { AppSettings } from '../../App';
import PeriodSelector, { PeriodRange } from '../periodSelector/PeriodSelector';
import '@webdatarocks/webdatarocks/webdatarocks.css';
import ukLocale from '../../uk.json';

// Dynamic import for WebDataRocks to handle CommonJS module
let WebDataRocks: any = null;

interface AnalyticsWebDataRocksProps {
  onBack: () => void;
  settings: AppSettings;
}

const AnalyticsWebDataRocks: React.FC<AnalyticsWebDataRocksProps> = ({ onBack, settings }) => {
  const pivotContainerRef = useRef<HTMLDivElement>(null);
  const pivotRef = useRef<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodRange, setPeriodRange] = useState<PeriodRange | null>(null);
  const [isWebDataRocksLoaded, setIsWebDataRocksLoaded] = useState(false);

  // Load WebDataRocks and Toolbar dynamically
  useEffect(() => {
    const loadWebDataRocks = async () => {
      try {
        // Import WebDataRocks main module
        const wdrModule = await import('@webdatarocks/webdatarocks');
        WebDataRocks = (wdrModule as any).default || wdrModule;
        
        // Import Toolbar module (required for toolbar functionality)
        try {
          await import('@webdatarocks/webdatarocks/webdatarocks.toolbar.js');
        } catch (toolbarErr) {
          // Try minified version if regular import fails
          try {
            await import('@webdatarocks/webdatarocks/webdatarocks.toolbar.min.js');
          } catch (minErr) {
            console.warn('Toolbar module not found, toolbar may not work', minErr);
          }
        }
        
        setIsWebDataRocksLoaded(true);
      } catch (err) {
        console.error('Failed to load WebDataRocks:', err);
        setError('Ошибка загрузки WebDataRocks');
      }
    };
    loadWebDataRocks();
  }, []);

  const loadData = async () => {
    if (!settings.googleSheetUrl) {
      setError('URL таблицы не указан');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const reportData = await fetchUnpivotedReport(settings.googleSheetUrl);
      setData(reportData);
    } catch (err: any) {
      console.error('Failed to load report data:', err);
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [settings.googleSheetUrl]);

  // Filter data by period range
  const filteredData = useMemo(() => {
    if (!periodRange || data.length === 0) return data;

    return data.filter(row => {
      // Try to find date field (could be 'timestamp', 'date', or renamed)
      const dateValue = row.timestamp || row.date || row['Дата'] || row['Timestamp'] || row['Date'];
      
      if (!dateValue) return true; // Include if no date field found

      let rowDate: Date;
      
      // Handle different date formats
      if (dateValue instanceof Date) {
        rowDate = dateValue;
      } else if (typeof dateValue === 'string') {
        // Try to parse date string
        rowDate = new Date(dateValue);
        if (isNaN(rowDate.getTime())) {
          return true; // Include if date parsing fails
        }
      } else if (typeof dateValue === 'number') {
        // Timestamp in milliseconds or seconds
        rowDate = new Date(dateValue > 1e12 ? dateValue : dateValue * 1000);
      } else {
        return true; // Include if date is in unexpected format
      }

      // Check if date is within range
      return rowDate >= periodRange.startDate && rowDate <= periodRange.endDate;
    });
  }, [data, periodRange]);

  // Initialize WebDataRocks pivot table
  useEffect(() => {
    if (!isWebDataRocksLoaded || !pivotContainerRef.current || filteredData.length === 0 || !WebDataRocks) {
      return;
    }

    try {
      // Destroy existing instance if any
      if (pivotRef.current) {
        pivotRef.current.dispose();
        pivotRef.current = null;
      }

      // Create new WebDataRocks instance (can be called with or without new)
      const WebDataRocksConstructor = WebDataRocks.default || WebDataRocks;
      const pivotConfig = {
        container: pivotContainerRef.current,
        width: '100%',
        height: '100%',
        toolbar: true, // Toolbar parameter should be at the top level, not inside report.options
        global: {
          localization: ukLocale
        },
        report: {
          dataSource: {
            type: 'json',
            data: filteredData
          },
          options: {
            grid: {
              type: 'classic',
              showGrandTotals: 'on',
              showTotals: 'on',
              showFilter: true,
              showHeaders: true,
              allowDragging: true
            },
            configuratorActive: false,
            configuratorButton: false,
            showDefaultSlice: false
          },
          slice: {
            rows: [],
            columns: [],
            measures: []
          },
          formats: []
        }
      };

      // Try without new first (as it's callable), then with new if needed
      try {
        pivotRef.current = WebDataRocksConstructor(pivotConfig);
      } catch (err) {
        // If that fails, try with new
        pivotRef.current = new WebDataRocksConstructor(pivotConfig);
      }

      // Handle errors
      pivotRef.current.on('reportcomplete', () => {
        console.log('WebDataRocks report loaded successfully');
      });

      pivotRef.current.on('error', (event: any) => {
        console.error('WebDataRocks error:', event);
        setError('Ошибка при отображении сводной таблицы: ' + (event.message || 'Неизвестная ошибка'));
      });
    } catch (err: any) {
      console.error('Failed to initialize WebDataRocks:', err);
      setError('Ошибка инициализации WebDataRocks: ' + (err.message || 'Неизвестная ошибка'));
    }

    // Cleanup on unmount
    return () => {
      if (pivotRef.current) {
        try {
          pivotRef.current.dispose();
        } catch (e) {
          console.error('Error disposing WebDataRocks:', e);
        }
        pivotRef.current = null;
      }
    };
  }, [isWebDataRocksLoaded, filteredData]);

  const handlePeriodChange = (range: PeriodRange) => {
    setPeriodRange(range);
  };

  return (
    <div className="flex flex-col h-full bg-[#18181b] text-white animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="flex items-center gap-4 p-6 pb-4 md:max-w-5xl md:mx-auto md:w-full">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">WebDataRocks Dashboard</h1>
            <p className="text-zinc-400 text-sm mt-1">Интерактивная сводная таблица</p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Обновить данные"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto p-6">
          <div className="md:max-w-5xl md:mx-auto w-full h-full min-h-[600px]">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={48} className="text-orange-500 animate-spin mb-4" />
                <p className="text-zinc-400">Загрузка данных...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-400 mb-1">Ошибка загрузки</h3>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            )}

            {!isLoading && !error && data.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle className="text-zinc-500 mb-4" size={48} />
                <p className="text-zinc-400">Нет данных для отображения</p>
                <p className="text-zinc-500 text-sm mt-2">Убедитесь, что лист "ОТЧЕТ" содержит данные</p>
              </div>
            )}

            {!isLoading && !error && data.length > 0 && filteredData.length === 0 && periodRange && (
              <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle className="text-zinc-500 mb-4" size={48} />
                <p className="text-zinc-400">Нет данных за выбранный период</p>
                <p className="text-zinc-500 text-sm mt-2">Попробуйте выбрать другой период</p>
              </div>
            )}

            {!isWebDataRocksLoaded && !isLoading && !error && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={48} className="text-orange-500 animate-spin mb-4" />
                <p className="text-zinc-400">Загрузка WebDataRocks...</p>
              </div>
            )}

            {!isLoading && !error && isWebDataRocksLoaded && filteredData.length > 0 && (
              <div className="bg-[#27272a] rounded-xl border border-zinc-800 overflow-hidden h-full">
                <div ref={pivotContainerRef} className="wdr-component" style={{ height: '100%', minHeight: '600px' }} />
              </div>
            )}
          </div>
        </div>

        {/* Footer with Period Selector */}
        <div className="border-t border-zinc-800 bg-[#18181b] p-4">
          <div className="md:max-w-5xl md:mx-auto w-full flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">Период отчета:</span>
              <PeriodSelector onPeriodChange={handlePeriodChange} />
            </div>
            {periodRange && (
              <p className="text-xs text-zinc-400">
                {periodRange.startDate.toLocaleDateString('ru-RU')} - {periodRange.endDate.toLocaleDateString('ru-RU')}
              </p>
            )}
            {!periodRange && filteredData.length > 0 && (
              <p className="text-xs text-zinc-500">
                Показано {filteredData.length} записей
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsWebDataRocks;
