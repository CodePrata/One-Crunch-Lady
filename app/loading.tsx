// Generic fallback for any async route lacking a more specific loading.tsx
// (admin pages, the order success page). The storefront home route has
// its own tailored one at app/(storefront)/loading.tsx - this one is
// deliberately content-agnostic rather than shaped like any one page.
export default function Loading() {
  return (
    <main className="flex min-h-[50vh] items-center justify-center px-4 py-20">
      <div
        className="h-10 w-10 animate-spin rounded-full border-[3px] border-cookie-brown border-r-transparent"
        role="status"
        aria-label="Loading"
      />
    </main>
  );
}
