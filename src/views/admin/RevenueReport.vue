<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800">月度营收报表</h2>
      <el-date-picker
        v-model="selectedMonth"
        type="month"
        placeholder="选择月份"
        value-format="YYYY-MM"
        @change="onMonthChange"
        style="width: 180px"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">总营收</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">{{ formatCurrency(revenueStats.totalRevenue) }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#3b82f6"><Money /></el-icon>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">人工费营收</p>
            <p class="text-2xl font-bold text-green-600 mt-1">{{ formatCurrency(revenueStats.laborRevenue) }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#16a34a"><User /></el-icon>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">物料费营收</p>
            <p class="text-2xl font-bold text-orange-600 mt-1">{{ formatCurrency(revenueStats.materialRevenue) }}</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#ea580c"><Goods /></el-icon>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">上门费营收</p>
            <p class="text-2xl font-bold text-purple-600 mt-1">{{ formatCurrency(revenueStats.visitFeeRevenue) }}</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#9333ea"><LocationFilled /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-5">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">费用类型占比</h3>
        <div ref="pieChartRef" class="h-72"></div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-5">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">按楼栋收入统计</h3>
        <div ref="barChartRef" class="h-72"></div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-5">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">每日收入趋势</h3>
      <div ref="lineChartRef" class="h-80"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { getRevenueStats } from '@/api/bills'
import { formatCurrency } from '@/utils/format'
import type { MonthlyRevenueStats } from '@shared/types'
import { Money, User, Goods, LocationFilled } from '@element-plus/icons-vue'

const pieChartRef = ref<HTMLElement>()
const barChartRef = ref<HTMLElement>()
const lineChartRef = ref<HTMLElement>()

let pieChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null
let lineChart: echarts.ECharts | null = null

const selectedMonth = ref(dayjs().format('YYYY-MM'))
const revenueStats = ref<MonthlyRevenueStats>({
  totalRevenue: 0,
  laborRevenue: 0,
  materialRevenue: 0,
  visitFeeRevenue: 0,
  byBuilding: [],
  byDate: []
})

async function loadData() {
  try {
    revenueStats.value = await getRevenueStats({ month: selectedMonth.value })
    await nextTick()
    updateCharts()
  } catch (e) {
    console.error('加载营收数据失败', e)
  }
}

function initPieChart() {
  if (!pieChartRef.value) return

  pieChart = echarts.init(pieChartRef.value)
  updatePieChart()
}

function updatePieChart() {
  if (!pieChart) return

  const pieData = [
    { value: revenueStats.value.laborRevenue, name: '人工费' },
    { value: revenueStats.value.materialRevenue, name: '物料费' },
    { value: revenueStats.value.visitFeeRevenue, name: '上门费' }
  ]

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `${params.name}: ${formatCurrency(params.value)} (${params.percent}%)`
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
            fontSize: 18,
            fontWeight: 'bold',
            formatter: (params: any) => `${params.name}\n${formatCurrency(params.value)}`
          }
        },
        labelLine: {
          show: false
        },
        data: pieData
      }
    ],
    color: ['#16a34a', '#ea580c', '#9333ea']
  }
  pieChart.setOption(option)
}

function initBarChart() {
  if (!barChartRef.value) return

  barChart = echarts.init(barChartRef.value)
  updateBarChart()
}

function updateBarChart() {
  if (!barChart) return

  const buildingData = revenueStats.value.byBuilding

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => `${params[0].name}: ${formatCurrency(params[0].value)}`
    },
    xAxis: {
      type: 'category',
      data: buildingData.map(item => item.building + '号楼'),
      axisLabel: {
        interval: 0,
        rotate: 30
      }
    },
    yAxis: {
      type: 'value',
      name: '金额',
      axisLabel: {
        formatter: (value: number) => '¥' + value
      }
    },
    series: [
      {
        type: 'bar',
        data: buildingData.map(item => item.amount),
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
  updateLineChart()
}

function updateLineChart() {
  if (!lineChart) return

  const dateData = revenueStats.value.byDate

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => `${params[0].name}: ${formatCurrency(params[0].value)}`
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dateData.map(item => item.date),
      axisLabel: {
        interval: Math.floor(dateData.length / 10)
      }
    },
    yAxis: {
      type: 'value',
      name: '金额',
      axisLabel: {
        formatter: (value: number) => '¥' + value
      }
    },
    series: [
      {
        type: 'line',
        data: dateData.map(item => item.amount),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
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

function updateCharts() {
  updatePieChart()
  updateBarChart()
  updateLineChart()
}

function handleResize() {
  pieChart?.resize()
  barChart?.resize()
  lineChart?.resize()
}

function onMonthChange() {
  loadData()
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
