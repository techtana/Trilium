import { createPortal } from "preact/compat";
import { useState, useRef } from "preact/hooks";
import Modal from "../../../react/Modal";
import FormGroup from "../../../react/FormGroup";
import FormSelect from "../../../react/FormSelect";
import FormTextBox from "../../../react/FormTextBox";
import { t } from "../../../../services/i18n";

export interface LlmProviderConfig {
    id: string;
    name: string;
    provider: string;
    apiKey: string;
    /** Base URL for local providers such as Ollama */
    baseUrl?: string;
}

export interface ProviderType {
    id: string;
    name: string;
    /** Whether this provider uses a local server URL instead of an API key */
    isLocal?: boolean;
}

export const PROVIDER_TYPES: ProviderType[] = [
    { id: "anthropic", name: "Anthropic" },
    { id: "openai", name: "OpenAI" },
    { id: "google", name: "Google Gemini" },
    { id: "ollama", name: "Ollama (local)", isLocal: true }
];

interface AddProviderModalProps {
    show: boolean;
    onHidden: () => void;
    onSave: (provider: LlmProviderConfig) => void;
}

const DEFAULT_OLLAMA_URL = "http://localhost:11434";

export default function AddProviderModal({ show, onHidden, onSave }: AddProviderModalProps) {
    const [selectedProvider, setSelectedProvider] = useState(PROVIDER_TYPES[0].id);
    const [apiKey, setApiKey] = useState("");
    const [baseUrl, setBaseUrl] = useState(DEFAULT_OLLAMA_URL);
    const formRef = useRef<HTMLFormElement>(null);

    const providerType = PROVIDER_TYPES.find(p => p.id === selectedProvider);
    const isLocal = providerType?.isLocal ?? false;
    const canSubmit = isLocal ? baseUrl.trim().length > 0 : apiKey.trim().length > 0;

    function handleProviderChange(id: string) {
        setSelectedProvider(id);
        // Reset fields when switching providers
        setApiKey("");
        setBaseUrl(DEFAULT_OLLAMA_URL);
    }

    function handleSubmit() {
        if (!canSubmit) {
            return;
        }

        const newProvider: LlmProviderConfig = {
            id: `${selectedProvider}_${Date.now()}`,
            name: providerType?.name || selectedProvider,
            provider: selectedProvider,
            apiKey: isLocal ? "" : apiKey.trim(),
            ...(isLocal ? { baseUrl: baseUrl.trim() } : {})
        };

        onSave(newProvider);
        resetForm();
        onHidden();
    }

    function resetForm() {
        setSelectedProvider(PROVIDER_TYPES[0].id);
        setApiKey("");
        setBaseUrl(DEFAULT_OLLAMA_URL);
    }

    function handleCancel() {
        resetForm();
        onHidden();
    }

    return createPortal(
        <Modal
            show={show}
            onHidden={handleCancel}
            onSubmit={handleSubmit}
            formRef={formRef}
            title={t("llm.add_provider_title")}
            className="add-provider-modal"
            size="md"
            footer={
                <>
                    <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                        {t("llm.cancel")}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
                        {t("llm.add_provider")}
                    </button>
                </>
            }
        >
            <FormGroup name="provider-type" label={t("llm.provider_type")}>
                <FormSelect
                    values={PROVIDER_TYPES}
                    keyProperty="id"
                    titleProperty="name"
                    currentValue={selectedProvider}
                    onChange={handleProviderChange}
                />
            </FormGroup>

            {isLocal ? (
                <FormGroup name="base-url" label={t("llm.ollama_url")}>
                    <FormTextBox
                        type="text"
                        currentValue={baseUrl}
                        onChange={setBaseUrl}
                        placeholder={t("llm.ollama_url_placeholder")}
                        autoFocus
                    />
                </FormGroup>
            ) : (
                <FormGroup name="api-key" label={t("llm.api_key")}>
                    <FormTextBox
                        type="password"
                        currentValue={apiKey}
                        onChange={setApiKey}
                        placeholder={t("llm.api_key_placeholder")}
                        autoFocus
                    />
                </FormGroup>
            )}
        </Modal>,
        document.body
    );
}
