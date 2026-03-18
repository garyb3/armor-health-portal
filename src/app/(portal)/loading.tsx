export default function PortalLoading() {
  return (
    <div className="animate-pulse space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-72 bg-gray-100 rounded" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-lg" />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
