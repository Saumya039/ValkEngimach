import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, maxWidth = '600px' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ maxWidth, width: '100%', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="mb-0">{title}</h3>
          <button type="button" className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
