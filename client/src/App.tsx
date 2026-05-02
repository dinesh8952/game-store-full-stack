import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Pending from './pages/Pending';
import Rejected from './pages/Rejected';
import Games from './pages/Games';
import GameDetail from './pages/GameDetail';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminGames from './pages/admin/Games';

const qc = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!user?.isSuperAdmin) return <Navigate to="/games" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/pending" element={<PrivateRoute><Pending /></PrivateRoute>} />
      <Route path="/rejected" element={<PrivateRoute><Rejected /></PrivateRoute>} />

      <Route path="/games" element={<PrivateRoute><Games /></PrivateRoute>} />
      <Route path="/games/:id" element={<PrivateRoute><GameDetail /></PrivateRoute>} />

      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/games" element={<AdminRoute><AdminGames /></AdminRoute>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
