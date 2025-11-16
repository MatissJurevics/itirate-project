"use client"
import * as React from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRouter } from "next/navigation"

interface SidebarItem {
  title: string;
  url: string;
}

interface NavMainItem {
  title: string;
  url: string;
  items: SidebarItem[];
}

interface SidebarData {
  navMain: NavMainItem[];
}

const truncateTitle = (title: string) => {
  if (title.length <= 35) {
    return title
  }
  return `${title.slice(0, 35)}...`
}

// This is sample data.
const initialData: SidebarData = {
  navMain: [
    {
      title: "Dashboards",
      url: "/app",
      items: [],
    },

  ]
}



export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [data, setData] = React.useState<SidebarData>(initialData);
  const router = useRouter();

  // Fetch all dashboards from Supabase and update sidebar
  React.useEffect(() => {
    const fetchDashboards = async () => {
      try {
        const supabase = createClient();

        // Fetch all dashboards from the dashboards table
        const { data: dashboards, error } = await supabase
          .from("dashboards")
          .select("id, title, created_at")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Failed to fetch dashboards:", error);
          return;
        }

        if (dashboards && dashboards.length > 0) {
          // Transform dashboards to sidebar items format
          const sidebarItems = dashboards
            .filter(dashboard => dashboard.id && dashboard.title)
            .map(dashboard => ({
              title: dashboard.title || `Dashboard ${dashboard.id.slice(0, 8)}`,
              url: `/app/${dashboard.id}`,
              uuid: dashboard.id,
            }));

          setData(prevData => ({
            ...prevData,
            navMain: prevData.navMain.map(navItem =>
              navItem.title === "Dashboards"
                ? { ...navItem, items: sidebarItems }
                : navItem
            )
          }));
        }
      } catch (error) {
        console.error("Error fetching dashboards:", error);
      }
    };

    fetchDashboards();
  }, []);

  return (
    <Sidebar variant="sidebar">
      <SidebarHeader>
        <div className="flex flex-col gap-3 p-2">
          {/* Logo/Branding */}
          <div className="px-2 py-1">
            <span className="font-fancy text-2xl">Procure</span>
          </div>
          {/* Main Action Button */}
          <Button onClick={() => router.push('/')} className="flex-row mt-2 flex w-fit justify-start gap-2">
            <Plus className="h-4 w-4" />
            Create New Dashboard
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link href={item.url} className="font-medium">
                    <span title={item.title}>{truncateTitle(item.title)}</span>
                  </Link>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                    {item.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuSubButton asChild isActive={false} className="w-full">
                                <Link href={item.url} className="block">
                                  <span className="truncate">{item.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </TooltipTrigger>
                            <TooltipContent side="right" align="center">
                              <p>{item.title}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
