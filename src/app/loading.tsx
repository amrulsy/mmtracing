export default function Loading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Hero skeleton */}
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6 px-4">
          <div className="h-6 w-48 bg-surface-hover rounded-full mx-auto" />
          <div className="h-12 w-96 max-w-full bg-surface-hover rounded-xl mx-auto" />
          <div className="h-6 w-72 max-w-full bg-surface-hover rounded-lg mx-auto" />
          <div className="flex gap-3 justify-center">
            <div className="h-12 w-40 bg-surface-hover rounded-xl" />
            <div className="h-12 w-40 bg-surface-hover rounded-xl" />
          </div>
        </div>
      </div>
      {/* Stats skeleton */}
      <div className="py-16 bg-primary/10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-8 w-16 bg-surface-hover rounded mx-auto" />
              <div className="h-4 w-24 bg-surface-hover rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
