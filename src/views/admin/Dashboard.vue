<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <h2 class="text-2xl font-bold text-gray-800 mb-6">数据仪表盘</h2>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">总工单</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">{{ stats.totalOrders }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#3b82f6"><Document /></el-icon>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">待处理</p>
            <p class="text-2xl font-bold text-yellow-600 mt-1">{{ stats.pendingOrders }}</p>
          </div>
          <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#ca8a04"><Clock /></el-icon>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">处理中</p>
            <p class="text-2xl font-bold text-blue-600 mt-1">{{ stats.processingOrders }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#2563eb"><Setting /></el-icon>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">已完成</p>
            <p class="text-2xl font-bold text-green-600 mt-1">{{ stats.completedOrders }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#16a34a"><CircleCheck /></el-icon>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">超时率</p>
            <p class="text-2xl font-bold text-red-600 mt-1">{{ stats.timeoutRate.toFixed(1) }}%</p>
          </div>
          <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#dc2626"><Warning /></el-icon>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">平均处理时长</p>
            <p class="text-2xl font-bold text-purple-600 mt-1">{{ formatDuration(stats.avgProcessingTime) }}</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#9333ea"><Timer /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-5">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">工单类型分布</h3>
        <div ref="pieChartRef" class="h-72"></div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-5">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">平均处理时长</h3>
        <div ref="barChartRef" class="h-72"></div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-5">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">维修人员评分排名</h3>
        <div class="space-y-3">
          <div
            v-for="item in staffRanking"
            :key="item.id"
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
              :class="{
                'bg-yellow-500': item.rank === 1,
                'bg-gray-400': item.rank === 2,
                'bg-amber-600': item.rank === 3,
                'bg-gray-300': item.rank > 3
              }"
            >
              {{ item.rank }}
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span class="font-medium text-gray-800">{{ item.name }}</span>
                <div class="flex items-center gap-1">
                  <el-rate v-model="item.avgRating" disabled :max="5" size="small" />
                  <span class="text-sm text-gray-500 ml-1">{{ item.avgRating.toFixed(1) }}</span>
                </div>
              </div>
              <p class="text-xs text-gray-500 mt-1">已完成 {{ item.completedCount }} 单</p>
            </div>
          </div>
        </div>
      </div>
      <div class="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">每月工单趋势</h3>
        <div ref="lineChartRef" class="h-72"></div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-5">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">超时率统计</h3>
      <div class="overflow-x-auto">
        <el-table :data="timeoutRateList" border stripe>
          <el-table-column prop="name" label="工单类型" width="120" />
          <el-table-column prop="total" label="总工单" width="100" align="center" />
          <el-table-column prop="timeout" label="超时工单" width="100" align="center">
            <template #default="{ row }">
              <span class="text-red-600 font-medium">{{ row.timeout }}</span>
            </template>
          </el-table-column>
          <el-table-column label="超时率" width="200">
            <template #default="{ row }">
              <div class="flex items-center gap-2">
                <el-progress
                  :percentage="row.rate"
                  :stroke-width="8"
                  :color="row.rate > 10 ? '#f56c6c' : row.rate > 5 ? '#e6a23c' : '#67c23a'"
                />
                <span class="text-sm">{{ row.rate.toFixed(1) }}%</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import {
  getDashboardStats,
  getOrdersByType,
  getAvgDuration,
  getStaffRanking,
  getMonthlyTrend,
  getTimeoutRate
} from '@/api/stats'
import { formatDuration } from '@/utils/format'
import type { DashboardStats } from '@shared/types'
import { Document, Clock, Setting, CircleCheck, Warning, Timer } from '@element-plus/icons-vue'

const pieChartRef = ref<HTMLElement>()
const barChartRef = ref<HTMLElement>()
const lineChartRef = ref<HTMLElement>()

let pieChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null
let lineChart: echarts.ECharts | null = null

const stats = ref<DashboardStats>({
  totalOrders: 0,
  pendingOrders: 0,
  processingOrders: 0,
  completedOrders: 0,
  timeoutCount: 0,
  timeoutRate: 0,
  avgProcessingTime: 0
})

const ordersByType = ref<{ type: string; name: string; value: number }[]>([])
const avgDuration = ref<{ type: string; name: string; avgHours: number }[]>([])
const staffRanking = ref<{ rank: number; id: string; name: string; avgRating: number; completedCount: number }[]>([])
const monthlyTrend = ref<{ month: string; count: number }[]>([])
const timeoutRateList = ref<{ type: string; name: string; total: number; timeout: number; rate: number }[]>([])

async function loadData() {
  const [
    statsData,
    ordersByTypeData,
    avgDurationData,
    staffRankingData,
    monthlyTrendData,
    timeoutRateData
  ] = await Promise.all([
    getDashboardStats(),
    getOrdersByType(),
    getAvgDuration(),
    getStaffRanking(),
    getMonthlyTrend(),
    getTimeoutRate()
  ])

  stats.value = statsData
  ordersByType.value = ordersByTypeData
  avgDuration.value = avgDurationData
  staffRanking.value = staffRankingData
  monthlyTrend.value = monthlyTrendData
  timeoutRateList.value = timeoutRateData
}

function initPieChart() {
  if (!pieChartRef.value) return

  pieChart = echarts.init(pieChartRef.value)
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'center'
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: ordersByType.value.map(item => ({
          value: item.value,
          name: item.name
        }))
      }
    ],
    color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452']
  }
  pieChart.setOption(option)
}

function initBarChart() {
  if (!barChartRef.value) return

  barChart = echarts.init(barChartRef.value)
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: '{b}: {c} 小时'
    },
    xAxis: {
      type: 'category',
      data: avgDuration.value.map(item => item.name),
      axisLabel: {
        interval: 0,
        rotate: 30
      }
    },
    yAxis: {
      type: 'value',
      name: '小时'
    },
    series: [
      {
        type: 'bar',
        data: avgDuration.value.map(item => item.avgHours),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' }
          ]),
          borderRadius: [8, 8, 0, 0]
        },
        barWidth: '50%'
      }
    ]
  }
  barChart.setOption(option)
}

function initLineChart() {
  if (!lineChartRef.value) return

  lineChart = echarts.init(lineChartRef.value)
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: monthlyTrend.value.map(item => item.month)
    },
    yAxis: {
      type: 'value',
      name: '工单数量'
    },
    series: [
      {
        type: 'line',
        data: monthlyTrend.value.map(item => item.count),
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: '#409eff'
        },
        itemStyle: {
          color: '#409eff'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.4)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
          ])
        }
      }
    ]
  }
  lineChart.setOption(option)
}

function handleResize() {
  pieChart?.resize()
  barChart?.resize()
  lineChart?.resize()
}

onMounted(async () => {
  await loadData()
  await nextTick()
  initPieChart()
  initBarChart()
  initLineChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  pieChart?.dispose()
  barChart?.dispose()
  lineChart?.dispose()
})
</script>

<style scoped>
.el-rate /deep/ .el-rate__icon {
  font-size: 14px;
}
</style>
