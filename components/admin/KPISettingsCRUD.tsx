import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { KPISettings } from '../../types';
import { fetchSettings, updateRecord, createRecord } from '../../services/sheetService';

interface KPISettingsCRUDProps {
  webhookUrl: string;
  onClose: () => void;
}

const DEFAULT_KPI_SETTINGS: KPISettings = {
  good: { emoji: '🟢', threshold: 1.5, send: false, condition: '>=' },
  ok: { emoji: '🟡', threshold: 1.2, send: false, condition: '>=' },
  bad: { emoji: '🟠', threshold: 1.0, send: false, condition: '<' },
  'very bad': { emoji: '🔴', threshold: 0.5, send: true, condition: '<' }
};

const KPISettingsCRUD: React.FC<KPISettingsCRUDProps> = ({ webhookUrl, onClose }) => {
  const [settings, setSettings] = useState<KPISettings>(DEFAULT_KPI_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!webhookUrl) {
      setLoading(false);
      return;
    }

    try {
      const data = await fetchSettings(webhookUrl);
      const kpiSetting = data.find((item: any) => item.key === 'bad_good_kpi');
      
      if (kpiSetting && kpiSetting.value) {
        try {
          const parsed = JSON.parse(kpiSetting.value);
          setSettings(parsed);
        } catch (e) {
          console.error('Failed to parse KPI settings:', e);
        }
      }
    } catch (e) {
      console.error('Failed to load KPI settings:', e);
      setError('Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!webhookUrl) {
      setError('URL вебхука не настроен');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const value = JSON.stringify(settings, null, 2);
      const payload = {
        key: 'bad_good_kpi',
        value: value
      };

      // Try to update existing, if fails, create new
      const success = await updateRecord(webhookUrl, 'Настройки', payload, 'key');
      
      if (!success) {
        await createRecord(webhookUrl, 'Настройки', payload);
      }

      alert('Настройки KPI успешно сохранены!');
      onClose();
    } catch (e) {
      console.error('Failed to save KPI settings:', e);
      setError('Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  };

  const updateKPILevel = (level: keyof KPISettings, field: keyof KPISettings['good'], value: any) => {
    setSettings(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#27272a] rounded-xl p-6 text-white">
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#27272a] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-zinc-800">
        <div className="sticky top-0 bg-[#27272a] border-b border-zinc-800 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Настройки KPI</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}

          {(Object.keys(DEFAULT_KPI_SETTINGS) as Array<keyof KPISettings>).map((level) => (
            <div key={level} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <h3 className="text-lg font-bold text-white mb-4 capitalize">{level}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Emoji</label>
                  <input
                    type="text"
                    value={settings[level].emoji}
                    onChange={(e) => updateKPILevel(level, 'emoji', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                    maxLength={2}
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Порог</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings[level].threshold}
                    onChange={(e) => updateKPILevel(level, 'threshold', parseFloat(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Условие</label>
                  <select
                    value={settings[level].condition}
                    onChange={(e) => updateKPILevel(level, 'condition', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                  >
                    <option value=">=">{">="}</option>
                    <option value="<=">{"<="}</option>
                    <option value=">">{">"}</option>
                    <option value="<">{"<"}</option>
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings[level].send}
                      onChange={(e) => updateKPILevel(level, 'send', e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-zinc-400">Отправлять уведомление</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-[#27272a] border-t border-zinc-800 p-6 flex gap-4 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={20} />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KPISettingsCRUD;



