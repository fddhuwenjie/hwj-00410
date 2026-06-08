<template>
  <div class="space-y-4 pb-24">
    <div class="bg-white rounded-2xl shadow-sm p-5" v-loading="loading">
      <template v-if="article">
        <h1 class="text-xl font-bold text-gray-800 mb-3 leading-snug">
          {{ article.title }}
        </h1>

        <div class="flex flex-wrap items-center gap-3 mb-4">
          <el-tag type="primary" effect="dark">
            {{ KnowledgeCategoryMap[article.category] }}
          </el-tag>
          <span class="text-xs text-gray-400 flex items-center gap-1">
            <el-icon :size="14"><View /></el-icon>
            {{ article.viewCount }} 浏览
          </span>
          <span class="text-xs text-gray-400 flex items-center gap-1">
            <el-icon :size="14"><Star /></el-icon>
            {{ article.helpfulCount }} 点赞
          </span>
          <span class="text-xs text-gray-400 flex items-center gap-1">
            <el-icon :size="14"><Clock /></el-icon>
            {{ formatDate(article.createdAt, 'YYYY-MM-DD') }}
          </span>
        </div>

        <div class="flex flex-wrap gap-1 mb-5">
          <el-tag
            v-for="tag in article.keywords"
            :key="tag"
            size="small"
            type="info"
            effect="plain"
          >
            #{{ tag }}
          </el-tag>
        </div>

        <div class="article-content">
          <pre class="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed text-sm bg-gray-50 p-4 rounded-xl">{{ article.content }}</pre>
        </div>
      </template>
    </div>

    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-lg" v-if="article">
      <div class="flex gap-3 max-w-lg mx-auto">
        <el-button
          class="flex-1"
          size="large"
          type="success"
          :loading="helpfulLoading"
          :disabled="hasMarkedHelpful"
          @click="handleHelpful"
        >
          <el-icon><Star /></el-icon>
          {{ hasMarkedHelpful ? '已反馈有帮助' : '这篇文章有帮助' }}
        </el-button>
        <el-button
          class="flex-1"
          size="large"
          type="primary"
          :loading="selfServiceLoading"
          :disabled="hasRecordedSelfService"
          @click="handleSelfService"
        >
          <el-icon><CircleCheck /></el-icon>
          {{ hasRecordedSelfService ? '已记录' : '问题已解决' }}
        </el-button>
      </div>
      <p v-if="hasRecordedSelfService" class="text-center text-xs text-green-600 mt-2">
        已记录为自助解决，无需提交工单
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getKnowledgeArticle, markHelpful, recordSelfService } from '@/api/knowledge'
import { useUserStore } from '@/stores/user'
import { formatDate } from '@/utils/format'
import { Star, View, Clock, CircleCheck } from '@element-plus/icons-vue'
import { KnowledgeCategoryMap } from '@shared/types'
import type { KnowledgeArticle } from '@shared/types'

const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const helpfulLoading = ref(false)
const selfServiceLoading = ref(false)
const article = ref<KnowledgeArticle | null>(null)
const hasMarkedHelpful = ref(false)
const hasRecordedSelfService = ref(false)

async function loadArticle() {
  const id = route.params.id as string
  if (!id) return

  loading.value = true
  try {
    article.value = await getKnowledgeArticle(id)
  } finally {
    loading.value = false
  }
}

async function handleHelpful() {
  if (!article.value || hasMarkedHelpful.value) return

  helpfulLoading.value = true
  try {
    await markHelpful(article.value.id)
    article.value.helpfulCount++
    hasMarkedHelpful.value = true
    ElMessage.success('感谢您的反馈，我们会持续优化内容')
  } finally {
    helpfulLoading.value = false
  }
}

async function handleSelfService() {
  if (!article.value || hasRecordedSelfService.value) return

  try {
    await ElMessageBox.confirm(
      '确认问题已通过知识库解决，无需提交工单吗？',
      '提示',
      {
        confirmButtonText: '确认已解决',
        cancelButtonText: '取消',
        type: 'success'
      }
    )
  } catch {
    return
  }

  selfServiceLoading.value = true
  try {
    await recordSelfService({
      ownerRoom: userStore.user?.room || '',
      queryText: article.value.title,
      matchedArticleId: article.value.id,
      matchedArticleTitle: article.value.title,
      isResolved: true
    })
    hasRecordedSelfService.value = true
    ElMessage.success('已记录为自助解决，感谢您的反馈')
  } finally {
    selfServiceLoading.value = false
  }
}

onMounted(() => {
  loadArticle()
})
</script>

<style scoped>
.article-content pre {
  font-family: inherit;
  font-size: 14px;
  line-height: 1.8;
}
</style>
