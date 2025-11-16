"use client"
import * as React from "react"
import Link from "next/link"
import { LayoutDashboard, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRouter } from "next/navigation"

interface Dashboard {
  id: string;
  title: string;
  url: string;
}

const truncateTitle = (title: string) => {
  if (title.length <= 30) {
    return title
  }
  return `${title.slice(0, 30)}...`
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [dashboards, setDashboards] = React.useState<Dashboard[]>([]);
  const router = useRouter();

  // Fetch all dashboards from Supabase
  React.useEffect(() => {
    const fetchDashboards = async () => {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("dashboards")
          .select("id, title, created_at, updated_at")
          .order("updated_at", { ascending: false });

        if (error) {
          console.error("Failed to fetch dashboards:", error);
          return;
        }

        if (data && data.length > 0) {
          const formattedDashboards = data
            .filter(dashboard => dashboard.id && dashboard.title)
            .map(dashboard => ({
              id: dashboard.id,
              title: dashboard.title || `Dashboard ${dashboard.id.slice(0, 8)}`,
              url: `/app/${dashboard.id}`,
            }));

          setDashboards(formattedDashboards);
        }
      } catch (error) {
        console.error("Error fetching dashboards:", error);
      }
    };

    fetchDashboards();
  }, []);

  return (
    <Sidebar variant="sidebar" {...props}>
      <SidebarHeader>
        <div className="flex flex-col gap-4 px-4 py-3">
          <Link href="/" className="font-fancy text-2xl text-foreground">
            Procure
          </Link>

          <Button
            onClick={() => router.push('/app')}
            variant="secondary"
            size="sm"
            className="w-full justify-start gap-2 text-sm!"
          >
            <LayoutDashboard className="h-4 w-4" />
            Your Dashboards
          </Button>

          <Button
            onClick={() => router.push('/')}
            variant="secondary"
            size="sm"
            className="w-full justify-start gap-2 -mt-2 text-sm!"
          >
            <Plus className="h-4 w-4" />
            New Dashboard
          </Button>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground px-4">
            Recent Dashboards
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1 px-2">
            {dashboards.length > 0 ? (
              dashboards.map((dashboard) => (
                <SidebarMenuItem key={dashboard.id}>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <Link href={dashboard.url} className="w-full">
                            <span className="truncate">{truncateTitle(dashboard.title)}</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {dashboard.title.length > 32 && (
                        <TooltipContent side="right" align="center">
                          <p>{dashboard.title}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </SidebarMenuItem>
              ))
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">No dashboards yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create one to get started</p>
              </div>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
