import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save, Image as ImageIcon, Download } from 'lucide-react';
import { Product, ProductTypeDefinition } from '../../types';
import { fetchProducts, fetchProductTypes, createRecord, updateRecord, deleteRecord } from '../../services/sheetService';
import { generateProductImage, downloadProductImage, ImageColor, generateProductImagePrompt } from '../../services/geminiService';

interface ProductCRUDProps {
  webhookUrl: string;
  onClose: () => void;
}

const ProductCRUD: React.FC<ProductCRUDProps> = ({ webhookUrl, onClose }) => {
  const [items, setItems] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<Product>>({
    id: '',
    name: '',
    type: '',
    dimensions: { length: 0, width: 0, thickness: 0 },
    image: '',
    price: 0
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [imageColor, setImageColor] = useState<ImageColor>('green');
  const [showImageGenerator, setShowImageGenerator] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!webhookUrl) {
      setLoading(false);
      return;
    }

    try {
      const [productsData, typesData] = await Promise.all([
        fetchProducts(webhookUrl),
        fetchProductTypes(webhookUrl)
      ]);
      setItems(productsData);
      setProductTypes(typesData);
    } catch (e) {
      console.error('Failed to load products:', e);
      setError('Не удалось загрузить продукцию');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newItem.id || !newItem.name || !newItem.type) {
      setError('Заполните обязательные поля (ID, название, тип)');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        id: newItem.id,
        name: newItem.name,
        productType: newItem.type,
        length: newItem.dimensions?.length || 0,
        width: newItem.dimensions?.width || 0,
        thickness: newItem.dimensions?.thickness || 0,
        image: newItem.image || '',
        price: newItem.price || 0,
        close: false
      };

      await createRecord(webhookUrl, 'ПРОДУКЦИЯ', payload);
      await loadData();
      setNewItem({
        id: '',
        name: '',
        type: '',
        dimensions: { length: 0, width: 0, thickness: 0 },
        image: '',
        price: 0
      });
    } catch (e) {
      console.error('Failed to create product:', e);
      setError('Не удалось создать продукцию');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (item: Product) => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        id: item.id,
        name: item.name,
        productType: item.type,
        length: item.dimensions.length,
        width: item.dimensions.width,
        thickness: item.dimensions.thickness,
        image: item.image,
        price: item.price,
        close: false
      };

      await updateRecord(webhookUrl, 'ПРОДУКЦИЯ', payload);
      await loadData();
      setEditingId(null);
    } catch (e) {
      console.error('Failed to update product:', e);
      setError('Не удалось обновить продукцию');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту продукцию?')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Soft delete - mark as closed
      await updateRecord(webhookUrl, 'ПРОДУКЦИЯ', { id, close: true });
      await loadData();
    } catch (e) {
      console.error('Failed to delete product:', e);
      setError('Не удалось удалить продукцию');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        if (field.startsWith('dimensions.')) {
          const dimField = field.split('.')[1];
          return {
            ...item,
            dimensions: {
              ...item.dimensions,
              [dimField]: value
            }
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleGenerateImage = async (productName: string, productNumber?: string) => {
    setGeneratingImage(productName);
    setError(null);

    try {
      // Extract number from product name if not provided
      const numberMatch = productName.match(/(\d+)/);
      const number = productNumber || numberMatch?.[1] || '';
      
      // Generate image using Canvas
      const dataUrl = generateProductImage(productName, number || undefined, imageColor);
      
      // Create filename: productName.png
      const filename = `${productName}.png`;
      
      // Download image
      downloadProductImage(dataUrl, filename);
      
      // Also set the image URL (data URL can be used directly, or save to server)
      // For now, we'll use data URL directly
      if (editingId) {
        // Update the item being edited
        updateItem(editingId, 'image', dataUrl);
      } else {
        // Update new item
        setNewItem(prev => ({ ...prev, image: dataUrl }));
      }
      
      setShowImageGenerator(null);
      
      // Show success message
      alert(`Изображение "${filename}" сгенерировано и загружено!`);
    } catch (e) {
      console.error('Failed to generate image:', e);
      setError('Не удалось сгенерировать изображение');
    } finally {
      setGeneratingImage(null);
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
      <div className="bg-[#27272a] rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-zinc-800">
        <div className="sticky top-0 bg-[#27272a] border-b border-zinc-800 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Продукция</h2>
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
            <h3 className="text-lg font-bold text-white mb-4">Добавить продукцию</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">ID *</label>
                <input
                  type="text"
                  placeholder="ID"
                  value={newItem.id}
                  onChange={(e) => setNewItem({ ...newItem, id: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Название *</label>
                <input
                  type="text"
                  placeholder="Название"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Тип продукции *</label>
                <select
                  value={newItem.type}
                  onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                >
                  <option value="">Выберите тип</option>
                  {productTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.id} - {type.ru}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Цена (₽)</label>
                <input
                  type="number"
                  placeholder="Цена"
                  value={newItem.price || 0}
                  onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Длина (мм)</label>
                <input
                  type="number"
                  placeholder="Длина"
                  value={newItem.dimensions?.length || 0}
                  onChange={(e) => setNewItem({
                    ...newItem,
                    dimensions: { ...newItem.dimensions!, length: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Ширина (мм)</label>
                <input
                  type="number"
                  placeholder="Ширина"
                  value={newItem.dimensions?.width || 0}
                  onChange={(e) => setNewItem({
                    ...newItem,
                    dimensions: { ...newItem.dimensions!, width: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Толщина (мм)</label>
                <input
                  type="number"
                  placeholder="Толщина"
                  value={newItem.dimensions?.thickness || 0}
                  onChange={(e) => setNewItem({
                    ...newItem,
                    dimensions: { ...newItem.dimensions!, thickness: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                />
              </div>
            </div>
            
            {/* Image URL field with Generate button - outside grid */}
            <div className="mt-4">
              <label className="block text-sm text-zinc-400 mb-2">Изображение:</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="URL изображения или путь /images/название.png"
                  value={newItem.image || ''}
                  onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newItem.name) {
                      setError('Введите название продукта для генерации изображения');
                      return;
                    }
                    setShowImageGenerator('new');
                  }}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 rounded-lg text-white transition-colors flex items-center justify-center gap-2 shrink-0 font-medium min-w-[140px]"
                  title="Сгенерировать изображение"
                >
                  <ImageIcon size={20} className="shrink-0" />
                  <span>🖼️ Генерировать</span>
                </button>
              </div>
            </div>

            {/* Image Generator Modal for New Item */}
            {showImageGenerator === 'new' && (
              <div className="mt-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-white">Генерация изображения</h4>
                  <button
                    onClick={() => setShowImageGenerator(null)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Промпт для Gemini:</label>
                    <div className="bg-zinc-900 p-3 rounded text-sm text-zinc-300 font-mono">
                      {generateProductImagePrompt(newItem.name || 'ПРОДУКТ', newItem.name?.match(/(\d+)/)?.[1], imageColor)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Цвет цифр:</label>
                    <select
                      value={imageColor}
                      onChange={(e) => setImageColor(e.target.value as ImageColor)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white"
                    >
                      <option value="green">Зеленый</option>
                      <option value="blue">Синий</option>
                      <option value="red">Красный</option>
                      <option value="orange">Оранжевый</option>
                      <option value="yellow">Желтый</option>
                      <option value="purple">Фиолетовый</option>
                      <option value="black">Черный</option>
                    </select>
                  </div>
                  <button
                    onClick={() => handleGenerateImage(newItem.name || '', newItem.name?.match(/(\d+)/)?.[1])}
                    disabled={generatingImage !== null || !newItem.name}
                    className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ImageIcon size={20} />
                    {generatingImage ? 'Генерация...' : 'Сгенерировать и скачать изображение'}
                  </button>
                </div>
              </div>
            )}

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
                className="bg-zinc-900 rounded-lg p-4 border border-zinc-800"
              >
                {editingId === item.id ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">ID</label>
                        <input
                          type="text"
                          value={item.id}
                          disabled
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Название *</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Тип продукции *</label>
                        <select
                          value={item.type}
                          onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                        >
                          {productTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.id}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Цена (₽)</label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Длина (мм)</label>
                        <input
                          type="number"
                          value={item.dimensions.length}
                          onChange={(e) => updateItem(item.id, 'dimensions.length', parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Ширина (мм)</label>
                        <input
                          type="number"
                          value={item.dimensions.width}
                          onChange={(e) => updateItem(item.id, 'dimensions.width', parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Толщина (мм)</label>
                        <input
                          type="number"
                          value={item.dimensions.thickness}
                          onChange={(e) => updateItem(item.id, 'dimensions.thickness', parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>
                    
                    {/* Image URL field with Generate button - outside grid */}
                    <div className="mt-4">
                      <label className="block text-sm text-zinc-400 mb-2">Изображение:</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={item.image}
                          onChange={(e) => updateItem(item.id, 'image', e.target.value)}
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
                          placeholder="URL изображения или путь /images/название.png"
                        />
                        <button
                          type="button"
                          onClick={() => setShowImageGenerator(item.id)}
                          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 rounded-lg text-white transition-colors flex items-center justify-center gap-2 shrink-0 font-medium min-w-[140px]"
                          title="Сгенерировать изображение"
                        >
                          <ImageIcon size={20} className="shrink-0" />
                          <span>🖼️ Генерировать</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-white">{item.name} ({item.id})</div>
                      <div className="text-sm text-zinc-400">
                        Тип: {item.type} | Размеры: {item.dimensions.length}×{item.dimensions.width}×{item.dimensions.thickness} мм | Цена: {item.price} ₽
                      </div>
                    </div>
                    {item.image && (
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-16 h-16 object-cover rounded-lg ml-4"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Image Generator Modal for Editing Item */}
                {showImageGenerator === item.id && (
                  <div className="mt-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-white">Генерация изображения</h4>
                      <button
                        onClick={() => setShowImageGenerator(null)}
                        className="text-zinc-400 hover:text-white"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Промпт для Gemini:</label>
                        <div className="bg-zinc-900 p-3 rounded text-sm text-zinc-300 font-mono">
                          {generateProductImagePrompt(item.name, item.name.match(/(\d+)/)?.[1], imageColor)}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Цвет цифр:</label>
                        <select
                          value={imageColor}
                          onChange={(e) => setImageColor(e.target.value as ImageColor)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white"
                        >
                          <option value="green">Зеленый</option>
                          <option value="blue">Синий</option>
                          <option value="red">Красный</option>
                          <option value="orange">Оранжевый</option>
                          <option value="yellow">Желтый</option>
                          <option value="purple">Фиолетовый</option>
                          <option value="black">Черный</option>
                        </select>
                      </div>
                      <button
                        onClick={() => handleGenerateImage(item.name, item.name.match(/(\d+)/)?.[1])}
                        disabled={generatingImage !== null}
                        className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <ImageIcon size={20} />
                        {generatingImage === item.name ? 'Генерация...' : 'Сгенерировать и скачать изображение'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
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

export default ProductCRUD;

