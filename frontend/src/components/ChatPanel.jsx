import React, { useEffect, useRef, useState, useMemo } from "react";
import Card from "./primitives/Card";
import Button from "./primitives/Button";
import Labeled from "./primitives/Labeled";
import { chat, getConversation } from "../services/api";
import { useSettings } from "../context/SettingsContext";

/** Merge server-fetched messages with any locally-newer optimistic ones */
function mergeMessages(current, incoming) {
  const byId = new Map();
  const incomingNewest =
    incoming.length ? Math.max(...incoming.map(x => +new Date(x.at || 0))) : 0;

  incoming.forEach(m => {
    if (m && m.id) byId.set(m.id, m);
  });

  for (const m of current || []) {
    if (!m || !m.id || m.id === "loading") continue;
    if (!byId.has(m.id)) {
      const thisAt = +new Date(m.at || 0);
      // Keep local message if it's newer than what the server currently has
      if (thisAt > incomingNewest) byId.set(m.id, m);
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => +new Date(a.at || 0) - +new Date(b.at || 0)
  );
}

export default function ChatPanel({ userId, selectedDocIds, conversationId, setConversationId }) {
  const { provider, model, openaiKey, topK, maxContext, historyLimit, temperature, maxOutputTokens } = useSettings();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [convTitle, setConvTitle] = useState("");
  const scroller = useRef(null);

  // sequence guard for stale fetch results
  const loadSeqRef = useRef(0);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    const seq = ++loadSeqRef.current;

    // Avoid clobbering optimistic UI while sending
    if (busy) return;

    const load = async () => {
      if (!userId) return;
      setError("");
      if (!conversationId) { setMessages([]); setConvTitle(""); return; }
      try {
        const detail = await getConversation({ userId, conversationId });
        if (cancelled || seq !== loadSeqRef.current) return;

        setConvTitle(detail.title || "Conversation");
        const uiMsgs = (detail.messages || []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          at: m.created_at,
          sources: m.sources || [],
        }));

        setMessages(prev => mergeMessages(prev, uiMsgs));
      } catch (e) {
        if (!cancelled) setError(String(e.message || e));
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userId, conversationId, busy]);

  const send = async () => {
    const ask = query.trim();
    if (!ask) return;
    if (!userId) return setError("Sign in first.");
    if (!selectedDocIds?.length) return setError("Select at least one file.");

    setError("");

    const nowIso = new Date().toISOString();
    const userMsg = { id: crypto.randomUUID?.() || `user-${Date.now()}`, role: "user", content: ask, at: nowIso };
    const loadingMsg = { id: "loading", role: "assistant", content: "Assistant is thinking…", at: nowIso, loading: true };

    setMessages(ms => [...ms, userMsg, loadingMsg]);
    setBusy(true);
    setQuery("");

    try {
      const res = await chat({
        userId,
        query: ask,
        docIds: selectedDocIds,
        temperature,
        provider,
        model,
        historyLimit,
        conversationId,
        topK,
        maxContext,
        openaiKey,
        maxOutputTokens,
      });

      setMessages(ms => {
        const filtered = ms.filter(m => m.id !== "loading");
        const assistantMsg = {
          id: res.id || crypto.randomUUID?.() || `asst-${Date.now()}`,
          role: "assistant",
          content: res.response,
          at: new Date().toISOString(),
          sources: res.sources || [],
        };
        return [...filtered, assistantMsg];
      });

      if (!conversationId && res.conversation_id) setConversationId(res.conversation_id);
    } catch (e) {
      setMessages(ms => ms.filter(m => m.id !== "loading"));
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const placeholder = selectedDocIds?.length
    ? `Ask about ${selectedDocIds.length} selected document(s)…`
    : "Ask about your documents…";

  // --- Sources panel helpers ---
  const latestAssistantWithSources = useMemo(() => {
    if (!messages || !Array.isArray(messages)) return null;
    const assistantMessagesWithSources = messages
      .filter((m) => m.role === "assistant" && m.sources && m.sources.length)
      .sort((a, b) => new Date(a.at) - new Date(b.at));
    return assistantMessagesWithSources.length
      ? assistantMessagesWithSources[assistantMessagesWithSources.length - 1]
      : null;
  }, [messages]);

  const dedupedSources = useMemo(() => {
    if (!latestAssistantWithSources) return [];
    const seen = new Set();
    const out = [];
    for (const s of latestAssistantWithSources.sources) {
      const key = `${s.source || ""}|${s.page || ""}|${s.snippet || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
    return out;
  }, [latestAssistantWithSources]);

  const renderSourceLink = (src) => {
    if (!src) return <span className="font-mono text-gray-800">Unknown source</span>;
    const isUrl = /^https?:\/\//i.test(src);
    const label = (() => {
      try {
        if (isUrl) {
          const u = new URL(src);
          const path = u.pathname.split("/").filter(Boolean);
          return `${u.hostname}${path.length ? " / " + decodeURIComponent(path[path.length - 1]) : ""}`;
        }
      } catch (_) { /* ignore */ }
      const parts = src.split(/[\\/]/);
      return parts[parts.length - 1] || src;
    })();
    return isUrl ? (
      <a href={src} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{label}</a>
    ) : (
      <span className="font-mono break-all">{label}</span>
    );
  };

  return (
    <Card
      title={convTitle || "Chatbot"}
      right={<span className="text-xs text-gray-500">Provider: {provider} · Model: {model}</span>}
    >
      <div className="space-y-3">
        {error && <div className="text-sm text-red-600">{error}</div>}

        {/* Messages area */}
        <div ref={scroller} className="min-h-[200px] max-h-[420px] overflow-auto border rounded-xl p-3 space-y-3 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-sm text-gray-500">No messages yet. Ask something!</div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, idx) => (
                <div key={m.id || idx} className={`bg-white border rounded-xl p-3 ${m.loading ? 'opacity-70' : ''}`}>
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{m.role}</div>
                  <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="flex gap-2">
          <textarea
            className="w-full border rounded-xl px-3 py-2 h-20"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
            }}
          />
          <Button onClick={send} disabled={busy || !query.trim()}>Send ⌘⏎</Button>
        </div>

        {/* Sources section */}
        <div className="border rounded-xl p-3 bg-white">
          <Labeled label="Sources (latest answer)">
            {!latestAssistantWithSources ? (
              <div className="text-sm text-gray-500">No sources to show yet.</div>
            ) : (
              <ul className="space-y-3">
                {dedupedSources.map((s, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-semibold text-gray-600 mt-0.5">[{i + 1}]</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {renderSourceLink(s.source)}{s.page ? <span className="text-gray-500"> — p.{s.page}</span> : null}
                        </div>
                        {s.snippet ? (
                          <div className="text-xs text-gray-600 mt-1 whitespace-pre-wrap border-l pl-2">
                            {s.snippet}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Labeled>
        </div>
      </div>
    </Card>
  );
}
