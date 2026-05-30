function envFlag(value: string | undefined) {
  return value === "true" || value === "1";
}

export function isPaperDeskEnabled() {
  return envFlag(process.env.NEXT_PUBLIC_ENABLE_PAPER_DESK);
}
