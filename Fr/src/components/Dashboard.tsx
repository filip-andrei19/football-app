import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Activity, CreditCard, DollarSign, Users } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6 pb-24 sm:pb-8">
      
      {/* HEADER TACTIC */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button className="w-full sm:w-auto">Download Report</Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        {/* TABS RESPONSIVE: Scroll pe mobil dacă nu încap */}
        <div className="overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-full justify-start sm:justify-center sm:w-auto inline-flex min-w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
        </div>
        
        <TabsContent value="overview" className="space-y-4">
          {/* STATS GRID: 1 col pe mobil, 2 pe tableta, 4 pe desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Stat Card 1 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,231.89</div>
                <p className="text-xs text-muted-foreground">+20.1% from last month</p>
              </CardContent>
            </Card>

            {/* Stat Card 2 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Collectors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+2350</div>
                <p className="text-xs text-muted-foreground">+180.1% from last month</p>
              </CardContent>
            </Card>

            {/* Stat Card 3 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+12,234</div>
                <p className="text-xs text-muted-foreground">+19% from last month</p>
              </CardContent>
            </Card>
            
             {/* Stat Card 4 */}
             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Now</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+573</div>
                <p className="text-xs text-muted-foreground">+201 since last hour</p>
              </CardContent>
            </Card>
          </div>

          {/* MAIN CHARTS GRID: 1 col pe mobil, 7 cols sparte pe desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            
            {/* Main Chart Area */}
            <Card className="col-span-1 lg:col-span-4">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2 pr-2 sm:pr-6">
                {/* Aici poți pune componenta <ChartContainer> din chart.tsx dacă ai recharts */}
                <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-muted/20 rounded-md text-xs sm:text-sm px-4 text-center">
                   Chart Placeholder (Install Recharts)
                </div>
              </CardContent>
            </Card>

            {/* Recent Sales / Activity */}
            <Card className="col-span-1 lg:col-span-3">
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>You made 265 sales this month.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 sm:space-y-8">
                  {/* Item 1 */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 overflow-hidden rounded-full bg-slate-200"></span>
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium leading-none truncate">Olivia Martin</p>
                      <p className="text-[10px] sm:text-sm text-muted-foreground truncate">olivia.martin@email.com</p>
                    </div>
                    <div className="font-medium text-xs sm:text-sm shrink-0">+$1,999.00</div>
                  </div>
                  {/* Item 2 */}
                   <div className="flex items-center gap-3 sm:gap-4">
                    <span className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 overflow-hidden rounded-full bg-slate-200"></span>
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium leading-none truncate">Jackson Lee</p>
                      <p className="text-[10px] sm:text-sm text-muted-foreground truncate">jackson.lee@email.com</p>
                    </div>
                    <div className="font-medium text-xs sm:text-sm shrink-0">+$39.00</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}