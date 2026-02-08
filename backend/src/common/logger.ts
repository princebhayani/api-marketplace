export const logger = {
  info: (msg: string, meta?: unknown) => console.log(msg, meta ?? ""),
  error: (msg: string, meta?: unknown) => {
    try {
      if (meta instanceof Error) {
        console.error(msg, meta.stack || meta.message);
      } else {
        console.error(msg, meta ?? "");
      }
    } catch (e) {
      console.error(msg, "[Logger Error] Failed to log error details");
    }
  },
  warn: (msg: string, meta?: unknown) => console.warn(msg, meta ?? ""),
};

