export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="sw-card space-y-5 p-6 sm:p-8">
        <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--color-paper-3)]" />
        <div className="h-10 w-full max-w-sm animate-pulse rounded-[var(--radius-input)] bg-[var(--color-paper-3)]" />
        <div className="h-5 w-full max-w-lg animate-pulse rounded-[var(--radius-input)] bg-[var(--color-paper-3)]" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map(item => (
          <div key={item} className="sw-card space-y-5 p-6">
            <div className="h-3 w-28 animate-pulse rounded-full bg-[var(--color-paper-3)]" />
            <div className="h-8 w-40 animate-pulse rounded-[var(--radius-input)] bg-[var(--color-paper-3)]" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map(line => (
                <div key={line} className="h-4 animate-pulse rounded-[var(--radius-input)] bg-[var(--color-paper-3)]" />
              ))}
            </div>
            <div className="h-11 animate-pulse rounded-full bg-[var(--color-paper-3)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
