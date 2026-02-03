"use client";

import { Fragment } from "react";
import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { EditIcon, DeleteIcon } from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ObjectActionItem = {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  tone?: "default" | "edit" | "delete";
};

type ObjectActionDropdownProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  actions?: ObjectActionItem[];
  triggerLabel?: string;
  triggerClassName?: string;
  align?: "start" | "end";
};

function renderItem(item: ObjectActionItem, key: string) {
  const toneClass =
    item.tone === "edit"
      ? "object-action-item--edit"
      : item.tone === "delete"
        ? "object-action-item--delete"
        : undefined;
  return (
    <DropdownMenuItem
      key={key}
      className={cn("object-action-item", toneClass)}
      onSelect={item.onSelect}
    >
      {item.icon ? <span className="object-action-item__icon">{item.icon}</span> : null}
      {item.label}
    </DropdownMenuItem>
  );
}

export function ObjectActionDropdown({
  onEdit,
  onDelete,
  actions = [],
  triggerLabel = "Actions",
  triggerClassName,
  align = "end"
}: ObjectActionDropdownProps) {
  if (!onEdit && !onDelete && actions.length === 0) return null;

  const customItems = actions;
  const editItems: ObjectActionItem[] = onEdit
    ? [{ label: "Edit", onSelect: onEdit, icon: <EditIcon size={14} aria-hidden />, tone: "edit" }]
    : [];
  const deleteItems: ObjectActionItem[] = onDelete
    ? [
        {
          label: "Delete",
          onSelect: onDelete,
          icon: <DeleteIcon size={14} aria-hidden />,
          tone: "delete"
        }
      ]
    : [];

  const groups: ObjectActionItem[][] = [];
  if (customItems.length) groups.push(customItems);
  if (editItems.length) groups.push(editItems);
  if (deleteItems.length) groups.push(deleteItems);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn("object-action-trigger", triggerClassName)} type="button" aria-label={triggerLabel}>
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="object-action-dropdown">
        {groups.map((group, groupIndex) => (
          <Fragment key={`group-${groupIndex}`}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuGroup>
              {group.map((item, itemIndex) =>
                renderItem(item, `${groupIndex}-${item.label}-${itemIndex}`)
              )}
            </DropdownMenuGroup>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
