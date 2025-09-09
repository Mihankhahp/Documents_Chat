import React, { useState } from "react";
import "./index.css";
import { SettingsProvider } from "./context/SettingsContext";
import SignInSignUp from "./components/SignInSignUp";
import FilesPanel from "./components/FilesPanel";
import ConversationsPanel from "./components/ConversationsPanel";
import SettingsMenu from "./components/SettingsMenu";
import ChatPanel from "./components/ChatPanel";
import AdminPanel from "./components/AdminPanel";
import HealthOverlay from "./components/HealthOverlay";
import Button from "./components/primitives/Button";
import useLocalStorage from "./hooks/useLocalStorage";
import { resetUser } from "./services/api";

export default function App() {
  const [userId, setUserId] = useLocalStorage("rag_user_id", "");
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [conversationId, setConversationId] = useLocalStorage("rag_conversation_id", null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAdmin, setShowAdmin] = React.useState(false);
  const [backendReady, setBackendReady] = React.useState(false);
  const [serverInfo, setServerInfo] = React.useState(null);

  const resetAll = async () => {
    if (!userId) return alert("Sign in first");
    if (!confirm("Reset ALL of your uploaded data and conversation?")) return;
    try { await resetUser({ userId }); }
    catch (e) { alert(String(e.message || e)); }
    finally {
      setSelectedDocIds([]);
      setConversationId(null);
      setRefreshKey(x => x + 1);
    }
  };

  const signOut = () => {
    setUserId("");
    setSelectedDocIds([]);
    setConversationId(null);
  };

  return (
    <SettingsProvider>
      <HealthOverlay open={!backendReady} onReady={(info) => { setBackendReady(true); setServerInfo(info); }} />

      <div className="min-h-full bg-gray-50">
        <header className="border-b bg-white">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="font-semibold">Documents Chat</div>
            <div className="flex items-center gap-3 text-xs text-gray-600">
              {serverInfo && (
                <div className="hidden sm:block">
                  Emb: {serverInfo.embed_model}
                </div>
              )}
              {userId && <Button variant="ghost" onClick={signOut}>Sign out</Button>}
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {!userId ? (
            <div className="max-w-md mx-auto">
              <SignInSignUp userId={userId} setUserId={setUserId} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-4">
                <FilesPanel userId={userId} selectedDocIds={selectedDocIds} setSelectedDocIds={setSelectedDocIds} onUploaded={() => setRefreshKey(x => x + 1)} />
                <ConversationsPanel userId={userId} conversationId={conversationId} setConversationId={setConversationId} refreshKey={refreshKey} />
                <SettingsMenu />
                <div className="flex items-center justify-between">
                  <Button variant="danger" onClick={resetAll}>Reset user data</Button>

                </div>
              </div>

              <div className="lg:col-span-2">
                <ChatPanel userId={userId} selectedDocIds={selectedDocIds} conversationId={conversationId} setConversationId={setConversationId} />
              </div>

            </div>
          )}

          <footer className="mt-10 text-center text-xs text-gray-500">
            © {new Date().getFullYear()} RAG Project Powered by Peyman
          </footer>
        </div>
      </div>
    </SettingsProvider>
  );
}
