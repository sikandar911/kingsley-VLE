import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { courseChatApi } from "../api/courseChat.api";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

const POLL_INTERVAL_MS = 10000;

export default function CourseChatTab({ courseId, sectionId }) {
  const { user } = useAuth();
  const canUpload = user?.role === "teacher" || user?.role === "admin";

  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newIds, setNewIds] = useState(new Set());

  // Pagination: earliest message id seen
  const [oldestId, setOldestId] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);

  const bottomRef = useRef(null);
  const pollerRef = useRef(null);

  // ── Fetch latest 50 messages ──────────────────────────────────────────────
  const fetchMessages = useCallback(
    async (opts = {}) => {
      const { silent = false, scrollToBottom = false } = opts;
      if (!courseId) return;
      try {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        const res = await courseChatApi.listMessages(courseId, sectionId);
        const fetched = Array.isArray(res.data) ? res.data : [];

        setMessages((prev) => {
          // Separate optimistic messages (temp-*) from server messages
          // Keep optimistic messages until they're replaced by real ones from server
          const optimisticMsgs = prev.filter((m) => m.id.startsWith("temp-"));

          // Find genuinely new messages (after background poll)
          const prevIds = new Set(
            prev.filter((m) => !m.id.startsWith("temp-")).map((m) => m.id),
          );
          const incoming = fetched.filter((m) => !prevIds.has(m.id));
          if (incoming.length > 0) {
            const incoming50ms = new Set(incoming.map((m) => m.id));
            setNewIds(incoming50ms);
            setTimeout(() => setNewIds(new Set()), 2000);
          }

          // Merge: server messages + optimistic messages (optimistic at end)
          // When an optimistic message gets its real ID from API response,
          // the server version (in fetched) will have that real ID, and the
          // old temp message will be filtered out by handleSend
          return [...fetched, ...optimisticMsgs];
        });

        setHasOlder(fetched.length === 50);
        if (fetched.length > 0) setOldestId(fetched[0].id);
        setError(null);

        if (scrollToBottom) {
          setTimeout(
            () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
            50,
          );
        }
      } catch (err) {
        if (!silent)
          setError(err.response?.data?.error || "Failed to load messages");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [courseId, sectionId],
  );

  // ── Load older messages (cursor-based) ───────────────────────────────────
  const loadOlderMessages = async () => {
    if (!oldestId || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await courseChatApi.listMessages(
        courseId,
        sectionId,
        oldestId,
      );
      const older = Array.isArray(res.data) ? res.data : [];
      setMessages((prev) => [...older, ...prev]);
      setHasOlder(older.length === 50);
      if (older.length > 0) setOldestId(older[0].id);
    } catch (err) {
      console.error("Error loading older messages:", err);
    } finally {
      setLoadingOlder(false);
    }
  };

  // ── Initial load + polling ────────────────────────────────────────────────
  useEffect(() => {
    fetchMessages({ scrollToBottom: true });

    // Fetch members for @mention once on mount
    if (courseId) {
      courseChatApi
        .getMembers(courseId, sectionId)
        .then((res) => setMembers(Array.isArray(res.data) ? res.data : []))
        .catch(() => setMembers([]));
    }

    pollerRef.current = setInterval(() => {
      fetchMessages({ silent: true });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollerRef.current);
  }, [fetchMessages]);

  // ── Scroll to bottom after initial load ──────────────────────────────────
  useEffect(() => {
    if (!loading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [loading]);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = async (content) => {
    if (!content?.trim()) return;

    // Optimistic update: show message immediately before API responds
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      content,
      courseId,
      sectionId: sectionId === "null" ? null : sectionId || null,
      userId: user?.id,
      classMaterialId: null,
      createdAt: new Date().toISOString(),
      deletedAt: null,
      user: {
        id: user?.id,
        role: user?.role,
        studentProfile: user?.studentProfile || null,
        teacherProfile: user?.teacherProfile || null,
      },
      classMaterial: null,
      reactions: [],
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );

    try {
      const res = await courseChatApi.sendMessage(courseId, sectionId, content);
      const msg = res.data;
      // Replace optimistic message with real one from server
      setMessages((prev) => prev.map((m) => (m.id === tempId ? msg : m)));
      setNewIds(new Set([msg.id]));
      setTimeout(() => setNewIds(new Set()), 2000);
    } catch (err) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      console.error("send error:", err);
    }
  };

  // ── Send message with file ───────────────────────────────────────────────
  const handleSendFile = async (formData) => {
    // Optimistic update for file upload
    const tempId = `temp-${Date.now()}`;
    const content = formData.get("content") || "";
    const optimisticMsg = {
      id: tempId,
      content,
      courseId,
      sectionId: sectionId === "null" ? null : sectionId || null,
      userId: user?.id,
      classMaterialId: null,
      createdAt: new Date().toISOString(),
      deletedAt: null,
      user: {
        id: user?.id,
        role: user?.role,
        studentProfile: user?.studentProfile || null,
        teacherProfile: user?.teacherProfile || null,
      },
      classMaterial: null, // Will be filled in on server response
      reactions: [],
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );

    try {
      const res = await courseChatApi.sendMessageWithFile(
        courseId,
        sectionId,
        formData,
      );
      const msg = res.data;
      // Replace optimistic message with real one from server
      setMessages((prev) => prev.map((m) => (m.id === tempId ? msg : m)));
      setNewIds(new Set([msg.id]));
      setTimeout(() => setNewIds(new Set()), 2000);
    } catch (err) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      console.error("send file error:", err);
    }
  };

  // ── React to a message ───────────────────────────────────────────────────
  const handleReact = async (messageId, type) => {
    try {
      const res = await courseChatApi.toggleReaction(
        courseId,
        sectionId,
        messageId,
        type,
      );
      const updated = res.data;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? updated : m)),
      );
    } catch (err) {
      console.error("react error:", err);
    }
  };

  // ── Delete a message ─────────────────────────────────────────────────────
  const handleDelete = async (messageId) => {
    try {
      await courseChatApi.deleteMessage(courseId, sectionId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error("delete error:", err);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-9 h-9 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-32" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 p-4">
          <div className="h-14 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100dvh - 130px)", minHeight: "400px" }}
    >
      {/* Top controls */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1 flex-shrink-0">
        {/* Load older button */}
        {hasOlder && (
          <button
            onClick={loadOlderMessages}
            disabled={loadingOlder}
            className="text-xs text-[#6b1d3e] font-semibold hover:underline disabled:opacity-60 flex items-center gap-1"
          >
            {loadingOlder ? (
              <svg
                className="w-3 h-3 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            ) : (
              "↑"
            )}
            See older messages
          </button>
        )}
        {!hasOlder && <span />}

        {/* Reload button */}
        <button
          onClick={() => fetchMessages({ silent: true })}
          disabled={refreshing}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
          title="Refresh messages"
        >
          <svg
            className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 flex-shrink-0">
          {error}
        </div>
      )}

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
          
              <img
            src="/text-profile.png"
            alt="User avatar"
            className="w-9 h-9 md:w-11 md:h-11"
          />
            <p className="text-gray-500 text-sm">No messages yet.</p>
            <p className="text-gray-400 text-xs mt-1">
              Be the first to say something!
            </p>
          </div>
        )}

        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            message={m}
            currentUserId={user?.id}
            onReact={handleReact}
            onDelete={handleDelete}
            isNew={newIds.has(m.id)}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onSendFile={handleSendFile}
        canUpload={canUpload}
        disabled={false}
        members={members}
      />
    </div>
  );
}
