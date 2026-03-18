export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-6 w-44 bg-gray-200 rounded" />
          <div className="h-4 w-72 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-64 bg-gray-100 rounded-md hidden md:block" />
      </div>

      {/* Chart skeleton */}
      <div className="h-48 bg-gray-100 rounded-lg" />

      {/* Pipeline columns skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-5 w-28 bg-gray-200 rounded" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-20 bg-gray-100 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
