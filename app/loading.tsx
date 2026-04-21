export default function Loading() {
  return (
    <main className="pt-10">
      <section className="responsive-shell px-4 pb-10 tablet:px-6 desktop:px-8">
        <div className="mb-5 h-10 w-52 animate-pulse rounded bg-cookie-brown/20" />

        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border-2 border-cookie-brown bg-flour-white p-4"
            >
              <div className="mb-4 aspect-[4/3] animate-pulse rounded-lg bg-cookie-brown/15" />
              <div className="h-8 w-3/4 animate-pulse rounded bg-cookie-brown/20" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-cookie-brown/15" />
              <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-cookie-brown/15" />
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="h-10 w-20 animate-pulse rounded bg-hero-yellow/60" />
                <div className="h-11 w-28 animate-pulse rounded bg-cookie-brown/20" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
