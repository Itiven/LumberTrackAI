import React from 'react';
import { ArrowLeft, Bell, Moon, Shield, LogOut, ChevronRight, CheckCircle2, Lock, Link, User as UserIcon } from 'lucide-react';
import { AppSettings } from '../App';

interface SettingsViewProps {
   onBack: () => void;
   userName: string;
   userRole?: string;
   userLogin?: string;
   onLogout: () => void;
   settings: AppSettings;
   onUpdateSettings: (s: Partial<AppSettings>) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onBack, userName, userRole, userLogin, onLogout, settings, onUpdateSettings }) => {

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
            <h1 className="text-2xl font-bold">Настройки</h1>
         </div>

         <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="md:max-w-2xl md:mx-auto w-full space-y-6">
               {/* Profile Section */}
               <div className="flex items-center gap-4 bg-[#27272a] p-4 rounded-2xl border border-zinc-800">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg shrink-0 uppercase">
                     {userName.charAt(0)}
                  </div>
                  <div className="flex-1">
                     <div className="font-bold text-lg flex items-center gap-2">
                        {userName}
                        {userRole === 'Администратор' && (
                           <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full border border-red-500/30">ADMIN</span>
                        )}
                     </div>
                     <div className="text-zinc-400 text-sm flex items-center gap-1">
                        <UserIcon size={12} />
                        <span>{userLogin || 'Гость'}</span>
                        <span className="text-zinc-600">•</span>
                        <span>{userRole || 'Сотрудник'}</span>
                     </div>
                  </div>
               </div>

               {/* Yield Control Section */}
               <div className="space-y-2">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Контроль производства</h3>
                  <div className="bg-[#27272a] rounded-xl overflow-hidden border border-zinc-800 divide-y divide-zinc-800">
                     {/* Toggle Switch */}
                     <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-lg ${settings.isYieldControlEnabled ? 'bg-red-500/20 text-red-500' : 'bg-zinc-700/50 text-zinc-400'}`}>
                              <Lock size={20} />
                           </div>
                           <span className="font-medium">Блокировка при ошибках</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                           <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={settings.isYieldControlEnabled}
                              onChange={(e) => onUpdateSettings({ isYieldControlEnabled: e.target.checked })}
                           />
                           <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                     </div>

                     {/* Threshold Inputs */}
                     <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1 w-1/2">
                           <span className="text-xs text-zinc-500">Мин. выход (%)</span>
                           <input
                              type="number"
                              value={settings.minYield}
                              onChange={(e) => onUpdateSettings({ minYield: parseInt(e.target.value) || 0 })}
                              className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white focus:border-orange-500 outline-none transition-colors"
                           />
                        </div>
                        <div className="flex flex-col gap-1 w-1/2">
                           <span className="text-xs text-zinc-500">Макс. выход (%)</span>
                           <input
                              type="number"
                              value={settings.maxYield}
                              onChange={(e) => onUpdateSettings({ maxYield: parseInt(e.target.value) || 0 })}
                              className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white focus:border-orange-500 outline-none transition-colors"
                           />
                        </div>
                     </div>
                  </div>
               </div>

               {/* AI Settings Section */}
               <div className="space-y-2">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Искусственный интеллект</h3>
                  <div className="bg-[#27272a] rounded-xl overflow-hidden border border-zinc-800 divide-y divide-zinc-800">
                     <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-lg ${settings.isAiAnalysisEnabled ? 'bg-purple-500/20 text-purple-500' : 'bg-zinc-700/50 text-zinc-400'}`}>
                              <Moon size={20} />
                           </div>
                           <div className="flex flex-col">
                              <span className="font-medium">AI Анализ</span>
                              <span className="text-xs text-zinc-500">Комментарии "Бригадира"</span>
                           </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                           <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={settings.isAiAnalysisEnabled ?? true} // Default true if undefined
                              onChange={(e) => onUpdateSettings({ isAiAnalysisEnabled: e.target.checked })}
                           />
                           <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                        </label>
                     </div>
                  </div>
               </div>

               {/* App Settings Group */}
               <div className="space-y-2">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Приложение</h3>
                  <div className="bg-[#27272a] rounded-xl overflow-hidden border border-zinc-800 divide-y divide-zinc-800">
                     <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-800 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className="bg-blue-500/20 p-2 rounded-lg text-blue-500">
                              <Bell size={20} />
                           </div>
                           <span className="font-medium">Уведомления</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500">
                           <span className="text-sm">Вкл</span>
                           <ChevronRight size={16} />
                        </div>
                     </button>

                     <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-800 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className="bg-purple-500/20 p-2 rounded-lg text-purple-500">
                              <Moon size={20} />
                           </div>
                           <span className="font-medium">Тема</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500">
                           <span className="text-sm">Темная</span>
                           <ChevronRight size={16} />
                        </div>
                     </button>
                  </div>
               </div>

               {/* Security & Support */}
               <div className="space-y-2">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Данные</h3>
                  <div className="bg-[#27272a] rounded-xl overflow-hidden border border-zinc-800 divide-y divide-zinc-800">
                     <div className="p-4 space-y-3">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="bg-green-500/20 p-2 rounded-lg text-green-500">
                              <Shield size={20} />
                           </div>
                           <span className="font-medium">Google Sheet Integration</span>
                        </div>

                        <div className="space-y-1">
                           <label className="text-xs text-zinc-500 ml-1 flex items-center gap-1">
                              <Link size={10} />
                              Webhook / Script URL
                           </label>
                           <input
                              type="url"
                              placeholder="https://script.google.com/macros/s/..."
                              value={settings.googleSheetUrl || ''}
                              onChange={(e) => onUpdateSettings({ googleSheetUrl: e.target.value })}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:border-green-500 outline-none transition-colors placeholder-zinc-600"
                           />
                           <div className="flex justify-between items-start">
                              <p className="text-[10px] text-zinc-500 ml-1">
                                 Вставьте URL веб-приложения Google Apps Script.
                              </p>
                              <span className="text-[10px] text-green-500/80 flex items-center gap-1">
                                 <CheckCircle2 size={10} />
                                 Автосохранение
                              </span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Admin Zone - Dangerous Operations */}
               {userRole === 'Власник' && (
                  <div className="space-y-2">
                     <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider ml-1">Опасная зона</h3>
                     <div className="bg-[#27272a] rounded-xl overflow-hidden border border-red-900/30 divide-y divide-zinc-800">
                        <button
                           onClick={async () => {
                              if (window.confirm("Вы уверены? Это действие безвозвратно удалит все записи помеченные как 'deleted' из таблицы!")) {
                                 const { cleanupDatabase } = await import('../services/sheetService');
                                 const success = await cleanupDatabase(settings.googleSheetUrl);
                                 if (success) {
                                    alert("База данных успешно очищена.");
                                 } else {
                                    alert("Ошибка очистки базы данных. Проверьте консоль и логи.");
                                 }
                              }
                           }}
                           className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors group"
                        >
                           <div className="flex items-center gap-3">
                              <div className="bg-red-500/10 p-2 rounded-lg text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                 <LogOut size={20} className="rotate-180" />
                              </div>
                              <span className="font-medium text-red-400 group-hover:text-red-300">Очистка базы данных</span>
                           </div>
                           <div className="flex items-center gap-2 text-red-500/50">
                              <span className="text-xs">Удалить "deleted"</span>
                              <ChevronRight size={16} />
                           </div>
                        </button>
                     </div>
                  </div>
               )}


               {/* Footer Actions */}
               <div className="pt-4">
                  <button
                     onClick={onLogout}
                     className="w-full flex items-center justify-center gap-2 text-red-500 p-4 hover:bg-red-500/10 rounded-xl transition-colors font-medium"
                  >
                     <LogOut size={20} />
                     <span>Выйти из аккаунта</span>
                  </button>
                  <div className="text-center mt-6 text-xs text-zinc-600">
                     LumberTrack AI v1.0.4
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default SettingsView;