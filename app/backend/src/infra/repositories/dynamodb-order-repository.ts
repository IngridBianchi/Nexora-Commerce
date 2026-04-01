import { QueryCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"
import { OrderRecord, OrderStatus } from "../../domain/order"
import { OrderStatusUpdater } from "../../application/ports/order-status-updater"
import { OrderWriter } from "../../application/ports/order-writer"
import { db } from "../db/client"

export class DynamoDbOrderRepository implements OrderWriter, OrderStatusUpdater {
  constructor(
    private readonly tableName: string,
    private readonly productsTableName: string
  ) {}

  async create(
    order: OrderRecord,
    stockReservations: Array<{ productId: string; quantity: number }>
  ): Promise<void> {
    const stockUpdates = stockReservations.map((reservation) => ({
      Update: {
        TableName: this.productsTableName,
        Key: {
          PK: `PRODUCT#${reservation.productId}`,
          SK: "DETAILS"
        },
        UpdateExpression: "SET stock = stock - :qty",
        ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK) AND stock >= :qty",
        ExpressionAttributeValues: {
          ":qty": reservation.quantity
        }
      }
    }))

    await db.send(
      new TransactWriteCommand({
        TransactItems: [
          ...stockUpdates,
          {
            Put: {
              TableName: this.tableName,
              Item: {
                PK: `ORDER#${order.orderId}`,
                SK: `USER#${order.email}`,
                ...order
              },
              ConditionExpression: "attribute_not_exists(PK)"
            }
          }
        ]
      })
    )
  }

  async updateStatusByOrderId(orderId: string, status: OrderStatus): Promise<"UPDATED" | "UNCHANGED" | "NOT_FOUND"> {
    const pk = `ORDER#${orderId}`

    const queryResult = await db.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": pk
        },
        Limit: 1
      })
    )

    const orderItem = queryResult.Items?.[0]
    if (!orderItem || typeof orderItem.SK !== "string") {
      return "NOT_FOUND"
    }

    if (orderItem.status === status) {
      return "UNCHANGED"
    }

    await db.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: pk,
          SK: orderItem.SK
        },
        UpdateExpression: "SET #status = :status",
        ExpressionAttributeNames: {
          "#status": "status"
        },
        ExpressionAttributeValues: {
          ":status": status
        }
      })
    )

    return "UPDATED"
  }
}
