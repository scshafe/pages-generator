import { useEffect } from "react";

type MenuType = "container" | "unit" | "style" | null;

export function useInlineMenuEvents({
  isAuthor,
  isTextUnit,
  nodeId,
  textValue,
  inlineEditableRef,
  onOpenMenu,
  onGroupCreate
}: {
  isAuthor: boolean;
  isTextUnit: boolean;
  nodeId: number;
  textValue: string;
  inlineEditableRef: React.RefObject<HTMLElement>;
  onOpenMenu: (menuType: MenuType, split: { before: string; after: string }, caretIndex: number) => void;
  onGroupCreate: (split: { before: string; after: string }, caretIndex: number) => void;
}) {
  useEffect(() => {
    if (!isAuthor || !isTextUnit) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId: number; menuType: MenuType }>).detail;
      if (!detail || detail.nodeId !== nodeId) return;
      const editable = inlineEditableRef.current;
      const fullText = editable?.textContent ?? textValue;
      const caretIndex = editable ? getSelectionOffset(editable) ?? fullText.length : fullText.length;
      const split = { before: fullText.slice(0, caretIndex), after: fullText.slice(caretIndex) };
      onOpenMenu(detail.menuType, split, caretIndex);
    };
    window.addEventListener("author-menu-open", handler as EventListener);
    return () => window.removeEventListener("author-menu-open", handler as EventListener);
  }, [inlineEditableRef, isAuthor, isTextUnit, nodeId, onOpenMenu, textValue]);

  useEffect(() => {
    if (!isAuthor || !isTextUnit) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId: number }>).detail;
      if (!detail || detail.nodeId !== nodeId) return;
      const editable = inlineEditableRef.current;
      const fullText = editable?.textContent ?? textValue;
      const caretIndex = editable ? getSelectionOffset(editable) ?? fullText.length : fullText.length;
      const split = { before: fullText.slice(0, caretIndex), after: fullText.slice(caretIndex) };
      onGroupCreate(split, caretIndex);
    };
    window.addEventListener("author-group-create", handler as EventListener);
    return () => window.removeEventListener("author-group-create", handler as EventListener);
  }, [inlineEditableRef, isAuthor, isTextUnit, nodeId, onGroupCreate, textValue]);
}

function getSelectionOffset(container: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.startContainer)) return null;
  const preRange = range.cloneRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}
