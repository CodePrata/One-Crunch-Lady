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
