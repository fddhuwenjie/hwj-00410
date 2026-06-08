<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <h2 class="text-2xl font-bold text-gray-800 mb-6">物料消耗统计</h2>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <div
        v-for="item in categorySummary"
        :key="item.category"
        class="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">{{ item.category }}</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">{{ item.total_stock }}</p>
            <p class="text-xs text-gray-400 mt-1">总库存</p>
          </div>
          <div
            class="w-12 h-12 rounded-lg flex items-center justify-center"
            :class="item.low_stock_count > 0 ? 'bg-red-100' : 'bg-green-100'"
          >
            <el-icon
              :size="24"
              :color="item.low_stock_count > 0 ? '#dc2626' : '#16a34a'"
            >
              <Warning v-if="item.low_stock_count > 0" />
              <CircleCheck v-else />
            </el-icon>
          </div>
        </div>
        <div class="mt-4 pt-4 border-t">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">物料种类</span>
            <span class="font-medium">{{ item.material_count }}</span>
          </div>
          <div class="flex items-center justify-between text-sm mt-2">
            <span class="text-gray-500">库存不足</span>
            <span :class="item.low_stock_count > 0 ? 'text-red-600 font-medium' : 'text-green-600'">
              {{ item.low_stock_count }} 种
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-5">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">月度消耗趋势</h3>
        <div ref="lineChartRef" class="h-72"></div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-5">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">分类消耗占比（近6个月）</h3>
        <div ref="pieChartRef" class="h-72"></div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-5">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">月度消耗明细</h3>
      <div class="overflow-x-auto">
        <el-table :data="tableData" border stripe>
          <el-table-column prop="month" label="月份" width="120" />
          <el-table-column prop="category" label="分类" width="100">
            <template #default="{ row }">
              <el-tag type="primary">{{ row.category }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="quantity" label="消耗量" width="120" align="center">
            <template #default="{ row }">
              {{ row.quantity }}
            </template>
          </el-table-column>
          <el-table-column label="消耗金额" width="140" align="center">
            <template #default="{ row }">
              <span class="font-medium">¥{{ row.amount.toFixed(2) }}</span>
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
import { getMonthlyMaterialUsage, getCategorySummary } from '@/api/materials'
import type { MonthlyMaterialStats, MaterialCategory } from '@shared/types'
import { Warning, CircleCheck } from '@element-plus/icons-vue'

const lineChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()

let lineChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

const categorySummary = ref<{
  category: MaterialCategory
  material_count: number
  total_stock: number
  low_stock_count: number
}[]>([])

const monthlyUsage = ref<MonthlyMaterialStats[]>([])
const tableData = ref<MonthlyMaterialStats[]>([])

async function loadData() {
  const [summary, usage] = await Promise.all([
    getCategorySummary(),
    getMonthlyMaterialUsage(6)
  ])
  
  categorySummary.value = summary
  monthlyUsage.value = usage
  tableData.value = [...usage].reverse()
}

function initLineChart() {
  if (!lineChartRef.value) return

  const months = Array.from(new Set(monthlyUsage.value.map(item => item.month))).sort()
  const categories: MaterialCategory[] = ['管件', '电料', '五金']

  const series = categories.map(category => ({
    name: category,
    type: 'line' as const,
    smooth: true,
    symbol: 'circle',
    symbolSize: 8,
    data: months.map(month => {
      const item = monthlyUsage.value.find(m => m.month === month && m.category === category)
      return item ? item.amount : 0
    })
  }))

  lineChart = echarts.init(lineChartRef.value)
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = `${params[0].axisValue}<br/>`
        params.forEach((p: any) => {
          result += `${p.marker} ${p.seriesName}: ¥${p.value.toFixed(2)}<br/>`
        })
        return result
      }
    },
    legend: {
      data: categories,
      bottom: 0
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: months
    },
    yAxis: {
      type: 'value',
      name: '金额(元)'
    },
    color: ['#3b82f6', '#10b981', '#f59e0b'],
    series
  }
  lineChart.setOption(option)
}

function initPieChart() {
  if (!pieChartRef.value) return

  const categories: MaterialCategory[] = ['管件', '电料', '五金']
  const data = categories.map(category => {
    const total = monthlyUsage.value
      .filter(m => m.category === category)
      .reduce((sum, m) => sum + m.amount, 0)
    return {
      name: category,
      value: total
    }
  })

  pieChart = echarts.init(pieChartRef.value)
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c.toFixed(2)} ({d}%)'
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
        data,
        color: ['#3b82f6', '#10b981', '#f59e0b']
      }
    ]
  }
  pieChart.setOption(option)
}

function handleResize() {
  lineChart?.resize()
  pieChart?.resize()
}

onMounted(async () => {
  await loadData()
  await nextTick()
  initLineChart()
  initPieChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  lineChart?.dispose()
  pieChart?.dispose()
})
</script>
