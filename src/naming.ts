/** Convert snake_case to camelCase (e.g. "user_name" → "userName"). */
export function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/** Convert snake_case to PascalCase (e.g. "user_name" → "UserName"). */
export function toPascalCase(str: string): string {
    const camel = toCamelCase(str);
    return camel.length ? camel.charAt(0).toUpperCase() + camel.slice(1) : "";
}
