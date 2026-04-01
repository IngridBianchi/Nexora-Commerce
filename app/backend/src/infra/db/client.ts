import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"
import * as AWSXRay from "aws-xray-sdk-core"
import { env } from "../../config/env"

const rawClient = new DynamoDBClient({
  region: env.awsRegion
})

// Instrument with X-Ray when running in Lambda (AWS_LAMBDA_FUNCTION_NAME is set).
// Falls back to untraced client in local test environments.
const tracedClient =
  process.env["AWS_LAMBDA_FUNCTION_NAME"]
    ? AWSXRay.captureAWSv3Client(rawClient as never)
    : rawClient

export const db = DynamoDBDocumentClient.from(tracedClient as DynamoDBClient, {
  marshallOptions: {
    removeUndefinedValues: true
  }
})
