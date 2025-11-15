import * as React from "react"
import { GalleryVerticalEnd } from "lucide-react"

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

// This is sample data.
const initialData = {
  navMain: [
    {
      title: "Create Page",
      url: "/app",
      items: [
      ],
    },
   
  ]
}



export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [data, setData] = React.useState(initialData);
  
  // Load data from localStorage on component mount
  React.useEffect(() => {
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
          .filter(item => item && typeof item === 'object' && item.title && item.uuid)
          .map(item => ({
            title: item.title,
            url: `/app/${item.uuid}`,
          }));
        
        if (newItems.length > 0) {
          setData(prevData => ({
            ...prevData,
            navMain: prevData.navMain.map(navItem => 
              navItem.title === "Create Page" 
                ? { ...navItem, items: [...navItem.items, ...newItems] }
                : navItem
            )
          }));
        }
      }
    } catch (error) {
      // Silently handle JSON parsing errors and clear invalid data
      localStorage.removeItem('dashboardid');
    }
  }, []);

  // Render-trick state to force re-render when navMain changes
  const [, setSidebarRerender] = React.useState(0);
  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
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
