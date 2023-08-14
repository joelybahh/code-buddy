import path from "path";
import { CodeBuddyConfig, ConfigLoadError, PackageJson } from "../types/index.js";

export async function loadConfig(): Promise<CodeBuddyConfig> {
    try {
        const config = await import(path.resolve(process.cwd(), "cb.config.js"));
        return config.default;
    } catch (error) {
        throw new ConfigLoadError("Error loading configuration file: " + error.message);
    }
}

export async function loadPackageJson(): Promise<PackageJson> {
    try {
        const packageJson = await import(path.resolve(process.cwd(), "package.json"), {
            assert: { type: "json" },
        });
        return packageJson.default;
    } catch (error) {
        throw new ConfigLoadError("Error loading package.json file: " + error.message);
    }
}
