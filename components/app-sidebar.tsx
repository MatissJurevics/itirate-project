import * as React from "react"
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
          // Fall back to localStorage if Supabase fetch fails
          loadFromLocalStorage();
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

          // Store in localStorage
          try {
            localStorage.setItem('dashboardid', JSON.stringify(sidebarItems));
          } catch (storageError) {
            console.warn("Failed to save to localStorage:", storageError);
          }

          // Update sidebar data
          setData(prevData => ({
            ...prevData,
            navMain: prevData.navMain.map(navItem =>
              navItem.title === "Dashboards"
                ? { ...navItem, items: sidebarItems }
                : navItem
            )
          }));
        } else {
          // No dashboards found, try loading from localStorage as fallback
          loadFromLocalStorage();
        }
      } catch (error) {
        console.error("Error fetching dashboards:", error);
        // Fall back to localStorage
        loadFromLocalStorage();
      }
    };

    const loadFromLocalStorage = () => {
      const dashboardData = localStorage.getItem('dashboardid');
      if (!dashboardData) {
        return;
      }

      // Validate that the data is not empty and is a valid JSON string
      const trimmedData = dashboardData.trim();
      if (!trimmedData || trimmedData === 'undefined' || trimmedData === 'null') {
        localStorage.removeItem('dashboardid');
        return;
      }

      // Basic JSON structure validation before parsing
      const firstChar = trimmedData[0];
      const lastChar = trimmedData[trimmedData.length - 1];
      const isValidJsonStructure =
        (firstChar === '[' && lastChar === ']') ||
        (firstChar === '{' && lastChar === '}');

      if (!isValidJsonStructure) {
        console.warn('Invalid JSON structure in localStorage, clearing data');
        localStorage.removeItem('dashboardid');
        return;
      }

      try {
        const parsedData = JSON.parse(trimmedData);
        if (Array.isArray(parsedData)) {
          const newItems = parsedData
            .filter(item => item && typeof item === 'object' && item.title && (item.uuid || item.id))
            .map(item => ({
              title: item.title,
              url: `/app/${item.uuid || item.id}`,
            }));

          if (newItems.length > 0) {
            setData(prevData => ({
              ...prevData,
              navMain: prevData.navMain.map(navItem =>
                navItem.title === "Create Page"
                  ? { ...navItem, items: newItems }
                  : navItem
              )
            }));
          }
        }
      } catch (error) {
        // Silently handle JSON parsing errors and clear invalid data
        localStorage.removeItem('dashboardid');
      }
    };

    fetchDashboards();
  }, []);

  return (
    <Sidebar variant="sidebar" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Create New Page</span>
                </div>
              </a>
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
                  <a href={item.url} className="font-medium">
                    {item.title}
                  </a>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                    {item.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton asChild isActive={false}>
                          <a href={item.url}>{item.title}</a>
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
