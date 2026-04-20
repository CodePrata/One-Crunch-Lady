export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-20">
      <section className="impact-border rounded-xl bg-hero-yellow p-8 md:p-12">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-cookie-brown">
          One Crunch Lady
        </p>
        <h1 className="font-display text-5xl uppercase leading-tight text-power-red md:text-7xl">
          Manga-style cookie shop
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-cookie-brown">
          Next.js foundation is ready. Build your products, ordering flow, and
          checkout experience from here.
        </p>
      </section>
    </main>
  );
}
