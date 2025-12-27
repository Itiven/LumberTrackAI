import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, User, TrendingUp, Clock, BarChart3, PieChart, Download, Loader2, Coins, Box, AlertCircle } from 'lucide-react';
import { fetchFullHistory } from '../services/sheetService';
import { AppSettings } from '../App';

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
}

interface ExecutorStats {
    name: string;
    totalBoards: number;
    totalVolumeIn: number;
    totalVolumeOut: number;
    avgYield: number;
    totalEarnings: number;
    totalTimeMinutes: number;
    avgTimePerBoard: number;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onBack, settings }) => {
    const [data, setData] = useState<AnalyticsRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [startDate, setStartDate] = useState<string>(
        new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );

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

    const calculateTime = (startId: string, endStr: string): number => {
        // Assuming boardId (startId) is a timestamp in ms
        const start = Number(startId);
        const endDate = parseDate(endStr);
        const end = endDate?.getTime();

        if (!isNaN(start) && end) {
            const diffMs = end - start;
            // Valid duration if between 1 minute and 12 hours (sanity check)
            if (diffMs > 60000 && diffMs < 12 * 60 * 60 * 1000) {
                return Math.round(diffMs / 60000); // minutes
            }
        }
        return 0; // Unknown or invalid
    };

    // Filter Data by Date Range and Calculate Stats
    const filteredData = data.filter(row => {
        const rowDate = parseDate(row.timestamp);
        if (!rowDate) return false;

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return rowDate >= start && rowDate <= end;
    });

    // Aggregate by Executor
    const executorStats: Record<string, ExecutorStats> = {};
    const productStatsMap: Record<string, number> = {};

    let totalVolumeIn = 0;
    let totalVolumeOut = 0;
    let totalEarningsGlobal = 0;

    filteredData.forEach(row => {
        const executor = row.executor || 'Неизвестный';
        if (!executorStats[executor]) {
            executorStats[executor] = {
                name: executor,
                totalBoards: 0,
                totalVolumeIn: 0,
                totalVolumeOut: 0,
                avgYield: 0,
                totalEarnings: 0,
                totalTimeMinutes: 0,
                avgTimePerBoard: 0
            };
        }

        const stats = executorStats[executor];
        const volIn = Number(row.boardVolumeM3) || 0;
        const volOut = Number(row.productsVolumeM3) || 0;
        const earn = Number(row.earnings) || 0;
        const yld = Number(row.yieldPercentage) || 0;
        const duration = calculateTime(row.boardId, row.timestamp);

        stats.totalBoards++;
        stats.totalVolumeIn += volIn;
        stats.totalVolumeOut += volOut;
        stats.totalEarnings += earn;
        // Running average for yield
        stats.avgYield = ((stats.avgYield * (stats.totalBoards - 1)) + yld) / stats.totalBoards;

        if (duration > 0) {
            stats.totalTimeMinutes += duration;
        }

        totalVolumeIn += volIn;
        totalVolumeOut += volOut;
        totalEarningsGlobal += earn;

        // Unpivot Products
        try {
            if (row.products && typeof row.products === 'string') {
                const productsMap = JSON.parse(row.products);
                Object.entries(productsMap).forEach(([productName, qty]) => {
                    const quantity = Number(qty) || 0;
                    if (!productStatsMap[productName]) {
                        productStatsMap[productName] = 0;
                    }
                    productStatsMap[productName] += quantity;
                });
            }
        } catch (e) {
            // Ignore parsing errors for legacy data
        }
    });

    const productStats = Object.entries(productStatsMap)
        .map(([product, totalQuantity]) => ({ product, totalQuantity }))
        .sort((a, b) => b.totalQuantity - a.totalQuantity);

    // Finalize averages
    const tableData = Object.values(executorStats).map(stat => ({
        ...stat,
        avgTimePerBoard: stat.totalTimeMinutes > 0 && stat.totalBoards > 0
            ? Math.round(stat.totalTimeMinutes / stat.totalBoards)
            : 0
    })).sort((a, b) => b.totalEarnings - a.totalEarnings);

    const globalYield = totalVolumeIn > 0 ? (totalVolumeOut / totalVolumeIn) * 100 : 0;

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

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white"
                    />
                    <span className="text-zinc-500">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white"
                    />
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#27272a] p-4 rounded-xl border border-zinc-800">
                        <div className="text-zinc-500 text-xs mb-1 flex items-center gap-1"><Coins size={12} /> Выручка</div>
                        <div className="text-2xl font-bold text-green-400">{totalEarningsGlobal.toLocaleString()} ₽</div>
                    </div>
                    <div className="bg-[#27272a] p-4 rounded-xl border border-zinc-800">
                        <div className="text-zinc-500 text-xs mb-1 flex items-center gap-1"><Box size={12} /> Объем (Вход)</div>
                        <div className="text-2xl font-bold text-white">{totalVolumeIn.toFixed(3)} м³</div>
                    </div>
                    <div className="bg-[#27272a] p-4 rounded-xl border border-zinc-800">
                        <div className="text-zinc-500 text-xs mb-1 flex items-center gap-1"><TrendingUp size={12} /> Средний КПД</div>
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
                                    <th className="px-4 py-3 text-right">Партий</th>
                                    <th className="px-4 py-3 text-right">Выручка</th>
                                    <th className="px-4 py-3 text-center">КПД %</th>
                                    <th className="px-4 py-3 text-center">Время/Доска (мин)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {tableData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
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
                                            <td className="px-4 py-3 text-right text-zinc-300">{stat.totalBoards}</td>
                                            <td className="px-4 py-3 text-right text-green-400 font-bold">{stat.totalEarnings}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs ${stat.avgYield > 60 ? 'bg-green-900/30 text-green-400' : 'bg-orange-900/30 text-orange-400'}`}>
                                                    {stat.avgYield.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-zinc-400">
                                                {stat.avgTimePerBoard || '-'}
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
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {productStats.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} className="px-4 py-8 text-center text-zinc-500">
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
