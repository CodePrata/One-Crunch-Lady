import Image from "next/image";
import AddToCartButton from "@/components/features/AddToCartButton";
import ProductDetail from "@/components/features/ProductDetail";
import { getOptimizedImage } from "@/lib/cloudinary";

interface ProductCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  category: string | null;
  ingredients: string[];
  isAvailable: boolean;
}

function ProductPlaceholder({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      aria-label={`${name} placeholder`}
      role="img"
      className="h-full w-full"
    >
      <rect x="0" y="0" width="400" height="300" fill="#FAFAFA" />
      <rect
        x="20"
        y="20"
        width="360"
        height="260"
        rx="24"
        fill="#FFD700"
        stroke="#8D6E63"
        strokeWidth="10"
      />
      <text
        x="200"
        y="185"
        textAnchor="middle"
        style={{
          fontFamily: "var(--font-bangers), Impact, sans-serif",
          fontSize: 140,
          fill: "#8D6E63",
        }}
      >
        {name.charAt(0).toUpperCase()}
      </text>
    </svg>
  );
}

export default function ProductCard({
  id,
  name,
  description,
  price,
  imageUrl,
  category,
  ingredients,
  isAvailable,
}: ProductCardProps) {
  const shortDescription = description.length > 95 ? `${description.slice(0, 92)}...` : description;

  return (
    <article className="relative flex h-full flex-col rounded-xl border-[3px] border-cookie-brown bg-flour-white p-4">
      {!isAvailable ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-cookie-brown/85">
          <span className="rounded-md border-2 border-flour-white bg-power-red px-4 py-2 font-display text-3xl uppercase text-flour-white">
            Sold Out
          </span>
        </div>
      ) : null}

      <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-xl border-2 border-cookie-brown bg-flour-white">
        {imageUrl ? (
          <Image
            src={getOptimizedImage(imageUrl)}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
          />
        ) : (
          <ProductPlaceholder name={name} />
        )}
      </div>

      {category ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-cookie-brown/60">
          {category}
        </p>
      ) : null}

      <div className="mt-1 flex items-start justify-between gap-3">
        <h3 className="font-display text-3xl uppercase leading-none text-cookie-brown">{name}</h3>
        <p className="shrink-0 pt-0.5 text-lg font-extrabold text-cookie-brown">
          ${price.toFixed(2)}
        </p>
      </div>

      <p className="mt-2 flex-1 text-sm leading-relaxed text-cookie-brown">{shortDescription}</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <ProductDetail
          id={id}
          name={name}
          description={description}
          price={price}
          imageUrl={imageUrl}
          ingredients={ingredients}
          isAvailable={isAvailable}
        />
        <AddToCartButton productId={id} productName={name} isAvailable={isAvailable} />
      </div>
    </article>
  );
}
