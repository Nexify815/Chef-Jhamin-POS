export default function HamburgerButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed top-4 left-4 z-[200] w-11 h-11 flex items-center justify-center rounded-xl backdrop-blur-xl transition-colors cursor-pointer"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-glow)',
        color: 'var(--teal)',
      }}
      aria-label="Toggle menu"
    >
      <i className="fas fa-bars text-base" />
    </button>
  );
}
