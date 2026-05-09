/** UUID del proyecto Builderbot (panel / MCP). Público solo si usás prefijo NEXT_PUBLIC_. */
export function getBuilderbotProjectId(): string | undefined {
  const v = process.env.NEXT_PUBLIC_BUILDERBOT_PROJECT_ID || process.env.BUILDERBOT_PROJECT_ID;
  return v?.trim() || undefined;
}
