type LogLevel = "INFO" | "WARN" | "ERROR"

function writeStructuredLog(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ?? {})
  }

  const serialized = JSON.stringify(payload)
  if (level === "ERROR") {
    console.error(serialized)
    return
  }

  if (level === "WARN") {
    console.warn(serialized)
    return
  }

  console.info(serialized)
}

export function logInfo(message: string, context?: Record<string, unknown>): void {
  writeStructuredLog("INFO", message, context)
}

export function logError(message: string, context?: Record<string, unknown>): void {
  writeStructuredLog("ERROR", message, context)
}

export function emitMetric(
  name: string,
  value: number,
  dimensions: Record<string, string>
): void {
  const dimensionKeys = Object.keys(dimensions)

  const payload = {
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: "Nexora/Backend",
          Dimensions: [dimensionKeys],
          Metrics: [{ Name: name, Unit: "Count" }]
        }
      ]
    },
    ...dimensions,
    [name]: value
  }

  console.info(JSON.stringify(payload))
}
