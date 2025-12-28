import React, { useState, useEffect } from 'react';
import { Trees, ArrowRight, Loader2, Lock, User as UserIcon, Link } from 'lucide-react';
import { AppSettings } from '../App';
import { fetchUsers } from '../services/sheetService';
import { User } from '../types';

interface AuthViewProps {
  onLogin: (user: User) => void;
  settings: AppSettings;
  onUpdateSettings: (s: Partial<AppSettings>) => void;
}

// Utility to hash password
async function sha256(message: string): Promise<string> {
    try {
        // Використовуємо window.crypto.subtle для сумісності
        const cryptoObj = window.crypto || (globalThis as any).crypto;
        if (!cryptoObj || !cryptoObj.subtle) {
            console.warn('[sha256] crypto.subtle not available, using fallback');
            // Fallback: якщо crypto.subtle недоступний, повертаємо оригінальний рядок
            // (це означає, що паролі повинні зберігатися як plaintext)
            return message;
        }
        
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await cryptoObj.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error('[sha256] Error hashing password:', error);
        // Fallback: повертаємо оригінальний рядок якщо хешування не вдалося
        return message;
    }
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin, settings, onUpdateSettings }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Get WEBHOOK_URL from environment variables
  const envWebhookUrl = (process.env as any).WEBHOOK_URL || (import.meta as any).env?.VITE_WEBHOOK_URL || '';
  
  // Local state for URL input if not present in settings
  // Priority: settings.googleSheetUrl > env WEBHOOK_URL > tempUrl
  const [tempUrl, setTempUrl] = useState(settings.googleSheetUrl || envWebhookUrl || '');

  useEffect(() => {
    // If settings.googleSheetUrl exists, use it
    // Otherwise, use env WEBHOOK_URL if available
    if (settings.googleSheetUrl) {
      setTempUrl(settings.googleSheetUrl);
    } else if (envWebhookUrl) {
      setTempUrl(envWebhookUrl);
    }
  }, [settings.googleSheetUrl, envWebhookUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Validation
    if (!login.trim() || !password.trim()) {
      setError('Введите логин и пароль');
      return;
    }
    
    // Priority: settings.googleSheetUrl > env WEBHOOK_URL > tempUrl
    const activeUrl = settings.googleSheetUrl || envWebhookUrl || tempUrl;
    if (!activeUrl) {
       setError('Необходимо указать URL таблицы для авторизации');
       return;
    }

    // Save URL if it was entered here or came from env (and not already saved in settings)
    if (!settings.googleSheetUrl && (tempUrl || envWebhookUrl)) {
      onUpdateSettings({ googleSheetUrl: tempUrl || envWebhookUrl });
    }

    setIsLoading(true);

    try {
      console.log('[AuthView] Starting authentication for user:', login);
      console.log('[AuthView] Using URL:', activeUrl);
      
      // 2. Fetch Users
      const users = await fetchUsers(activeUrl);
      
      console.log('[AuthView] Fetched users count:', users.length);
      
      if (users.length === 0) {
        const errorMsg = 'Не удалось загрузить список пользователей. Проверьте URL.';
        console.error('[AuthView] No users loaded. URL:', activeUrl);
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      // 3. Find User
      const user = users.find(u => u.login.toLowerCase() === login.trim().toLowerCase());
      
      if (!user) {
        const errorMsg = 'Пользователь с таким логином не найден';
        console.warn('[AuthView] User not found:', login);
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      console.log('[AuthView] User found:', user.name, 'Role:', user.role);

      // 4. Verify Password (Hash or Cleartext)
      const inputHash = await sha256(password.trim());
      
      // We check both raw (for "1111" case) and hashed (for future security)
      const isMatch = user.password === password.trim() || user.password === inputHash;

      if (isMatch) {
        console.log('[AuthView] Password verified, logging in user');
        onLogin(user);
      } else {
        console.warn('[AuthView] Password mismatch for user:', login);
        setError('Неверный пароль');
      }

    } catch (err: any) {
      console.error('[AuthView] Authentication error:', err);
      console.error('[AuthView] Error details:', {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        url: activeUrl,
        errorType: typeof err
      });
      
      // Більш детальне повідомлення про помилку
      let errorMessage = 'Ошибка сети или сервера';
      
      if (err?.message) {
        // Якщо повідомлення вже зрозуміле, використовуємо його
        if (err.message.includes('Ошибка') || err.message.includes('HTTP') || err.message.includes('не удалось')) {
          errorMessage = err.message;
        } else if (err.message === 'Failed to fetch') {
          errorMessage = 'Ошибка подключения к серверу. Проверьте:\n1. Подключение к интернету\n2. Доступность Google Apps Script\n3. Правильность URL';
        } else {
          errorMessage += `: ${err.message}`;
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.name === 'TypeError' && err?.message?.includes('fetch')) {
        errorMessage = 'Ошибка сети: не удалось подключиться к серверу. Проверьте подключение к интернету и доступность Google Apps Script.';
      } else if (err?.name === 'AbortError') {
        errorMessage = 'Превышено время ожидания. Попробуйте еще раз.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  // ... rest of the component remains the same

  return (
    <div className="flex flex-col h-full items-center justify-center p-6 bg-[#18181b] text-white overflow-y-auto">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 animate-in zoom-in duration-500">
          <div className="bg-orange-500/20 p-6 rounded-full text-orange-500 mb-4">
            <Trees size={48} />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-center">LumberTrack AI</h1>
          <p className="text-zinc-400 text-center text-sm">
            Учет пиломатериалов и аналитика эффективности
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-in slide-in-from-bottom duration-500 fade-in bg-[#27272a] p-6 rounded-2xl border border-zinc-800 shadow-xl">
          
          {/* Webhook URL Input (Only if not set) */}
          {!settings.googleSheetUrl && (
             <div className="mb-4 pb-4 border-b border-zinc-700">
                <label className="block text-xs font-medium text-orange-500 mb-1 ml-1 flex items-center gap-1">
                   <Link size={12} />
                   Webhook URL Таблицы
                </label>
                <input
                  type="url"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder="https://script.google.com/..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500 transition-colors text-white"
                />
             </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-1 ml-1">Логин</label>
            <div className="relative">
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="ivav"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 pl-12 text-lg focus:outline-none focus:border-orange-500 transition-colors text-white placeholder-zinc-700"
              />
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-1 ml-1">Пароль</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 pl-12 text-lg focus:outline-none focus:border-orange-500 transition-colors text-white placeholder-zinc-700"
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded-lg border border-red-900/50">
               {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-500/20 mt-2"
          >
            {isLoading ? (
               <Loader2 className="animate-spin" />
            ) : (
               <>
                 <span>Войти</span>
                 <ArrowRight size={20} />
               </>
            )}
          </button>
        </form>
        
        <p className="mt-6 text-center text-zinc-600 text-xs">
          Авторизация через лист "Пользователь"
        </p>
      </div>
    </div>
  );
};

export default AuthView;