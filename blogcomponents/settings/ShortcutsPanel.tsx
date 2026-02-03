"use client";

import { useCallback, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ObjectActionDropdown } from "@/blogcomponents/ui/ObjectActionDropdown";

type ShortcutEntry = {
  id: string;
  label: string;
  value: string;
};

const initialShortcuts: ShortcutEntry[] = [
  { id: "group-create", label: "Create sub group", value: "Hyper + G" },
  { id: "unit-menu", label: "Open add unit menu", value: "Hyper + U" },
  { id: "unit-insert", label: "Insert unit in place", value: "Hyper + P" },
  { id: "style-menu", label: "Open style menu", value: "Hyper + L" },
  { id: "toggle-outlines", label: "Show/Hide Outlines", value: "Hyper + B" },
  { id: "toggle-config", label: "Toggle configuration panel", value: "Hyper + T" },
  { id: "toggle-agent", label: "Toggle agent tab", value: "Hyper + A" },
  { id: "focus-next", label: "Focus next", value: "Hyper + K" },
  { id: "focus-prev", label: "Focus previous", value: "Hyper + J" },
  { id: "move-out-before", label: "Move out before group", value: "Hyper + O then J" },
  { id: "move-out-after", label: "Move out after group", value: "Hyper + O then K" },
  { id: "move-in-next", label: "Move in next sub group", value: "Hyper + I then K" },
  { id: "move-in-prev", label: "Move in previous sub group", value: "Hyper + I then J" },
  { id: "jump-end", label: "Jump to end of unit", value: "Hyper + ]" },
  { id: "jump-start", label: "Jump to start of unit", value: "Hyper + [" }
];

function parseShortcut(value: string): string[][] {
  if (!value) return [];
  return value
    .split(/\s+then\s+/i)
    .map((sequence) =>
      sequence
        .split("+")
        .map((part) => part.trim())
        .filter(Boolean)
    )
    .filter((sequence) => sequence.length > 0);
}

function ShortcutKeys({ value }: { value: string }) {
  const sequences = useMemo(() => parseShortcut(value), [value]);
  if (sequences.length === 0) return null;
  const hyperKeys = ["⌘", "⇧", "⌥", "⌃"];
  return (
    <div className="shortcut-kbd">
      {sequences.map((sequence, seqIndex) => (
        <span key={`seq-${seqIndex}`} className="shortcut-kbd-sequence">
          <KbdGroup className="shortcut-kbd-group">
            {sequence.map((token, index) => {
              const isHyper = token.toLowerCase() === "hyper";
              return (
                <span key={`${token}-${index}`} className="shortcut-kbd-token">
                  {isHyper ? (
                    <span className="shortcut-kbd-hyper">
                      {hyperKeys.map((key, keyIndex) => (
                        <Kbd key={`${key}-${keyIndex}`}>{key}</Kbd>
                      ))}
                    </span>
                  ) : (
                    <Kbd>{token}</Kbd>
                  )}
                  {index < sequence.length - 1 ? <span className="shortcut-kbd-plus">+</span> : null}
                </span>
              );
            })}
          </KbdGroup>
          {seqIndex < sequences.length - 1 ? <span className="shortcut-kbd-then">then</span> : null}
        </span>
      ))}
    </div>
  );
}

function ShortcutInputDisplay({ value }: { value: string }) {
  return (
    <div className="shortcut-input-display">
      <Input readOnly value={value} className="shortcut-input-field shortcut-input-field--display" />
      <div className="shortcut-input-overlay">
        <ShortcutKeys value={value} />
      </div>
    </div>
  );
}

export function ShortcutsPanel() {
  const [shortcuts, setShortcuts] = useState<ShortcutEntry[]>(initialShortcuts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");

  const startEditing = useCallback((entry: ShortcutEntry) => {
    setEditingId(entry.id);
    setDraftValue(entry.value);
  }, []);

  const commitEditing = useCallback(() => {
    if (!editingId) return;
    setShortcuts((prev) =>
      prev.map((entry) => (entry.id === editingId ? { ...entry, value: draftValue.trim() } : entry))
    );
    setEditingId(null);
    setDraftValue("");
  }, [draftValue, editingId]);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setDraftValue("");
  }, []);

  const clearShortcut = useCallback(
    (id: string) => {
      setShortcuts((prev) => prev.map((entry) => (entry.id === id ? { ...entry, value: "" } : entry)));
      if (editingId === id) {
        setEditingId(null);
        setDraftValue("");
      }
    },
    [editingId]
  );

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Shortcuts</h2>
        <p>Reserved shortcuts for authoring workflows.</p>
      </div>
      <div className="section-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shortcut</TableHead>
              <TableHead>Keys</TableHead>
              <TableHead className="shortcut-actions-col">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shortcuts.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="shortcut-label">{entry.label}</TableCell>
                <TableCell>
                  {editingId === entry.id ? (
                    <Input
                      value={draftValue}
                      onChange={(event) => setDraftValue(event.target.value)}
                      onBlur={commitEditing}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitEditing();
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelEditing();
                        }
                      }}
                      placeholder="Shortcut"
                      className="shortcut-input-field"
                      autoFocus
                    />
                  ) : (
                    <ShortcutInputDisplay value={entry.value} />
                  )}
                </TableCell>
                <TableCell className="shortcut-actions-col">
                  <ObjectActionDropdown
                    onEdit={() => startEditing(entry)}
                    onDelete={() => clearShortcut(entry.id)}
                    triggerLabel={`${entry.label} actions`}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
