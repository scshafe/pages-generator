const isVerbose = process.env.NODE_ENV !== "production";

export function logInfo(message: string, payload?: unknown) {
  if (!isVerbose) return;
  if (payload) {
    console.info(message, payload);
  } else {
    console.info(message);
  }
}

export function logError(message: string, payload?: unknown) {
  if (payload) {
    console.error(message, payload);
  } else {
    console.error(message);
  }
}
