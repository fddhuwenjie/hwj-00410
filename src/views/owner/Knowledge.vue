<template>
  <div class="space-y-4">
    <div class="bg-white rounded-2xl shadow-sm p-4">
      <div class="relative">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索文章标题、关键词..."
          clearable
          @keyup.enter="loadArticles"
          @clear="loadArticles"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <div class="flex gap-2 mt-4 overflow-x-auto pb-1">
        <el-tag
          v-for="tab in categoryTabs"
          :key="tab.value"
          :type="activeCategory === tab.value ? 'primary' : 'info'"
          :effect="activeCategory === tab.value ? 'dark' : 'plain'"
          class="cursor-pointer whitespace-nowrap !rounded-full flex-shrink-0"
          @click="selectCategory(tab.value)"
        >
          {{ tab.label }}
        </el-tag>
      </div>
    </div>

    <div v-loading="loading" class="min-h-[300px]">
      <div v-if="articles.length === 0" class="py-12 text-center">
        <el-empty description="暂无文章" :image-size="80" />
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="article in articles"
          :key="article.id"
          class="bg-white rounded-2xl shadow-sm p-4 hover-lift cursor-pointer"
          @click="viewDetail(article.id)"
        >
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-bold text-gray-800 text-base line-clamp-1 flex-1 mr-2">
              {{ article.title }}
            </h3>
            <el-tag size="small" type="primary" effect="dark">
              {{ KnowledgeCategoryMap[article.category] }}
            </el-tag>
          </div>

          <p class="text-sm text-gray-500 line-clamp-2 mb-3 leading-relaxed">
            {{ getSummary(article.content) }}
          </p>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-xs text-gray-400 flex items-center gap-1">
                <el-icon :size="14"><View /></el-icon>
                {{ article.viewCount }}
              </span>
              <span class="text-xs text-gray-400 flex items-center gap-1">
                <el-icon :size="14"><Star /></el-icon>
                {{ article.helpfulCount }}
              </span>
            </div>
            <el-button
              size="small"
              type="success"
              plain
              @click.stop="handleHelpful(article)"
            >
              <el-icon><Star /></el-icon>
              有帮助
            </el-button>
          </div>
        </div>
      </div>

      <div class="flex justify-center py-4" v-if="articles.length > 0">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          layout="prev, pager, next"
          :page-sizes="[]"
          background
          @current-change="loadArticles"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getKnowledgeArticles, markHelpful } from '@/api/knowledge'
import { Search, View, Star } from '@element-plus/icons-vue'
import { KnowledgeCategoryMap } from '@shared/types'
import type { KnowledgeArticle, KnowledgeCategory } from '@shared/types'

const router = useRouter()
const loading = ref(false)
const articles = ref<KnowledgeArticle[]>([])
const searchKeyword = ref('')
const activeCategory = ref<KnowledgeCategory | 'all'>('all')

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const categoryTabs = [
  { label: '全部', value: 'all' as const },
  { label: '水电', value: 'water' as KnowledgeCategory },
  { label: '电路', value: 'electric' as KnowledgeCategory },
  { label: '门窗', value: 'door_window' as KnowledgeCategory },
  { label: '公共设施', value: 'public' as KnowledgeCategory },
  { label: '其他', value: 'other' as KnowledgeCategory }
]

function getSummary(content: string): string {
  const plainText = content.replace(/[#*_`\[\]]/g, '')
  return plainText.slice(0, 100) + (plainText.length > 100 ? '...' : '')
}

function selectCategory(category: KnowledgeCategory | 'all') {
  activeCategory.value = category
  pagination.page = 1
  loadArticles()
}

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
    if (activeCategory.value !== 'all') {
      params.category = activeCategory.value
    }
    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }
    const res = await getKnowledgeArticles(params)
    articles.value = res.data
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

function viewDetail(id: string) {
  router.push(`/owner/knowledge/${id}`)
}

async function handleHelpful(article: KnowledgeArticle) {
  try {
    await markHelpful(article.id)
    article.helpfulCount++
    ElMessage.success('感谢您的反馈')
  } catch {
  }
}

onMounted(() => {
  loadArticles()
})
</script>
