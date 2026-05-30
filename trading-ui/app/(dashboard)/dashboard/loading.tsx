export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="sw-card space-y-5 p-6 sm:p-8">
        <div className="h-3 w-32 animate-pulse rounded-full bg-[var(--color-paper-3)]" />
        <div className="h-10 w-full max-w-md animate-pulse rounded-[var(--radius-input)] bg-[var(--color-paper-3)]" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map(item => (
            <div key={item} className="sw-panel h-24 animate-pulse" />
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map(item => (
          <div key={item} className="sw-card space-y-4 p-5">
            <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--color-paper-3)]" />
            <div className="h-56 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-paper-3)]" />
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(metric => (
                <div key={metric} className="h-14 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-paper-3)]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
