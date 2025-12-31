import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { fetchSettings, createRecord, updateRecord, deleteRecord } from '../../services/sheetService';

interface Setting {
  key: string;
  value: string;
  [key: string]: any;
}

interface SettingsCRUDProps {
  webhookUrl: string;
  onClose: () => void;
}

const SettingsCRUD: React.FC<SettingsCRUDProps> = ({ webhookUrl, onClose }) => {
  const [items, setItems] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Setting>({ key: '', value: '' });
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
      const data = await fetchSettings(webhookUrl);
      setItems(data);
    } catch (e) {
      console.error('Failed to load settings:', e);
      setError('Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newItem.key || !newItem.value) {
      setError('Заполните ключ и значение');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createRecord(webhookUrl, 'Настройки', newItem, 'key');
      await loadItems();
      setNewItem({ key: '', value: '' });
    } catch (e) {
      console.error('Failed to create setting:', e);
      setError('Не удалось создать настройку');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (item: Setting) => {
    setSaving(true);
    setError(null);

    try {
      await updateRecord(webhookUrl, 'Настройки', item, 'key');
      await loadItems();
      setEditingKey(null);
    } catch (e) {
      console.error('Failed to update setting:', e);
      setError('Не удалось обновить настройку');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту настройку?')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await deleteRecord(webhookUrl, 'Настройки', key, 'key');
      await loadItems();
    } catch (e) {
      console.error('Failed to delete setting:', e);
      setError('Не удалось удалить настройку');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (key: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.key === key) {
        return { ...item, [field]: value };
      }
      return item;
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
          <h2 className="text-2xl font-bold text-white">Настройки</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Ключ"
                value={newItem.key}
                onChange={(e) => setNewItem({ ...newItem, key: e.target.value })}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
              />
              <textarea
                placeholder="Значение"
                value={newItem.value}
                onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white min-h-[100px]"
                rows={4}
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
            {items.map((item) => (
              <div
                key={item.key}
                className="bg-zinc-900 rounded-lg p-4 border border-zinc-800"
              >
                {editingKey === item.key ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={item.key}
                      disabled
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white opacity-50"
                    />
                    <textarea
                      value={item.value}
                      onChange={(e) => updateItem(item.key, 'value', e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white min-h-[100px]"
                      rows={6}
                    />
                  </div>
                ) : (
                  <div>
                    <div className="font-bold text-white mb-2">{item.key}</div>
                    <div className="text-sm text-zinc-400 whitespace-pre-wrap break-words">
                      {item.value.length > 200 ? `${item.value.substring(0, 200)}...` : item.value}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  {editingKey === item.key ? (
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
                        onClick={() => setEditingKey(item.key)}
                        className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                      >
                        <Edit2 size={20} className="text-white" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.key)}
                        disabled={saving}
                        className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 size={20} className="text-white" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsCRUD;




