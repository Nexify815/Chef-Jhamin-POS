import { useState } from "react";
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  const quickLogins = [
    { icon: "\ud83d\udc51", label: "Owner", sub: "admin", user: "admin", role: "owner" },
    { icon: "\ud83e\uddd1\u200d\ud83c\udf73", label: "Staff", sub: "staff", user: "staff", role: "staff" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedCard) {
      setError("Please select a role (Owner or Staff)");
      return;
    }
    setLoading(true);
    try {
      const result = await login(username, password, selectedCard);
      if (!result?.success) {
        setError(result?.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (q) => {
    setSelectedCard(q.role);
  };

  const isDark = theme === 'dark';

  const neu = {
    card: {
      background: isDark ? "#1a2535" : "#FFFFFF",
      boxShadow: isDark
        ? "8px 8px 20px rgba(0,0,0,0.5), -4px -4px 12px rgba(255,255,255,0.03)"
        : "8px 8px 20px rgba(0,0,0,0.08), -4px -4px 12px rgba(255,255,255,0.7)",
      borderRadius: "20px",
    },
    inset: {
      background: isDark ? "#161f2e" : "#F1F5F9",
      boxShadow: isDark
        ? "inset 4px 4px 10px rgba(0,0,0,0.5), inset -2px -2px 6px rgba(255,255,255,0.03)"
        : "inset 4px 4px 10px rgba(0,0,0,0.06), inset -2px -2px 6px rgba(255,255,255,0.6)",
      borderRadius: "12px",
    },
    button: {
      background: "linear-gradient(145deg, #16b89a, #0d8a72)",
      boxShadow: isDark
        ? "4px 4px 12px rgba(0,0,0,0.4), -2px -2px 8px rgba(20,184,166,0.2)"
        : "4px 4px 12px rgba(0,0,0,0.12), -2px -2px 8px rgba(20,184,166,0.15)",
      borderRadius: "12px",
    },
    quickBtn: {
      background: isDark ? "#1a2535" : "#F8FAFC",
      boxShadow: isDark
        ? "4px 4px 10px rgba(0,0,0,0.4), -2px -2px 6px rgba(255,255,255,0.02)"
        : "4px 4px 10px rgba(0,0,0,0.06), -2px -2px 6px rgba(255,255,255,0.5)",
      borderRadius: "14px",
    },
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: isDark ? "#141e2d" : "#E2E8F0" }}
    >
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm md:max-w-lg">
        <div style={neu.card} className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-20 h-20 flex items-center justify-center mb-4"
              style={{
                background: isDark ? "#1a2535" : "#F8FAFC",
                boxShadow: isDark
                  ? "6px 6px 14px rgba(0,0,0,0.5), -3px -3px 10px rgba(20,184,166,0.08)"
                  : "6px 6px 14px rgba(0,0,0,0.08), -3px -3px 10px rgba(255,255,255,0.6)",
                borderRadius: "50%",
              }}
            >
              <div
                className="w-14 h-14 flex items-center justify-center"
                style={{
                  background: "linear-gradient(145deg, #16b89a, #0d8a72)",
                  boxShadow: "2px 2px 6px rgba(0,0,0,0.3)",
                  borderRadius: "50%",
                }}
              >
                <span className="text-2xl">{"\ud83c\udf74"}</span>
              </div>
            </div>
            <h1 className="text-lg font-bold text-center" style={{ color: isDark ? '#fff' : '#0F172A' }}>Chef Jhamin's Kitchen</h1>
            <p className="text-xs tracking-[0.2em] uppercase mt-1" style={{ color: 'var(--teal)' }}>Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold tracking-widest uppercase mb-2 block ml-1" style={{ color: 'var(--teal)' }}>Username</label>
              <div className="flex items-center gap-3 px-4 py-3" style={neu.inset}>
                <span className="shrink-0" style={{ color: 'var(--teal-muted)' }}>{"\ud83d\udc64"}</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter username"
                  name="ck_username"
                  autoComplete="one-time-code"
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: isDark ? '#fff' : '#0F172A' }}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold tracking-widest uppercase mb-2 block ml-1" style={{ color: 'var(--teal)' }}>Password</label>
              <div className="flex items-center gap-3 px-4 py-3" style={neu.inset}>
                <span className="shrink-0" style={{ color: 'var(--teal-muted)' }}>{"\ud83d\udd12"}</span>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  name="ck_password"
                  autoComplete="one-time-code"
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: isDark ? '#fff' : '#0F172A' }}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="text-xs hover:opacity-80 transition shrink-0" style={{ color: 'var(--text-dim)' }}>
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-center rounded-lg py-2 anim-slide-down" style={{ color: '#F87171', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-4 text-sm tracking-widest uppercase mt-2 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={neu.button}
            >
              {loading ? (
                <>
                  <img src="/assets/loadinganimation.svg" alt="" className="w-5 h-5" style={{ filter: 'brightness(10)' }} />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)" }} />
            <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-dim)' }}>Quick Access</span>
            <div className="flex-1 h-px" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)" }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {quickLogins.map((r, index) => (
              <button
                key={r.label}
                type="button"
                onClick={() => handleQuickLogin(r)}
                className="flex flex-col items-center gap-1.5 py-4 transition-all duration-200 active:scale-95"
                style={{
                  ...neu.quickBtn,
                  ...(selectedCard === r.role ? {
                    background: isDark
                      ? "linear-gradient(145deg, rgba(22,184,154,0.15), rgba(13,138,114,0.1))"
                      : "linear-gradient(145deg, rgba(22,184,154,0.08), rgba(13,138,114,0.04))",
                    boxShadow: isDark
                      ? "4px 4px 10px rgba(0,0,0,0.4), -2px -2px 6px rgba(20,184,166,0.08), inset 0 0 0 1px rgba(20,184,166,0.3)"
                      : "4px 4px 10px rgba(0,0,0,0.06), -2px -2px 6px rgba(255,255,255,0.5), inset 0 0 0 1px rgba(20,184,166,0.3)",
                    border: "1px solid rgba(20,184,166,0.3)",
                  } : {}),
                }}
              >
                <span className="text-2xl">{r.icon}</span>
                <span className="text-sm font-semibold" style={{ color: selectedCard === r.role ? 'var(--teal)' : isDark ? '#fff' : '#0F172A' }}>{r.label}</span>
                <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{r.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
