import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { historyService } from '../services/api/historyService';
import { HistoryRecord, NotificationItem } from '../types';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  const loadFromHistory = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) return;

    try {
      const historyList = await historyService.getAdminHistory();
      // Take the latest 10 records to create notifications
      const latest = historyList.slice(0, 10);

      const items: NotificationItem[] = latest.map((h: HistoryRecord) => ({
        id: `notif-${h.historyId}`,
        historyId: h.historyId,
        driverUsername: h.driverUsername || `Tài xế #${h.driverId}`,
        searchType: h.searchType,
        status: h.status,
        destinationName: h.endPointName || `Điểm #${h.endPointId}`,
        distanceM: h.distanceM ?? undefined,
        timestamp: h.searchedAt,
        read: readIds.has(`notif-${h.historyId}`),
      }));

      setNotifications(items);
    } catch {
      // Silently handle polling errors
    }
  }, [isAdmin, isAuthenticated, readIds]);

  // Periodic polling every 30 seconds for admin
  useEffect(() => {
    if (!isAdmin) return;
    loadFromHistory();
    const interval = setInterval(loadFromHistory, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, loadFromHistory]);

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      return next;
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications: loadFromHistory,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
