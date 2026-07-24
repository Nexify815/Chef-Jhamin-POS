export default function PageLoader({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 anim-fade-in">
      <img src="/assets/loadinganimation.svg" alt="Loading" className="w-20 h-20" />
      <p className="text-sm font-medium tracking-wide" style={{ color: 'var(--text-dim)' }}>{text}</p>
    </div>
  );
}
