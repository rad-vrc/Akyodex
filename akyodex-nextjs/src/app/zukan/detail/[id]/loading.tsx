/**
 * Akyo Detail Loading State
 * 
 * Displays loading skeleton while fetching individual Akyo data.
 */

export default function DetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Button Skeleton */}
        <div className="mb-6">
          <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>

        {/* Main Card Skeleton */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 sm:p-8">
            {/* Image Skeleton */}
            <div className="space-y-4">
              <div className="aspect-[3/2] bg-gray-200 rounded-2xl animate-pulse"></div>
              <div className="flex gap-2">
                <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>

            {/* Info Skeleton */}
            <div className="space-y-6">
              {/* ID Badge */}
              <div className="h-8 w-24 bg-gray-200 rounded-full animate-pulse"></div>

              {/* Title */}
              <div className="h-10 w-3/4 bg-gray-200 rounded-lg animate-pulse"></div>

              {/* Attributes */}
              <div className="space-y-2">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="flex flex-wrap gap-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-8 w-24 bg-gray-200 rounded-full animate-pulse"
                      style={{ animationDelay: `${i * 100}ms` }}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Creator */}
              <div className="space-y-2">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>

              {/* VRChat Link */}
              <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse"></div>

              {/* Notes */}
              <div className="space-y-2">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-16 w-full bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Akyos Skeleton */}
        <div className="mt-12">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-6"></div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="aspect-[3/2] bg-gray-200"></div>
                <div className="p-3 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                  <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-full shadow-lg p-4 flex items-center gap-3 z-50">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-500"></div>
        <span className="text-sm font-medium text-gray-700">読み込み中...</span>
      </div>
    </div>
  );
}
