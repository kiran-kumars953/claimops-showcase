import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import apiService from '../services/api';

export const RequireAuth = ({ children }: { children: ReactElement }) => {
  const token = apiService.getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

