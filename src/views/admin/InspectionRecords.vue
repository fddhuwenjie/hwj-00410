<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800">巡检记录</h2>
      <el-button @click="loadRecords">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-5 mb-6">
      <div class="flex flex-wrap gap-4 items-end">
        <el-form-item label="巡检计划" class="mb-0">
          <el-select v-model="filterPlanId" placeholder="全部计划" clearable style="width: 180px">
            <el-option
              v-for="plan in plans"
              :key="plan.id"
              :label="plan.name"
              :value="plan.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="巡检人员" class="mb-0">
          <el-select v-model="filterStaffId" placeholder="全部人员" clearable style="width: 140px">
            <el-option
              v-for="staff in staffList"
              :key="staff.id"
              :label="staff.name"
              :value="staff.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围" class="mb-0">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 280px"
          />
        </el-form-item>
        <el-button type="primary" @click="loadRecords">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm">
      <el-table :data="records" border stripe v-loading="loading">
        <el-table-column label="日期" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="巡检计划" min-width="160">
          <template #default="{ row }">
            {{ row.plan?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="巡检人员" width="100">
          <template #default="{ row }">
            {{ row.staff?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="area" label="巡检区域" min-width="180" />
        <el-table-column label="巡检结果" width="140">
          <template #default="{ row }">
            <el-tag v-if="row.abnormalCount === 0" type="success">
              全部正常
            </el-tag>
            <el-tag v-else type="danger">
              {{ row.abnormalCount }}项异常
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="巡检项目" min-width="300">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-1">
              <el-tag
                v-for="item in row.itemsResult"
                :key="item.item"
                size="small"
                :type="item.status === 'normal' ? 'success' : 'danger'"
              >
                {{ item.item }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end p-4">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadRecords"
          @current-change="loadRecords"
        />
      </div>
    </div>

    <el-dialog
      v-model="detailVisible"
      title="巡检记录详情"
      width="600px"
    >
      <div v-if="currentRecord">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-gray-500">巡检计划</span>
            <span class="font-medium">{{ currentRecord.plan?.name || '-' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">巡检人员</span>
            <span class="font-medium">{{ currentRecord.staff?.name || '-' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">巡检区域</span>
            <span class="font-medium">{{ currentRecord.area }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">巡检时间</span>
            <span class="font-medium">{{ formatDate(currentRecord.createdAt) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">巡检结果</span>
            <el-tag :type="currentRecord.abnormalCount === 0 ? 'success' : 'danger'">
              {{ currentRecord.abnormalCount === 0 ? '全部正常' : `${currentRecord.abnormalCount}项异常` }}
            </el-tag>
          </div>
          <div class="pt-4 border-t">
            <h4 class="font-medium mb-3">巡检项目详情</h4>
            <div class="space-y-2">
              <div
                v-for="item in currentRecord.itemsResult"
                :key="item.item"
                class="flex items-center justify-between p-3 rounded-lg"
                :class="item.status === 'normal' ? 'bg-green-50' : 'bg-red-50'"
              >
                <div class="flex items-center gap-2">
                  <el-icon
                    :color="item.status === 'normal' ? '#16a34a' : '#dc2626'"
                  >
                    <CircleCheck v-if="item.status === 'normal'" />
                    <CircleClose v-else />
                  </el-icon>
                  <span class="font-medium">{{ item.item }}</span>
                </div>
                <span v-if="item.remark" class="text-sm text-gray-500">
                  {{ item.remark }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getInspectionRecords, getInspectionPlans } from '@/api/inspections'
import { getStaffList } from '@/api/staff'
import { formatDate } from '@/utils/format'
import type { InspectionRecord, InspectionPlan, Staff } from '@shared/types'
import { Refresh, Search, View, CircleCheck, CircleClose } from '@element-plus/icons-vue'

const loading = ref(false)
const records = ref<InspectionRecord[]>([])
const plans = ref<InspectionPlan[]>([])
const staffList = ref<Staff[]>([])

const filterPlanId = ref('')
const filterStaffId = ref('')
const dateRange = ref<string[]>([])

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const detailVisible = ref(false)
const currentRecord = ref<InspectionRecord | null>(null)

async function loadPlans() {
  const res = await getInspectionPlans({ pageSize: 100 })
  plans.value = res.data
}

async function loadStaff() {
  staffList.value = await getStaffList()
}

async function loadRecords() {
  loading.value = true
  try {
    const params: {
      planId?: string
      staffId?: string
      startDate?: string
      endDate?: string
      page: number
      pageSize: number
    } = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filterPlanId.value) {
      params.planId = filterPlanId.value
    }
    if (filterStaffId.value) {
      params.staffId = filterStaffId.value
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await getInspectionRecords(params)
    records.value = res.data
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  filterPlanId.value = ''
  filterStaffId.value = ''
  dateRange.value = []
  pagination.page = 1
  loadRecords()
}

function viewDetail(record: InspectionRecord) {
  currentRecord.value = record
  detailVisible.value = true
}

onMounted(async () => {
  await Promise.all([loadPlans(), loadStaff()])
  loadRecords()
})
</script>
