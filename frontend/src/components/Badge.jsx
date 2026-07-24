export default function Badge({ variant = 'info', children }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
