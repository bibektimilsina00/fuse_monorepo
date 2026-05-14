import React from 'react'
import { 
  Zap, 
  Calendar, 
  Globe, 
  Database, 
  Briefcase, 
  User, 
  Layers, 
  Shield, 
  Brain, 
  List, 
  Repeat, 
  StickyNote, 
  Cpu, 
  Lock, 
  Workflow,
  Code2
} from 'lucide-react'

export interface NodeItem {
  id: string
  label: string
  icon: React.ReactNode
  color: string
}

export const TRIGGERS: NodeItem[] = [
  { id: 'start', label: 'Start', icon: <Zap className="size-3.5 fill-white" />, color: '#0ea5e9' },
  { id: 'schedule', label: 'Schedule', icon: <Calendar className="size-3.5" />, color: '#6366f1' },
  { id: 'webhook', label: 'Webhook', icon: <Globe className="size-3.5" />, color: '#10b981' },
  { id: 'airtable', label: 'Airtable', icon: <Database className="size-3.5" />, color: '#f59e0b' },
  { id: 'ashby', label: 'Ashby', icon: <Briefcase className="size-3.5" />, color: '#4f46e5' },
  { id: 'attio', label: 'Attio', icon: <User className="size-3.5" />, color: '#111827' },
]

export const BLOCKS: NodeItem[] = [
  { id: 'agent', label: 'Agent', icon: <Brain className="size-3.5" />, color: '#8b5cf6' },
  { id: 'api', label: 'API', icon: <Globe className="size-3.5" />, color: '#3b82f6' },
  { id: 'condition', label: 'Condition', icon: <Workflow className="size-3.5" />, color: '#f97316' },
  { id: 'credential', label: 'Credential', icon: <Lock className="size-3.5" />, color: '#6366f1' },
  { id: 'function', label: 'Function', icon: <Code2 className="size-3.5" />, color: '#ef4444' },
  { id: 'guardrails', label: 'Guardrails', icon: <Shield className="size-3.5" />, color: '#22c55e' },
  { id: 'hitl', label: 'Human in the Loop', icon: <User className="size-3.5" />, color: '#10b981' },
  { id: 'knowledge', label: 'Knowledge', icon: <Brain className="size-3.5" />, color: '#06b6d4' },
  { id: 'logs', label: 'Logs', icon: <List className="size-3.5" />, color: '#eab308' },
  { id: 'loop', label: 'Loop', icon: <Repeat className="size-3.5" />, color: '#3b82f6' },
  { id: 'memory', label: 'Memory', icon: <Cpu className="size-3.5" />, color: '#ec4899' },
  { id: 'mothership', label: 'Mothership', icon: <Layers className="size-3.5" />, color: '#a855f7' },
  { id: 'note', label: 'Note', icon: <StickyNote className="size-3.5" />, color: '#f59e0b' },
]
