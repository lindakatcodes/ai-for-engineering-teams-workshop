'use client';

import { useState } from 'react';
import { Customer } from '@/data/mock-customers';
import CustomerCard from '@/components/CustomerCard';

interface CustomerSelectorProps {
  customers: Customer[];
  selectedCustomerId?: string;
  onSelectCustomer: (customer: Customer) => void;
}

export default function CustomerSelector({
  customers,
  selectedCustomerId,
  onSelectCustomer,
}: CustomerSelectorProps) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.company.toLowerCase().includes(query.toLowerCase())
      )
    : customers;

  return (
    <div className="flex flex-col gap-3 w-full">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or company…"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        aria-label="Search customers"
      />

      <div className="flex flex-col gap-2 overflow-y-auto max-h-[600px]">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No customers match &ldquo;{query}&rdquo;
          </p>
        ) : (
          filtered.map((customer) => (
            <div
              key={customer.id}
              className={
                customer.id === selectedCustomerId
                  ? 'rounded-lg ring-2 ring-blue-500'
                  : ''
              }
            >
              <CustomerCard customer={customer} onClick={onSelectCustomer} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
