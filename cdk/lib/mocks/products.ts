export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
}

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "MacBook Pro 16",
    description: "Powerful laptop for professionals",
    price: 2499,
    image: "macbook-pro.jpg",
  },
  {
    id: "2",
    name: "iPhone 15",
    description: "Latest iPhone with advanced features",
    price: 999,
    image: "iphone-15.jpg",
  },
  {
    id: "3",
    name: "iPad Air",
    description: "Versatile and powerful tablet",
    price: 599,
    image: "ipad-air.jpg",
  },
  {
    id: "4",
    name: "AirPods Pro",
    description: "Wireless earbuds with noise cancellation",
    price: 249,
    image: "airpods-pro.jpg",
  },
  {
    id: "5",
    name: "Apple Watch",
    description: "Smartwatch for iOS users",
    price: 399,
    image: "apple-watch.jpg",
  },
];
