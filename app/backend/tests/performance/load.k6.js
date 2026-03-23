import http from "k6/http"
import { check, sleep } from "k6"

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1000"]
  }
}

const baseUrl = __ENV.BASE_URL || "https://bhyrxu22xc.execute-api.us-east-1.amazonaws.com/dev"

export default function () {
  const productsRes = http.get(`${baseUrl}/products?limit=3`)
  check(productsRes, {
    "products status is 200": (res) => res.status === 200
  })

  const payload = JSON.stringify({
    name: "Load Tester",
    email: `load-${__VU}-${__ITER}@example.com`,
    address: "Calle Load 123",
    items: [{ productId: "001", quantity: 1 }]
  })

  const orderRes = http.post(`${baseUrl}/orders`, payload, {
    headers: { "Content-Type": "application/json" }
  })

  check(orderRes, {
    "orders status is 201 or 409": (res) => res.status === 201 || res.status === 409
  })

  sleep(1)
}
