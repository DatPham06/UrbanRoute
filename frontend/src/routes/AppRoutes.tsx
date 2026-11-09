import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminDeliveryPointsPage } from '../pages/admin/AdminDeliveryPointsPage';
import { AdminHistoryPage } from '../pages/admin/AdminHistoryPage';
import { DriverRoutesPage } from '../pages/driver/DriverRoutesPage';
import { DriverHistoryPage } from '../pages/driver/DriverHistoryPage';
import { NotFoundPage } from '../pages/common/NotFoundPage';
import { useAuth } from '../contexts/AuthContext';
import { isAdmin } from '../config/roles';

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, currentUser } = useAuth();

  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            isAdmin(currentUser?.role) ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <Navigate to="/driver/routes" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Public Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="delivery-points" element={<AdminDeliveryPointsPage />} />
        <Route path="history" element={<AdminHistoryPage />} />
      </Route>

      {/* Driver Protected Routes */}
      <Route
        path="/driver"
        element={
          <ProtectedRoute requireAdmin={false}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/driver/routes" replace />} />
        <Route path="routes" element={<DriverRoutesPage />} />
        <Route path="history" element={<DriverHistoryPage />} />
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
