export default function StatCard({ icon, label, value, color, index = 0 }) {
  const colorMap = {
    gold: { bg: 'bg-teal/15', text: 'text-teal', border: 'border-teal/20' },
    green: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    red: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/20' },
    blue: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' },
    purple: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/20' },
    orange: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/20' },
  };

  const c = colorMap[color] || colorMap.gold;

  return (
    <div
      className={`glass-card interactive flex items-center gap-4 p-5 border ${c.border}`}
      style={{ animation: `slideInUp 0.35s ease ${index * 0.08}s both` }}
    >
      <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
        <i className={`${icon} text-lg ${c.text}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl font-bold text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}
