export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-40 bg-muted rounded animate-pulse" />
        <div className="h-4 w-72 bg-muted rounded animate-pulse" />
      </div>
      <div className="h-16 bg-muted/60 rounded-lg animate-pulse" />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 bg-muted/60 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3 h-[420px] bg-muted/60 rounded-lg animate-pulse" />
        <div className="lg:col-span-1 h-[420px] bg-muted/60 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
