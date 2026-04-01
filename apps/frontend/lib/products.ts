import { Product } from "./types"

export const productsCatalog: Product[] = [
  {
    id: "001",
    name: "Remera Nexora",
    description: "Remera de algodon con logo Nexora",
    price: 2500,
    imageUrl: "/remera.png",
    category: "Indumentaria",
    stock: 50
  },
  {
    id: "002",
    name: "Taza Nexora",
    description: "Taza ceramica blanca con logo Nexora",
    price: 1200,
    imageUrl: "/taza.png",
    category: "Accesorios",
    stock: 100
  },
  {
    id: "003",
    name: "Gorra Nexora",
    description: "Gorra negra ajustable con logo Nexora",
    price: 1800,
    imageUrl: "/gorra.png",
    category: "Accesorios",
    stock: 30
  }
]
