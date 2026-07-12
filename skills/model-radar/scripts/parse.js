const SORT_VALUES = new Set([
    "cheap",
    "expensive",
    "popular",
    "new",
    "ctx",
    "throughput",
    "latency"
]);
const COMMAND_VALUES = new Set(["list", "recommend", "compare", "tasks", "refresh"]);
export function parseNumericSuffix(value) {
    const lower = value.toLowerCase();
    const match = lower.match(/^(\d+(?:\.\d+)?)([kmb])?$/);
    if (!match) throw new Error(`Invalid numeric value: ${value}`);
    const number = Number(match[1]);
    const multiplier = {
        k: 1_000,
        m: 1_000_000,
        b: 1_000_000_000
    }[match[2]] ?? 1;
    const result = number * multiplier;
    if (!Number.isFinite(result)) throw new Error(`Invalid numeric value: ${value}`);
    return result;
}
export function parseRange(value, bareDefault) {
    if (value.includes("..")) {
        if (value.indexOf("..") !== value.lastIndexOf("..")) {
            throw new Error(`Invalid range: ${value}`);
        }
        const dotIdx = value.indexOf("..");
        const minStr = value.slice(0, dotIdx);
        const maxStr = value.slice(dotIdx + 2);
        if (!minStr && !maxStr) throw new Error(`Invalid range: ${value}`);
        const range = {
            min: minStr ? parseNumericSuffix(minStr) : undefined,
            max: maxStr ? parseNumericSuffix(maxStr) : undefined
        };
        if (range.min !== undefined && range.max !== undefined && range.min > range.max) {
            throw new Error(`Range minimum exceeds maximum: ${value}`);
        }
        return range;
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
    if (!COMMAND_VALUES.has(command)) throw new Error(`Unknown command: ${command}`);
    if (command === "compare") {
        if (args.length < 3) throw new Error("compare requires at least two models");
        return {
            command: "compare",
            models: args.slice(1)
        };
    }
    if (command === "refresh") {
        if (args.length > 1) throw new Error("refresh does not accept arguments");
        return {
            command: "refresh"
        };
    }
    if (command === "tasks") {
        if (args.length > 2) throw new Error("tasks accepts at most one tag");
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
        if (colonIdx <= 0 || colonIdx === token.length - 1) {
            throw new Error(`Invalid token: ${token}`);
        }
        const key = token.slice(0, colonIdx);
        const value = token.slice(colonIdx + 1);
        switch(key){
            case "sort":
                if (!SORT_VALUES.has(value)) throw new Error(`Invalid sort: ${value}`);
                sort = value;
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
                constraints.capabilities = parseList(value, key);
                break;
            case "in":
                constraints.input_modalities = parseList(value, key);
                break;
            case "gen":
                constraints.output_modalities = parseList(value, key);
                break;
            case "hf":
            case "open":
                if (value !== "true" && value !== "false") {
                    throw new Error(`${key} must be true or false`);
                }
                constraints.hugging_face_listed = value === "true";
                break;
            case "top":
                if (!/^\d+$/.test(value) || Number(value) < 1) {
                    throw new Error("top must be a positive integer");
                }
                top = Number(value);
                break;
            case "preset":
                preset = value;
                break;
            default:
                throw new Error(`Unknown token: ${key}`);
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

function parseList(value, key) {
    const items = value.split(",").map((item)=>item.trim());
    if (items.some((item)=>!item)) throw new Error(`Invalid ${key} list: ${value}`);
    return items;
}
