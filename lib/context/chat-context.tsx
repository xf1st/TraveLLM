"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  metadata?: any // Can hold info like "budget_updated", "itinerary_draft"
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  updatedAt: number
  tripId?: string // If this chat is explicitly linked to a saved trip
  draftTrip?: any // Partial trip info gathered during interview
}

interface ChatContextType {
  sessions: ChatSession[]
  activeSessionId: string | null
  setActiveSessionId: (id: string | null) => void
  createSession: (initialMessage?: string) => string
  updateSession: (id: string, updates: Partial<ChatSession>) => void
  deleteSession: (id: string) => void
  addMessage: (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  getActiveSession: () => ChatSession | undefined
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('travellm_chat_history')
      if (stored) {
        const parsed = JSON.parse(stored)
        setSessions(parsed.sessions || [])
        setActiveSessionId(parsed.activeSessionId || null)
      }
    } catch (e) {
      console.error('Failed to load chat history', e)
    }
    setIsInitialized(true)
  }, [])

  // Save to localStorage when sessions change
  useEffect(() => {
    if (!isInitialized) return
    try {
      localStorage.setItem('travellm_chat_history', JSON.stringify({
        sessions,
        activeSessionId
      }))
    } catch (e) {
      console.error('Failed to save chat history', e)
    }
  }, [sessions, activeSessionId, isInitialized])

  const createSession = useCallback((initialMessage?: string) => {
    const newId = crypto.randomUUID()
    const newSession: ChatSession = {
      id: newId,
      title: initialMessage ? initialMessage.slice(0, 30) + '...' : 'Новый чат',
      messages: [],
      updatedAt: Date.now()
    }
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(newId)
    return newId
  }, [])

  const updateSession = useCallback((id: string, updates: Partial<ChatSession>) => {
    setSessions(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
    ))
  }, [])

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id))
    if (activeSessionId === id) {
      setActiveSessionId(null)
    }
  }, [activeSessionId])

  const addMessage = useCallback((sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    }

    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s
      
      // Auto-update title if it's the first user message and title is default
      let title = s.title
      if (s.messages.length === 0 && message.role === 'user') {
        title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
      }

      return {
        ...s,
        title,
        messages: [...s.messages, newMessage],
        updatedAt: Date.now()
      }
    }))
  }, [])

  const getActiveSession = useCallback(() => {
    return sessions.find(s => s.id === activeSessionId)
  }, [sessions, activeSessionId])

  return (
    <ChatContext.Provider value={{
      sessions,
      activeSessionId,
      setActiveSessionId,
      createSession,
      updateSession,
      deleteSession,
      addMessage,
      getActiveSession
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
