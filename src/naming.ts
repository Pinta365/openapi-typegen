/** Convert snake_case and kebab-case to camelCase (e.g. "user_name" → "userName", "security-advisory" → "securityAdvisory"). */
export function toCamelCase(str: string): string {
    return str
        .replace(/[-_]([a-z])/g, (_, letter: string) => letter.toUpperCase())
        .replace(/[-_]([A-Z])/g, (_, letter: string) => letter);
}

/** Convert to PascalCase for type names (e.g. "user_name" → "UserName", "security-advisory-ecosystems" → "SecurityAdvisoryEcosystems"). Hyphens and underscores are treated as word boundaries so output is a valid TypeScript identifier. */
export function toPascalCase(str: string): string {
    const camel = toCamelCase(str);
    return camel.length ? camel.charAt(0).toUpperCase() + camel.slice(1) : "";
}
