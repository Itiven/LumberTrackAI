import { BoardDimensions, CartItem, AnalysisResult, ProductTypeDefinition, Product, User } from '../types';

// Cache busting version (can be updated on build/deploy)
const IMAGE_CACHE_VERSION = '1.0.0';

/**
 * Виконати JSONP запит для обходу CORS
 * @param url - URL для запиту
 * @returns Promise з даними
 */
const jsonpRequest = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Створюємо унікальне ім'я для callback функції
    const callbackName = 'jsonp_callback_' + Math.random().toString(36).substr(2, 9);

    // Додаємо callback параметр до URL
    const urlObj = new URL(url);
    urlObj.searchParams.append('callback', callbackName);

    // Створюємо script тег
    const script = document.createElement('script');
    script.src = urlObj.toString();
    script.async = true;

    // Додаємо callback функцію до window
    (window as any)[callbackName] = (data: any) => {
      // Видаляємо script тег та callback функцію
      document.body.removeChild(script);
      delete (window as any)[callbackName];
      resolve(data);
    };

    // Обробка помилок
    script.onerror = () => {
      document.body.removeChild(script);
      delete (window as any)[callbackName];
      reject(new Error('JSONP request failed'));
    };

    // Додаємо script до DOM
    document.body.appendChild(script);

    // Timeout для безпеки
    setTimeout(() => {
      if ((window as any)[callbackName]) {
        document.body.removeChild(script);
        delete (window as any)[callbackName];
        reject(new Error('JSONP request timeout'));
      }
    }, 30000);
  });
};

/**
 * Generate image URL with cache busting hash
 * @param productName - Name of the product
 * @param customImageUrl - Custom image URL from sheet (if provided)
 * @returns Image URL with hash for cache busting
 */
export const getProductImageUrl = (productName: string, customImageUrl?: string): string => {
  // If custom URL is provided and it's a full URL (starts with http://, https://, or data:), use it as is
  if (customImageUrl && (customImageUrl.startsWith('http://') || customImageUrl.startsWith('https://') || customImageUrl.startsWith('data:'))) {
    return customImageUrl;
  }

  // If custom URL is provided and it's a relative path, use it with version hash
  if (customImageUrl && customImageUrl.trim() !== '') {
    const separator = customImageUrl.includes('?') ? '&' : '?';
    return `${customImageUrl}${separator}v=${IMAGE_CACHE_VERSION}`;
  }

  // Default: use /images/ folder with product name and version hash for cache busting
  if (productName) {
    return `/images/${productName}.png?v=${IMAGE_CACHE_VERSION}`;
  }

  return '';
};

export const saveToGoogleSheet = async (
  board: BoardDimensions,
  cart: CartItem[],
  analysis: AnalysisResult,
  webhookUrl?: string,
  executor?: string,
  timeStats?: { durationFetch: number; durationMeasure: number; durationSawing: number; },
  unitCost?: number,
  boardCost?: number,
  kpi?: number
): Promise<boolean> => {
  const timestamp = new Date().toLocaleString('ru-RU');

  // Format the product list as a JSON string with new format
  // New format: { "productName": { "count": number, "cost": number } }
  const productsMap: Record<string, { count: number; cost: number }> = {};
  cart.forEach(item => {
    productsMap[item.product.name] = {
      count: item.quantity,
      cost: item.product.price
    };
  });
  const productsSummary = JSON.stringify(productsMap, null, 2);

  const totalEarnings = analysis.earnings;

  const payload: any = {
    action: 'add',
    timestamp,
    boardId: board.id,
    batchNumber: board.batchNumber,
    boardLength: board.length,
    boardWidth: board.width,
    boardThickness: board.thickness,
    boardVolumeM3: analysis.boardVolumeM3.toFixed(4),
    products: productsSummary,
    totalItems: cart.reduce((acc, i) => acc + i.quantity, 0),
    productsVolumeM3: analysis.productsVolumeM3.toFixed(4),
    earnings: totalEarnings,
    yieldPercentage: analysis.yieldPercentage,
    aiMessage: analysis.message,
    executor: executor || 'Unknown',
    durationFetch: timeStats?.durationFetch || 0,
    durationMeasure: timeStats?.durationMeasure || 0,
    durationSawing: timeStats?.durationSawing || 0
  };

  // Add new fields if provided
  if (unitCost !== undefined) {
    payload.unit_cost = unitCost;
  }
  if (boardCost !== undefined) {
    payload.board_cost = boardCost;
  }
  if (kpi !== undefined) {
    payload.KPI = kpi;
  }

  console.log("Saving to external service...", payload);

  if (webhookUrl) {
    try {
      // Використовуємо 'text/plain' замість 'application/json' для обходу CORS preflight запиту
      // Браузер не відправляє OPTIONS запит для 'text/plain', що дозволяє Google Apps Script приймати дані без помилок CORS
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload)
      });
      console.log("Request sent to webhook successfully");
      return true;
    } catch (error) {
      console.error("Failed to save to sheet via webhook:", error);
      return false;
    }
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Data saved locally (simulation):", payload);
      resolve(true);
    }, 1500);
  });
};

export const updateSheetEntry = async (
  boardId: string,
  batchNumber: string,
  cart: CartItem[],
  analysis: AnalysisResult,
  webhookUrl?: string
): Promise<boolean> => {
  if (!webhookUrl) return false;

  const productsMap: Record<string, number> = {};
  cart.forEach(item => {
    productsMap[item.product.name] = item.quantity;
  });
  const productsSummary = JSON.stringify(productsMap, null, 2);

  const payload = {
    action: 'update',
    boardId: boardId,
    batchNumber: batchNumber,
    products: productsSummary,
    totalItems: cart.reduce((acc, i) => acc + i.quantity, 0),
    productsVolumeM3: analysis.productsVolumeM3.toFixed(4),
    earnings: analysis.earnings,
    yieldPercentage: analysis.yieldPercentage
  };

  console.log("Updating external service...", payload);

  try {
    // Використовуємо 'text/plain' замість 'application/json' для обходу CORS preflight запиту
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    console.error("Failed to update sheet:", error);
    return false;
  }
};

export const fetchProductTypes = async (webhookUrl?: string): Promise<ProductTypeDefinition[]> => {
  if (!webhookUrl) return [];

  console.log("Fetching product types from Google Sheet...");
  try {
    const url = new URL(webhookUrl);
    url.searchParams.append('action', 'getTypes');

    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Fetched product types:", data);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to fetch product types:", error);
    return [];
  }
};

export const fetchProducts = async (webhookUrl?: string): Promise<Product[]> => {
  if (!webhookUrl) return [];

  console.log("Fetching products from Google Sheet...");
  try {
    const url = new URL(webhookUrl);
    url.searchParams.append('action', 'getProducts');

    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawData = await response.json();
    console.log("Fetched raw products:", rawData);

    if (!Array.isArray(rawData)) return [];

    const products: Product[] = rawData
      .filter((row: any) => {
        const isClosed = row.close === true || String(row.close).toLowerCase() === 'true';
        return !isClosed;
      })
      .map((row: any) => {
        // Generate image URL using helper function (uses /images/ folder with hash for cache busting)
        const imageUrl = getProductImageUrl(row.name, row.image);

        return {
          id: String(row.id),
          name: row.name,
          type: row.ProductType,
          dimensions: {
            length: Number(row.length) || 0,
            width: Number(row.width) || 0,
            thickness: Number(row.thickness) || 0,
          },
          image: imageUrl,
          price: Number(row.price) || 0
        };
      });

    return products;
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return [];
  }
};

export const fetchUsers = async (webhookUrl: string): Promise<User[]> => {
  if (!webhookUrl) {
    console.error('[fetchUsers] No webhook URL provided');
    throw new Error('Webhook URL не указан');
  }

  console.log('[fetchUsers] Fetching users from Google Sheet, URL:', webhookUrl);

  try {
    // Валідація та нормалізація URL
    let url: URL;
    try {
      url = new URL(webhookUrl);
    } catch (urlError) {
      console.error('[fetchUsers] Invalid URL:', webhookUrl);
      throw new Error(`Некорректный URL: ${webhookUrl}`);
    }

    url.searchParams.append('action', 'getUsers');
    const fetchUrl = url.toString();

    console.log('[fetchUsers] Fetch URL:', fetchUrl);
    console.log('[fetchUsers] User agent:', navigator.userAgent);
    console.log('[fetchUsers] Is service worker controlled:', !!navigator.serviceWorker?.controller);

    // Використовуємо прямий запит БЕЗ спеціальних заголовків, щоб уникнути preflight запиту
    // Без заголовків браузер не відправляє OPTIONS запит, що дозволяє обійти CORS проблеми
    let response: Response;
    try {
      response = await fetch(fetchUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        cache: 'no-store',
        referrerPolicy: 'no-referrer'
        // НЕ додаємо заголовки - це викликає preflight запит і CORS помилки
      });
    } catch (fetchError: any) {
      console.error('[fetchUsers] Fetch error details:', {
        name: fetchError?.name,
        message: fetchError?.message,
        stack: fetchError?.stack
      });

      // Детальніша інформація про помилку
      if (fetchError?.name === 'TypeError' && fetchError?.message === 'Failed to fetch') {
        throw new Error('Не удалось подключиться к серверу. Проверьте подключение к интернету и доступность сервера Google Apps Script.');
      }
      throw fetchError;
    }

    console.log('[fetchUsers] Response status:', response.status, response.statusText);
    console.log('[fetchUsers] Response ok:', response.ok);
    console.log('[fetchUsers] Response type:', response.type);

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Unable to read response body';
      }
      console.error('[fetchUsers] HTTP error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText.substring(0, 100)}`);
    }

    const contentType = response.headers.get('content-type') || '';
    console.log('[fetchUsers] Response Content-Type:', contentType);

    // Перевірка Content-Type, але не строга для сумісності
    if (contentType && !contentType.includes('application/json') && !contentType.includes('text/plain')) {
      const text = await response.text();
      console.warn('[fetchUsers] Unexpected Content-Type, but trying to parse as JSON:', contentType);
      console.warn('[fetchUsers] Response text preview:', text.substring(0, 200));
    }

    let rawData;
    try {
      rawData = await response.json();
    } catch (jsonError: any) {
      const text = await response.text();
      console.error('[fetchUsers] Failed to parse JSON:', jsonError);
      console.error('[fetchUsers] Response text:', text.substring(0, 500));
      throw new Error(`Ошибка парсинга JSON: ${jsonError.message}`);
    }

    console.log('[fetchUsers] Parsed JSON data type:', Array.isArray(rawData) ? 'array' : typeof rawData);
    console.log('[fetchUsers] Data length:', Array.isArray(rawData) ? rawData.length : 'N/A');

    // Expected structure from sheet based on screenshot: name, password, role, id, login
    if (!Array.isArray(rawData)) {
      console.error('[fetchUsers] Response is not an array:', rawData);
      throw new Error('Ответ сервера не является массивом');
    }

    const users = rawData.map((row: any) => ({
      id: String(row.id || ''),
      name: row.name || '',
      login: row.login || '',
      password: String(row.password || ''), // Raw password from sheet
      role: row.role || ''
    }));

    console.log('[fetchUsers] Successfully mapped users:', users.length);
    return users;

  } catch (error: any) {
    console.error('[fetchUsers] Failed to fetch users:', error);
    console.error('[fetchUsers] Error type:', error?.name);
    console.error('[fetchUsers] Error message:', error?.message);
    console.error('[fetchUsers] Error stack:', error?.stack);

    // Створюємо більш зрозуміле повідомлення про помилку
    let errorMessage = 'Ошибка при загрузке пользователей';
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      errorMessage = 'Ошибка сети: не удалось подключиться к серверу. Проверьте подключение к интернету и URL.';
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Викидаємо помилку далі з покращеним повідомленням
    throw new Error(errorMessage);
  }
};

export const deleteEntry = async (
  boardId: string,
  webhookUrl?: string
): Promise<boolean> => {
  if (!webhookUrl) return false;

  console.log(`Marking entry ${boardId} as deleted...`);

  // Используем updateSheetEntry (или generic call), но удобнее сделать отдельный вызов
  // так как updateSheetEntry требует много параметров.
  // Сделаем прямой fetch
  const payload = {
    action: 'update',
    boardId: boardId,
    status: 'deleted'
  };

  try {
    // Використовуємо 'text/plain' замість 'application/json' для обходу CORS preflight запиту
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    console.error("Failed to delete entry:", error);
    return false;
  }
};

export const cleanupDatabase = async (webhookUrl?: string): Promise<boolean> => {
  if (!webhookUrl) return false;

  console.log("Cleaning up database (hard delete)...");

  const payload = {
    action: 'cleanup'
  };

  try {
    // Використовуємо 'text/plain' замість 'application/json' для обходу CORS preflight запиту
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    console.error("Failed to cleanup database:", error);
    return false;
  }
};

export const fetchFullHistory = async (webhookUrl: string): Promise<any[]> => {
  if (!webhookUrl) return [];

  console.log("Fetching full history from Google Sheet...");
  try {
    const url = new URL(webhookUrl);
    url.searchParams.append('action', 'getAllHistory');

    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawData = await response.json();
    console.log("Fetched history data:", rawData);

    if (!Array.isArray(rawData)) return [];
    return rawData;
  } catch (error) {
    console.error("Failed to fetch full history:", error);
    return [];
  }
};

export const fetchPartitions = async (webhookUrl: string): Promise<any[]> => {
  if (!webhookUrl) return [];

  console.log("Fetching partitions from Google Sheet...");
  try {
    const url = new URL(webhookUrl);
    url.searchParams.append('action', 'getPartitions');

    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawData = await response.json();
    console.log("Fetched partitions:", rawData);

    if (!Array.isArray(rawData)) return [];
    return rawData;
  } catch (error) {
    console.error("Failed to fetch partitions:", error);
    return [];
  }
};

export const fetchSettings = async (webhookUrl: string): Promise<any[]> => {
  if (!webhookUrl) return [];

  console.log("Fetching settings from Google Sheet...");
  try {
    const url = new URL(webhookUrl);
    url.searchParams.append('action', 'getSettings');

    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawData = await response.json();
    console.log("Fetched settings:", rawData);

    if (!Array.isArray(rawData)) return [];
    return rawData;
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return [];
  }
};
// Додайте цю функцію після fetchSettings

/**
 * Send log message to Telegram
 * @param webhookUrl - URL для отримання налаштувань
 * @param message - Повідомлення для відправки
 */
export const sendTelegramLog = async (webhookUrl: string, message: string): Promise<void> => {
  if (!webhookUrl) {
    console.warn('Cannot send Telegram log: webhookUrl not provided');
    return;
  }

  try {
    // Отримуємо налаштування з листа "Настройки"
    const settings = await fetchSettings(webhookUrl);

    // Шукаємо telegram_token та telegram_chat_id
    const telegramTokenSetting = settings.find((s: any) => s.key === 'telegram_token' || s.key === 'telegram_bot_token');
    const telegramChatIdSetting = settings.find((s: any) => s.key === 'telegram_chat_id' || s.key === 'telegram_chat');

    const telegramToken = telegramTokenSetting?.value?.trim();
    const telegramChatId = telegramChatIdSetting?.value?.trim();

    if (!telegramToken || !telegramChatId) {
      console.warn('Telegram credentials not found in settings');
      return;
    }

    // Форматуємо повідомлення з датою та часом
    const timestamp = new Date().toLocaleString('ru-RU');
    const formattedMessage = `🔐 LumberTrack AI - Лог авторизації\n\n⏰ ${timestamp}\n\n${message}`;

    // Відправляємо повідомлення в Telegram
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: formattedMessage,
        parse_mode: 'HTML',
      }),
    });
  } catch (error) {
    console.error('Failed to send Telegram log:', error);
    // Не викидаємо помилку, щоб не ламати процес авторизації
  }
};




// ==========================================
// CRUD Operations for Admin/Owner
// ==========================================

/**
 * Generic CRUD operation function
 */
const crudOperation = async (
  webhookUrl: string,
  sheetName: string,
  operation: 'create' | 'update' | 'delete',
  data: any,
  idField: string = 'id'
): Promise<boolean> => {
  if (!webhookUrl) return false;

  try {
    const payload = {
      action: 'crud',
      sheetName: sheetName,
      operation: operation,
      data: data,
      idField: idField
    };

    // Використовуємо 'text/plain' замість 'application/json' для обходу CORS preflight запиту
    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload)
    });

    console.log(`CRUD operation ${operation} completed for ${sheetName}`);
    return true;
  } catch (error) {
    console.error(`Failed to perform ${operation} on ${sheetName}:`, error);
    return false;
  }
};

/**
 * Create a new record in a sheet
 */
export const createRecord = async (
  webhookUrl: string,
  sheetName: string,
  data: any,
  idField: string = 'id'
): Promise<boolean> => {
  return crudOperation(webhookUrl, sheetName, 'create', data, idField);
};

/**
 * Update an existing record in a sheet
 */
export const updateRecord = async (
  webhookUrl: string,
  sheetName: string,
  data: any,
  idField: string = 'id'
): Promise<boolean> => {
  return crudOperation(webhookUrl, sheetName, 'update', data, idField);
};

/**
 * Delete a record from a sheet
 */
export const deleteRecord = async (
  webhookUrl: string,
  sheetName: string,
  recordId: string,
  idField: string = 'id'
): Promise<boolean> => {
  return crudOperation(webhookUrl, sheetName, 'delete', { [idField]: recordId }, idField);
};

/**
 * Fetch report settings from Google Sheet
 */
export const fetchReportSettings = async (webhookUrl: string): Promise<any[]> => {
  if (!webhookUrl) return [];

  console.log("Fetching report settings from Google Sheet...");
  try {
    // Note: This requires a new action in doGet.js: 'getReportSettings'
    // For now, return empty array and let the component handle it
    const url = new URL(webhookUrl);
    url.searchParams.append('action', 'getReportSettings');

    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow'
    });

    if (!response.ok) {
      // If action doesn't exist yet, return empty array
      return [];
    }

    const rawData = await response.json();
    if (!Array.isArray(rawData)) return [];
    return rawData;
  } catch (error) {
    console.error("Failed to fetch report settings:", error);
    return [];
  }
};

/**
 * ==========================================
 * GOOGLE APPS SCRIPT SETUP (SERVER-SIDE)
 * ==========================================
 * 
 * --- Code.gs ---
 * 
 * function doGet(e) {
 *   var action = e.parameter.action;
 *   
 *   if (action == 'getTypes') {
 *     return getSheetData("ТИП ПРОДУКЦИИ");
 *   } else if (action == 'getProducts') {
 *     return getSheetData("ПРОДУКЦИЯ");
 *   } else if (action == 'getUsers') {
 *     return getSheetData("Пользователь");
 *   }
 *   
 *   return ContentService.createTextOutput(JSON.stringify({error: "Unknown action"})).setMimeType(ContentService.MimeType.JSON);
 * }
 * 
 * function getSheetData(sheetName) {
 *   try {
 *     var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
 *     if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
 *     
 *     var data = sheet.getDataRange().getValues();
 *     var headers = data[0]; 
 *     var result = [];
 *     
 *     for (var i = 1; i < data.length; i++) {
 *       var obj = {};
 *       for (var j = 0; j < headers.length; j++) obj[headers[j]] = data[i][j];
 *       if (obj['id'] || obj['name']) result.push(obj);
 *     }
 *     
 *     return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
 *   } catch (error) {
 *     return ContentService.createTextOutput(JSON.stringify({error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
 *   }
 * }
 *
 * function doPost(e) {
 *   try {
 *     var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]; 
 *     var data = JSON.parse(e.postData.contents);
 *     
 *     if (data.action === 'update') {
 *        updateRowInSheet(data, sheet);
 *     } else {
 *        writeJSONtoSheet(data, sheet);
 *     }
 *     
 *     return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
 *   } catch (error) {
 *     return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
 *   }
 * }
 * ... (updateRowInSheet and writeJSONtoSheet same as before)
 */