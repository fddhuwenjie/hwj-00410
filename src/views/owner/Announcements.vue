<template>
  <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
    <div class="p-4 border-b border-gray-100">
      <h2 class="font-bold text-lg text-gray-800">公告通知</h2>
      <p class="text-xs text-gray-500 mt-1">了解小区最新动态</p>
    </div>

    <div v-loading="loading">
      <div v-if="sortedAnnouncements.length === 0" class="py-16 text-center">
        <el-empty description="暂无公告" :image-size="100" />
      </div>
      <div v-else>
        <div v-if="pinnedAnnouncements.length > 0" class="divide-y divide-gray-50">
          <div
            v-for="announcement in pinnedAnnouncements"
            :key="announcement.id"
            class="p-4 hover:bg-gray-50 cursor-pointer transition-colors bg-gradient-to-r from-orange-50 to-transparent"
            @click="toggleExpand(announcement.id)"
          >
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0">
                <el-tag type="danger" effect="dark" size="small">置顶</el-tag>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-gray-800 line-clamp-1">{{ announcement.title }}</h3>
                <p class="text-xs text-gray-400 mt-1">{{ formatDate(announcement.createdAt, 'YYYY-MM-DD HH:mm') }}</p>
                <div class="mt-2 overflow-hidden transition-all duration-300" :style="{ maxHeight: expandedId === announcement.id ? '1000px' : '0' }">
                  <p class="text-sm text-gray-600 whitespace-pre-wrap">{{ announcement.content }}</p>
                  <div class="flex gap-4 mt-3 text-xs text-gray-400">
                    <span>有效期：{{ formatDate(announcement.validFrom, 'YYYY-MM-DD') }} 至 {{ formatDate(announcement.validTo, 'YYYY-MM-DD') }}</span>
                  </div>
                </div>
                <div class="flex items-center justify-between mt-2">
                  <span v-if="expandedId !== announcement.id" class="text-xs text-gray-500 line-clamp-2">{{ announcement.content }}</span>
                  <el-icon :class="['text-gray-400 transition-transform', { 'rotate-180': expandedId === announcement.id }]">
                    <ArrowDown />
                  </el-icon>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="divide-y divide-gray-50" v-if="normalAnnouncements.length > 0">
          <div
            v-for="announcement in normalAnnouncements"
            :key="announcement.id"
            class="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            @click="toggleExpand(announcement.id)"
          >
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-gray-800 line-clamp-1">{{ announcement.title }}</h3>
                <p class="text-xs text-gray-400 mt-1">{{ formatDate(announcement.createdAt, 'YYYY-MM-DD HH:mm') }}</p>
                <div class="mt-2 overflow-hidden transition-all duration-300" :style="{ maxHeight: expandedId === announcement.id ? '1000px' : '0' }">
                  <p class="text-sm text-gray-600 whitespace-pre-wrap">{{ announcement.content }}</p>
                  <div class="flex gap-4 mt-3 text-xs text-gray-400">
                    <span>有效期：{{ formatDate(announcement.validFrom, 'YYYY-MM-DD') }} 至 {{ formatDate(announcement.validTo, 'YYYY-MM-DD') }}</span>
                  </div>
                </div>
                <div class="flex items-center justify-between mt-2">
                  <span v-if="expandedId !== announcement.id" class="text-xs text-gray-500 line-clamp-2">{{ announcement.content }}</span>
                  <el-icon :class="['text-gray-400 transition-transform', { 'rotate-180': expandedId === announcement.id }]">
                    <ArrowDown />
                  </el-icon>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { getAnnouncements } from '@/api/announcements'
import { formatDate } from '@/utils/format'
import type { Announcement } from '@shared/types'

const loading = ref(false)
const announcements = ref<Announcement[]>([])
const expandedId = ref<string | null>(null)

const sortedAnnouncements = computed(() => {
  return [...announcements.value].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

const pinnedAnnouncements = computed(() => {
  return sortedAnnouncements.value.filter(a => a.isPinned)
})

const normalAnnouncements = computed(() => {
  return sortedAnnouncements.value.filter(a => !a.isPinned)
})

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

async function loadAnnouncements() {
  loading.value = true
  try {
    announcements.value = await getAnnouncements()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAnnouncements()
})
</script>
