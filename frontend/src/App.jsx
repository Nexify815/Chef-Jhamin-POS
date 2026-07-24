import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ModalProvider } from './components/Modal';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ErrorPage from './pages/ErrorPage';
import OwnerLayout from './pages/owner/OwnerLayout';
import StaffLayout from './pages/staff/StaffLayout';

function ProtectedRoute({ children, role }) {
  const { isLoggedIn, user } = useAuth();
  if (!isLoggedIn) return <Navigate to="/" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'owner' ? '/owner' : '/staff'} replace />;
  }
  return children;
}

function AppRoutes() {
  const { isLoggedIn, user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={
        isLoggedIn
          ? (user.mustChangePassword ? <Navigate to="/change-password" replace /> : <Navigate to={user.role === 'owner' ? '/owner' : '/staff'} replace />)
          : <LoginPage />
      } />
      <Route path="/change-password" element={
        isLoggedIn ? <ChangePasswordPage /> : <Navigate to="/" replace />
      } />
      <Route path="/owner/*" element={
        <ProtectedRoute role="owner"><OwnerLayout /></ProtectedRoute>
      } />
      <Route path="/staff/*" element={
        <ProtectedRoute role="staff"><StaffLayout /></ProtectedRoute>
      } />
      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ModalProvider>
            <KeyboardShortcuts />
            <AppRoutes />
          </ModalProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
