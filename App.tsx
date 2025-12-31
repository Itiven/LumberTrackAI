import React, { useState, useEffect } from 'react';
import BoardInput from './components/BoardInput';
import ProductGrid from './components/ProductGrid';
import AnalysisView from './components/AnalysisView';
import SettingsView from './components/SettingsView';
import HistoryView from './components/HistoryView';
import AuthView from './components/AuthView';
import EmployeeInputView from './components/EmployeeInputView';
import { BoardDimensions, Product, CartItem, AnalysisResult, LeaderboardEntry, HistoryEntry, ProductTypeDefinition, User } from './types';
import { analyzeYield, calculateStats } from './services/geminiService';
import { fetchProductTypes, fetchProducts } from './services/sheetService';
import { INITIAL_LEADERBOARD, MOCK_PRODUCTS } from './constants';
import { Loader2 } from 'lucide-react';

import OwnerMainView from './components/OwnerMainView';
import ReferencesView from './components/ReferencesView';
import DashboardsView from './components/dashboards/DashboardsView';

type Step = 'auth' | 'input' | 'grid' | 'analysis' | 'settings' | 'history' | 'employee' | 'ownerMain' | 'references' | 'dashboards';

export interface AppSettings {
  minYield: number;
  maxYield: number;
  isYieldControlEnabled: boolean;
  googleSheetUrl: string;
  isAiAnalysisEnabled: boolean;
  gridColumns?: number; // Number of columns in product grid (default: 6)
}

const DEFAULT_SETTINGS: AppSettings = {
  minYield: 10,
  maxYield: 98,
  isYieldControlEnabled: false,
  googleSheetUrl: '',
  isAiAnalysisEnabled: true, // Default to enabled
  gridColumns: 6 // Default grid columns for desktop/tablet
};
const envWebhookUrl = (import.meta as any).env?.VITE_WEBHOOK_URL || '';
const App: React.FC = () => {
  // Initialize state from localStorage
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('lumberUserObj');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    // Backward compatibility for old simple string storage
    const oldName = localStorage.getItem('lumberUser');
    if (oldName) return { id: '0', name: oldName, login: 'old', role: 'Сотрудник' };
    return null;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('lumberSettings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const [step, setStep] = useState<Step>(() => {
    const saved = localStorage.getItem('lumberUserObj');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user.role === 'Сотрудник') {
          return 'employee';
        } else if (user.role === 'Власник') {
          return 'ownerMain';
        }
        return 'input';
      } catch (e) {
        return 'auth';
      }
    }
    return localStorage.getItem('lumberUser') ? 'employee' : 'auth';
  });

  // History State
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('lumberHistory');
    return saved ? JSON.parse(saved) : [];
  });

  // Products State (Load from local storage first, fallback to MOCK)
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('lumberProducts');
    return saved ? JSON.parse(saved) : MOCK_PRODUCTS;
  });

  // Product Types State
  const [productTypes, setProductTypes] = useState<ProductTypeDefinition[]>([]);

  // Load product types and products on mount or when URL changes
  useEffect(() => {
    const loadData = async () => {
      if (settings.googleSheetUrl) {
        // 1. Fetch Types
        const types = await fetchProductTypes(settings.googleSheetUrl);
        if (types && types.length > 0) {
          setProductTypes(types);
        }

        // 2. Fetch Products
        const fetchedProducts = await fetchProducts(settings.googleSheetUrl);
        if (fetchedProducts && fetchedProducts.length > 0) {
          setProducts(fetchedProducts);
          localStorage.setItem('lumberProducts', JSON.stringify(fetchedProducts));
        }
      }
    };
    loadData();
  }, [settings.googleSheetUrl]);

  // Persist history
  useEffect(() => {
    localStorage.setItem('lumberHistory', JSON.stringify(history));
  }, [history]);

  const [board, setBoard] = useState<BoardDimensions | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Application State for Daily Progress
  const [dailyTotal, setDailyTotal] = useState(() => {
    // Basic calculation for today's total from history
    // Note: real implementation would parse dates, but for now we reset on refresh unless we persist dailyTotal separately
    return 0;
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
    { id: 'me', name: user?.name || 'Я (Вы)', earnings: dailyTotal, isCurrentUser: true, avatar: 'ME' },
    ...INITIAL_LEADERBOARD
  ]);

  // Recalculate daily total from history when history loads
  useEffect(() => {
    if (history.length > 0) {
      const today = new Date().toLocaleDateString('ru-RU');
      const todaySum = history
        .filter(h => h.timestamp.includes(today)) // Simple string check for now
        .reduce((sum, h) => sum + h.earnings, 0);

      setDailyTotal(todaySum);
    }
  }, [history]);

  // Update leaderboard name when user changes
  useEffect(() => {
    if (user) {
      setLeaderboard(prev => prev.map(entry =>
        entry.isCurrentUser ? { ...entry, name: user.name, earnings: dailyTotal } : entry
      ));
    }
  }, [user, dailyTotal]);

  //  // Workflow Timers State
  const [timers, setTimers] = useState<{
    startFetch?: number;
    startMeasure?: number;
    startSaw?: number;
    endSaw?: number;
  }>({});

  // Persist settings
  useEffect(() => {
    localStorage.setItem('lumberSettings', JSON.stringify(settings));
  }, [settings]);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleLogin = (loggedInUser: User) => {
    if (loggedInUser.role === 'Власник') {
      // Auto-set cleanup URL for owner if it was saved
      const savedUrl = localStorage.getItem('lumberSheetUrl');
      if (savedUrl && !settings.googleSheetUrl) {
        setSettings(prev => ({ ...prev, googleSheetUrl: savedUrl }));
      }
    }

    // Save user object
    localStorage.setItem('lumberUserObj', JSON.stringify(loggedInUser));
    // Also save legacy format for robustness
    localStorage.setItem('lumberUser', loggedInUser.name);

    setUser(loggedInUser);
    // Redirect based on role
    if (loggedInUser.role === 'Сотрудник') {
      setStep('employee');
    } else if (loggedInUser.role === 'Власник') {
      setStep('ownerMain');
    } else {
      setStep('input');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('lumberUserObj');
    localStorage.removeItem('lumberUser');
    setUser(null);
    setStep('auth');
    setBoard(null);
    setCart([]);
    setAnalysisResult(null);
    setTimers({}); // Reset timers
  };

  // Timer Handlers
  const handleStartFetch = () => {
    setTimers({ startFetch: Date.now() });
    setBoard(null); // Clear board implies clearing batch number in input
    // User requested to stay on input screen
  };

  const handleStartMeasure = () => {
    setTimers(prev => ({ ...prev, startMeasure: Date.now() }));
  };

  const handleBoardSubmit = (dims: BoardDimensions) => {
    setTimers(prev => ({ ...prev, startSaw: Date.now() }));
    setBoard(dims);
    setStep('grid');
  };

  // Helper to update analysis result instantly when cart changes
  const updateAnalysisLocally = (newCart: CartItem[]) => {
    if (step === 'analysis' && board && analysisResult) {
      const stats = calculateStats(board, newCart);
      setAnalysisResult({
        ...analysisResult,
        ...stats
      });
    }
  };

  const handleUpdateCart = (product: Product, delta: number) => {
    let newCart: CartItem[] = [];
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          newCart = prev.filter(item => item.product.id !== product.id);
        } else {
          newCart = prev.map(item =>
            item.product.id === product.id ? { ...item, quantity: newQty } : item
          );
        }
      } else if (delta > 0) {
        newCart = [...prev, { product, quantity: 1 }];
      } else {
        newCart = prev;
      }
      return newCart;
    });

    updateAnalysisLocally(newCart);
  };

  const handleRemoveItem = (productId: string) => {
    setCart(prev => {
      const newCart = prev.filter(item => item.product.id !== productId);
      updateAnalysisLocally(newCart);
      return newCart;
    });
  };

  const handleClearCart = () => {
    setCart([]);
    updateAnalysisLocally([]);
  };

  const handleReview = async () => {
    // Allow null board (Warehouse mode)
    setTimers(prev => ({ ...prev, startAnalysis: Date.now() }));

    setIsAnalyzing(true);
    try {
      const result = await analyzeYield(board, cart, settings.isAiAnalysisEnabled);
      setAnalysisResult(result);
      setStep('analysis');
    } catch (e) {
      console.error(e);
      alert('Ошибка при расчете. Попробуйте снова.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveSuccess = (entry: HistoryEntry) => {
    // Add cart and volume to history entry for future editing
    const fullEntry: HistoryEntry = {
      ...entry,
      cart: [...cart], // Clone cart
      boardVolume: analysisResult ? analysisResult.boardVolumeM3 : 0,
      boardId: board?.id || entry.id
    };

    setHistory(prev => {
      // Check if this board already exists in history to prevent duplicates
      const existingIndex = prev.findIndex(item => item.boardId === fullEntry.boardId);

      if (existingIndex >= 0) {
        // Update existing entry
        const updatedHistory = [...prev];
        updatedHistory[existingIndex] = fullEntry;
        return updatedHistory;
      }

      // Add new entry
      return [fullEntry, ...prev];
    });
  };

  const handleHistoryUpdate = (updatedEntry: HistoryEntry) => {
    setHistory(prev => prev.map(item =>
      item.id === updatedEntry.id ? updatedEntry : item
    ));
  };

  const handleReset = () => {
    setBoard(null);
    setCart([]);
    setAnalysisResult(null);
    setStep('input');
  };

  const handleBackFromHistory = () => {
    // Return to where we likely came from
    if (user?.role === 'Сотрудник') {
      setStep('employee');
    } else if (analysisResult) {
      setStep('analysis');
    } else if (board) {
      setStep('grid');
    } else {
      setStep('input');
    }
  };

  if (isAnalyzing) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#18181b] text-white">
        <Loader2 size={48} className="text-orange-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold">Считаем заработок...</h2>
        <p className="text-zinc-400 mt-2">Gemini проверяет отчет</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:max-w-5xl mx-auto bg-[#18181b] relative overflow-hidden md:border-x md:border-zinc-800 md:shadow-2xl">
      {step === 'auth' && (
        <AuthView
          onLogin={handleLogin}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {step === 'input' && (
        <BoardInput
          onContinue={handleBoardSubmit}
          onOpenSettings={() => setStep('settings')}
          onOpenHistory={() => setStep('history')}
          onOpenWarehouse={handleStartFetch}
          webappUrl={settings.googleSheetUrl}
          onBatchSelect={handleStartMeasure}
          fetchStartTime={timers.startFetch}
          measureStartTime={timers.startMeasure}
        />
      )}

      {step === 'ownerMain' && user?.role === 'Власник' && (
        <OwnerMainView
          userName={user.name}
          userLogin={user.login}
          onLogout={handleLogout}
          settings={settings}
          onOpenReferences={() => setStep('references')}
          onOpenSettings={() => setStep('settings')}
          onOpenDashboards={() => setStep('dashboards')}
        />
      )}

      {step === 'references' && (
        <ReferencesView
          onBack={() => setStep('ownerMain')}
          settings={settings}
        />
      )}

      {step === 'dashboards' && (
        <DashboardsView
          onBack={() => setStep('ownerMain')}
          settings={settings}
        />
      )}

      {step === 'settings' && (
        <SettingsView
          onBack={() => {
            if (user?.role === 'Власник') {
              setStep('ownerMain');
            } else {
              handleBackFromHistory();
            }
          }}
          userName={user?.name || 'Пользователь'}
          userRole={user?.role}
          userLogin={user?.login}
          onLogout={handleLogout}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {step === 'history' && (
        <HistoryView
          history={history}
          onBack={handleBackFromHistory}
          onClearHistory={() => setHistory([])}
          settings={settings}
          onUpdateHistoryEntry={handleHistoryUpdate}
        />
      )}

      {step === 'grid' && (
        <ProductGrid
          products={products}
          cart={cart}
          onUpdateCart={handleUpdateCart}
          onReview={handleReview}
          onOpenSettings={() => setStep('settings')}
          onOpenHistory={() => setStep('history')}
          onBack={() => setStep('input')}
          board={board}
          startTime={timers.startSaw}
        />
      )}

      {step === 'analysis' && analysisResult && board && (
        <AnalysisView
          board={board}
          cart={cart}
          result={analysisResult}
          dailyTotal={dailyTotal}
          leaderboard={leaderboard}
          onBack={() => setStep('grid')}
          onReset={handleReset}
          settings={settings}
          onOpenSettings={() => setStep('settings')}
          onOpenHistory={() => setStep('history')}
          onUpdateCart={handleUpdateCart}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onSaveSuccess={handleSaveSuccess}
          executor={user?.name}
        />
      )}


      {step === 'employee' && (
        <EmployeeInputView
          products={products}
          cart={cart}
          onUpdateCart={handleUpdateCart}
          onClearCart={handleClearCart}
          settings={settings}
          webappUrl={settings.googleSheetUrl}
          executor={user?.name}
          onSaveSuccess={(entry) => {
            handleSaveSuccess(entry);
          }}
          onOpenSettings={() => setStep('settings')}
          onOpenHistory={() => setStep('history')}
        />
      )}
    </div>
  );
};

export default App;