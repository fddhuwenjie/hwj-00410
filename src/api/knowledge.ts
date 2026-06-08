import request from '@/utils/request'
import type { KnowledgeArticle, KnowledgeStats, KnowledgeCategory } from '@shared/types'

interface KnowledgeListResponse {
  data: KnowledgeArticle[]
  total: number
}

export function getKnowledgeArticles(params?: {
  category?: KnowledgeCategory
  keyword?: string
  page?: number
  pageSize?: number
}): Promise<KnowledgeListResponse> {
  return request.get('/knowledge', { params })
}

export function getKnowledgeArticle(id: string): Promise<KnowledgeArticle> {
  return request.get(`/knowledge/${id}`)
}

export function createKnowledgeArticle(data: {
  title: string
  category: KnowledgeCategory
  content: string
  keywords: string[]
}): Promise<KnowledgeArticle> {
  return request.post('/knowledge', data)
}

export function updateKnowledgeArticle(id: string, data: {
  title?: string
  category?: KnowledgeCategory
  content?: string
  keywords?: string[]
}): Promise<KnowledgeArticle> {
  return request.put(`/knowledge/${id}`, data)
}

export function deleteKnowledgeArticle(id: string): Promise<void> {
  return request.delete(`/knowledge/${id}`)
}

export function markHelpful(id: string): Promise<KnowledgeArticle> {
  return request.post(`/knowledge/${id}/helpful`)
}

export function matchKnowledgeArticles(query: string): Promise<(KnowledgeArticle & { matchScore: number })[]> {
  return request.get(`/knowledge/match/${encodeURIComponent(query)}`)
}

export function recordSelfService(data: {
  ownerRoom: string
  queryText: string
  matchedArticleId?: string
  matchedArticleTitle?: string
  isResolved: boolean
}): Promise<void> {
  return request.post('/knowledge/self-service', data)
}

export function getKnowledgeStats(): Promise<KnowledgeStats> {
  return request.get('/knowledge/stats')
}
