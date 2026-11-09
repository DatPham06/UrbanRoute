import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  History,
  Route,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mockStorage } from '../../services/mock/mockStorage';
import { useToast } from '../../contexts/ToastContext';
import { USE_MOCK_API } from '../../config/api';

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isAdmin } = useAuth();
  const { success } = useToast();

  const handleResetMockData = () => {
    if (window.confirm('Đặt lại địa điểm và lịch sử dùng thử về mặc định?')) {
      mockStorage.resetMockData();
      success('Đã đặt lại dữ liệu dùng thử.');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const adminNavItems = [
    { to: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/admin/delivery-points', label: 'Điểm giao nhận', icon: MapPin },
    { to: '/admin/history', label: 'Lịch sử tìm đường', icon: History },
    { to: '/driver/routes', label: 'Tìm đường', icon: Route },
  ];

  const driverNavItems = [
    { to: '/driver/routes', label: 'Tìm đường', icon: Route },
    { to: '/driver/history', label: 'Lịch sử tìm đường', icon: History },
  ];

  const navItems = isAdmin ? adminNavItems : driverNavItems;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-white transition-transform duration-200 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-700 px-5">
          <Route className="h-5 w-5 text-blue-300" aria-hidden="true" />
          <span className="text-base font-semibold">UrbanRoute</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Điều hướng chính">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? 'border-blue-400 bg-slate-800 text-white'
                    : 'border-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        {USE_MOCK_API && (
          <div className="border-t border-slate-700 p-3">
            <button
              type="button"
              onClick={handleResetMockData}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Đặt lại dữ liệu thử
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
