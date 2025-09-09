import React from "react";
import Card from "./primitives/Card";
import Labeled from "./primitives/Labeled";
import { useSettings } from "../context/SettingsContext";

function Tag({ children }) {
  return (
    <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700">
      {children}
    </span>
  );
}

function ModelCard({ title, subtitle, tags = [], selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left border rounded-xl p-3 hover:bg-gray-50 transition",
        selected ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50/40" : "border-gray-200"
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{title}</div>
          {subtitle && <div className="text-xs text-gray-600 mt-0.5">{subtitle}</div>}
        </div>
        <div className="flex gap-1 flex-wrap">
          {tags.map((t, i) => <Tag key={i}>{t}</Tag>)}
        </div>
      </div>
    </button>
  );
}

export default function SettingsMenu() {
  // Pull everything we might need; fall back if your SettingsContext doesn’t yet expose compat baseURL.
  const settings = useSettings();
  const {
    provider, setProvider,
    model, setModel,
    openaiKey, setOpenaiKey,
    topK, setTopK,
    maxContext, setMaxContext,
    maxOutputTokens, setMaxOutputTokens,
    historyLimit, setHistoryLimit,
    temperature, setTemperature,
    openaiBaseUrl = "",          // optional in context
    setOpenaiBaseUrl             // optional setter
  } = settings;

  // Always require the user to enter the API key; do not pre-fill from persistent storage

  const isOpenAI = provider === "openai";
  const isOllama = provider === "ollama";
  const isCompat = provider === "openai_compat";

  // Curated OpenAI options (feel free to tweak for your account)
  const curated = [
    {
      id: "gpt-4o-mini",
      title: "gpt-4o-mini",
      subtitle: "Lightweight multimodal, great price for most RAG chats.",
      tags: ["cheapest", "fast", "solid quality"]
    },
    {
      id: "gpt-4.1",
      title: "gpt-4.1",
      subtitle: "Stronger reasoning for tougher questions and synthesis.",
      tags: ["best performance", "reasoning"]
    }
  ];

  return (
    <div className="space-y-6">
      {/* LLM SETTINGS */}
      <Card title="LLM Settings">
        <div className="text-xs text-gray-600 mb-3">
          Choose a provider and model for generation. Temperature adds randomness; Max tokens caps the model’s output size.
        </div>

        {/* Provider */}
        <Labeled label="Provider">
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setModel(e.target.value === "ollama" ? "llama3:latest" : "gpt-4o-mini");
            }}
          >
            <option value="ollama">Ollama (local)</option>
            <option value="openai">OpenAI</option>
            {/* <option value="openai_compat">OpenAI-Compatible</option> */}
          </select>
        </Labeled>

        {/* OpenAI creds */}
        {isOpenAI && (
          <Labeled label="OpenAI API Key">
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              type="password"
            />
          </Labeled>
        )}


        {/* OpenAI-Compatible creds */}
        {isCompat && (
          <>
            <Labeled label="API Key">
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="Your provider’s API key"
              />
            </Labeled>
            <Labeled label="Base URL">
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={openaiBaseUrl}
                onChange={(e) => (typeof setOpenaiBaseUrl === "function" ? setOpenaiBaseUrl(e.target.value) : null)}
                placeholder="https://your-compat-host/v1"
                disabled={typeof setOpenaiBaseUrl !== "function"}
                title={typeof setOpenaiBaseUrl !== "function" ? "Add openaiBaseUrl to SettingsContext to enable editing" : ""}
              />
            </Labeled>
            <div className="text-xs text-gray-500 -mt-2 mb-2">
              Use any OpenAI-compatible endpoint (e.g., local gateway, hosted proxy). Must expose the /v1 schema.
            </div>
          </>
        )}

        {/* Model picker */}
        {isOpenAI && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {curated.map((m) => (
                <ModelCard
                  key={m.id}
                  title={m.title}
                  subtitle={m.subtitle}
                  tags={m.tags}
                  selected={model === m.id}
                  onClick={() => setModel(m.id)}
                />
              ))}
            </div>
            <div className="mt-2">
              <Labeled label="Model (override)">
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                />
              </Labeled>
            </div>
          </>
        )}
        {isOllama && (
          <Labeled label="Model">
            <input
              className="w-full border rounded-lg px-3 py-2"
              value="llama3:latest"
              disabled
              placeholder="llama3:latest"
            />
          </Labeled>
        )}

        {/* Temperature & Max tokens (LLM) */}
        <div className="grid grid-cols-2 gap-2">
          <Labeled label="Temperature">
            <input
              type="number"
              step="0.1"
              min={0}
              max={2}
              className="w-full border rounded-lg px-3 py-2"
              value={Number.isFinite(temperature) ? temperature : 0}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </Labeled>
          <Labeled label="Max Context">
            <input
              type="number"
              min={1}
              className="w-full border rounded-lg px-3 py-2"
              value={Number.isFinite(maxContext) ? maxContext : 10}
              onChange={(e) => setMaxContext(Number(e.target.value))}
              placeholder="e.g., 1024"
            />
          </Labeled>
          <Labeled label="Max Output Tokens">
            <input
              type="number"
              min={1}
              className="w-full border rounded-lg px-3 py-2"
              value={Number.isFinite(maxOutputTokens) ? maxOutputTokens : 1024}
              onChange={(e) => setMaxOutputTokens(Number(e.target.value))}
              placeholder="e.g., 1024"
            />
          </Labeled>
        </div>
      </Card>

      {/* RAG / SEARCH SETTINGS */}
      <Card title="RAG Settings">
        <div className="text-xs text-gray-600 mb-3">
          Retrieval controls how many chunks you fetch and how much chat history you include before asking the LLM.
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Labeled label="Top-K (chunks)">
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
            />
          </Labeled>
          <Labeled label="History limit (messages)">
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2"
              value={historyLimit}
              onChange={(e) => setHistoryLimit(Number(e.target.value))}
            />
          </Labeled>
          <div className="flex items-end">
            <div className="text-xs text-gray-500">
              Tip: start with Top-K 6–10; increase only if answers miss context.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
