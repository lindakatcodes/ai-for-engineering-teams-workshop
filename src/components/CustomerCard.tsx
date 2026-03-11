import { Customer } from '@/data/mock-customers';

interface CustomerCardProps {
  customer: Customer;
  onClick?: (customer: Customer) => void;
}

function getHealthScoreConfig(score: number): {
  label: string;
  dotClass: string;
  badgeClass: string;
} {
  if (score <= 30) {
    return {
      label: 'Poor',
      dotClass: 'bg-red-500',
      badgeClass: 'bg-red-100 text-red-800',
    };
  }
  if (score <= 70) {
    return {
      label: 'Moderate',
      dotClass: 'bg-yellow-400',
      badgeClass: 'bg-yellow-100 text-yellow-800',
    };
  }
  return {
    label: 'Good',
    dotClass: 'bg-green-500',
    badgeClass: 'bg-green-100 text-green-800',
  };
}

export default function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const { name, company, healthScore, domains } = customer;
  const health = getHealthScoreConfig(healthScore);
  const hasDomains = Array.isArray(domains) && domains.length > 0;
  const hasMultipleDomains = hasDomains && domains!.length > 1;

  function handleClick() {
    if (onClick) {
      onClick(customer);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick(customer);
    }
  }

  return (
    <div
      className={[
        'bg-white rounded-lg border border-gray-200 shadow-sm p-4',
        'flex flex-col gap-3',
        onClick
          ? 'cursor-pointer hover:shadow-md hover:border-gray-300 transition-shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Select customer ${name} from ${company}` : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Header: name, company, and health badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-500 truncate">{company}</p>
        </div>

        {/* Health score badge */}
        <div
          className={`flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${health.badgeClass}`}
          aria-label={`Health score: ${healthScore} — ${health.label}`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${health.dotClass}`}
            aria-hidden="true"
          />
          <span>{healthScore}</span>
          <span className="sr-only">{health.label}</span>
          <span aria-hidden="true" className="hidden sm:inline">
            {health.label}
          </span>
        </div>
      </div>

      {/* Domains section */}
      {hasDomains && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Domains
            </span>
            {hasMultipleDomains && (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                {domains!.length}
              </span>
            )}
          </div>
          <ul className="flex flex-col gap-0.5">
            {domains!.map((domain) => (
              <li
                key={domain}
                className="truncate rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-700 font-mono"
              >
                {domain}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
