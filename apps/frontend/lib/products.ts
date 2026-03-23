import { Product } from "./types"

export const productsCatalog: Product[] = [
  {
    id: "bluetooth-headphones",
    name: "Auriculares Bluetooth",
    description: "Auriculares inalambricos con cancelacion de ruido",
    price: 59.99,
    imageUrl: "https://picsum.photos/300/200?random=1"
  },
  {
    id: "smartwatch-nexora",
    name: "Smartwatch Nexora",
    description: "Reloj inteligente con monitoreo de salud",
    price: 129.99,
    imageUrl: "https://picsum.photos/300/200?random=2"
  },
  {
    id: "notebook-ultralight",
    name: "Notebook Ultralight",
    description: "Laptop ligera con 16GB RAM y SSD 512GB",
    price: 999.99,
    imageUrl: "https://picsum.photos/300/200?random=3"
  }
]
