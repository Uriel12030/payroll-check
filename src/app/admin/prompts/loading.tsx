export default function PromptsLoading() {
  return (
    <div className="py-6" dir="rtl">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-56 bg-gray-100 rounded animate-pulse mt-2" />
      </div>

      {/* Filter skeleton */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-5 bg-gray-100 rounded animate-pulse" />
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse mb-3" />
            <div className="h-3 w-48 bg-gray-50 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
