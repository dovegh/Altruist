'use client';

/**
 * "Mark packed / dispatched / delivered". One press, one step; the button
 * shows it is working and says plainly if the step was refused.
 */
import { useState, useTransition } from 'react';
import { advanceOrder } from '@/app/(portal)/fulfilment/actions';
import { Icon } from '@/components/Icon';
import type { OrderStatus } from '@/lib/portal';

export const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  RECEIVED: { to: 'PACKING', label: 'Mark packed' },
  VERIFYING: { to: 'PACKING', label: 'Mark packed' },
  PACKING: { to: 'DISPATCHED', label: 'Mark dispatched' },
  DISPATCHED: { to: 'DELIVERED', label: 'Mark delivered' },
};

export function AdvanceButton({
  id,
  status,
  size = 'sm',
  block = true,
}: {
  id: string;
  status: OrderStatus;
  size?: 'sm' | 'md';
  block?: boolean;
}) {
  const step = NEXT_STEP[status];
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!step) return null;

  return (
    <div style={{ display: 'grid', gap: 6, position: 'relative', zIndex: 1 }}>
      <button
        type="button"
        className={`btn btn-primary ${size === 'sm' ? 'btn-sm' : ''} ${block ? 'btn-block' : ''}`}
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const result = await advanceOrder(id, step.to);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {pending ? 'Saving…' : step.label}
        {pending ? null : <Icon name="arrow-right" size={16} />}
      </button>
      {error ? (
        <span role="alert" style={{ fontSize: 12, color: 'var(--text-danger)' }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
