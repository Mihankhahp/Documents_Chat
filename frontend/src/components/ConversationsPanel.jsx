import React, { useEffect, useState } from "react";
import Card from "./primitives/Card";
import Button from "./primitives/Button";
import { createConversation, listConversations, deleteConversation } from "../services/api";
import { cn } from "../lib/ui";

export default function ConversationsPanel({ userId, conversationId, setConversationId, refreshKey }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    if (!userId) return;
    setBusy(true); setErr("");
    try { const rows = await listConversations({ userId }); setItems(rows || []); }
    catch (e) { setErr(String(e.message || e)); }
    finally { setBusy(false); }
  };
  useEffect(() => { load(); }, [userId, refreshKey]); // eslint-disable-line

  const create = async () => {
    try {
      const c = await createConversation({ userId });
      setConversationId(c.id);
      await load();
    } catch (e) { alert(e.message || String(e)); }
  };
  const remove = async (id) => {
    if (!confirm("Delete this conversation?")) return;
    try { await deleteConversation({ userId, conversationId: id }); if (id === conversationId) setConversationId(null); await load(); }
    catch (e) { alert(e.message || String(e)); }
  };

  return (
    <Card title="Conversations" right={<Button onClick={create}>New</Button>}>
      {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
      {busy && <div className="text-sm text-gray-500 mb-2">Loading…</div>}
      <div className="space-y-2 max-h-72 overflow-auto">
        {items.length === 0 ? (
          <div className="text-sm text-gray-500">No conversations yet.</div>
        ) : items.map(c => (
          <div key={c.id} className={cn("flex items-center justify-between gap-2 p-2 border rounded-xl", conversationId === c.id ? "border-gray-900" : "border-gray-200")}>
            <button onClick={() => setConversationId(c.id)} className="text-left min-w-0">
              <div className="text-sm font-medium truncate" title={c.id}>{c.title || "Untitled"}</div>
              <div className="text-xs text-gray-500">{new Date(c.updated_at || c.created_at).toLocaleString()}</div>
            </button>
            <Button variant="danger" onClick={() => remove(c.id)}>Delete</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
