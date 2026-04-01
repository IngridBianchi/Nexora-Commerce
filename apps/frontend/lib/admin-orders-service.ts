import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb"

export interface AdminOrderSummary {
  orderId: string
  email: string
  name: string
  status: string
  total: number
  createdAt: string | null
  itemCount: number
}

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" }),
  { marshallOptions: { removeUndefinedValues: true } }
)

export async function listAdminOrders(tableName: string): Promise<AdminOrderSummary[]> {
  const result = await client.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: "begins_with(PK, :prefix)",
      ExpressionAttributeValues: { ":prefix": "ORDER#" },
      Limit: 100
    })
  )

  const orders = (result.Items ?? []).map((item) => ({
    orderId: item.orderId ?? item.PK?.replace("ORDER#", ""),
    email: item.email ?? "",
    name: item.name ?? "",
    status: item.status ?? "UNKNOWN",
    total: item.total ?? 0,
    createdAt: item.createdAt ?? null,
    itemCount: Array.isArray(item.items) ? item.items.length : 0
  }))

  orders.sort((a, b) => {
    if (!a.createdAt) return 1
    if (!b.createdAt) return -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return orders
}
