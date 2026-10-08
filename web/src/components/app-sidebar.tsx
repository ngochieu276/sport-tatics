import { useState, type FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { FolderPlus, LayoutList, MoreHorizontal, Plus } from "lucide-react";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { CreateTacticDialog } from "@/components/create-tactic-dialog";
import { FormError } from "@/components/forms";
import { Logo } from "@/components/Logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { GroupSummary } from "@/domain/types";
import { useDeleteGroup, useGroups, useRenameGroup } from "@/hooks/use-groups";
import { useAuth } from "@/lib/auth";

export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: groups = [] } = useGroups();
  const renameGroup = useRenameGroup();
  const deleteGroup = useDeleteGroup();
  const activeGroupId = location.pathname === "/tactics" ? (searchParams.get("group") ?? "") : "";
  const onLibrary = location.pathname === "/tactics" && !activeGroupId;
  const [renaming, setRenaming] = useState<GroupSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<GroupSummary | null>(null);

  async function onRename(event: FormEvent) {
    event.preventDefault();
    if (!renaming) return;
    const name = renameValue.trim();
    if (!name) {
      setRenameError("Add a name");
      return;
    }
    try {
      await renameGroup.mutateAsync({ id: renaming.id, name });
      setRenaming(null);
      setRenameError(null);
    } catch (caught) {
      setRenameError(caught instanceof Error ? caught.message : "Could not rename the group");
    }
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/tactics">
                <Logo />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={onLibrary} tooltip="All tactics">
                  <Link to="/tactics">
                    <LayoutList />
                    <span>All tactics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <CreateTacticDialog
                  trigger={
                    <SidebarMenuButton>
                      <Plus />
                      <span>New tactic</span>
                    </SidebarMenuButton>
                  }
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Groups</SidebarGroupLabel>
          <CreateGroupDialog
            trigger={
              <SidebarGroupAction title="New group">
                <FolderPlus />
                <span className="sr-only">New group</span>
              </SidebarGroupAction>
            }
          />
          <SidebarGroupContent>
            <SidebarMenu>
              {groups.map((group) => (
                <SidebarMenuItem key={group.id}>
                  <SidebarMenuButton asChild isActive={activeGroupId === group.id} tooltip={group.name}>
                    <Link to={`/tactics?group=${group.id}`}>
                      <span>{group.name}</span>
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{group.tacticCount}</SidebarMenuBadge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction showOnHover>
                        <MoreHorizontal />
                        <span className="sr-only">Group actions</span>
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuItem
                        onClick={() => {
                          setRenaming(group);
                          setRenameValue(group.name);
                          setRenameError(null);
                        }}
                      >
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleting(group)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip={user?.email ?? "Account"}>
                  <span>{user?.email}</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem onClick={() => void logout()}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <Dialog
        open={Boolean(renaming)}
        onOpenChange={(open) => {
          if (!open) setRenaming(null);
        }}
      >
        <DialogContent>
          <form onSubmit={(event) => void onRename(event)}>
            <DialogHeader>
              <DialogTitle>Rename group</DialogTitle>
            </DialogHeader>
            <FieldGroup className="py-4">
              <Field>
                <FieldLabel htmlFor="rename-group-name">Name</FieldLabel>
                <Input
                  id="rename-group-name"
                  value={renameValue}
                  maxLength={40}
                  autoFocus
                  onChange={(event) => setRenameValue(event.target.value)}
                />
              </Field>
              <FormError>{renameError}</FormError>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
              <Button type="submit" disabled={renameGroup.isPending}>
                {renameGroup.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Tactics stay in your library. This only removes the group label.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) void deleteGroup.mutateAsync(deleting.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
