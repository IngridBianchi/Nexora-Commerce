import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb"
import { StoredStorefrontUser } from "@/lib/storefront-users"

const USERS_SK = "PROFILE"

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" }),
  { marshallOptions: { removeUndefinedValues: true } }
)

export function resolveStorefrontUsersTableName(): string {
  return process.env.STOREFRONT_USERS_TABLE ?? process.env.ORDERS_TABLE ?? "Products"
}

function getUserPk(email: string): string {
  return `USER#${email}`
}

export async function findStorefrontUserByEmailInDb(
  tableName: string,
  email: string
): Promise<StoredStorefrontUser | null> {
  const result = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK: getUserPk(email),
        SK: USERS_SK
      },
      ConsistentRead: true
    })
  )

  const item = result.Item
  if (!item) {
    return null
  }

  if (
    typeof item.email !== "string" ||
    typeof item.name !== "string" ||
    typeof item.passwordHash !== "string" ||
    typeof item.salt !== "string" ||
    typeof item.createdAt !== "string"
  ) {
    return null
  }

  return {
    email: item.email,
    name: item.name,
    passwordHash: item.passwordHash,
    salt: item.salt,
    createdAt: item.createdAt,
    emailVerifiedAt: typeof item.emailVerifiedAt === "string" ? item.emailVerifiedAt : null,
    emailVerificationTokenHash:
      typeof item.emailVerificationTokenHash === "string" ? item.emailVerificationTokenHash : null,
    emailVerificationExpiresAt:
      typeof item.emailVerificationExpiresAt === "string" ? item.emailVerificationExpiresAt : null,
    passwordResetTokenHash:
      typeof item.passwordResetTokenHash === "string" ? item.passwordResetTokenHash : null,
    passwordResetExpiresAt:
      typeof item.passwordResetExpiresAt === "string" ? item.passwordResetExpiresAt : null
  }
}

export async function saveStorefrontUserInDb(tableName: string, user: StoredStorefrontUser): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        PK: getUserPk(user.email),
        SK: USERS_SK,
        entityType: "USER",
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        salt: user.salt,
        createdAt: user.createdAt,
        emailVerifiedAt: user.emailVerifiedAt ?? null,
        emailVerificationTokenHash: user.emailVerificationTokenHash ?? null,
        emailVerificationExpiresAt: user.emailVerificationExpiresAt ?? null,
        passwordResetTokenHash: user.passwordResetTokenHash ?? null,
        passwordResetExpiresAt: user.passwordResetExpiresAt ?? null,
        updatedAt: new Date().toISOString()
      }
    })
  )
}

export async function createStorefrontUserInDb(
  tableName: string,
  user: StoredStorefrontUser
): Promise<"CREATED" | "ALREADY_EXISTS"> {
  try {
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: getUserPk(user.email),
          SK: USERS_SK,
          entityType: "USER",
          email: user.email,
          name: user.name,
          passwordHash: user.passwordHash,
          salt: user.salt,
          createdAt: user.createdAt,
          emailVerifiedAt: user.emailVerifiedAt ?? null,
          emailVerificationTokenHash: user.emailVerificationTokenHash ?? null,
          emailVerificationExpiresAt: user.emailVerificationExpiresAt ?? null,
          passwordResetTokenHash: user.passwordResetTokenHash ?? null,
          passwordResetExpiresAt: user.passwordResetExpiresAt ?? null,
          updatedAt: new Date().toISOString()
        },
        ConditionExpression: "attribute_not_exists(PK)"
      })
    )

    return "CREATED"
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: string }).name === "ConditionalCheckFailedException"
    ) {
      return "ALREADY_EXISTS"
    }

    throw error
  }
}
