"use client"
import * as React from "react"
import Link from "next/link"
import { GalleryVerticalEnd } from "lucide-react"
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-md">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-fancy text-lg">Procure</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link href={item.url} className="font-medium">
                    {item.title}
                  </Link>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                    {item.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton asChild isActive={false}>
                          <Link href={item.url}>{item.title}</Link>
                        </SidebarMenuSubButton>
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
