<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800">维修人员管理</h2>
      <el-button type="primary" @click="openAddDialog">
        <el-icon><Plus /></el-icon>
        新增维修人员
      </el-button>
    </div>

    <div class="bg-white rounded-xl shadow-sm">
      <el-table :data="staffList" border stripe v-loading="loading">
        <el-table-column label="工号" prop="workNo" width="120" />
        <el-table-column label="姓名" prop="name" width="120" />
        <el-table-column label="手机号" prop="phone" width="140" />
        <el-table-column label="技能标签" width="200">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-1">
              <el-tag
                v-for="skill in row.skills"
                :key="skill"
                size="small"
                type="info"
              >
                {{ formatSkillTag(skill) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="当前工单" width="100" align="center">
          <template #default="{ row }">
            <span :class="row.currentOrderCount > 3 ? 'text-red-600 font-medium' : 'text-gray-700'">
              {{ row.currentOrderCount }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="历史完成" width="100" align="center">
          <template #default="{ row }">
            <span class="text-green-600 font-medium">{{ row.completedOrderCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="平均评分" width="140">
          <template #default="{ row }">
            <div class="flex items-center gap-1">
              <el-rate v-model="row.avgRating" disabled :max="5" size="small" />
              <span class="text-sm text-gray-600">{{ row.avgRating.toFixed(1) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openEditDialog(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑维修人员' : '新增维修人员'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="技能标签" prop="skills">
          <el-checkbox-group v-model="form.skills">
            <el-checkbox label="water_electric">水电</el-checkbox>
            <el-checkbox label="carpentry">木工</el-checkbox>
            <el-checkbox label="tiler">瓦工</el-checkbox>
            <el-checkbox label="general">综合</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存' : '新增' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { getStaffList, createStaff, updateStaff, deleteStaff } from '@/api/staff'
import { formatDate, formatSkillTag } from '@/utils/format'
import type { Staff, SkillTag } from '@shared/types'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'

const loading = ref(false)
const submitting = ref(false)
const staffList = ref<Staff[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentStaffId = ref('')
const formRef = ref<FormInstance>()

const form = reactive({
  name: '',
  phone: '',
  skills: [] as SkillTag[]
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  skills: [{ required: true, message: '请选择至少一个技能标签', trigger: 'change' }]
}

async function loadStaffList() {
  loading.value = true
  try {
    staffList.value = await getStaffList()
  } finally {
    loading.value = false
  }
}

function openAddDialog() {
  isEdit.value = false
  currentStaffId.value = ''
  form.name = ''
  form.phone = ''
  form.skills = []
  dialogVisible.value = true
}

function openEditDialog(row: Staff) {
  isEdit.value = true
  currentStaffId.value = row.id
  form.name = row.name
  form.phone = row.phone
  form.skills = [...row.skills]
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEdit.value) {
      await updateStaff(currentStaffId.value, {
        name: form.name,
        phone: form.phone,
        skills: form.skills
      })
      ElMessage.success('修改成功')
    } else {
      await createStaff({
        name: form.name,
        phone: form.phone,
        skills: form.skills
      })
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadStaffList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: Staff) {
  try {
    await ElMessageBox.confirm(
      `确定要删除维修人员「${row.name}」吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteStaff(row.id)
    ElMessage.success('删除成功')
    loadStaffList()
  } catch {
    // 取消删除
  }
}

onMounted(() => {
  loadStaffList()
})
</script>
