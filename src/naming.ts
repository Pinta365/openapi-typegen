export function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function toPascalCase(str: string): string {
    const camel = toCamelCase(str);
    return camel.length ? camel.charAt(0).toUpperCase() + camel.slice(1) : "";
}
