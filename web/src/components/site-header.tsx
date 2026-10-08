import { Link, useLocation } from "react-router";
import { CreateTacticDialog } from "@/components/create-tactic-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function SiteHeader() {
  const location = useLocation();
  const onEditor = /^\/tactics\/[^/]+$/.test(location.pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          {onEditor ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/tactics">Tactics</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Court</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <BreadcrumbItem>
              <BreadcrumbPage>Tactics</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <CreateTacticDialog />
    </header>
  );
}
