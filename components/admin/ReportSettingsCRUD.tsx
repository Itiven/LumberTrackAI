import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save, ArrowUp, ArrowDown } from 'lucide-react';

interface ReportSetting {
  getUnpivotedReportData: string; // Original key name
  ОТЧЕТ?: string; // Display name
  ПОРЯДОК_ОТЧЕТА?: number; // Order
  [key: string]: any;
}

interface ReportSettingsCRUDProps {
  webhookUrl: string;
  onClose: () => void;
}

const ReportSettingsCRUD: React.FC<ReportSettingsCRUDProps> = ({ webhookUrl, onClose }) => {
  const [items, setItems] = useState<ReportSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<ReportSetting>({
    getUnpivotedReportData: '',
    ОТЧЕТ: '',
    ПОРЯДОК_ОТЧЕТА: 0
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    if (!webhookUrl) {
      setLoading(false);
      return;
    }

    try {
      // Try to fetch from "НАСТРОЙКИ ОТЧЕТА" sheet
      // Note: This requires backend support in doGet.js
      const url = new URL(webhookUrl);
      url.searchParams.append('action', 'getReportSettings');

      const response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow'
      });

      if (!response.ok) {
        // If action doesn't exist, return empty array (will be handled by backend)
        setItems([]);
        return;
      }

      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load report settings:', e);
      // Don't show error if action doesn't exist yet
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newItem.getUnpivotedReportData || !newItem.ОТЧЕТ) {
      setError('Заполните название поля и отображаемое имя');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        action: 'crud',
        sheetName: 'НАСТРОЙКИ ОТЧЕТА',
        operation: 'create',
        data: newItem,
        idField: 'getUnpivotedReportData'
      };

      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      await loadItems();
      setNewItem({ getUnpivotedReportData: '', ОТЧЕТ: '', ПОРЯДОК_ОТЧЕТА: 0 });
    } catch (e) {
      console.error('Failed to create report setting:', e);
      setError('Не удалось создать настройку отчета');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (item: ReportSetting) => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        action: 'crud',
        sheetName: 'НАСТРОЙКИ ОТЧЕТА',
        operation: 'update',
        data: item,
        idField: 'getUnpivotedReportData'
      };

      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      await loadItems();
      setEditingKey(null);
    } catch (e) {
      console.error('Failed to update report setting:', e);
      setError('Не удалось обновить настройку отчета');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту настройку отчета?')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        action: 'crud',
        sheetName: 'НАСТРОЙКИ ОТЧЕТА',
        operation: 'delete',
        data: { getUnpivotedReportData: key },
        idField: 'getUnpivotedReportData'
      };

      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      await loadItems();
    } catch (e) {
      console.error('Failed to delete report setting:', e);
      setError('Не удалось удалить настройку отчета');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (key: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.getUnpivotedReportData === key) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    
    // Update order values
    newItems.forEach((item, idx) => {
      item.ПОРЯДОК_ОТЧЕТА = idx + 1;
    });

    setItems(newItems);
    
    // Save all items with new order
    Promise.all(newItems.map(item => handleUpdate(item))).then(() => {
      loadItems();
    });
  };

  // Sort items by order
  const sortedItems = [...items].sort((a, b) => {
    const orderA = a.ПОРЯДОК_ОТЧЕТА || 9999;
    const orderB = b.ПОРЯДОК_ОТЧЕТА || 9999;
    return orderA - orderB;
  });

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
          <h2 className="text-2xl font-bold text-white">Настройки отчета</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}

          {/* Create new item */}
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <h3 className="text-lg font-bold text-white mb-4">Добавить настройку</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Название поля (ключ)"
                value={newItem.getUnpivotedReportData}
                onChange={(e) => setNewItem({ ...newItem, getUnpivotedReportData: e.target.value })}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
              />
              <input
                type="text"
                placeholder="Отображаемое имя"
                value={newItem.ОТЧЕТ}
                onChange={(e) => setNewItem({ ...newItem, ОТЧЕТ: e.target.value })}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
              />
              <input
                type="number"
                placeholder="Порядок"
                value={newItem.ПОРЯДОК_ОТЧЕТА || 0}
                onChange={(e) => setNewItem({ ...newItem, ПОРЯДОК_ОТЧЕТА: parseInt(e.target.value) || 0 })}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Plus size={20} />
              Добавить
            </button>
          </div>

          {/* List items */}
          <div className="space-y-2">
            {sortedItems.map((item, index) => (
              <div
                key={item.getUnpivotedReportData}
                className="bg-zinc-900 rounded-lg p-4 border border-zinc-800"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded disabled:opacity-50"
                    >
                      <ArrowUp size={16} className="text-white" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === sortedItems.length - 1}
                      className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded disabled:opacity-50"
                    >
                      <ArrowDown size={16} className="text-white" />
                    </button>
                  </div>

                  {editingKey === item.getUnpivotedReportData ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        type="text"
                        value={item.getUnpivotedReportData}
                        disabled
                        className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white opacity-50"
                      />
                      <input
                        type="text"
                        value={item.ОТЧЕТ || ''}
                        onChange={(e) => updateItem(item.getUnpivotedReportData, 'ОТЧЕТ', e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                      />
                      <input
                        type="number"
                        value={item.ПОРЯДОК_ОТЧЕТА || 0}
                        onChange={(e) => updateItem(item.getUnpivotedReportData, 'ПОРЯДОК_ОТЧЕТА', parseInt(e.target.value) || 0)}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                      />
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="font-bold text-white">{item.getUnpivotedReportData}</div>
                      <div className="text-sm text-zinc-400">
                        Отображается как: {item.ОТЧЕТ || 'не задано'} | Порядок: {item.ПОРЯДОК_ОТЧЕТА || 0}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {editingKey === item.getUnpivotedReportData ? (
                      <>
                        <button
                          onClick={() => handleUpdate(item)}
                          disabled={saving}
                          className="p-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                        >
                          <Save size={20} className="text-white" />
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                        >
                          <X size={20} className="text-white" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingKey(item.getUnpivotedReportData)}
                          className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                        >
                          <Edit2 size={20} className="text-white" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.getUnpivotedReportData)}
                          disabled={saving}
                          className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={20} className="text-white" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportSettingsCRUD;

