import { homedir } from "os";
import { join } from "path";

export function resolveCacheDir(env = process.env, home = homedir()) {
    if (env.MODEL_RADAR_CACHE_DIR) return env.MODEL_RADAR_CACHE_DIR;
    if (env.MODEL_RADAR_DIR) return join(env.MODEL_RADAR_DIR, "cache");
    return join(env.XDG_CACHE_HOME ?? join(home, ".cache"), "model-radar");
}
