/**
 * Zukan Loading State
 * 
 * Displays an instant loading skeleton while fetching Akyo data.
 * Uses React Suspense boundary automatically.
 */

export default function ZukanLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-50 p-4 sm:p-6 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          
          {/* Search Bar Skeleton */}
          <div className="w-full h-12 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
      </header>

      {/* Content Skeleton */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Filter Section Skeleton */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6">
          <div className="flex flex-wrap gap-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-8 w-24 bg-gray-200 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              ></div>
            ))}
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="flex gap-4">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Cards Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Image Skeleton */}
              <div className="aspect-[3/2] bg-gray-200"></div>
              
              {/* Content Skeleton */}
              <div className="p-4 space-y-3">
                <div className="h-6 w-3/4 bg-gray-200 rounded"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Loading Indicator */}
      <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-full shadow-lg p-4 flex items-center gap-3 z-50">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-500"></div>
        <span className="text-sm font-medium text-gray-700">読み込み中...</span>
      </div>
    </div>
  );
}
