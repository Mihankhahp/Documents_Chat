import React, { createContext, useContext } from "react";
import useLocalStorage from "../hooks/useLocalStorage";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [provider, setProvider] = useLocalStorage("rag_provider", "ollama");
  const [model, setModel] = useLocalStorage("rag_model", "llama3:latest");
  const [openaiKey, setOpenaiKey] = React.useState(""); // Only in memory
  const [topK, setTopK] = useLocalStorage("rag_top_k", 12);
  const [maxContext, setMaxContext] = useLocalStorage("rag_max_context", 6);
  const [historyLimit, setHistoryLimit] = useLocalStorage("rag_history_limit", 12);
  const [temperature, setTemperature] = useLocalStorage("rag_temperature", 0.2);
  const [maxOutputTokens, setMaxOutputTokens] = useLocalStorage("rag_max_output_tokens", 1024);

  const value = {
    provider, setProvider,
    model, setModel,
    openaiKey, setOpenaiKey,
    topK, setTopK,
    maxContext, setMaxContext,
    historyLimit, setHistoryLimit,
    temperature, setTemperature,
    maxOutputTokens, setMaxOutputTokens
  };
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
