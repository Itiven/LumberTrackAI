import { GoogleGenAI, Type } from "@google/genai";
import { BoardDimensions, CartItem, AnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Color options for image generation
 */
export type ImageColor = 'green' | 'blue' | 'red' | 'orange' | 'yellow' | 'purple' | 'black';

const COLOR_NAMES: Record<ImageColor, string> = {
  green: 'зеленый',
  blue: 'синий',
  red: 'красный',
  orange: 'оранжевый',
  yellow: 'желтый',
  purple: 'фиолетовый',
  black: 'черный'
};

export const calculateStats = (board: BoardDimensions | null, items: CartItem[]) => {
  // 1. Calculate Financials
  const totalEarnings = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // 2. Calculate Yield % and Volumes
  // Объем доски (м³): (Ширина * Толщина * Длина) / 1000000000
  const boardVolumeMm3 = board ? (board.width * board.thickness * board.length) : 0;
  const boardVolumeM3 = boardVolumeMm3 / 1000000000;

  const productsVolumeMm3 = items.reduce((acc, item) => {
    // Calculate approximate volume of the finished product
    const pVol = item.product.dimensions.length *
      item.product.dimensions.width *
      item.product.dimensions.thickness;
    return acc + (pVol * item.quantity);
  }, 0);
  const productsVolumeM3 = productsVolumeMm3 / 1e9;

  const yieldPercentage = boardVolumeMm3 > 0
    ? Math.round((productsVolumeMm3 / boardVolumeMm3) * 100)
    : 0;

  return {
    earnings: totalEarnings,
    yieldPercentage,
    boardVolumeM3,
    productsVolumeM3,
  };
};

export const analyzeYield = async (
  board: BoardDimensions | null,
  items: CartItem[],
  isAiEnabled: boolean = true
): Promise<AnalysisResult> => {

  const stats = calculateStats(board, items);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return {
      ...stats,
      message: "Смена не начата.",
      motivationalQuote: "Время - деньги."
    };
  }

  // 3. Check if AI is enabled
  if (!isAiEnabled) {
    return {
      ...stats,
      message: "Расчет выполнен успешно.",
      motivationalQuote: "Хорошая работа!"
    };
  }

  // 4. AI Analysis for subjective feedback
  const prompt = `
    Я работаю столяром. 
    Доска: ${board.length}x${board.width}x${board.thickness}мм (${stats.boardVolumeM3.toFixed(4)} м3).
    Изделий: ${totalCount} шт (${stats.productsVolumeM3.toFixed(4)} м3).
    Заработок: ${stats.earnings} руб.
    Полезный выход (КПД): ${stats.yieldPercentage}%.
    Список: ${items.map(i => `${i.product.name} (${i.product.price}р)`).join(', ')}.
    
    1. Напиши комментарий (message) о результате: оцени заработок и насколько бережно использован материал.
    2. Дай короткий совет или шутку (motivationalQuote) для рабочего.
    Стиль "Опытный бригадир".
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING, description: "Комментарий бригадира" },
            motivationalQuote: { type: Type.STRING, description: "Мотивация" }
          },
          required: ["message", "motivationalQuote"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const data = JSON.parse(text);

    return {
      ...stats,
      message: data.message,
      motivationalQuote: data.motivationalQuote
    };

  } catch (error) {
    console.error("Gemini analysis failed:", error);

    return {
      ...stats,
      message: "Партия учтена. Нормальный результат.",
      motivationalQuote: "Работаем дальше!"
    };
  }
};

/**
 * Generate product image prompt for Gemini
 * Note: Gemini doesn't generate images directly, but we can create a prompt
 * that can be used with image generation APIs or create a simple canvas-based image
 * 
 * @param productName - Name of the product
 * @param productNumber - Number/size to display (e.g., 60, 40)
 * @param color - Color for the number text
 * @returns Generated prompt string
 */
export const generateProductImagePrompt = (
  productName: string,
  productNumber?: string | number,
  color: ImageColor = 'green'
): string => {
  const numberText = productNumber ? ` с надписью ${productNumber}` : '';
  const colorText = COLOR_NAMES[color] || COLOR_NAMES.green;
  
  return `Сгенерируй изображение ${productName}${numberText} Для товара с названием ${productName}${productNumber ? ' ' + productNumber : ''} цвет цифр ${colorText}`;
};

/**
 * Create a simple product image using Canvas API
 * This creates a downloadable PNG image
 * 
 * @param productName - Name of the product
 * @param productNumber - Number/size to display
 * @param color - Color for the number text
 * @returns Data URL of the generated image (can be saved or used as image source)
 */
export const generateProductImage = (
  productName: string,
  productNumber?: string | number,
  color: ImageColor = 'green'
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // Background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#2a2a2a');
  gradient.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Product name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(productName, canvas.width / 2, canvas.height / 2 - 40);

  // Number with color
  if (productNumber) {
    const colorMap: Record<ImageColor, string> = {
      green: '#22c55e',
      blue: '#3b82f6',
      red: '#ef4444',
      orange: '#f97316',
      yellow: '#eab308',
      purple: '#a855f7',
      black: '#000000'
    };
    
    ctx.fillStyle = colorMap[color] || colorMap.green;
    ctx.font = 'bold 64px Arial';
    ctx.fillText(String(productNumber), canvas.width / 2, canvas.height / 2 + 40);
  }

  // Border
  ctx.strokeStyle = '#404040';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
};

/**
 * Download generated image as file
 * 
 * @param dataUrl - Data URL of the image
 * @param filename - Filename to save as (e.g., 'КУВАЛДА 60.png')
 */
export const downloadProductImage = (dataUrl: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};