import http from "k6/http"
import { check } from "k6"

export const options = {
  scenarios: {
    burst_errors: {
      executor: "constant-arrival-rate",
      duration: "20s",
      rate: 20,
      timeUnit: "1s",
      preAllocatedVUs: 20,
      maxVUs: 50
    }
  },
  thresholds: {
    http_req_failed: ["rate<0.20"],
    http_req_duration: ["p(95)<1500"]
  }
}

const baseUrl = __ENV.BASE_URL || "https://bhyrxu22xc.execute-api.us-east-1.amazonaws.com/dev"

export default function () {
  const badOrder = JSON.stringify({
    name: "x",
    email: "not-an-email",
    address: "bad",
    items: []
  })

  const res = http.post(`${baseUrl}/orders`, badOrder, {
    headers: { "Content-Type": "application/json" }
  })

  check(res, {
    "returns validation status": (r) => r.status === 400 || r.status === 422
  })
}
