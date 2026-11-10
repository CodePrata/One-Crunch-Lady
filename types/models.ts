export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  imageUrl: string;
  ingredients: string[];
  isAvailable: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export enum OrderStatus {
  UNPAID = "UNPAID",
  PAID = "PAID",
  READY = "READY",
}

/** An image plus its real pixel size (needed to keep its aspect ratio). */
export interface BrandImage {
  url: string;
  width: number;
  height: number;
}

/**
 * Header logo pieces, admin-editable (site_branding, migration 017).
 * `mascot` is always resolved - the custom upload or the default
 * /header-logo.png. `wordmark: null` means show the "ONE CRUNCH LADY" text.
 */
export interface HeaderBranding {
  mascot: BrandImage;
  wordmark: BrandImage | null;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderItems: OrderItem[];
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
}
