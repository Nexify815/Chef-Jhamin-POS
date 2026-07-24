import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex items-center justify-center min-h-[500px] p-6"
          style={{ background: 'var(--bg-page)' }}
        >
          <div className="flex flex-col items-center text-center max-w-md w-full">
            <div className="w-full max-w-[200px] mb-6 anim-scale-in">
              <img
                src="/erroranimation.svg"
                alt="Error"
                className="w-full h-auto"
                style={{ filter: 'drop-shadow(0 0 40px rgba(20, 184, 166, 0.15))' }}
              />
            </div>

            <div
              className="text-5xl font-black tracking-tighter mb-2 anim-fade-in"
              style={{ color: 'var(--teal)' }}
            >
              500
            </div>

            <h3
              className="text-lg font-bold mb-2 anim-slide-up"
              style={{ color: 'var(--text-primary)' }}
            >
              Something went wrong
            </h3>

            <p
              className="text-sm mb-6 anim-slide-up"
              style={{ color: 'var(--text-muted)', animationDelay: '0.05s' }}
            >
              This section encountered an error. Try refreshing.
            </p>

            <button
              onClick={() => window.location.reload()}
              className="btn-primary px-6 py-2.5 text-sm anim-slide-up"
              style={{ animationDelay: '0.1s' }}
            >
              <i className="fas fa-refresh mr-2" />Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
