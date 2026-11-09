import React from 'react';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { USE_MOCK_API } from '../../config/api';
import { NotificationDropdown } from './NotificationDropdown';

export interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { currentUser, logout, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Mở menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        <span className="truncate text-sm font-semibold text-slate-900">
          <span className="md:hidden">UrbanRoute</span>
          <span className="hidden md:inline">{isAdmin ? 'Quản trị' : 'Tài xế'}</span>
        </span>
        {USE_MOCK_API && (
          <span className="shrink-0 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">Dùng thử</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {isAdmin && <NotificationDropdown />}
        {currentUser && (
          <>
            <span className="hidden max-w-48 truncate text-sm text-slate-700 sm:block">
              {currentUser.fullName || currentUser.username}
            </span>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-md p-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden lg:inline">Đăng xuất</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
