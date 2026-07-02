import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import OperatorLog from './pages/OperatorLog';
import AdminDashboard from './pages/AdminDashboard';
import CashRegister from './pages/CashRegister';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Disclaimer from './pages/Disclaimer';
import { useAuth } from './context/AuthContext';

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/operator'} replace /> : <Login />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/disclaimer" element={<Disclaimer />} />
      
      <Route path="/" element={<Layout />}>
        {/* Redirect root to appropriate dashboard */}
        <Route index element={
          <ProtectedRoute>
            {user?.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/operator" replace />}
          </ProtectedRoute>
        } />
        
        {/* Operator Routes */}
        <Route path="operator" element={
          <ProtectedRoute>
            <OperatorLog />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="admin" element={
          <ProtectedRoute requireAdmin={true}>
            <Navigate to="/admin/logs" replace />
          </ProtectedRoute>
        } />
        
        <Route path="admin/logs" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="admin/cash" element={
          <ProtectedRoute requireAdmin={true}>
            <CashRegister />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}

export default App;
