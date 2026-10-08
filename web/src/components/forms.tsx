import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { GroupSummary } from "@/domain/types";

export function SectionHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase", className)}>
      {children}
    </h2>
  );
}

export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
};

export function ChoiceToggle<T extends string>({
  value,
  onChange,
  options,
  disabled,
  className,
  itemClassName,
  variant = "outline",
  size = "sm",
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ChoiceOption<T>[];
  disabled?: boolean;
  className?: string;
  itemClassName?: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  ariaLabel?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      variant={variant}
      size={size}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn("flex w-full flex-wrap", className)}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} className={cn("flex-1 capitalize", itemClassName)}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function GroupChecklist({
  groups,
  selectedIds,
  onChange,
  max = 8,
  disabled,
  empty = "No groups yet.",
  idPrefix = "group",
}: {
  groups: GroupSummary[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  disabled?: boolean;
  empty?: string;
  idPrefix?: string;
}) {
  if (groups.length === 0) {
    return <p className="text-xs text-muted-foreground">{empty}</p>;
  }
  return (
    <FieldGroup data-slot="checkbox-group" className="gap-2">
      {groups.map((group) => {
        const checked = selectedIds.includes(group.id);
        const inputId = `${idPrefix}-${group.id}`;
        return (
          <Field key={group.id} orientation="horizontal" className="items-center gap-2">
            <Checkbox
              id={inputId}
              checked={checked}
              disabled={disabled || (!checked && selectedIds.length >= max)}
              onCheckedChange={(next) => {
                if (next === true) {
                  if (selectedIds.length >= max) return;
                  onChange([...selectedIds, group.id]);
                  return;
                }
                onChange(selectedIds.filter((id) => id !== group.id));
              }}
            />
            <FieldLabel htmlFor={inputId} className="font-normal">
              {group.name}
            </FieldLabel>
          </Field>
        );
      })}
    </FieldGroup>
  );
}

export function ConfirmAction({
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  children: ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => void onConfirm()}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <FieldError>{children}</FieldError>;
}
