import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import apiService from '../services/api';

export const RequireRole = ({ allowedRoles, children }: { allowedRoles: string[]; children: ReactElement }) => {
  const token = apiService.getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const role = apiService.getRole();
  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

