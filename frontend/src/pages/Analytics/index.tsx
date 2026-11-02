import { useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import {
  Database,
  Eye,
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
  CheckCircle,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/utils'
import type { HotDocument, KnowledgeGap } from '@/types'

// Metric Card Component
interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: number
  trendLabel?: string
  iconBgColor?: string
}

function MetricCard({ title, value, icon, trend, trendLabel, iconBgColor = 'bg-primary-50' }: MetricCardProps) {
  const trendColor = trend && trend > 0 ? 'text-green-600' : trend && trend < 0 ? 'text-red-600' : 'text-slate-500'
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{typeof value === 'number' ? formatNumber(value) : value}</p>
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1 mt-1 text-sm', trendColor)}>
              <TrendIcon className="w-4 h-4" />
              <span>{Math.abs(trend)}%</span>
              {trendLabel && <span className="text-slate-400">{trendLabel}</span>}
            </div>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', iconBgColor)}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

// Hot Document Item Component
function HotDocumentItem({ document, rank }: { document: HotDocument; rank: number }) {
  const TrendIcon = document.trend === 'up' ? TrendingUp : document.trend === 'down' ? TrendingDown : Minus
  const trendColor = document.trend === 'up' ? 'text-green-500' : document.trend === 'down' ? 'text-red-500' : 'text-slate-400'

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 hover:bg-slate-50 rounded-lg transition-colors">
      <span className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold',
        rank <= 3 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
      )}>
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{document.title}</p>
        <p className="text-xs text-slate-400">{formatNumber(document.views)} 次访问</p>
      </div>
      <TrendIcon className={cn('w-4 h-4', trendColor)} />
    </div>
  )
}

// Knowledge Gap Item Component
function KnowledgeGapItem({ gap }: { gap: KnowledgeGap }) {
  const priorityConfig = {
    urgent: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', label: '紧急' },
    medium: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200', label: '中等' },
    low: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', label: '一般' },
  }

  const statusConfig = {
    identified: { icon: AlertTriangle, text: '待处理' },
    processing: { icon: RefreshCw, text: '处理中' },
    resolved: { icon: CheckCircle, text: '已解决' },
  }

  const config = priorityConfig[gap.priority]
  const StatusIcon = statusConfig[gap.status].icon

  return (
    <div className={cn('flex items-center gap-3 py-2.5 px-3 rounded-lg border', config.bg, config.border)}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{gap.keyword}</p>
        <p className="text-xs text-slate-400">{formatNumber(gap.searchCount)} 次搜索</p>
      </div>
      <Badge variant={gap.priority === 'urgent' ? 'destructive' : gap.priority === 'medium' ? 'warning' : 'secondary'}>
        {config.label}
      </Badge>
      <div className="flex items-center gap-1 text-xs text-slate-400">
        <StatusIcon className={cn('w-3.5 h-3.5', gap.status === 'processing' && 'animate-spin')} />
        <span>{statusConfig[gap.status].text}</span>
      </div>
    </div>
  )
}

export default function Analytics() {
  const {
    statistics,
    usageTrend,
    kbDistribution,
    parsingEfficiency,
    hotDocuments,
    knowledgeGaps,
    isLoading,
    fetchAll,
  } = useAnalyticsStore()

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  if (isLoading && !statistics) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 bg-slate-50/50">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="知识总量"
            value={statistics?.totalDocuments ?? 0}
            icon={<Database className="w-6 h-6 text-primary" />}
            trend={statistics?.growthRate.documents}
            trendLabel="较上月"
            iconBgColor="bg-primary-50"
          />
          <MetricCard
            title="本月访问量"
            value={statistics?.monthlyVisits ?? 0}
            icon={<Eye className="w-6 h-6 text-accent-blue" />}
            trend={statistics?.growthRate.visits}
            trendLabel="较上月"
            iconBgColor="bg-blue-50"
          />
          <MetricCard
            title="活跃用户"
            value={statistics?.activeUsers ?? 0}
            icon={<Users className="w-6 h-6 text-accent-purple" />}
            trend={statistics?.growthRate.users}
            trendLabel="较上月"
            iconBgColor="bg-purple-50"
          />
          <MetricCard
            title="准确率"
            value={`${statistics?.accuracy ?? 0}%`}
            icon={<Target className="w-6 h-6 text-accent-yellow" />}
            iconBgColor="bg-yellow-50"
          />
        </div>

        {/* Main Content: Charts + Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Side: Charts */}
          <div className="lg:col-span-2 space-y-4">
            {/* Usage Trend Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  知识使用热度趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={usageTrend} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="visits"
                        name="访问量"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="searches"
                        name="搜索量"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="downloads"
                        name="下载量"
                        stroke="#d946ef"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Two Charts in Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* KB Distribution Pie Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">知识库分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={kbDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {kbDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 mt-2">
                    {kbDistribution.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-slate-600">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Parsing Efficiency Bar Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">解析效率统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={parsingEfficiency} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="success" name="成功" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="failed" name="失败" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Side: Rankings */}
          <div className="space-y-4">
            {/* Hot Documents TOP10 */}
            <Card className="h-[calc(50%-8px)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  热门知识 TOP10
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-1 max-h-[280px] overflow-y-auto">
                  {hotDocuments.map((doc, index) => (
                    <HotDocumentItem key={doc.id} document={doc} rank={index + 1} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Knowledge Gaps */}
            <Card className="h-[calc(50%-8px)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-accent-yellow" />
                  知识缺口识别
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {knowledgeGaps.map((gap) => (
                    <KnowledgeGapItem key={gap.id} gap={gap} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}