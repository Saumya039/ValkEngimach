import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [workerId, setWorkerId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const user = await login(workerId, pin);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/operator');
      }
    } catch (err) {
      setError(err.message || 'Invalid ID or PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <motion.div 
        className="card text-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <div className="mb-6 flex justify-center">
          <img src="/logo.jpg" alt="Valk Engimach Logo" style={{ height: '80px', objectFit: 'contain' }} />
        </div>
        <h2 className="mb-2 text-gradient">Worker Secure Portal</h2>
        <p className="text-muted mb-8">Enter your Worker ID and PIN</p>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="badge badge-danger mb-4 w-full" 
            style={{ padding: '1rem' }}
          >
            {error}
          </motion.div>
        )}
        
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="input-group">
            <label>Worker ID</label>
            <input 
              type="text" 
              className="input font-mono font-bold" 
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 1000"
              maxLength="4"
              required 
            />
          </div>
          <div className="input-group">
            <label>Numeric PIN</label>
            <input 
              type="password" 
              className="input font-mono font-bold" 
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              maxLength="4"
              inputMode="numeric"
              required 
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit" 
            className="btn btn-primary w-full mt-4" 
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Secure Login'}
          </motion.button>
        </form>

        <div className="mt-8 text-sm text-muted font-mono" style={{ opacity: 0.7 }}>
          <p>Admin: ID 1000 / PIN 1234</p>
          <p>Operator: ID 2001 / PIN 1111</p>
        </div>
      </motion.div>
    </div>
  );
}
