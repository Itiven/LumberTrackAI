import React, { useState } from 'react';
import { ArrowLeft, BarChart3, Package, Settings as SettingsIcon, FileText, ChevronRight } from 'lucide-react';
import { AppSettings } from '../App';
import KPISettingsCRUD from './admin/KPISettingsCRUD';
import ProductTypeCRUD from './admin/ProductTypeCRUD';
import ProductCRUD from './admin/ProductCRUD';
import SettingsCRUD from './admin/SettingsCRUD';
import ReportSettingsCRUD from './admin/ReportSettingsCRUD';

interface ReferencesViewProps {
  onBack: () => void;
  settings: AppSettings;
}

const ReferencesView: React.FC<ReferencesViewProps> = ({ onBack, settings }) => {
  const [activeCRUD, setActiveCRUD] = useState<'kpi' | 'productType' | 'product' | 'settings' | 'reportSettings' | null>(null);

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
        <h1 className="text-2xl font-bold">Справочники</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="md:max-w-2xl md:mx-auto w-full space-y-6">
          {/* CRUD Operations */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-orange-500 uppercase tracking-wider ml-1">Управление данными</h3>
            <div className="bg-[#27272a] rounded-xl overflow-hidden border border-orange-900/30 divide-y divide-zinc-800">
              <button
                onClick={() => setActiveCRUD('kpi')}
                className="w-full flex items-center justify-between p-4 hover:bg-orange-500/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/10 p-2 rounded-lg text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <BarChart3 size={20} />
                  </div>
                  <span className="font-medium text-orange-400 group-hover:text-orange-300">Настройки KPI</span>
                </div>
                <ChevronRight size={16} className="text-orange-500/50" />
              </button>

              <button
                onClick={() => setActiveCRUD('productType')}
                className="w-full flex items-center justify-between p-4 hover:bg-orange-500/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/10 p-2 rounded-lg text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <Package size={20} />
                  </div>
                  <span className="font-medium text-orange-400 group-hover:text-orange-300">Типы продукции</span>
                </div>
                <ChevronRight size={16} className="text-orange-500/50" />
              </button>

              <button
                onClick={() => setActiveCRUD('product')}
                className="w-full flex items-center justify-between p-4 hover:bg-orange-500/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/10 p-2 rounded-lg text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <Package size={20} />
                  </div>
                  <span className="font-medium text-orange-400 group-hover:text-orange-300">Продукция</span>
                </div>
                <ChevronRight size={16} className="text-orange-500/50" />
              </button>

              <button
                onClick={() => setActiveCRUD('settings')}
                className="w-full flex items-center justify-between p-4 hover:bg-orange-500/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/10 p-2 rounded-lg text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <SettingsIcon size={20} />
                  </div>
                  <span className="font-medium text-orange-400 group-hover:text-orange-300">Настройки</span>
                </div>
                <ChevronRight size={16} className="text-orange-500/50" />
              </button>

              <button
                onClick={() => setActiveCRUD('reportSettings')}
                className="w-full flex items-center justify-between p-4 hover:bg-orange-500/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/10 p-2 rounded-lg text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <FileText size={20} />
                  </div>
                  <span className="font-medium text-orange-400 group-hover:text-orange-300">Настройки отчета</span>
                </div>
                <ChevronRight size={16} className="text-orange-500/50" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CRUD Modals */}
      {activeCRUD === 'kpi' && (
        <KPISettingsCRUD
          webhookUrl={settings.googleSheetUrl}
          onClose={() => setActiveCRUD(null)}
        />
      )}
      {activeCRUD === 'productType' && (
        <ProductTypeCRUD
          webhookUrl={settings.googleSheetUrl}
          onClose={() => setActiveCRUD(null)}
        />
      )}
      {activeCRUD === 'product' && (
        <ProductCRUD
          webhookUrl={settings.googleSheetUrl}
          onClose={() => setActiveCRUD(null)}
        />
      )}
      {activeCRUD === 'settings' && (
        <SettingsCRUD
          webhookUrl={settings.googleSheetUrl}
          onClose={() => setActiveCRUD(null)}
        />
      )}
      {activeCRUD === 'reportSettings' && (
        <ReportSettingsCRUD
          webhookUrl={settings.googleSheetUrl}
          onClose={() => setActiveCRUD(null)}
        />
      )}
    </div>
  );
};

export default ReferencesView;


