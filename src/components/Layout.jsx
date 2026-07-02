import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Home, ClipboardList, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <motion.nav 
        className="navbar"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <div className="container navbar-content">
          <Link to="/" className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/logo.jpg" alt="Valk Engimach" style={{ height: '32px', borderRadius: '4px' }} />
          </Link>
          {user && (
            <div className="navbar-nav">
              {user.role === 'admin' ? (
                <>
                  <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
                    <Home size={18} /> Dashboard
                  </Link>
                  <Link to="/admin/logs" className={`nav-link ${location.pathname === '/admin/logs' ? 'active' : ''}`}>
                    <ClipboardList size={18} /> Logs
                  </Link>
                  <Link to="/admin/cash" className={`nav-link ${location.pathname === '/admin/cash' ? 'active' : ''}`}>
                    <Wallet size={18} /> Cash
                  </Link>
                </>
              ) : (
                <span className="nav-link">Supervisor Portal</span>
              )}
              
              <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </motion.nav>
      
      <AnimatePresence mode="wait">
        <motion.main 
          key={location.pathname}
          className="container mt-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
    </>
  );
};
