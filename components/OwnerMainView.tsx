import React from 'react';
import { ArrowLeft, BookOpen, Settings, BarChart3, User as UserIcon, LogOut, ChevronRight } from 'lucide-react';
import { AppSettings } from '../App';

interface OwnerMainViewProps {
  userName: string;
  userLogin?: string;
  onLogout: () => void;
  settings: AppSettings;
  onOpenReferences: () => void;
  onOpenSettings: () => void;
  onOpenDashboards: () => void;
}

const OwnerMainView: React.FC<OwnerMainViewProps> = ({
  userName,
  userLogin,
  onLogout,
  settings,
  onOpenReferences,
  onOpenSettings,
  onOpenDashboards,
}) => {
  return (
    <div className="flex flex-col h-full bg-[#18181b] text-white animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 pb-2 md:max-w-2xl md:mx-auto md:w-full">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Головне меню</h1>
          <p className="text-zinc-400 text-sm mt-1">Власник</p>
        </div>
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
                <span className="text-[10px] bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full border border-orange-500/30">
                  ВЛАСНИК
                </span>
              </div>
              <div className="text-zinc-400 text-sm flex items-center gap-1">
                <UserIcon size={12} />
                <span>{userLogin || 'Гость'}</span>
              </div>
            </div>
          </div>

          {/* Navigation Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Навігація</h3>
            <div className="bg-[#27272a] rounded-xl overflow-hidden border border-zinc-800 divide-y divide-zinc-800">
              {/* Справочники */}
              <button
                onClick={onOpenReferences}
                className="w-full flex items-center justify-between p-4 hover:bg-orange-500/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/10 p-2 rounded-lg text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <BookOpen size={20} />
                  </div>
                  <span className="font-medium text-orange-400 group-hover:text-orange-300">Справочники</span>
                </div>
                <ChevronRight size={16} className="text-orange-500/50" />
              </button>

              {/* Налаштування */}
              <button
                onClick={onOpenSettings}
                className="w-full flex items-center justify-between p-4 hover:bg-blue-500/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Settings size={20} />
                  </div>
                  <span className="font-medium text-blue-400 group-hover:text-blue-300">Налаштування</span>
                </div>
                <ChevronRight size={16} className="text-blue-500/50" />
              </button>

              {/* Дашборди */}
              <button
                onClick={onOpenDashboards}
                className="w-full flex items-center justify-between p-4 hover:bg-purple-500/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/10 p-2 rounded-lg text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <BarChart3 size={20} />
                  </div>
                  <span className="font-medium text-purple-400 group-hover:text-purple-300">Дашборди</span>
                </div>
                <ChevronRight size={16} className="text-purple-500/50" />
              </button>
            </div>
          </div>

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

export default OwnerMainView;


