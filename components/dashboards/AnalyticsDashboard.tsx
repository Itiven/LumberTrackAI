import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, User, TrendingUp, Clock, BarChart3, PieChart, Download, Loader2, Coins, Box, AlertCircle } from 'lucide-react';
import { fetchFullHistory, fetchSettings } from '../../services/sheetService';
import { AppSettings } from '../../App';
import { KPISettings, KPIConfig } from '../../types';
import PeriodSelector, { PeriodRange } from '../periodSelector/PeriodSelector';

interface AnalyticsDashboardProps {
    onBack: () => void;
    settings: AppSettings;
}

interface AnalyticsRecord {
    timestamp: string;
    boardId: string;
    executor: string;
    batchNumber: string;
    productsVolumeM3: number;
    boardVolumeM3: number;
    yieldPercentage: number;
    earnings: number;
    products: string; // JSON string
    status?: string;
    board_cost?: number; // Стоимость доски
    KPI?: number; // KPI значение
}

interface ExecutorStats {
    name: string;
    totalBoards: number;
    totalVolumeIn: number;
    totalVolumeOut: number;
    avgYield: number;
    totalEarnings: number;
    totalBoardCost: number; // Сумма стоимости всех досок
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onBack, settings }) => {
    const [data, setData] = useState<AnalyticsRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [periodRange, setPeriodRange] = useState<PeriodRange | null>(null);
    const [kpiSettings, setKpiSettings] = useState<KPISettings | null>(null);

    // Default KPI settings (fallback)
    const defaultKPISettings: KPISettings = {
        good: { emoji: '🟢', threshold: 1.5, send: false, condition: '>=' },
        ok: { emoji: '🟡', threshold: 1.2, send: false, condition: '>=' },
        bad: { emoji: '🟠', threshold: 1.0, send: false, condition: '<' },
        'very bad': { emoji: '🔴', threshold: 0.5, send: false, condition: '<' }
    };

    // Helper to parse date formats
    const parseDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        try {
            // Try ISO format first (YYYY-MM-DD...)
            if (dateStr.includes('T')) {
                const d = new Date(dateStr);
                return isNaN(d.getTime()) ? null : d;
            }

            // Try Russian format (dd.mm.yyyy, hh:mm:ss)
            const [datePart, timePart] = dateStr.split(', ');
            if (datePart) {
                const [day, month, year] = datePart.split('.').map(Number);
                let hours = 0, minutes = 0, seconds = 0;
                if (timePart) {
                    [hours, minutes, seconds] = timePart.split(':').map(Number);
                }
                const d = new Date(year, month - 1, day, hours, minutes, seconds);
                return isNaN(d.getTime()) ? null : d;
            }
        } catch (e) {
            return null;
        }
        return null;
    };

    // Load KPI settings
    useEffect(() => {
        const loadKPISettings = async () => {
            if (!settings.googleSheetUrl) {
                setKpiSettings(defaultKPISettings);
                return;
            }

            try {
                const settingsData = await fetchSettings(settings.googleSheetUrl);
                const kpiSetting = settingsData.find((s: any) => s.key === 'bad_good_kpi');
                
                if (kpiSetting && kpiSetting.value) {
                    try {
                        const parsed = JSON.parse(kpiSetting.value);
                        if (parsed.good && parsed.ok && parsed.bad && parsed['very bad']) {
                            setKpiSettings(parsed);
                            return;
                        }
                    } catch (e) {
                        console.error('Failed to parse KPI settings:', e);
                    }
                }
                
                // Use default if not found or invalid
                setKpiSettings(defaultKPISettings);
            } catch (e) {
                console.error('Failed to load KPI settings:', e);
                setKpiSettings(defaultKPISettings);
            }
        };

        loadKPISettings();
    }, [settings.googleSheetUrl]);

    useEffect(() => {
        // Try to load from LocalStorage first for speed
        const savedData = localStorage.getItem('lumberAnalyticsData');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                setData(parsed);
            } catch (e) {
                console.error("Failed to load cached analytics", e);
            }
        }

        // Then fetch fresh data in background (or user triggers it)
        loadData();
    }, []);

    const loadData = async () => {
        if (!settings.googleSheetUrl) {
            setError("URL таблицы не настроен");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const history = await fetchFullHistory(settings.googleSheetUrl);
            // Filter out deleted rows
            const validData = history.filter((row: any) => row.status !== 'deleted');

            // Save to LocalStorage
            localStorage.setItem('lumberAnalyticsData', JSON.stringify(validData));

            setData(validData);
        } catch (e) {
            console.error(e);
            setError("Не удалось загрузить данные");
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to check KPI condition
    const checkKPICondition = (kpi: number, condition: string, threshold: number): boolean => {
        switch (condition) {
            case '>=': return kpi >= threshold;
            case '<=': return kpi <= threshold;
            case '>': return kpi > threshold;
            case '<': return kpi < threshold;
            default: return false;
        }
    };

    // Helper function to get emoji status from KPI value
    const getKPIStatusEmoji = (kpi: number | null | undefined, settings: KPISettings): string => {
        if (kpi === null || kpi === undefined || isNaN(kpi)) {
            return settings.bad.emoji; // Default to bad if no KPI
        }

        // Check in order: good -> ok -> very bad -> bad
        if (checkKPICondition(kpi, settings.good.condition, settings.good.threshold)) {
            return settings.good.emoji;
        }
        if (checkKPICondition(kpi, settings.ok.condition, settings.ok.threshold)) {
            return settings.ok.emoji;
        }
        if (checkKPICondition(kpi, settings['very bad'].condition, settings['very bad'].threshold)) {
            return settings['very bad'].emoji;
        }
        if (checkKPICondition(kpi, settings.bad.condition, settings.bad.threshold)) {
            return settings.bad.emoji;
        }

        // Fallback to bad
        return settings.bad.emoji;
    };

    // Filter Data by Date Range and Calculate Stats
    const filteredData = useMemo(() => {
        if (!periodRange) return data;

        return data.filter(row => {
            const rowDate = parseDate(row.timestamp);
            if (!rowDate) return false;

            return rowDate >= periodRange.startDate && rowDate <= periodRange.endDate;
        });
    }, [data, periodRange]);

    // Calculate stats from filtered data
    const { executorStats, productStats, tableData, totalVolumeIn, totalVolumeOut, totalEarningsGlobal, totalBoardCostGlobal, globalYield, statusStats } = useMemo(() => {
        // Aggregate by Executor
        const execStats: Record<string, ExecutorStats> = {};
        const prodStatsMap: Record<string, { quantity: number; amount: number }> = {};
        // Status stats structure: emoji -> { count, totalEarnings, totalBoardCost, totalVolumeIn, totalYield, boardCount }
        const statusStatsMap: Record<string, { 
            count: number; 
            totalEarnings: number; 
            totalBoardCost: number; 
            totalVolumeIn: number; 
            totalYield: number;
            boardCount: number;
        }> = {};

        const activeKPISettings = kpiSettings || defaultKPISettings;

        let volIn = 0;
        let volOut = 0;
        let earningsGlobal = 0;
        let boardCostGlobal = 0;

        filteredData.forEach(row => {
            const executor = row.executor || 'Неизвестный';
            if (!execStats[executor]) {
                execStats[executor] = {
                    name: executor,
                    totalBoards: 0,
                    totalVolumeIn: 0,
                    totalVolumeOut: 0,
                    avgYield: 0,
                    totalEarnings: 0,
                    totalBoardCost: 0
                };
            }

            const stats = execStats[executor];
            const rowVolIn = Number(row.boardVolumeM3) || 0;
            const rowVolOut = Number(row.productsVolumeM3) || 0;
            const earn = Number(row.earnings) || 0;
            const yld = Number(row.yieldPercentage) || 0;
            const boardCost = Number(row.board_cost) || 0;

            stats.totalBoards++;
            stats.totalVolumeIn += rowVolIn;
            stats.totalVolumeOut += rowVolOut;
            stats.totalEarnings += earn;
            stats.totalBoardCost += boardCost;
            // Running average for yield
            stats.avgYield = ((stats.avgYield * (stats.totalBoards - 1)) + yld) / stats.totalBoards;

            volIn += rowVolIn;
            volOut += rowVolOut;
            earningsGlobal += earn;
            boardCostGlobal += boardCost;

            // Aggregate status stats based on KPI
            const kpiValue = row.KPI !== null && row.KPI !== undefined ? Number(row.KPI) : null;
            const statusEmoji = getKPIStatusEmoji(kpiValue, activeKPISettings);
            if (!statusStatsMap[statusEmoji]) {
                statusStatsMap[statusEmoji] = {
                    count: 0,
                    totalEarnings: 0,
                    totalBoardCost: 0,
                    totalVolumeIn: 0,
                    totalYield: 0,
                    boardCount: 0
                };
            }
            const statusStat = statusStatsMap[statusEmoji];
            statusStat.count++;
            statusStat.totalEarnings += earn;
            statusStat.totalBoardCost += boardCost;
            statusStat.totalVolumeIn += rowVolIn;
            statusStat.totalYield += yld;
            statusStat.boardCount++;

            // Unpivot Products - supports both old format (number) and new format ({count, cost})
            try {
                if (row.products && typeof row.products === 'string') {
                    const productsMap = JSON.parse(row.products);
                    Object.entries(productsMap).forEach(([productName, productData]) => {
                        let quantity = 0;
                        let amount = 0;

                        // Check if it's new format: {count: number, cost: number}
                        if (productData && typeof productData === 'object' && 'count' in productData) {
                            quantity = Number((productData as any).count) || 0;
                            const cost = Number((productData as any).cost) || 0;
                            amount = quantity * cost;
                        } else {
                            // Old format: just a number
                            quantity = Number(productData) || 0;
                            amount = 0; // Old format doesn't have cost
                        }

                        if (!prodStatsMap[productName]) {
                            prodStatsMap[productName] = { quantity: 0, amount: 0 };
                        }
                        prodStatsMap[productName].quantity += quantity;
                        prodStatsMap[productName].amount += amount;
                    });
                }
            } catch (e) {
                // Ignore parsing errors for legacy data
                console.error('Error parsing products:', e);
            }
        });

        const prodStats = Object.entries(prodStatsMap)
            .map(([product, stats]) => ({ 
                product, 
                totalQuantity: stats.quantity,
                totalAmount: stats.amount
            }))
            .sort((a, b) => b.totalQuantity - a.totalQuantity);

        // Finalize data (no additional calculations needed)
        const tblData = Object.values(execStats).sort((a, b) => b.totalEarnings - a.totalEarnings);

        const yieldGlobal = volIn > 0 ? (volOut / volIn) * 100 : 0;

        // Convert status stats to array with labels and calculated averages
        const statusStatsArray = Object.entries(statusStatsMap).map(([emoji, stats]) => ({
            emoji,
            count: stats.count,
            totalEarnings: stats.totalEarnings,
            totalBoardCost: stats.totalBoardCost,
            totalVolumeIn: stats.totalVolumeIn,
            avgYield: stats.boardCount > 0 ? stats.totalYield / stats.boardCount : 0,
            label: emoji === activeKPISettings.good.emoji ? 'Хорошо' :
                   emoji === activeKPISettings.ok.emoji ? 'Нормально' :
                   emoji === activeKPISettings.bad.emoji ? 'Плохо' :
                   emoji === activeKPISettings['very bad'].emoji ? 'Очень плохо' : 'Неизвестно'
        })).sort((a, b) => {
            // Sort by priority: good -> ok -> bad -> very bad
            const order = [activeKPISettings.good.emoji, activeKPISettings.ok.emoji, 
                          activeKPISettings.bad.emoji, activeKPISettings['very bad'].emoji];
            const aIndex = order.indexOf(a.emoji);
            const bIndex = order.indexOf(b.emoji);
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });

        return {
            executorStats: execStats,
            productStats: prodStats,
            tableData: tblData,
            totalVolumeIn: volIn,
            totalVolumeOut: volOut,
            totalEarningsGlobal: earningsGlobal,
            totalBoardCostGlobal: boardCostGlobal,
            globalYield: yieldGlobal,
            statusStats: statusStatsArray
        };
    }, [filteredData, kpiSettings]);

    return (
        <div className="flex flex-col h-full bg-[#18181b] animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold flex items-center gap-2 text-blue-400">
                        <BarChart3 size={24} />
                        Аналитика
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <PeriodSelector onPeriodChange={setPeriodRange} />
                    <button
                        onClick={loadData}
                        disabled={isLoading}
                        title="Обновить данные с сервера"
                        className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors flex items-center gap-2"
                    >
                        <span className={`transition-transform duration-700 ${isLoading ? 'animate-spin' : ''}`}>
                            <Loader2 size={16} />
                        </span>
                        <span className="text-xs font-medium">Обновить</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 flex items-center gap-3">
                        <AlertCircle size={24} />
                        <p>{error}</p>
                    </div>
                )}

                {/* Global Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-[#27272a] p-4 rounded-xl border border-zinc-800">
                        <div className="text-zinc-500 text-xs mb-1 flex items-center gap-1"><Coins size={12} /> Сумма стоимости изделий</div>
                        <div className="text-2xl font-bold text-green-400">{totalEarningsGlobal.toLocaleString()} ₽</div>
                    </div>
                    <div className="bg-[#27272a] p-4 rounded-xl border border-zinc-800">
                        <div className="text-zinc-500 text-xs mb-1 flex items-center gap-1"><Coins size={12} /> Сумма стоимости досок</div>
                        <div className="text-2xl font-bold text-blue-400">
                            {totalBoardCostGlobal > 0 ? totalBoardCostGlobal.toLocaleString() + ' ₽' : '-'}
                        </div>
                    </div>
                    <div className="bg-[#27272a] p-4 rounded-xl border border-zinc-800">
                        <div className="text-zinc-500 text-xs mb-1 flex items-center gap-1"><Box size={12} /> Объем использования досок</div>
                        <div className="text-2xl font-bold text-white">{totalVolumeIn.toFixed(3)} м³</div>
                    </div>
                    <div className="bg-[#27272a] p-4 rounded-xl border border-zinc-800">
                        <div className="text-zinc-500 text-xs mb-1 flex items-center gap-1"><TrendingUp size={12} /> Средний КПІ</div>
                        <div className={`text-2xl font-bold ${globalYield > 50 ? 'text-green-400' : 'text-orange-400'}`}>
                            {globalYield.toFixed(1)}%
                        </div>
                    </div>
                    <div className="bg-[#27272a] p-4 rounded-xl border border-zinc-800">
                        <div className="text-zinc-500 text-xs mb-1 flex items-center gap-1"><AlertCircle size={12} /> Отходы</div>
                        <div className="text-2xl font-bold text-red-400">{(100 - globalYield).toFixed(1)}%</div>
                    </div>
                </div>

                {/* Executors Table */}
                <div className="bg-[#27272a] rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2 text-zinc-200">
                            <User size={18} />
                            Показатели сотрудников
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-800 text-zinc-400 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Сотрудник</th>
                                    <th className="px-4 py-3 text-right">Кол.Дошок (шт)</th>
                                    <th className="px-4 py-3 text-right">Сумма стоимости изделий</th>
                                    <th className="px-4 py-3 text-right">Сумма стоимости досок</th>
                                    <th className="px-4 py-3 text-right">Объем использования досок</th>
                                    <th className="px-4 py-3 text-center">КПД %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {tableData.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                                            Нет данных за выбранный период
                                        </td>
                                    </tr>
                                ) : (
                                    tableData.map((stat, idx) => (
                                        <tr key={stat.name} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px]">
                                                    {stat.name.charAt(0)}
                                                </div>
                                                {stat.name}
                                            </td>
                                            <td className="px-4 py-3 text-right text-zinc-300 font-bold">{stat.totalBoards}</td>
                                            <td className="px-4 py-3 text-right text-green-400 font-bold">{stat.totalEarnings.toLocaleString()} ₽</td>
                                            <td className="px-4 py-3 text-right text-blue-400 font-bold">
                                                {stat.totalBoardCost > 0 ? stat.totalBoardCost.toLocaleString() + ' ₽' : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-zinc-300">
                                                {stat.totalVolumeIn.toFixed(3)} м³
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs ${stat.avgYield > 60 ? 'bg-green-900/30 text-green-400' : 'bg-orange-900/30 text-orange-400'}`}>
                                                    {stat.avgYield.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Status Stats Section */}
                <div className="bg-[#27272a] rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2 text-zinc-200">
                            <TrendingUp size={18} />
                            Показатели статусов
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-800 text-zinc-400 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Статус</th>
                                    <th className="px-4 py-3 text-right">Количество досок (шт)</th>
                                    <th className="px-4 py-3 text-right">Сумма стоимости изделий</th>
                                    <th className="px-4 py-3 text-right">Сумма стоимости досок</th>
                                    <th className="px-4 py-3 text-right">Объем использования досок</th>
                                    <th className="px-4 py-3 text-center">Средний КПД %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {statusStats.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                                            Нет данных о статусах
                                        </td>
                                    </tr>
                                ) : (
                                    statusStats.map((stat, idx) => (
                                        <tr key={stat.emoji} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                                                <span className="text-2xl">{stat.emoji}</span>
                                                <span>{stat.label}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-zinc-300 font-bold">{stat.count}</td>
                                            <td className="px-4 py-3 text-right text-green-400 font-bold">
                                                {stat.totalEarnings.toLocaleString()} ₽
                                            </td>
                                            <td className="px-4 py-3 text-right text-blue-400 font-bold">
                                                {stat.totalBoardCost > 0 ? stat.totalBoardCost.toLocaleString() + ' ₽' : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-zinc-300">
                                                {stat.totalVolumeIn.toFixed(3)} м³
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs ${stat.avgYield > 60 ? 'bg-green-900/30 text-green-400' : 'bg-orange-900/30 text-orange-400'}`}>
                                                    {stat.avgYield.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Product Breakdown Table */}
                <div className="bg-[#27272a] rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2 text-zinc-200">
                            <Box size={18} />
                            Произведенная продукция
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-800 text-zinc-400 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Продукция</th>
                                    <th className="px-4 py-3 text-right">Количество (шт)</th>
                                    <th className="px-4 py-3 text-right">Сумма (₽)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {productStats.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                                            Нет данных о продукции
                                        </td>
                                    </tr>
                                ) : (
                                    productStats.map((stat, idx) => (
                                        <tr key={stat.product} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-white">
                                                {stat.product}
                                            </td>
                                            <td className="px-4 py-3 text-right text-zinc-300 font-bold">{stat.totalQuantity}</td>
                                            <td className="px-4 py-3 text-right text-green-400 font-bold">
                                                {stat.totalAmount > 0 ? stat.totalAmount.toLocaleString() : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Looker Studio Promo */}
                <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 p-6 rounded-xl border border-blue-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-blue-200 mb-1">Расширенная аналитика в Looker Studio</h3>
                        <p className="text-sm text-blue-200/60 max-w-lg">
                            Для построения графиков, дашбордов и глубокого анализа, вы можете подключить вашу таблицу Google Sheets к Looker Studio.
                        </p>
                    </div>
                    <a
                        href="https://lookerstudio.google.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                        <PieChart size={16} />
                        Открыть Looker Studio
                    </a>
                </div>

            </div>
        </div >
    );
};

export default AnalyticsDashboard;
