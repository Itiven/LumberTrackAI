import React, { useState } from 'react';
import { ArrowLeft, Factory, Table2, ChevronRight } from 'lucide-react';
import { AppSettings } from '../../App';
import AnalyticsDashboard from './AnalyticsDashboard';
import AnalyticsPivotTable from './AnalyticsPivotTable';

interface DashboardsViewProps {
  onBack: () => void;
  settings: AppSettings;
}

type DashboardType = 'list' | 'analytics' | 'pivot';

const DashboardsView: React.FC<DashboardsViewProps> = ({ onBack, settings }) => {
  const [activeDashboard, setActiveDashboard] = useState<DashboardType>('list');

  if (activeDashboard === 'analytics') {
    return (
      <AnalyticsDashboard
        onBack={() => setActiveDashboard('list')}
        settings={settings}
      />
    );
  }

  if (activeDashboard === 'pivot') {
    return (
      <AnalyticsPivotTable
        onBack={() => setActiveDashboard('list')}
        settings={settings}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#18181b] text-white animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 pb-2 md:max-w-2xl md:mx-auto md:w-full">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Дашборди</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="md:max-w-2xl md:mx-auto w-full space-y-6">
          {/* Dashboard List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider ml-1">Доступные дашборды</h3>
            <div className="bg-[#27272a] rounded-xl overflow-hidden border border-blue-900/30 divide-y divide-zinc-800">
              <button
                onClick={() => setActiveDashboard('analytics')}
                className="w-full flex items-center justify-between p-4 hover:bg-blue-500/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Factory size={20} />
                  </div>
                  <span className="font-medium text-blue-400 group-hover:text-blue-300">Дашборд директора</span>
                </div>
                <ChevronRight size={16} className="text-blue-500/50" />
              </button>

              <button
                onClick={() => setActiveDashboard('pivot')}
                className="w-full flex items-center justify-between p-4 hover:bg-purple-500/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/10 p-2 rounded-lg text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <Table2 size={20} />
                  </div>
                  <span className="font-medium text-purple-400 group-hover:text-purple-300">Сводная таблица</span>
                </div>
                <ChevronRight size={16} className="text-purple-500/50" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardsView;


