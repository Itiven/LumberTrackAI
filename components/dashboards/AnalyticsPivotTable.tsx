import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchUnpivotedReport, fetchReportSettings } from '../../services/sheetService';
import { AppSettings } from '../../App';
import PeriodSelector, { PeriodRange } from '../periodSelector/PeriodSelector';

interface AnalyticsPivotTableProps {
  onBack: () => void;
  settings: AppSettings;
}

interface ReportSettings {
  renameMap: Record<string, string>; // { originalKey: newKey }
  orderMap: Record<string, number>; // { originalKey: order }
  orderedKeys: string[]; // Array of original keys sorted by order
}

const AnalyticsPivotTable: React.FC<AnalyticsPivotTableProps> = ({ onBack, settings }) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodRange, setPeriodRange] = useState<PeriodRange | null>(null);
  const [reportSettings, setReportSettings] = useState<ReportSettings | null>(null);

  // Load report settings from НАСТРОЙКИ ОТЧЕТА sheet
  const loadReportSettings = async () => {
    if (!settings.googleSheetUrl) return;

    try {
      const settingsData = await fetchReportSettings(settings.googleSheetUrl);
      
      // Parse settings data similar to getReportSettings() in unpivot.js
      if (!settingsData || settingsData.length === 0) {
        setReportSettings({ renameMap: {}, orderMap: {}, orderedKeys: [] });
        return;
      }

      const renameMap: Record<string, string> = {};
      const orderMap: Record<string, number> = {};
      const keysWithSettings: Array<{ originalKey: string; newKey: string; order: number }> = [];

      // Find column indices (settingsData should be array of objects from sheet)
      // Assuming structure: { 'getUnpivotedReportData': 'timestamp', 'ОТЧЕТ': 'Дата', 'ПОРЯДОК_ОТЧЕТА': 1, ... }
      for (const row of settingsData) {
        const originalKey = String(row['getUnpivotedReportData'] || row.getUnpivotedReportData || '').trim();
        if (!originalKey) continue;

        const newKey = String(row['ОТЧЕТ'] || row.ОТЧЕТ || '').trim();
        const order = row['ПОРЯДОК_ОТЧЕТА'] !== undefined 
          ? Number(row['ПОРЯДОК_ОТЧЕТА']) 
          : (row.ПОРЯДОК_ОТЧЕТА !== undefined ? Number(row.ПОРЯДОК_ОТЧЕТА) : null);

        // Only include keys that have a new name (non-empty)
        if (newKey) {
          renameMap[originalKey] = newKey;
          if (order !== null && !isNaN(order)) {
            orderMap[originalKey] = order;
          }
          keysWithSettings.push({
            originalKey,
            newKey,
            order: order !== null && !isNaN(order) ? order : 9999
          });
        }
      }

      // Sort by order
      keysWithSettings.sort((a, b) => a.order - b.order);
      const orderedKeys = keysWithSettings.map(item => item.originalKey);

      setReportSettings({ renameMap, orderMap, orderedKeys });
    } catch (err) {
      console.error('Failed to load report settings:', err);
      setReportSettings({ renameMap: {}, orderMap: {}, orderedKeys: [] });
    }
  };

  const loadData = async () => {
    if (!settings.googleSheetUrl) {
      setError('URL таблицы не указан');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load settings and data in parallel
      await Promise.all([
        loadReportSettings(),
        (async () => {
          const reportData = await fetchUnpivotedReport(settings.googleSheetUrl);
          setData(reportData);
        })()
      ]);
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

  // Get columns with renamed headers based on report settings
  const getColumns = (): Array<{ originalKey: string; displayName: string }> => {
    if (filteredData.length === 0) return [];
    
    // Get all unique original keys from data
    const originalKeys = new Set<string>();
    filteredData.forEach(row => {
      Object.keys(row).forEach(key => originalKeys.add(key));
    });

    const renameMap = reportSettings?.renameMap || {};
    const orderedKeys = reportSettings?.orderedKeys || [];
    const orderMap = reportSettings?.orderMap || {};

    // Create array of columns with original key and display name
    const columns: Array<{ originalKey: string; displayName: string }> = [];

    // First, add columns in order from settings (if they exist in data)
    orderedKeys.forEach(originalKey => {
      if (originalKeys.has(originalKey) && renameMap[originalKey]) {
        columns.push({
          originalKey,
          displayName: renameMap[originalKey]
        });
      }
    });

    // Then add remaining columns that are not in orderedKeys
    originalKeys.forEach(originalKey => {
      const alreadyAdded = columns.some(col => col.originalKey === originalKey);
      if (!alreadyAdded) {
        columns.push({
          originalKey,
          displayName: renameMap[originalKey] || originalKey
        });
      }
    });

    return columns;
  };

  const columns = getColumns();

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
            <h1 className="text-2xl font-bold">Сводная таблица</h1>
            <p className="text-zinc-400 text-sm mt-1">Данные из листа "ОТЧЕТ"</p>
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
        
        {/* Period Selector */}
        <div className="px-6 pb-4 md:max-w-5xl md:mx-auto md:w-full">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">Период:</span>
            <PeriodSelector onPeriodChange={handlePeriodChange} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="md:max-w-5xl md:mx-auto w-full">
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

          {!isLoading && !error && filteredData.length > 0 && (
            <div className="bg-[#27272a] rounded-xl border border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-800/50 border-b border-zinc-700">
                    <tr>
                      {columns.map((col, idx) => (
                        <th
                          key={idx}
                          className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider sticky left-0 bg-zinc-800/50 z-10"
                        >
                          {col.displayName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredData.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="hover:bg-zinc-800/30 transition-colors"
                      >
                        {columns.map((col, colIdx) => (
                          <td
                            key={colIdx}
                            className="px-4 py-3 text-sm text-zinc-300 whitespace-nowrap"
                          >
                            {row[col.originalKey] !== null && row[col.originalKey] !== undefined
                              ? String(row[col.originalKey])
                              : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-zinc-800/30 px-4 py-3 border-t border-zinc-700 flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  Показано {filteredData.length} из {data.length} записей
                </p>
                {periodRange && (
                  <p className="text-xs text-zinc-400">
                    {periodRange.startDate.toLocaleDateString('ru-RU')} - {periodRange.endDate.toLocaleDateString('ru-RU')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPivotTable;

