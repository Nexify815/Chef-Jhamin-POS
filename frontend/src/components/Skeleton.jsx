export default function Skeleton({ rows = 3, className = '' }) {
  const barStyle = {
    height: '14px',
    borderRadius: '8px',
    background: 'linear-gradient(90deg, var(--border-color) 25%, var(--bg-input) 50%, var(--border-color) 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.5s ease-in-out infinite',
  };

  const widths = ['100%', '85%', '65%', '90%', '75%'];

  return (
    <div className={`anim-fade-in ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            ...barStyle,
            width: widths[i % widths.length],
            marginBottom: i < rows - 1 ? '12px' : 0,
          }}
        />
      ))}
    </div>
  );
}
