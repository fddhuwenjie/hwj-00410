<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <h2 class="text-2xl font-bold text-gray-800 mb-6">知识库统计</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">总文章数</p>
            <p class="text-3xl font-bold text-gray-800 mt-1">{{ stats.totalArticles }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#3b82f6"><Document /></el-icon>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">总浏览量</p>
            <p class="text-3xl font-bold text-gray-800 mt-1">{{ stats.totalViews }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#10b981"><View /></el-icon>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">总点赞数</p>
            <p class="text-3xl font-bold text-gray-800 mt-1">{{ stats.totalHelpful }}</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#f59e0b"><Star /></el-icon>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">自助解决率</p>
            <p class="text-3xl font-bold text-gray-800 mt-1">{{ selfServiceRatePercent }}%</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#8b5cf6"><CircleCheck /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-5">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">文章分类占比</h3>
        <div ref="pieChartRef" class="h-72"></div>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-5">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">热门文章浏览量 TOP10</h3>
        <div ref="barChartRef" class="h-72"></div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-5">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">自助解决统计</h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-green-50 rounded-xl p-4 text-center">
            <p class="text-sm text-gray-500">自助解决数</p>
            <p class="text-3xl font-bold text-green-600 mt-2">{{ stats.selfServiceCount }}</p>
          </div>
          <div class="bg-blue-50 rounded-xl p-4 text-center">
            <p class="text-sm text-gray-500">总咨询数</p>
            <p class="text-3xl font-bold text-blue-600 mt-2">{{ stats.totalConsultations }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-5">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">热门文章 TOP10</h3>
        <el-table :data="stats.topArticles" border stripe height="280">
          <el-table-column prop="title" label="标题" min-width="150" show-overflow-tooltip />
          <el-table-column label="分类" width="100">
            <template #default="{ row }">
              <el-tag size="small" type="primary">{{ KnowledgeCategoryMap[row.category as KnowledgeCategory] }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="viewCount" label="浏览量" width="80" align="center" />
          <el-table-column prop="helpfulCount" label="点赞数" width="80" align="center" />
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { getKnowledgeStats } from '@/api/knowledge'
import { KnowledgeCategoryMap } from '@shared/types'
import type { KnowledgeStats, KnowledgeCategory } from '@shared/types'
import { Document, View, Star, CircleCheck } from '@element-plus/icons-vue'

const pieChartRef = ref<HTMLElement>()
const barChartRef = ref<HTMLElement>()

let pieChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null

const stats = ref<KnowledgeStats>({
  totalArticles: 0,
  totalViews: 0,
  totalHelpful: 0,
  selfServiceCount: 0,
  totalConsultations: 0,
  selfServiceRate: 0,
  topArticles: []
})

const selfServiceRatePercent = computed(() => {
  return (stats.value.selfServiceRate * 100).toFixed(1)
})

async function loadData() {
  const data = await getKnowledgeStats()
  stats.value = data
}

function initPieChart() {
  if (!pieChartRef.value) return

  const categoryCounts: Record<KnowledgeCategory, number> = {
    water: 0,
    electric: 0,
    door_window: 0,
    public: 0,
    other: 0
  }

  stats.value.topArticles.forEach(article => {
    categoryCounts[article.category]++
  })

  const data = Object.entries(categoryCounts)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => ({
      name: KnowledgeCategoryMap[category as KnowledgeCategory],
      value: count
    }))

  pieChart = echarts.init(pieChartRef.value)
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}篇 ({d}%)'
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
        center: ['65%', '50%'],
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
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data,
        color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
      }
    ]
  }
  pieChart.setOption(option)
}

function initBarChart() {
  if (!barChartRef.value) return

  const top10 = [...stats.value.topArticles]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 10)

  const titles = top10.map(item => item.title.length > 10 ? item.title.slice(0, 10) + '...' : item.title)
  const viewCounts = top10.map(item => item.viewCount)

  barChart = echarts.init(barChartRef.value)
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '浏览量'
    },
    yAxis: {
      type: 'category',
      data: titles,
      axisLabel: {
        interval: 0,
        rotate: 0
      }
    },
    series: [
      {
        type: 'bar',
        data: viewCounts,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#60a5fa' },
            { offset: 1, color: '#3b82f6' }
          ]),
          borderRadius: [0, 4, 4, 0]
        },
        barWidth: 20
      }
    ]
  }
  barChart.setOption(option)
}

function handleResize() {
  pieChart?.resize()
  barChart?.resize()
}

onMounted(async () => {
  await loadData()
  await nextTick()
  initPieChart()
  initBarChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  pieChart?.dispose()
  barChart?.dispose()
})
</script>
