<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800">公告管理</h2>
      <el-button type="primary" @click="openAddDialog">
        <el-icon><Plus /></el-icon>
        发布公告
      </el-button>
    </div>

    <div class="space-y-4">
      <div
        v-for="item in sortedAnnouncements"
        :key="item.id"
        class="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <el-tag v-if="item.isPinned" type="danger" size="small" effect="dark">
              <el-icon :size="12"><Top /></el-icon>
              置顶
            </el-tag>
            <h3 class="text-lg font-semibold text-gray-800">{{ item.title }}</h3>
          </div>
          <div class="flex items-center gap-2">
            <el-button type="primary" size="small" @click="openEditDialog(item)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(item)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </div>
        <div class="text-gray-600 mb-4 whitespace-pre-wrap">{{ item.content }}</div>
        <div class="flex items-center justify-between text-sm text-gray-500">
          <div class="flex items-center gap-4">
            <span>
              <el-icon :size="14" class="mr-1"><Calendar /></el-icon>
              有效期：{{ formatDate(item.validFrom, 'YYYY-MM-DD') }} 至 {{ formatDate(item.validTo, 'YYYY-MM-DD') }}
            </span>
            <span>
              <el-icon :size="14" class="mr-1"><Clock /></el-icon>
              发布时间：{{ formatDate(item.createdAt) }}
            </span>
          </div>
          <div>
            <el-tag v-if="isExpired(item)" type="info" size="small">已过期</el-tag>
            <el-tag v-else type="success" size="small">生效中</el-tag>
          </div>
        </div>
      </div>

      <el-empty v-if="!loading && announcements.length === 0" description="暂无公告" />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑公告' : '发布公告'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入公告标题" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="正文" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="6"
            placeholder="请输入公告正文"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="置顶" prop="isPinned">
          <el-switch v-model="form.isPinned" active-text="是" inactive-text="否" />
        </el-form-item>
        <el-form-item label="有效期" prop="validFrom">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存' : '发布' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import dayjs from 'dayjs'
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/api/announcements'
import { formatDate } from '@/utils/format'
import type { Announcement } from '@shared/types'
import { Plus, Edit, Delete, Top, Calendar, Clock } from '@element-plus/icons-vue'

const loading = ref(false)
const submitting = ref(false)
const announcements = ref<Announcement[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentAnnouncementId = ref('')
const formRef = ref<FormInstance>()

const form = reactive({
  title: '',
  content: '',
  isPinned: false,
  validFrom: '',
  validTo: ''
})

const dateRange = ref<[string, string] | null>(null)

const rules: FormRules = {
  title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入公告正文', trigger: 'blur' }],
  isPinned: [{ required: true, message: '请选择是否置顶', trigger: 'change' }],
  validFrom: [{ required: true, message: '请选择有效期', trigger: 'change' }]
}

const sortedAnnouncements = computed(() => {
  return [...announcements.value].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
  })
})

function isExpired(item: Announcement) {
  return dayjs().isAfter(dayjs(item.validTo), 'day')
}

async function loadAnnouncements() {
  loading.value = true
  try {
    announcements.value = await getAnnouncements()
  } finally {
    loading.value = false
  }
}

function openAddDialog() {
  isEdit.value = false
  currentAnnouncementId.value = ''
  form.title = ''
  form.content = ''
  form.isPinned = false
  form.validFrom = ''
  form.validTo = ''
  dateRange.value = null
  dialogVisible.value = true
}

function openEditDialog(item: Announcement) {
  isEdit.value = true
  currentAnnouncementId.value = item.id
  form.title = item.title
  form.content = item.content
  form.isPinned = item.isPinned
  form.validFrom = item.validFrom
  form.validTo = item.validTo
  dateRange.value = [item.validFrom, item.validTo]
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value || !dateRange.value) return

  form.validFrom = dateRange.value[0]
  form.validTo = dateRange.value[1]

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEdit.value) {
      await updateAnnouncement(currentAnnouncementId.value, {
        title: form.title,
        content: form.content,
        isPinned: form.isPinned,
        validFrom: form.validFrom,
        validTo: form.validTo
      })
      ElMessage.success('修改成功')
    } else {
      await createAnnouncement({
        title: form.title,
        content: form.content,
        isPinned: form.isPinned,
        validFrom: form.validFrom,
        validTo: form.validTo
      })
      ElMessage.success('发布成功')
    }
    dialogVisible.value = false
    loadAnnouncements()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(item: Announcement) {
  try {
    await ElMessageBox.confirm(
      `确定要删除公告「${item.title}」吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteAnnouncement(item.id)
    ElMessage.success('删除成功')
    loadAnnouncements()
  } catch {
    // 取消删除
  }
}

onMounted(() => {
  loadAnnouncements()
})
</script>
