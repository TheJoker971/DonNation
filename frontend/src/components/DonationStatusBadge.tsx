export function DonationStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    PAID: 'bg-sky-100 text-sky-800',
    MINTING: 'bg-violet-100 text-violet-800',
    COMPLETED: 'bg-emerald-100 text-emerald-800',
    FAILED: 'bg-rose-100 text-rose-800',
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${map[status] ?? 'bg-slate-100 text-slate-700'}`}>{status}</span>;
}
