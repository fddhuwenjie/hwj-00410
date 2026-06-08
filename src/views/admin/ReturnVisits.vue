<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800">回访管理</h2>
    </div>

    <div class="bg-white rounded-xl shadow-sm mb-6">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="全部回访" name="all" />
        <el-tab-pane label="待完成回访" name="pending" />
        <el-tab-pane label="已完成回访" name="completed" />
      </el-tabs>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-5 mb-6">
      <div class="flex flex-wrap gap-4 items-end">
        <el-form-item label="维修人员" class="mb-0">
          <el-select v-model="filterStaffId" placeholder="全部维修人员" clearable style="width: 160px">
            <el-option
              v-for="staff in staffList"
              :key="staff.id"
              :label="staff.name"
              :value="staff.id"
            />
          </el-select>
        </el-form-item>
        <el-button type="primary" @click="loadReturnVisits">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm">
      <el-table
        :data="returnVisits"
        border
        stripe
        v-loading="loading"
      >
        <el-table-column prop="orderNo" label="工单号" width="140" />
        <el-table-column prop="ownerRoom" label="业主房屋" width="120" />
        <el-table-column prop="staffName" label="维修人员" width="100" />
        <el-table-column label="计划回访时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.scheduledAt) }}
          </template>
        </el-table-column>
        <el-table-column label="实际回访时间" width="160">
          <template #default="{ row }">
            {{ row.completedAt ? formatDate(row.completedAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ formatStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="primary"
              size="small"
              @click="openCompleteDialog(row)"
            >
              <el-icon><CircleCheck /></el-icon>
              完成回访
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
          @size-change="loadReturnVisits"
          @current-change="loadReturnVisits"
        />
      </div>
    </div>

    <el-dialog
      v-model="completeDialogVisible"
      title="完成回访"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form v-loading="submitting" :model="completeForm" label-width="120px">
        <el-form-item label="维修质量评分">
          <el-rate v-model="completeForm.qualityScore" :max="5" show-score />
        </el-form-item>
        <el-form-item label="服务态度评分">
          <el-rate v-model="completeForm.attitudeScore" :max="5" show-score />
        </el-form-item>
        <el-form-item label="响应速度评分">
          <el-rate v-model="completeForm.speedScore" :max="5" show-score />
        </el-form-item>
        <el-form-item label="是否有遗留问题">
          <el-radio-group v-model="completeForm.hasRemainingIssue">
            <el-radio :value="true">是</el-radio>
            <el-radio :value="false">否</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="completeForm.hasRemainingIssue"
          label="遗留问题描述"
          prop="remainingIssueDesc"
          :rules="{ required: true, message: '请输入遗留问题描述', trigger: 'blur' }"
        >
          <el-input
            v-model="completeForm.remainingIssueDesc"
            type="textarea"
            :rows="3"
            placeholder="请描述遗留问题"
          />
        </el-form-item>
        <el-form-item label="改进建议">
          <el-input
            v-model="completeForm.suggestion"
            type="textarea"
            :rows="3"
            placeholder="请输入改进建议（选填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmComplete">
          确认提交
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detailDialogVisible"
      title="回访详情"
      width="600px"
    >
      <div v-if="currentVisit" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="text-gray-500">工单号：</span>
            <span class="font-medium">{{ currentVisit.orderNo }}</span>
          </div>
          <div>
            <span class="text-gray-500">业主房屋：</span>
            <span class="font-medium">{{ currentVisit.ownerRoom }}</span>
          </div>
          <div>
            <span class="text-gray-500">维修人员：</span>
            <span class="font-medium">{{ currentVisit.staffName }}</span>
          </div>
          <div>
            <span class="text-gray-500">状态：</span>
            <el-tag :type="getStatusTagType(currentVisit.status)">
              {{ formatStatus(currentVisit.status) }}
            </el-tag>
          </div>
          <div>
            <span class="text-gray-500">计划回访时间：</span>
            <span class="font-medium">{{ formatDate(currentVisit.scheduledAt) }}</span>
          </div>
          <div v-if="currentVisit.completedAt">
            <span class="text-gray-500">实际回访时间：</span>
            <span class="font-medium">{{ formatDate(currentVisit.completedAt) }}</span>
          </div>
        </div>
        <el-divider />
        <div v-if="currentVisit.status === 'completed'" class="space-y-3">
          <div class="flex items-center gap-2">
            <span class="text-gray-500 w-28">维修质量评分：</span>
            <el-rate v-model="currentVisit.qualityScore" disabled :max="5" show-score />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-gray-500 w-28">服务态度评分：</span>
            <el-rate v-model="currentVisit.attitudeScore" disabled :max="5" show-score />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-gray-500 w-28">响应速度评分：</span>
            <el-rate v-model="currentVisit.speedScore" disabled :max="5" show-score />
          </div>
          <div>
            <span class="text-gray-500">是否有遗留问题：</span>
            <span class="font-medium">{{ currentVisit.hasRemainingIssue ? '是' : '否' }}</span>
          </div>
          <div v-if="currentVisit.hasRemainingIssue && currentVisit.remainingIssueDesc">
            <span class="text-gray-500">遗留问题描述：</span>
            <p class="mt-1 p-3 bg-gray-50 rounded-lg">{{ currentVisit.remainingIssueDesc }}</p>
          </div>
          <div v-if="currentVisit.suggestion">
            <span class="text-gray-500">改进建议：</span>
            <p class="mt-1 p-3 bg-gray-50 rounded-lg">{{ currentVisit.suggestion }}</p>
          </div>
        </div>
        <el-empty v-else description="该回访尚未完成，暂无评分信息" />
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getReturnVisits, completeReturnVisit } from '@/api/returnVisits'
import { getStaffList } from '@/api/staff'
import { formatDate } from '@/utils/format'
import type { ReturnVisit } from '@shared/types'
import { Search, View, CircleCheck } from '@element-plus/icons-vue'

const loading = ref(false)
const returnVisits = ref<ReturnVisit[]>([])
const staffList = ref<{ id: string; name: string }[]>([])

const activeTab = ref('all')
const filterStaffId = ref('')

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const completeDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const submitting = ref(false)
const currentVisit = ref<ReturnVisit | null>(null)

const completeForm = reactive({
  qualityScore: 5,
  attitudeScore: 5,
  speedScore: 5,
  hasRemainingIssue: false,
  remainingIssueDesc: '',
  suggestion: ''
})

function getStatusTagType(status: 'pending' | 'completed'): string {
  const typeMap: Record<string, string> = {
    pending: 'warning',
    completed: 'success'
  }
  return typeMap[status] || ''
}

function formatStatus(status: 'pending' | 'completed'): string {
  const statusMap: Record<string, string> = {
    pending: '待完成',
    completed: '已完成'
  }
  return statusMap[status] || status
}

function handleTabChange() {
  pagination.page = 1
  loadReturnVisits()
}

async function loadReturnVisits() {
  loading.value = true
  try {
    const params: {
      status?: string
      staffId?: string
      page?: number
      pageSize?: number
    } = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (activeTab.value !== 'all') {
      params.status = activeTab.value
    }
    if (filterStaffId.value) {
      params.staffId = filterStaffId.value
    }
    const res = await getReturnVisits(params)
    returnVisits.value = res.data
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

async function loadStaffList() {
  try {
    const list = await getStaffList()
    staffList.value = list.map(item => ({ id: item.id, name: item.name }))
  } catch (e) {
    console.error('加载维修人员列表失败', e)
  }
}

function resetFilter() {
  filterStaffId.value = ''
  pagination.page = 1
  loadReturnVisits()
}

function viewDetail(row: ReturnVisit) {
  currentVisit.value = row
  detailDialogVisible.value = true
}

function openCompleteDialog(row: ReturnVisit) {
  currentVisit.value = row
  completeForm.qualityScore = 5
  completeForm.attitudeScore = 5
  completeForm.speedScore = 5
  completeForm.hasRemainingIssue = false
  completeForm.remainingIssueDesc = ''
  completeForm.suggestion = ''
  completeDialogVisible.value = true
}

async function confirmComplete() {
  if (!currentVisit.value) return

  if (completeForm.hasRemainingIssue && !completeForm.remainingIssueDesc.trim()) {
    ElMessage.warning('请输入遗留问题描述')
    return
  }

  submitting.value = true
  try {
    await completeReturnVisit(currentVisit.value.id, {
      qualityScore: completeForm.qualityScore,
      attitudeScore: completeForm.attitudeScore,
      speedScore: completeForm.speedScore,
      hasRemainingIssue: completeForm.hasRemainingIssue,
      remainingIssueDesc: completeForm.hasRemainingIssue ? completeForm.remainingIssueDesc : undefined,
      suggestion: completeForm.suggestion || undefined
    })
    ElMessage.success('回访完成')
    completeDialogVisible.value = false
    loadReturnVisits()
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadStaffList()
  loadReturnVisits()
})
</script>
