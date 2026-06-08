<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <h2 class="text-2xl font-bold text-gray-800 mb-6">回访统计</h2>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">总回访数</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">{{ stats.totalVisits }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#3b82f6"><Document /></el-icon>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">已完成数</p>
            <p class="text-2xl font-bold text-green-600 mt-1">{{ stats.completedVisits }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#16a34a"><CircleCheck /></el-icon>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">待完成数</p>
            <p class="text-2xl font-bold text-yellow-600 mt-1">{{ stats.pendingVisits }}</p>
          </div>
          <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#ca8a04"><Clock /></el-icon>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">完成率</p>
            <p class="text-2xl font-bold text-purple-600 mt-1">{{ (stats.completionRate * 100).toFixed(1) }}%</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#9333ea"><DataBoard /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">质量平均分</p>
            <div class="flex items-center gap-1 mt-1">
              <p class="text-2xl font-bold text-blue-600">{{ stats.avgQualityScore.toFixed(1) }}</p>
              <el-rate v-model="stats.avgQualityScore" disabled :max="5" size="small" />
            </div>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#3b82f6"><Tools /></el-icon>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">态度平均分</p>
            <div class="flex items-center gap-1 mt-1">
              <p class="text-2xl font-bold text-green-600">{{ stats.avgAttitudeScore.toFixed(1) }}</p>
              <el-rate v-model="stats.avgAttitudeScore" disabled :max="5" size="small" />
            </div>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#16a34a"><UserFilled /></el-icon>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">速度平均分</p>
            <div class="flex items-center gap-1 mt-1">
              <p class="text-2xl font-bold text-orange-600">{{ stats.avgSpeedScore.toFixed(1) }}</p>
              <el-rate v-model="stats.avgSpeedScore" disabled :max="5" size="small" />
            </div>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#ea580c"><Lightning /></el-icon>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">综合平均分</p>
            <div class="flex items-center gap-1 mt-1">
              <p class="text-2xl font-bold text-purple-600">{{ stats.avgOverallScore.toFixed(1) }}</p>
              <el-rate v-model="stats.avgOverallScore" disabled :max="5" size="small" />
            </div>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <el-icon :size="24" color="#9333ea"><Star /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-xl shadow-sm p-5">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">维修人员综合满意度排名</h3>
        <div class="overflow-x-auto">
          <el-table :data="staffRankingList" border stripe>
            <el-table-column label="排名" width="80" align="center">
              <template #default="{ $index }">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto"
                  :class="{
                    'bg-yellow-500': $index === 0,
                    'bg-gray-400': $index === 1,
                    'bg-amber-600': $index === 2,
                    'bg-gray-300': $index > 2
                  }"
                >
                  {{ $index + 1 }}
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="staffName" label="维修人员姓名" width="120" />
            <el-table-column prop="visitCount" label="回访次数" width="100" align="center" />
            <el-table-column label="质量分" width="100" align="center">
              <template #default="{ row }">
                <span class="font-medium text-blue-600">{{ row.avgQualityScore.toFixed(1) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="态度分" width="100" align="center">
              <template #default="{ row }">
                <span class="font-medium text-green-600">{{ row.avgAttitudeScore.toFixed(1) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="速度分" width="100" align="center">
              <template #default="{ row }">
                <span class="font-medium text-orange-600">{{ row.avgSpeedScore.toFixed(1) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="综合满意度" width="140" align="center">
              <template #default="{ row }">
                <div class="flex items-center justify-center gap-1">
                  <el-rate v-model="row.avgOverallScore" disabled :max="5" size="small" />
                  <span class="font-medium text-purple-600">{{ row.avgOverallScore.toFixed(1) }}</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-5">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">各维修人员综合满意度对比</h3>
        <div ref="barChartRef" class="h-96"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { getReturnVisitStats, getReturnVisits } from '@/api/returnVisits'
import type { ReturnVisitStats, ReturnVisit } from '@shared/types'
import { Document, CircleCheck, Clock, DataBoard, Tools, Lightning, Star } from '@element-plus/icons-vue'

const barChartRef = ref<HTMLElement>()
let barChart: echarts.ECharts | null = null

const stats = ref<ReturnVisitStats>({
  totalVisits: 0,
  completedVisits: 0,
  pendingVisits: 0,
  completionRate: 0,
  avgQualityScore: 0,
  avgAttitudeScore: 0,
  avgSpeedScore: 0,
  avgOverallScore: 0,
  byStaff: []
})

interface StaffRankingItem {
  staffId: string
  staffName: string
  visitCount: number
  avgQualityScore: number
  avgAttitudeScore: number
  avgSpeedScore: number
  avgOverallScore: number
}

const staffRankingList = ref<StaffRankingItem[]>([])

async function calculateStaffScores() {
  try {
    const res = await getReturnVisits({ status: 'completed', pageSize: 1000 })
    const completedVisits = res.data

    const staffMap = new Map<string, {
      name: string
      qualityScores: number[]
      attitudeScores: number[]
      speedScores: number[]
    }>()

    completedVisits.forEach((visit: ReturnVisit) => {
      if (!staffMap.has(visit.staffId)) {
        staffMap.set(visit.staffId, {
          name: visit.staffName,
          qualityScores: [],
          attitudeScores: [],
          speedScores: []
        })
      }
      const staff = staffMap.get(visit.staffId)!
      staff.qualityScores.push(visit.qualityScore)
      staff.attitudeScores.push(visit.attitudeScore)
      staff.speedScores.push(visit.speedScore)
    })

    const list: StaffRankingItem[] = []
    staffMap.forEach((data, staffId) => {
      const avgQuality = data.qualityScores.reduce((a, b) => a + b, 0) / data.qualityScores.length
      const avgAttitude = data.attitudeScores.reduce((a, b) => a + b, 0) / data.attitudeScores.length
      const avgSpeed = data.speedScores.reduce((a, b) => a + b, 0) / data.speedScores.length
      const avgOverall = avgQuality * 0.4 + avgAttitude * 0.3 + avgSpeed * 0.3

      list.push({
        staffId,
        staffName: data.name,
        visitCount: data.qualityScores.length,
        avgQualityScore: avgQuality,
        avgAttitudeScore: avgAttitude,
        avgSpeedScore: avgSpeed,
        avgOverallScore: avgOverall
      })
    })

    list.sort((a, b) => b.avgOverallScore - a.avgOverallScore)
    staffRankingList.value = list
  } catch (e) {
    console.error('计算维修人员评分失败', e)
  }
}

async function loadData() {
  try {
    const [statsData] = await Promise.all([
      getReturnVisitStats(),
      calculateStaffScores()
    ])
    stats.value = statsData
  } catch (e) {
    console.error('加载统计数据失败', e)
  }
}

function initBarChart() {
  if (!barChartRef.value) return

  barChart = echarts.init(barChartRef.value)

  const staffNames = staffRankingList.value.map(item => item.staffName)
  const overallScores = staffRankingList.value.map(item => item.avgOverallScore)
  const qualityScores = staffRankingList.value.map(item => item.avgQualityScore)
  const attitudeScores = staffRankingList.value.map(item => item.avgAttitudeScore)
  const speedScores = staffRankingList.value.map(item => item.avgSpeedScore)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        let result = `${params[0].axisValue}<br/>`
        params.forEach((p: any) => {
          result += `${p.marker} ${p.seriesName}: ${p.value.toFixed(2)}<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['综合满意度', '质量分', '态度分', '速度分'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: staffNames,
      axisLabel: {
        interval: 0,
        rotate: 0
      }
    },
    yAxis: {
      type: 'value',
      name: '评分',
      min: 0,
      max: 5,
      interval: 1,
      axisLabel: {
        formatter: '{value}'
      }
    },
    series: [
      {
        name: '综合满意度',
        type: 'bar',
        data: overallScores,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#9333ea' },
            { offset: 1, color: '#a855f7' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '15%'
      },
      {
        name: '质量分',
        type: 'bar',
        data: qualityScores,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#60a5fa' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '15%'
      },
      {
        name: '态度分',
        type: 'bar',
        data: attitudeScores,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#10b981' },
            { offset: 1, color: '#34d399' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '15%'
      },
      {
        name: '速度分',
        type: 'bar',
        data: speedScores,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#f59e0b' },
            { offset: 1, color: '#fbbf24' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '15%'
      }
    ]
  }

  barChart.setOption(option)
}

function handleResize() {
  barChart?.resize()
}

onMounted(async () => {
  await loadData()
  await nextTick()
  initBarChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  barChart?.dispose()
})
</script>

<style scoped>
.el-rate /deep/ .el-rate__icon {
  font-size: 14px;
}
</style>
