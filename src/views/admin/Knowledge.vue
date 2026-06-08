<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800">知识库管理</h2>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新增文章
      </el-button>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-5 mb-6">
      <div class="flex flex-wrap gap-4 items-end">
        <el-form-item label="分类" class="mb-0">
          <el-select v-model="filterCategory" placeholder="全部分类" clearable style="width: 140px">
            <el-option
              v-for="(label, value) in KnowledgeCategoryMap"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词" class="mb-0">
          <el-input
            v-model="filterKeyword"
            placeholder="搜索标题/关键词"
            clearable
            style="width: 240px"
            @keyup.enter="loadArticles"
          />
        </el-form-item>
        <el-button type="primary" @click="loadArticles">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm">
      <el-table :data="articles" border stripe v-loading="loading">
        <el-table-column prop="title" label="标题" min-width="180">
          <template #default="{ row }">
            <div class="font-medium text-gray-800">{{ row.title }}</div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            <el-tag type="primary">{{ KnowledgeCategoryMap[row.category as KnowledgeCategory] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="关键词" min-width="160">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-1">
              <el-tag v-for="tag in row.keywords" :key="tag" size="small" type="info">
                {{ tag }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="浏览量" width="100" align="center">
          <template #default="{ row }">
            {{ row.viewCount }}
          </template>
        </el-table-column>
        <el-table-column label="点赞数" width="100" align="center">
          <template #default="{ row }">
            {{ row.helpfulCount }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openViewDialog(row)">
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button size="small" @click="openEditDialog(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
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
          @size-change="loadArticles"
          @current-change="loadArticles"
        />
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editingArticle ? '编辑文章' : '新增文章'"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="标题" required>
          <el-input v-model="formData.title" placeholder="请输入文章标题" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="formData.category" placeholder="请选择分类" style="width: 100%">
            <el-option
              v-for="(label, value) in KnowledgeCategoryMap"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-select
            v-model="formData.keywords"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入关键词后按回车添加"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="12"
            placeholder="请输入文章内容，支持 Markdown 语法"
            resize="vertical"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确认提交
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="viewDialogVisible"
      title="文章详情"
      width="700px"
    >
      <div v-if="viewingArticle" class="article-detail">
        <h3 class="text-xl font-bold text-gray-800 mb-3">{{ viewingArticle.title }}</h3>
        <div class="flex items-center gap-3 mb-4">
          <el-tag type="primary">{{ KnowledgeCategoryMap[viewingArticle.category] }}</el-tag>
          <span class="text-sm text-gray-500">
            <el-icon><View /></el-icon>
            {{ viewingArticle.viewCount }} 浏览
          </span>
          <span class="text-sm text-gray-500">
            <el-icon><Star /></el-icon>
            {{ viewingArticle.helpfulCount }} 点赞
          </span>
          <span class="text-sm text-gray-500">{{ formatDate(viewingArticle.createdAt) }}</span>
        </div>
        <div class="flex flex-wrap gap-1 mb-4">
          <el-tag v-for="tag in viewingArticle.keywords" :key="tag" size="small" type="info">
            {{ tag }}
          </el-tag>
        </div>
        <div class="article-content">
          <pre class="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">{{ viewingArticle.content }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getKnowledgeArticles,
  createKnowledgeArticle,
  updateKnowledgeArticle,
  deleteKnowledgeArticle
} from '@/api/knowledge'
import { formatDate } from '@/utils/format'
import { Plus, Search, Edit, Delete, View, Star } from '@element-plus/icons-vue'
import type { KnowledgeArticle, KnowledgeCategory } from '@shared/types'
import { KnowledgeCategoryMap } from '@shared/types'

const loading = ref(false)
const articles = ref<KnowledgeArticle[]>([])
const filterCategory = ref<KnowledgeCategory | ''>('')
const filterKeyword = ref('')

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const submitting = ref(false)
const editingArticle = ref<KnowledgeArticle | null>(null)
const viewingArticle = ref<KnowledgeArticle | null>(null)

const formData = reactive({
  title: '',
  category: 'water' as KnowledgeCategory,
  keywords: [] as string[],
  content: ''
})

async function loadArticles() {
  loading.value = true
  try {
    const params: {
      category?: KnowledgeCategory
      keyword?: string
      page: number
      pageSize: number
    } = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filterCategory.value) {
      params.category = filterCategory.value
    }
    if (filterKeyword.value) {
      params.keyword = filterKeyword.value
    }
    const res = await getKnowledgeArticles(params)
    articles.value = res.data
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  filterCategory.value = ''
  filterKeyword.value = ''
  pagination.page = 1
  loadArticles()
}

function openCreateDialog() {
  editingArticle.value = null
  formData.title = ''
  formData.category = 'water'
  formData.keywords = []
  formData.content = ''
  dialogVisible.value = true
}

function openEditDialog(article: KnowledgeArticle) {
  editingArticle.value = article
  formData.title = article.title
  formData.category = article.category
  formData.keywords = [...article.keywords]
  formData.content = article.content
  dialogVisible.value = true
}

function openViewDialog(article: KnowledgeArticle) {
  viewingArticle.value = article
  viewDialogVisible.value = true
}

async function handleSubmit() {
  if (!formData.title || !formData.category || !formData.content) {
    ElMessage.warning('请填写完整信息')
    return
  }

  submitting.value = true
  try {
    if (editingArticle.value) {
      await updateKnowledgeArticle(editingArticle.value.id, formData)
      ElMessage.success('更新成功')
    } else {
      await createKnowledgeArticle(formData)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadArticles()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(article: KnowledgeArticle) {
  try {
    await ElMessageBox.confirm(`确定要删除文章"${article.title}"吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteKnowledgeArticle(article.id)
    ElMessage.success('删除成功')
    loadArticles()
  } catch {
  }
}

onMounted(() => {
  loadArticles()
})
</script>

<style scoped>
.article-content pre {
  font-family: inherit;
  font-size: 14px;
  line-height: 1.8;
}
</style>
