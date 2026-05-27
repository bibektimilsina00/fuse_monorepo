import { useState } from "react";
import { Icons } from "@/shared/components/icons";
import type { WorkspaceRole } from "../types/workspaceTypes";
import { cn } from "@/lib/cn";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from "@/shared/components";

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_DESCS: Record<WorkspaceRole, string> = {
  owner: "Full control",
  admin: "Can manage members",
  member: "Can view & edit",
  viewer: "Read-only",
};

interface Props {
  value: WorkspaceRole;
  options: WorkspaceRole[];
  onChange: (role: WorkspaceRole) => void;
  disabled?: boolean;
}

export function RoleSelect({ value, options, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dropdown open={open} onOpenChange={setOpen} className="block w-full">
      <DropdownTrigger disabled={disabled} className="block w-full">
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-[37px] w-full items-center justify-between gap-[6px] rounded-[9px]",
            "border border-[var(--border-faint)] bg-[var(--bg)] px-[12px]",
            "text-[13px] font-medium text-[var(--text)] outline-none transition-colors",
            disabled
              ? "cursor-default opacity-50"
              : "cursor-pointer hover:border-[var(--border)] hover:bg-[var(--surface)]",
          )}
        >
          <span className="flex items-center gap-[8px]">
            <span
              className={cn(
                "h-[7px] w-[7px] shrink-0 rounded-full",
                value === "owner" && "bg-[var(--ok)]",
                value === "admin" && "bg-[var(--accent)]",
                value === "member" && "bg-[var(--text-mute)]",
                value === "viewer" && "bg-[var(--text-dim)]",
              )}
            />
            {ROLE_LABELS[value]}
          </span>
          <Icons.Caret
            style={{
              width: 10,
              height: 10,
              color: "var(--text-faint)",
              transition: "transform 120ms",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>
      </DropdownTrigger>

      <DropdownContent className="min-w-[220px]">
        {options.map((role) => (
          <DropdownItem
            key={role}
            onClick={() => onChange(role)}
            className={cn(role === value && "bg-[var(--surface)]")}
          >
            <span className="flex flex-1 items-center gap-[8px]">
              <span
                className={cn(
                  "h-[7px] w-[7px] shrink-0 rounded-full",
                  role === "owner" && "bg-[var(--ok)]",
                  role === "admin" && "bg-[var(--accent)]",
                  role === "member" && "bg-[var(--text-mute)]",
                  role === "viewer" && "bg-[var(--text-dim)]",
                )}
              />
              <span className="text-[13px] font-medium text-[var(--text)]">
                {ROLE_LABELS[role]}
              </span>
            </span>
            <span className="font-mono text-[11.5px] text-[var(--text-faint)]">
              {ROLE_DESCS[role]}
            </span>
            {role === value && (
              <Icons.Check
                style={{
                  width: 12,
                  height: 12,
                  color: "var(--ok)",
                  flexShrink: 0,
                }}
              />
            )}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
