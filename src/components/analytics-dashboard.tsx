
'use client';

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Eye, Heart, Share2, TrendingUp, BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react';

const engagementData: { date: string; likes: number; shares: number; impressions: number; }[] = [];

const engagementChartConfig = {
  impressions: {
    label: 'Impressions',
    color: 'hsl(var(--chart-3))',
    icon: Eye,
  },
  likes: {
    label: 'Likes',
    color: 'hsl(var(--primary))',
    icon: Heart,
  },
   shares: {
    label: 'Shares',
    color: 'hsl(var(--chart-2))',
    icon: Share2,
  },
} satisfies ChartConfig;

const revenueData: { source: string; revenue: number; }[] = [];

const revenueChartConfig = {
    revenue: {
      label: "Revenue (USD)",
    },
    prints: {
      label: "Prints",
      color: "hsl(var(--chart-1))",
    },
    commissions: {
      label: "Commissions",
      color: "hsl(var(--chart-2))",
    },
    digital: {
      label: "Digital",
      color: "hsl(var(--chart-3))",
    },
    auctions: {
      label: "Auctions",
      color: "hsl(var(--chart-4))",
    },
} satisfies ChartConfig

const topContentData: { id: string; title: string; imageUrl: string; imageAiHint: string; likes: number; shares: number; views: number; commentsCount: number; }[] = [];

const demographicsData: { location: string; followers: number; fill: string; }[] = [];

const demographicsChartConfig = {
    followers: {
      label: "Followers",
    },
    usa: {
      label: "USA",
      color: "hsl(var(--chart-1))",
    },
    europe: {
      label: "Europe",
      color: "hsl(var(--chart-2))",
    },
    canada: {
      label: "Canada",
      color: "hsl(var(--chart-3))",
    },
    other: {
      label: "Other",
      color: "hsl(var(--chart-4))",
    },
} satisfies ChartConfig

export function AnalyticsDashboard() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No likes yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Follower Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+0</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No shares yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ad Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">No active campaigns</p>
          </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Engagement Over Time</CardTitle>
                    <CardDescription>Impressions, likes, and shares over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    {engagementData.length > 0 ? (
                        <ChartContainer config={engagementChartConfig} className="h-[300px] w-full">
                            <LineChart accessibilityLayer data={engagementData} margin={{ left: 12, right: 12 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Line dataKey="impressions" type="natural" stroke="var(--color-impressions)" strokeWidth={2} dot={{ r: 4 }} />
                                <Line dataKey="likes" type="natural" stroke="var(--color-likes)" strokeWidth={2} dot={{ r: 4 }} />
                                <Line dataKey="shares" type="natural" stroke="var(--color-shares)" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        </ChartContainer>
                    ) : (
                        <div className="flex h-[300px] w-full items-center justify-center rounded-lg border border-dashed">
                            <div className="text-center">
                                <LineChartIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-4 text-sm text-muted-foreground">Post content to see engagement analytics.</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Revenue by Source</CardTitle>
                    <CardDescription>Last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                    {revenueData.length > 0 ? (
                        <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
                            <BarChart accessibilityLayer data={revenueData} layout="vertical" margin={{ left: 10, right: 60 }}>
                                <XAxis type="number" dataKey="revenue" hide />
                                <YAxis
                                    width={90}
                                    dataKey="source"
                                    type="category"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tickFormatter={(value) => revenueChartConfig[value.toLowerCase() as keyof typeof revenueChartConfig]?.label}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent hideLabel />}
                                />
                                <Bar dataKey="revenue" layout="vertical" radius={5}>
                                    {revenueData.map((entry) => (
                                        <Cell key={`cell-${entry.source}`} fill={`var(--color-${entry.source.toLowerCase()})`} />
                                    ))}
                                    <LabelList 
                                        dataKey="revenue" 
                                        position="right" 
                                        offset={8} 
                                        className="fill-foreground text-sm" 
                                        formatter={(value: number) => `$${value.toLocaleString()}`} 
                                    />
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    ) : (
                         <div className="flex h-[300px] w-full items-center justify-center rounded-lg border border-dashed">
                            <div className="text-center">
                                <BarChartIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-4 text-sm text-muted-foreground">Sell products to see revenue analytics.</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

       <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Top Performing Content</CardTitle>
                    <CardDescription>
                    Your most popular posts based on views and comments.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Artwork</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead className="text-right">Views</TableHead>
                                <TableHead className="text-right">Comments</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topContentData.length > 0 ? (
                                topContentData.map((post) => (
                                    <TableRow key={post.id}>
                                        <TableCell>
                                            <Image
                                                src={post.imageUrl}
                                                alt={post.title}
                                                width={40}
                                                height={40}
                                                className="rounded-md"
                                                data-ai-hint={post.imageAiHint}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{post.title}</TableCell>
                                        <TableCell className="text-right">{post.views.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{post.commentsCount.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No content posted yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                  <CardTitle>Follower Demographics</CardTitle>
                  <CardDescription>Top locations of your followers</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-0">
                  {demographicsData.length > 0 ? (
                    <ChartContainer
                        config={demographicsChartConfig}
                        className="mx-auto aspect-square h-[250px]"
                    >
                        <PieChart>
                            <ChartTooltip content={<ChartTooltipContent nameKey="followers" hideLabel />} />
                            <Pie
                                data={demographicsData}
                                dataKey="followers"
                                nameKey="location"
                                innerRadius={60}
                                strokeWidth={5}
                            >
                                {demographicsData.map((entry) => (
                                    <Cell key={`cell-${entry.location}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <ChartLegend
                                content={<ChartLegendContent nameKey="location" />}
                                className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                            />
                        </PieChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-[250px] w-full items-center justify-center rounded-lg border border-dashed">
                        <div className="text-center">
                            <PieChartIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p className="mt-4 text-sm text-muted-foreground">Gain followers to see demographics.</p>
                        </div>
                    </div>
                  )}
              </CardContent>
          </Card>
       </div>
    </div>
  );
}
