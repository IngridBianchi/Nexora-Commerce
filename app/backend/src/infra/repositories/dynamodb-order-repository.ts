import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb"
import { OrderRecord } from "../../domain/order"
import { OrderWriter } from "../../application/ports/order-writer"
import { db } from "../db/client"

export class DynamoDbOrderRepository implements OrderWriter {
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
}
