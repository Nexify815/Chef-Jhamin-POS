import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

export default function ErrorPage({ status = 404, message }) {
  const navigate = useNavigate();

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--bg-page)' }}
    >
      <div className="flex flex-col items-center text-center max-w-lg w-full">
        <div className="w-full max-w-[400px] mb-10 anim-scale-in">
          <img
            src="/erroranimation.svg"
            alt="404 - Page Not Found"
            className="w-full h-auto"
            style={{ filter: 'drop-shadow(0 0 40px rgba(20, 184, 166, 0.15))' }}
          />
        </div>

        <div className="flex gap-3 anim-slide-up">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
            }}
          >
            <i className="fas fa-arrow-left mr-2" />
            Go Back
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="btn-primary px-6 py-2.5 text-sm"
          >
            <i className="fas fa-home mr-2" />
            Home
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
