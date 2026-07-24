import { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

const ModalContext = createContext(null);

const typeConfig = {
  success: { icon: 'fas fa-check', bg: 'rgba(16,185,129,0.15)', text: '#34D399', border: 'rgba(16,185,129,0.30)' },
  error: { icon: 'fas fa-times', bg: 'rgba(239,68,68,0.15)', text: '#F87171', border: 'rgba(239,68,68,0.30)' },
  warning: { icon: 'fas fa-exclamation', bg: 'rgba(245,158,11,0.15)', text: '#FBBF24', border: 'rgba(245,158,11,0.30)' },
  info: { icon: 'fas fa-info', bg: 'rgba(59,130,246,0.15)', text: '#60A5FA', border: 'rgba(59,130,246,0.30)' },
};

export function ModalProvider({ children }) {
  const [modal, setModal] = useState({ open: false });
  const [customContent, setCustomContent] = useState(null);

  const close = useCallback(() => {
    setModal({ open: false });
    setCustomContent(null);
  }, []);

  const showAlert = useCallback((type, title, message, callback) => {
    setCustomContent(null);
    setModal({ open: true, mode: 'alert', type, title, message, callback });
  }, []);

  const showConfirm = useCallback((title, message, onConfirm) => {
    setCustomContent(null);
    setModal({ open: true, mode: 'confirm', type: 'warning', title, message, onConfirm });
  }, []);

  const openModal = useCallback((content) => {
    setModal({ open: true, mode: 'custom' });
    setCustomContent(content);
  }, []);

  const closeModal = useCallback(() => {
    setModal({ open: false });
    setCustomContent(null);
  }, []);

  const handleConfirm = () => {
    const cb = modal.onConfirm;
    close();
    if (cb) {
      Promise.resolve().then(() => cb()).catch(err => {
        console.error('Confirm callback error:', err);
      });
    }
  };

  const handleAlertOk = () => {
    const cb = modal.callback;
    close();
    if (cb) cb();
  };

  const config = typeConfig[modal.type] || typeConfig.info;

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, openModal, closeModal }}>
      {children}

      {modal.open && modal.mode === 'custom' && createPortal(customContent, document.body)}

      {modal.open && modal.mode !== 'custom' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 anim-fade-in"
          onClick={modal.mode === 'alert' ? handleAlertOk : undefined}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm anim-fade-in" />

          <div
            className="relative backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl anim-scale-in"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-glow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: config.bg, border: `1px solid ${config.border}` }}
              >
                <i className={`${config.icon} text-2xl`} style={{ color: config.text }} />
              </div>

              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{modal.title}</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-muted)' }}>{modal.message}</p>

              {modal.mode === 'confirm' ? (
                <div className="flex gap-3 w-full">
                  <button
                    onClick={close}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                    style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, var(--teal), var(--teal-deep))' }}
                  >
                    Confirm
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAlertOk}
                  className="w-full px-4 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, var(--teal), var(--teal-deep))' }}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}
