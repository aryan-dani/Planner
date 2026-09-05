export function devLog(...args: unknown[]) {
  if (process.env.NODE_ENV !== "production") console.log(...args);
}
