import { Customer } from '@/data/mock-customers';

interface CustomerCardProps {
  customer: Customer;
  onClick?: (customer: Customer) => void;
}

function getHealthColor(score: number): string {
  if (score <= 30) return 'bg-red-500';
  if (score <= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getHealthLabel(score: number): string {
  if (score <= 30) return 'Poor';
  if (score <= 70) return 'Moderate';
  return 'Good';
}

export default function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const { name, company, healthScore, domains } = customer;
  const hasDomains = domains && domains.length > 0;
  const hasMultipleDomains = domains && domains.length > 1;

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(customer)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(customer);
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{name}</h3>
          <p className="text-xs text-gray-500 truncate">{company}</p>
        </div>

        {/* Health score badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${getHealthColor(healthScore)}`} />
          <span className="text-xs font-medium text-gray-700">
            {healthScore} <span className="hidden sm:inline text-gray-400">· {getHealthLabel(healthScore)}</span>
          </span>
        </div>
      </div>

      {/* Domains */}
      {hasDomains && (
        <div className="mt-3">
          <span className="text-xs text-gray-400 block mb-1">
            Domains{hasMultipleDomains && (
              <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                {domains!.length}
              </span>
            )}
          </span>
          <ul className="space-y-0.5">
            {domains!.map((domain) => (
              <li key={domain} className="text-xs text-gray-700 truncate">
                {domain}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
