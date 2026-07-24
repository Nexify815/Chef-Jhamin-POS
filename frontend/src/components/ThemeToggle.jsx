import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer border"
      style={{
        background: isDark
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(13,148,136,0.1)',
        borderColor: isDark
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(13,148,136,0.2)',
        transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)',
      }}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <i
        className={`fas ${isDark ? 'fa-sun' : 'fa-moon'} text-sm transition-all duration-500`}
        style={{ color: isDark ? '#FBBF24' : '#0D9488', transform: isDark ? 'rotate(0deg)' : 'rotate(-180deg)' }}
      />
    </button>
  );
}
