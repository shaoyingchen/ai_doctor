import { create } from 'zustand'
import type { GraphNode, GraphEdge } from '@/types'

interface GraphState {
  // Data
  nodes: GraphNode[]
  edges: GraphEdge[]

  // Selection
  selectedNode: GraphNode | null
  selectedEdge: GraphEdge | null

  // Filters
  entityFilters: {
    person: boolean
    organization: boolean
    event: boolean
    location: boolean
    document: boolean
  }
  relationFilters: {
    belongs_to: boolean
    collaborates: boolean
    references: boolean
    related: boolean
  }

  // Display settings
  nodeSize: number
  layoutMode: 'force' | 'circular' | 'tree'
  searchQuery: string

  // Actions
  setNodes: (nodes: GraphNode[]) => void
  setEdges: (edges: GraphEdge[]) => void
  selectNode: (node: GraphNode | null) => void
  selectEdge: (edge: GraphEdge | null) => void
  toggleEntityFilter: (type: keyof GraphState['entityFilters']) => void
  toggleRelationFilter: (type: keyof GraphState['relationFilters']) => void
  setNodeSize: (size: number) => void
  setLayoutMode: (mode: GraphState['layoutMode']) => void
  setSearchQuery: (query: string) => void
  resetFilters: () => void
}

// Mock data for demonstration
const mockNodes: GraphNode[] = [
  { id: '1', label: '张三', type: 'person', properties: { department: '研发部', position: '工程师' } },
  { id: '2', label: '李四', type: 'person', properties: { department: '产品部', position: '产品经理' } },
  { id: '3', label: '王五', type: 'person', properties: { department: '市场部', position: '市场总监' } },
  { id: '4', label: '研发部', type: 'organization', properties: { founded: '2018' } },
  { id: '5', label: '产品部', type: 'organization', properties: { founded: '2018' } },
  { id: '6', label: '市场部', type: 'organization', properties: { founded: '2019' } },
  { id: '7', label: '产品发布会', type: 'event', properties: { date: '2024-03-15' } },
  { id: '8', label: '技术研讨会', type: 'event', properties: { date: '2024-02-20' } },
  { id: '9', label: '北京总部', type: 'location', properties: { address: '北京市朝阳区' } },
  { id: '10', label: '上海分公司', type: 'location', properties: { address: '上海市浦东新区' } },
  { id: '11', label: '技术规范文档', type: 'document', properties: { version: 'v2.1' } },
  { id: '12', label: '产品需求文档', type: 'document', properties: { version: 'v1.5' } },
]

const mockEdges: GraphEdge[] = [
  { id: 'e1', source: '1', target: '4', type: 'belongs_to', properties: {} },
  { id: 'e2', source: '2', target: '5', type: 'belongs_to', properties: {} },
  { id: 'e3', source: '3', target: '6', type: 'belongs_to', properties: {} },
  { id: 'e4', source: '1', target: '2', type: 'collaborates', properties: {} },
  { id: 'e5', source: '2', target: '3', type: 'collaborates', properties: {} },
  { id: 'e6', source: '7', target: '4', type: 'related', properties: {} },
  { id: 'e7', source: '7', target: '5', type: 'related', properties: {} },
  { id: 'e8', source: '8', target: '1', type: 'related', properties: {} },
  { id: 'e9', source: '4', target: '9', type: 'related', properties: {} },
  { id: 'e10', source: '6', target: '10', type: 'related', properties: {} },
  { id: 'e11', source: '11', target: '1', type: 'references', properties: {} },
  { id: 'e12', source: '12', target: '2', type: 'references', properties: {} },
]

export const useGraphStore = create<GraphState>((set) => ({
  // Data
  nodes: mockNodes,
  edges: mockEdges,

  // Selection
  selectedNode: null,
  selectedEdge: null,

  // Filters
  entityFilters: {
    person: true,
    organization: true,
    event: true,
    location: true,
    document: true,
  },
  relationFilters: {
    belongs_to: true,
    collaborates: true,
    references: true,
    related: true,
  },

  // Display settings
  nodeSize: 30,
  layoutMode: 'force',
  searchQuery: '',

  // Actions
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  selectNode: (node) => set({ selectedNode: node, selectedEdge: null }),
  selectEdge: (edge) => set({ selectedEdge: edge, selectedNode: null }),
  toggleEntityFilter: (type) => set((state) => ({
    entityFilters: { ...state.entityFilters, [type]: !state.entityFilters[type] }
  })),
  toggleRelationFilter: (type) => set((state) => ({
    relationFilters: { ...state.relationFilters, [type]: !state.relationFilters[type] }
  })),
  setNodeSize: (size) => set({ nodeSize: size }),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetFilters: () => set({
    entityFilters: {
      person: true,
      organization: true,
      event: true,
      location: true,
      document: true,
    },
    relationFilters: {
      belongs_to: true,
      collaborates: true,
      references: true,
      related: true,
    },
    searchQuery: '',
  }),
}))