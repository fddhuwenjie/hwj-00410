import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserRole } from '@shared/types'

interface User {
  id: string
  role: UserRole
  name: string
  room?: string
  workNo?: string
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => !!user.value)
  const isOwner = computed(() => user.value?.role === 'owner')
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isStaff = computed(() => user.value?.role === 'staff')

  function setUser(userData: User) {
    user.value = userData
    localStorage.setItem('repair_user', JSON.stringify(userData))
  }

  function logout() {
    user.value = null
    localStorage.removeItem('repair_user')
  }

  function initUser() {
    const saved = localStorage.getItem('repair_user')
    if (saved) {
      try {
        user.value = JSON.parse(saved)
      } catch {
        localStorage.removeItem('repair_user')
      }
    }
  }

  return {
    user,
    isLoggedIn,
    isOwner,
    isAdmin,
    isStaff,
    setUser,
    logout,
    initUser
  }
})
