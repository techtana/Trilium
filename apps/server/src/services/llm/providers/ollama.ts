import { createOpenAI } from "@ai-sdk/openai";
import type { ToolSet } from "ai";

import { BaseProvider } from "./base_provider.js";
import type { ModelInfo, ModelPricing } from "../types.js";
import log from "../../log.js";

const FREE_PRICING: ModelPricing = { input: 0, output: 0 };

export class OllamaProvider extends BaseProvider {
    name = "ollama";
    protected defaultModel = "";
    protected titleModel = "";
    protected availableModels: ModelInfo[] = [];
    protected modelPricing: Record<string, ModelPricing> = {};

    private baseUrl: string;
    private openaiCompat;
    private modelsReady: Promise<void>;

    constructor(baseUrl: string) {
        super();
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.openaiCompat = createOpenAI({
            baseURL: `${this.baseUrl}/v1`,
            // Ollama doesn't require a real API key but the SDK requires a non-empty string
            apiKey: "ollama"
        });
        this.modelsReady = this.fetchModels();
    }

    private async fetchModels(): Promise<void> {
        try {
            const res = await fetch(`${this.baseUrl}/api/tags`);
            if (!res.ok) {
                log.error(`Ollama: failed to fetch models (${res.status})`);
                return;
            }
            const data = (await res.json()) as { models?: { name: string; details?: { parameter_size?: string } }[] };
            const rawModels = data.models ?? [];

            this.availableModels = rawModels.map((m, i) => ({
                id: m.name,
                name: m.details?.parameter_size ? `${m.name} (${m.details.parameter_size})` : m.name,
                pricing: FREE_PRICING,
                isDefault: i === 0,
                costMultiplier: 0
            }));

            this.modelPricing = Object.fromEntries(this.availableModels.map(m => [m.id, FREE_PRICING]));

            if (this.availableModels.length > 0) {
                this.defaultModel = this.availableModels[0].id;
                this.titleModel = this.availableModels[0].id;
            }
        } catch (e) {
            log.error(`Ollama: error fetching models from ${this.baseUrl}: ${e}`);
        }
    }

    /** Await model population before use. Called by the provider index for async model listing. */
    async getAvailableModelsAsync(): Promise<ModelInfo[]> {
        await this.modelsReady;
        return this.availableModels;
    }

    protected createModel(modelId: string) {
        return this.openaiCompat(modelId);
    }

    protected override addWebSearchTool(_tools: ToolSet): void {
        // Ollama models do not have a built-in web search tool
    }
}
