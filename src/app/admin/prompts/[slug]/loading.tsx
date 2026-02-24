export default function PromptEditorLoading() {
  return (
    <div className="py-6" dir="rtl">
      {/* Top bar skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-gray-100 rounded-lg animate-pulse" />
          <div>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-28 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-10 w-36 bg-blue-100 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Scope/Language skeleton */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-gray-100 rounded animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Editor skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-96 w-full bg-gray-50 rounded-lg animate-pulse" />
        </div>
        <div>
          <div className="h-64 w-full bg-gray-50 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  )
}
