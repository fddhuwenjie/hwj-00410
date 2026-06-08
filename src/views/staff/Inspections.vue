<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800">巡检任务</h2>
    </div>

    <el-tabs v-model="activeTab" class="mb-6">
      <el-tab-pane label="待执行" name="todo">
        <div class="bg-white rounded-xl shadow-sm">
          <el-table :data="activePlans" border stripe v-loading="loading">
            <el-table-column prop="name" label="计划名称" min-width="180" />
            <el-table-column prop="area" label="巡检区域" min-width="180" />
            <el-table-column label="巡检周期" width="100">
              <template #default="{ row }">
                <el-tag type="primary">{{ formatInspectionCycle(row.cycle) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="巡检项目" min-width="250">
              <template #default="{ row }">
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="item in row.items"
                    :key="item"
                    size="small"
                    type="info"
                  >
                    {{ item }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="startInspection(row)">
                  <el-icon><Edit /></el-icon>
                  开始巡检
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="activePlans.length === 0" description="暂无待执行的巡检计划" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="我的记录" name="records">
        <div class="bg-white rounded-xl shadow-sm">
          <el-table :data="myRecords" border stripe v-loading="loading">
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
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="viewRecord(row)">
                  <el-icon><View /></el-icon>
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="myRecords.length === 0" description="暂无巡检记录" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="inspectionDialogVisible"
      title="执行巡检"
      width="600px"
      :close-on-click-modal="false"
    >
      <div v-if="currentPlan" class="space-y-4">
        <div class="p-4 bg-blue-50 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <span class="text-gray-600">巡检计划</span>
            <span class="font-semibold">{{ currentPlan.name }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-600">巡检区域</span>
            <span class="font-semibold">{{ currentPlan.area }}</span>
          </div>
        </div>

        <div class="space-y-3">
          <h4 class="font-medium text-gray-800">巡检项目（逐项检查后勾选）</h4>
          <div
            v-for="item in inspectionItems"
            :key="item.item"
            class="p-4 border rounded-lg"
            :class="{
              'bg-green-50 border-green-200': item.status === 'normal',
              'bg-red-50 border-red-200': item.status === 'abnormal',
              'bg-gray-50': !item.status
            }"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <el-checkbox
                  v-model="item.status"
                  true-value="normal"
                  false-value=""
                  @change="handleStatusChange(item)"
                >
                  <span class="font-medium">{{ item.item }}</span>
                </el-checkbox>
                <el-tag
                  v-if="item.status === 'normal'"
                  type="success"
                  size="small"
                >
                  正常
                </el-tag>
              </div>
              <el-checkbox
                v-model="item.status"
                true-value="abnormal"
                false-value=""
                @change="handleStatusChange(item)"
              >
                <span class="text-red-600">异常</span>
              </el-checkbox>
            </div>
            <el-input
              v-if="item.status === 'abnormal'"
              v-model="item.remark"
              placeholder="请输入异常详情"
              class="mt-3"
              :rows="2"
              type="textarea"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="inspectionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitInspection">
          提交巡检结果
        </el-button>
      </template>
    </el-dialog>

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
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  getInspectionPlans,
  getInspectionRecords,
  createInspectionRecord
} from '@/api/inspections'
import { formatDate, formatInspectionCycle } from '@/utils/format'
import type {
  InspectionPlan,
  InspectionRecord,
  InspectionItemResult
} from '@shared/types'
import { Edit, View, CircleCheck, CircleClose } from '@element-plus/icons-vue'

const userStore = useUserStore()
const activeTab = ref('todo')
const loading = ref(false)
const submitting = ref(false)
const activePlans = ref<InspectionPlan[]>([])
const myRecords = ref<InspectionRecord[]>([])

const inspectionDialogVisible = ref(false)
const detailVisible = ref(false)
const currentPlan = ref<InspectionPlan | null>(null)
const currentRecord = ref<InspectionRecord | null>(null)
const inspectionItems = ref<(InspectionItemResult & { remark?: string })[]>([])

async function loadActivePlans() {
  const res = await getInspectionPlans({ isActive: true, pageSize: 100 })
  activePlans.value = res.data
}

async function loadMyRecords() {
  if (!userStore.user?.id) return
  const res = await getInspectionRecords({
    staffId: userStore.user.id,
    pageSize: 100
  })
  myRecords.value = res.data
}

function startInspection(plan: InspectionPlan) {
  currentPlan.value = plan
  inspectionItems.value = plan.items.map(item => ({
    item,
    status: '' as any,
    remark: ''
  }))
  inspectionDialogVisible.value = true
}

function handleStatusChange(item: InspectionItemResult & { remark?: string }) {
  if (item.status !== 'abnormal') {
    item.remark = ''
  }
}

async function submitInspection() {
  if (!currentPlan.value || !userStore.user?.id) return

  const items = inspectionItems.value as InspectionItemResult[]
  const uncheckedItems = items.filter(item => !item.status)
  if (uncheckedItems.length > 0) {
    ElMessage.warning(`还有${uncheckedItems.length}项未检查，请完成所有项目`)
    return
  }

  submitting.value = true
  try {
    await createInspectionRecord({
      planId: currentPlan.value.id,
      staffId: userStore.user.id,
      area: currentPlan.value.area,
      itemsResult: items
    })
    ElMessage.success('巡检结果提交成功')
    inspectionDialogVisible.value = false
    loadMyRecords()
  } finally {
    submitting.value = false
  }
}

function viewRecord(record: InspectionRecord) {
  currentRecord.value = record
  detailVisible.value = true
}

onMounted(() => {
  loadActivePlans()
  loadMyRecords()
})
</script>
