interface ApiErrorMessageProps {
  title?: string;
  message: string;
}

export function ApiErrorMessage({
  title = 'Impossible de charger les données',
  message,
}: ApiErrorMessageProps) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-rose-800">{title}</h2>
      <p className="mt-2 text-sm text-rose-700">{message}</p>
      <p className="mt-4 text-sm text-rose-600">
        Vérifiez que le backend tourne sur{' '}
        <code className="rounded bg-rose-100 px-1.5 py-0.5">{process.env.NEXT_PUBLIC_API_URL}</code>
      </p>
    </div>
  );
}
