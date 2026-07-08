const SORT_VALUES = new Set([
    "cheap",
    "expensive",
    "popular",
    "new",
    "ctx",
    "throughput",
    "latency"
]);
export function parseNumericSuffix(value) {
    const lower = value.toLowerCase();
    if (lower.endsWith("m")) return parseFloat(lower.slice(0, -1)) * 1_000_000;
    if (lower.endsWith("k")) return parseFloat(lower.slice(0, -1)) * 1_000;
    return parseFloat(value);
}
export function parseRange(value, bareDefault) {
    if (value.includes("..")) {
        const dotIdx = value.indexOf("..");
        const minStr = value.slice(0, dotIdx);
        const maxStr = value.slice(dotIdx + 2);
        return {
            min: minStr ? parseNumericSuffix(minStr) : undefined,
            max: maxStr ? parseNumericSuffix(maxStr) : undefined
        };
    }
    const num = parseNumericSuffix(value);
    return bareDefault === "max" ? {
        max: num
    } : {
        min: num
    };
}
export function parseTokens(args) {
    const command = args[0] ?? "list";
    if (command === "compare") {
        return {
            command: "compare",
            models: args.slice(1)
        };
    }
    if (command === "refresh") {
        return {
            command: "refresh"
        };
    }
    if (command === "tasks") {
        return {
            command: "tasks",
            tag: args[1] ?? null
        };
    }
    const isRecommend = command === "recommend";
    const tokens = args.slice(1);
    const constraints = {};
    let sort = "new";
    let top = isRecommend ? 3 : 20;
    let preset = "coding";
    for (const token of tokens){
        const colonIdx = token.indexOf(":");
        if (colonIdx === -1) continue;
        const key = token.slice(0, colonIdx);
        const value = token.slice(colonIdx + 1);
        switch(key){
            case "sort":
                if (SORT_VALUES.has(value)) sort = value;
                break;
            case "price":
                constraints.price = parseRange(value, "max");
                break;
            case "ctx":
                constraints.context = parseRange(value, "min");
                break;
            case "out":
                constraints.output = parseRange(value, "min");
                break;
            case "cap":
                constraints.capabilities = value.split(",").map((s)=>s.trim());
                break;
            case "in":
                constraints.input_modalities = value.split(",").map((s)=>s.trim());
                break;
            case "gen":
                constraints.output_modalities = value.split(",").map((s)=>s.trim());
                break;
            case "open":
                constraints.open_source = value === "true";
                break;
            case "top":
                top = parseInt(value, 10);
                break;
            case "preset":
                preset = value;
                break;
        }
    }
    if (isRecommend) {
        return {
            command: "recommend",
            top,
            preset,
            constraints
        };
    }
    return {
        command: "list",
        top,
        sort,
        constraints
    };
}
