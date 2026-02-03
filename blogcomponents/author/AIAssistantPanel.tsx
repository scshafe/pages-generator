"use client";

import { useCallback, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useToast } from "@/blogcomponents/ui/ToastProvider";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type OpsChange = {
  path: string;
  before: unknown;
  after: unknown;
};

type OpsResult = {
  operations: Array<{ type: string; payload: Record<string, unknown> }>;
  results: Array<Record<string, unknown>>;
  changes: OpsChange[];
  undo: OpsChange[];
};

type ChatResponse = {
  message?: string;
  operations?: unknown;
};

function formatOps(ops: unknown) {
  try {
    return JSON.stringify(ops, null, 2);
  } catch {
    return "";
  }
}

export function AIAssistantPanel() {
  const toast = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Describe the edits you want and I will draft operations."
    }
  ]);
  const [input, setInput] = useState("");
  const [opsDraft, setOpsDraft] = useState("");
  const [preview, setPreview] = useState<OpsResult | null>(null);

  const parsedOps = useMemo(() => {
    const trimmed = opsDraft.trim();
    if (!trimmed) return { value: null, error: null };
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        return { value: null, error: "Operations must be a JSON array." };
      }
      return { value: parsed, error: null };
    } catch (err) {
      return { value: null, error: err instanceof Error ? err.message : "Invalid JSON." };
    }
  }, [opsDraft]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: trimmed
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);
    try {
      const history = [...messages, userMessage].map((message) => ({
        role: message.role,
        content: message.content
      }));
      const response = await apiFetch<ChatResponse>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: trimmed, history })
      });
      const reply = response.message ?? "No response from agent.";
      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: reply
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (response.operations) {
        setOpsDraft(formatOps(response.operations));
        setPreview(null);
      }
    } catch (err) {
      const fallback: ChatMessage = {
        id: `${Date.now()}-assistant-error`,
        role: "assistant",
        content: "AI agent is not configured yet. Paste operations below to preview/apply."
      };
      setMessages((prev) => [...prev, fallback]);
      if (err instanceof Error) {
        toast.push(err.message, "error");
      }
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, messages, toast]);

  const handlePreview = useCallback(async () => {
    if (!parsedOps.value) {
      toast.push(parsedOps.error ?? "Add operations to preview.", "error");
      return;
    }
    setIsPreviewing(true);
    try {
      const result = await apiFetch<OpsResult>("/ai/ops/preview", {
        method: "POST",
        body: JSON.stringify({ operations: parsedOps.value })
      });
      setPreview(result);
      toast.push("Preview generated", "success");
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Preview failed", "error");
    } finally {
      setIsPreviewing(false);
    }
  }, [parsedOps, toast]);

  const handleApply = useCallback(async () => {
    if (!parsedOps.value) {
      toast.push(parsedOps.error ?? "Add operations to apply.", "error");
      return;
    }
    setIsApplying(true);
    try {
      const result = await apiFetch<OpsResult>("/ai/ops/apply", {
        method: "POST",
        body: JSON.stringify({ operations: parsedOps.value })
      });
      setPreview(result);
      toast.push("Changes applied", "success");
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Apply failed", "error");
    } finally {
      setIsApplying(false);
    }
  }, [parsedOps, toast]);

  return (
    <div className="assistant-panel__body">
      <div className="assistant-panel__messages" role="log" aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`assistant-message assistant-message--${message.role}`}
          >
            <span className="assistant-message__role">{message.role === "user" ? "You" : "Agent"}</span>
            <p>{message.content}</p>
          </div>
        ))}
      </div>
      <div className="assistant-panel__composer">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask for edits, layout changes, or content polish..."
          rows={3}
        />
        <div className="assistant-panel__actions">
          <button
            className="button small"
            type="button"
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending ? "Sending" : "Send"}
          </button>
        </div>
      </div>
      <div className="assistant-panel__ops">
        <div className="assistant-panel__ops-header">
          <strong>Operations</strong>
          <span className="muted">Preview or apply JSON ops</span>
        </div>
        <textarea
          value={opsDraft}
          onChange={(event) => setOpsDraft(event.target.value)}
          placeholder={`[\n  { "type": "create_child", "payload": { "parent_node_id": 1, "component_type": "PlainTextUnit", "config": { "text": "Hello" } } }\n]`}
          rows={6}
        />
        {parsedOps.error ? <div className="alert">{parsedOps.error}</div> : null}
        <div className="assistant-panel__ops-actions">
          <button
            className="button small ghost"
            type="button"
            onClick={() => {
              setOpsDraft("");
              setPreview(null);
            }}
          >
            Clear
          </button>
          <div className="assistant-panel__ops-buttons">
            <button
              className="button small"
              type="button"
              onClick={handlePreview}
              disabled={isPreviewing}
            >
              {isPreviewing ? "Previewing" : "Preview"}
            </button>
            <button
              className="button small success"
              type="button"
              onClick={handleApply}
              disabled={isApplying}
            >
              {isApplying ? "Applying" : "Apply"}
            </button>
          </div>
        </div>
        {preview ? (
          <div className="assistant-panel__preview">
            <strong>Preview</strong>
            <p className="muted">{preview.changes.length} changes</p>
            <ul>
              {preview.changes.slice(0, 6).map((change) => (
                <li key={change.path}>{change.path}</li>
              ))}
            </ul>
            {preview.changes.length > 6 ? (
              <p className="muted">And {preview.changes.length - 6} more...</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
