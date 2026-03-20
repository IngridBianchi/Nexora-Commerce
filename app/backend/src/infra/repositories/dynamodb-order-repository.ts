import { PutCommand } from "@aws-sdk/lib-dynamodb"
import { OrderRecord } from "../../domain/order"
import { OrderWriter } from "../../application/ports/order-writer"
import { db } from "../db/client"

export class DynamoDbOrderRepository implements OrderWriter {
  constructor(private readonly tableName: string) {}

  async create(order: OrderRecord): Promise<void> {
    await db.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `ORDER#${order.orderId}`,
          SK: `USER#${order.email}`,
          ...order
        },
        ConditionExpression: "attribute_not_exists(PK)"
      })
    )
  }
}
