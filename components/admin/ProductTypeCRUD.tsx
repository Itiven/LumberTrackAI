import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { ProductTypeDefinition } from '../../types';
import { fetchProductTypes, createRecord, updateRecord, deleteRecord } from '../../services/sheetService';

interface ProductTypeCRUDProps {
  webhookUrl: string;
  onClose: () => void;
}

const ProductTypeCRUD: React.FC<ProductTypeCRUDProps> = ({ webhookUrl, onClose }) => {
  const [items, setItems] = useState<ProductTypeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<ProductTypeDefinition>>({ id: '', ru: '', ua: '' });
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
      const data = await fetchProductTypes(webhookUrl);
      setItems(data);
    } catch (e) {
      console.error('Failed to load product types:', e);
      setError('Не удалось загрузить типы продукции');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newItem.id || !newItem.ru || !newItem.ua) {
      setError('Заполните все поля');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createRecord(webhookUrl, 'ТИП ПРОДУКЦИИ', newItem);
      await loadItems();
      setNewItem({ id: '', ru: '', ua: '' });
    } catch (e) {
      console.error('Failed to create product type:', e);
      setError('Не удалось создать тип продукции');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (item: ProductTypeDefinition) => {
    setSaving(true);
    setError(null);

    try {
      await updateRecord(webhookUrl, 'ТИП ПРОДУКЦИИ', item);
      await loadItems();
      setEditingId(null);
    } catch (e) {
      console.error('Failed to update product type:', e);
      setError('Не удалось обновить тип продукции');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот тип продукции?')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await deleteRecord(webhookUrl, 'ТИП ПРОДУКЦИИ', id);
      await loadItems();
    } catch (e) {
      console.error('Failed to delete product type:', e);
      setError('Не удалось удалить тип продукции');
    } finally {
      setSaving(false);
    }
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
          <h2 className="text-2xl font-bold text-white">Типы продукции</h2>
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
            <h3 className="text-lg font-bold text-white mb-4">Добавить новый тип</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="ID (например, AXE_HANDLE)"
                value={newItem.id}
                onChange={(e) => setNewItem({ ...newItem, id: e.target.value })}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
              />
              <input
                type="text"
                placeholder="Название (RU)"
                value={newItem.ru}
                onChange={(e) => setNewItem({ ...newItem, ru: e.target.value })}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
              />
              <input
                type="text"
                placeholder="Название (UA)"
                value={newItem.ua}
                onChange={(e) => setNewItem({ ...newItem, ua: e.target.value })}
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
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 flex items-center justify-between"
              >
                {editingId === item.id ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      value={item.id}
                      disabled
                      className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white opacity-50"
                    />
                    <input
                      type="text"
                      value={item.ru}
                      onChange={(e) => {
                        const updated = items.map(i => i.id === item.id ? { ...i, ru: e.target.value } : i);
                        setItems(updated);
                      }}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                    />
                    <input
                      type="text"
                      value={item.ua}
                      onChange={(e) => {
                        const updated = items.map(i => i.id === item.id ? { ...i, ua: e.target.value } : i);
                        setItems(updated);
                      }}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                    />
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="font-bold text-white">{item.id}</div>
                    <div className="text-sm text-zinc-400">RU: {item.ru} | UA: {item.ua}</div>
                  </div>
                )}

                <div className="flex gap-2">
                  {editingId === item.id ? (
                    <>
                      <button
                        onClick={() => handleUpdate(item)}
                        disabled={saving}
                        className="p-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                      >
                        <Save size={20} className="text-white" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                      >
                        <X size={20} className="text-white" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingId(item.id)}
                        className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                      >
                        <Edit2 size={20} className="text-white" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
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

export default ProductTypeCRUD;



