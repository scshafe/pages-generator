"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";

export interface AISettings {
  voice_tone: string;
  voice_style: string;
  voice_personality: string;
  custom_instructions: string;
  ai_enabled: boolean;
  auto_suggestions: boolean;
  writing_assistance: boolean;
}

const defaultAISettings: AISettings = {
  voice_tone: "professional",
  voice_style: "concise",
  voice_personality: "friendly",
  custom_instructions: "",
  ai_enabled: true,
  auto_suggestions: false,
  writing_assistance: true
};

const voiceToneOptions = [
  { value: "professional", label: "Professional", description: "Formal and business-appropriate" },
  { value: "casual", label: "Casual", description: "Relaxed and conversational" },
  { value: "academic", label: "Academic", description: "Scholarly and precise" },
  { value: "creative", label: "Creative", description: "Expressive and imaginative" },
  { value: "technical", label: "Technical", description: "Detailed and specification-focused" },
  { value: "journalistic", label: "Journalistic", description: "News-style, factual" }
];

const voiceStyleOptions = [
  { value: "concise", label: "Concise", description: "Brief and to the point" },
  { value: "detailed", label: "Detailed", description: "Thorough and comprehensive" },
  { value: "storytelling", label: "Storytelling", description: "Narrative-driven" },
  { value: "instructional", label: "Instructional", description: "Step-by-step guidance" },
  { value: "persuasive", label: "Persuasive", description: "Compelling and convincing" }
];

const voicePersonalityOptions = [
  { value: "friendly", label: "Friendly", description: "Warm and approachable" },
  { value: "authoritative", label: "Authoritative", description: "Expert and confident" },
  { value: "empathetic", label: "Empathetic", description: "Understanding and supportive" },
  { value: "witty", label: "Witty", description: "Clever with subtle humor" },
  { value: "neutral", label: "Neutral", description: "Objective and impartial" }
];

export function AIPanel() {
  const [form, setForm] = useState<AISettings>(defaultAISettings);
  const [savedSnapshot, setSavedSnapshot] = useState<AISettings>(defaultAISettings);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const isAuthor = process.env.NEXT_PUBLIC_BUILD_MODE === "author";
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const loadSettings = useCallback(async () => {
    if (!isAuthor) return;
    try {
      const response = await apiFetch<AISettings>("/ai-settings");
      const next = { ...defaultAISettings, ...response };
      setForm(next);
      setSavedSnapshot(next);
      setSaveStatus("idle");
    } catch {
      // Settings might not exist yet, use defaults
      setForm(defaultAISettings);
      setSavedSnapshot(defaultAISettings);
    } finally {
      hasLoadedRef.current = true;
    }
  }, [isAuthor]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const hasChanges = (() => {
    const keys = Object.keys(defaultAISettings) as (keyof AISettings)[];
    return keys.some((key) => form[key] !== savedSnapshot[key]);
  })();

  useEffect(() => {
    if (!isAuthor) return;
    if (!hasLoadedRef.current) return;
    if (!hasChanges) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    setSaveStatus("saving");
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const updated = await apiFetch<AISettings>("/ai-settings", {
          method: "PUT",
          body: JSON.stringify(form)
        });
        const next = { ...defaultAISettings, ...updated };
        setForm(next);
        setSavedSnapshot(next);
        setSaveStatus("saved");
        setError(null);
        window.setTimeout(() => setSaveStatus("idle"), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save AI settings");
        setSaveStatus("error");
        toast.push("Save failed", "error");
      } finally {
        saveTimerRef.current = null;
      }
    }, 700);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [form, hasChanges, isAuthor, toast]);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>AI</h2>
        <p>Configure AI voice, tone, and behavior for content assistance.</p>
      </div>

      <div className="section-card">
        <div className="section-header">
          <h4>Voice Settings</h4>
          <p>Define how AI-generated content should sound.</p>
        </div>
        <div className="form-grid">
          <label>
            <span>Tone</span>
            <select
              value={form.voice_tone}
              onChange={(event) => setForm((prev) => ({ ...prev, voice_tone: event.target.value }))}
            >
              {voiceToneOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="form-hint">
              {voiceToneOptions.find((o) => o.value === form.voice_tone)?.description}
            </span>
          </label>

          <label>
            <span>Style</span>
            <select
              value={form.voice_style}
              onChange={(event) => setForm((prev) => ({ ...prev, voice_style: event.target.value }))}
            >
              {voiceStyleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="form-hint">
              {voiceStyleOptions.find((o) => o.value === form.voice_style)?.description}
            </span>
          </label>

          <label>
            <span>Personality</span>
            <select
              value={form.voice_personality}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, voice_personality: event.target.value }))
              }
            >
              {voicePersonalityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="form-hint">
              {voicePersonalityOptions.find((o) => o.value === form.voice_personality)?.description}
            </span>
          </label>

          <label>
            <span>Custom Instructions</span>
            <textarea
              value={form.custom_instructions}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, custom_instructions: event.target.value }))
              }
              placeholder="Add specific instructions for AI-generated content..."
              rows={4}
            />
            <span className="form-hint">
              Additional context or rules for AI to follow when generating content.
            </span>
          </label>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <h4>AI Behavior</h4>
          <p>Control when and how AI assists with content creation.</p>
        </div>
        <div className="form-grid">
          <label className="toggle-label">
            <span>Enable AI Features</span>
            <input
              type="checkbox"
              checked={form.ai_enabled}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, ai_enabled: event.target.checked }))
              }
            />
            <span className="form-hint">Master toggle for all AI features.</span>
          </label>

          <label className="toggle-label">
            <span>Auto Suggestions</span>
            <input
              type="checkbox"
              checked={form.auto_suggestions}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, auto_suggestions: event.target.checked }))
              }
              disabled={!form.ai_enabled}
            />
            <span className="form-hint">Show AI suggestions while writing.</span>
          </label>

          <label className="toggle-label">
            <span>Writing Assistance</span>
            <input
              type="checkbox"
              checked={form.writing_assistance}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, writing_assistance: event.target.checked }))
              }
              disabled={!form.ai_enabled}
            />
            <span className="form-hint">Enable AI to help improve and expand content.</span>
          </label>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {isAuthor && (hasChanges || saveStatus !== "idle") ? (
        <div className="action-bar">
          <div className="action-group action-group--right">
            {saveStatus === "saving" ? (
              <span className="status-chip status-saving">Saving...</span>
            ) : saveStatus === "error" ? (
              <span className="status-chip status-error">Save failed</span>
            ) : saveStatus === "saved" ? (
              <span className="status-chip status-saved">Saved</span>
            ) : hasChanges ? (
              <span className="status-chip status-dirty">Unsaved changes</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
