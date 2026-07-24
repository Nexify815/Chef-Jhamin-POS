import { useState } from 'react';
import { useModal } from '../components/Modal';

export default function FactoryResetModal({ onConfirm, onClose }) {
  const [input, setInput] = useState('');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 anim-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm anim-fade-in" onClick={onClose} />
      <div className="glass-card p-6 max-w-md w-full relative anim-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
          <i className="fas fa-exclamation-triangle text-red-400" />
        </div>
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Factory Reset</h3>
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        This will wipe ALL data and cannot be undone. Type <strong>CONFIRM</strong> to proceed.
      </p>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder='Type "CONFIRM"'
        className="input-field text-sm w-full mb-4"
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter' && input === 'CONFIRM') onConfirm(); }}
      />
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl" style={{ color: 'var(--text-muted)' }}>Cancel</button>
        <button
          onClick={onConfirm}
          disabled={input !== 'CONFIRM'}
          className="px-4 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: input === 'CONFIRM' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.05)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <i className="fas fa-trash mr-2" />Factory Reset
        </button>
      </div>
      </div>
    </div>
  );
}
