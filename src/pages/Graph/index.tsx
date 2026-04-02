import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useGraphStore } from '@/stores/graphStore'
import type { GraphNode } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Entity type labels and colors
const ENTITY_CONFIG = {
  person: { label: '人物', color: '#3b82f6' },
  organization: { label: '组织', color: '#7c3aed' },
  event: { label: '事件', color: '#22c55e' },
  location: { label: '地点', color: '#eab308' },
  document: { label: '文档', color: '#64748b' },
}

const RELATION_CONFIG = {
  belongs_to: { label: '隶属', color: '#94a3b8' },
  collaborates: { label: '协作', color: '#22c55e' },
  references: { label: '引用', color: '#0ea5e9' },
  related: { label: '关联', color: '#f59e0b' },
}

// Node positions for force-directed layout
interface NodePosition extends GraphNode {
  x: number
  y: number
  vx: number
  vy: number
}

export default function GraphPage() {
  const {
    nodes,
    edges,
    selectedNode,
    entityFilters,
    relationFilters,
    nodeSize,
    layoutMode,
    searchQuery,
    selectNode,
    toggleEntityFilter,
    toggleRelationFilter,
    setNodeSize,
    setLayoutMode,
    setSearchQuery,
    resetFilters,
  } = useGraphStore()

  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const containerRef = useRef<HTMLDivElement>(null)
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([])
  const [isDragging, setIsDragging] = useState<string | null>(null)

  // Filter nodes and edges based on filters and search
  const filteredData = useMemo(() => {
    const filteredNodes = nodes.filter((node) => {
      if (!entityFilters[node.type]) return false
      if (searchQuery && !node.label.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      return true
    })

    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id))
    const filteredEdges = edges.filter((edge) => {
      if (!relationFilters[edge.type]) return false
      if (!filteredNodeIds.has(edge.source) || !filteredNodeIds.has(edge.target)) return false
      return true
    })

    return { nodes: filteredNodes, edges: filteredEdges }
  }, [nodes, edges, entityFilters, relationFilters, searchQuery])

  // Initialize node positions
  useEffect(() => {
    if (filteredData.nodes.length === 0) {
      setNodePositions([])
      return
    }

    const centerX = dimensions.width / 2
    const centerY = dimensions.height / 2

    const positions: NodePosition[] = filteredData.nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / filteredData.nodes.length
      const radius = Math.min(dimensions.width, dimensions.height) * 0.35
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
      }
    })
    setNodePositions(positions)
  }, [filteredData.nodes, dimensions])

  // Simple force simulation
  useEffect(() => {
    if (nodePositions.length === 0 || layoutMode !== 'force') return

    let animationId: number
    const runSimulation = () => {
      setNodePositions((prev) => {
        if (prev.length === 0) return prev

        const positions = prev.map((node) => ({ ...node, vx: 0, vy: 0 }))
        const centerX = dimensions.width / 2
        const centerY = dimensions.height / 2

        // Apply forces
        for (let i = 0; i < positions.length; i++) {
          // Center gravity
          positions[i].vx += (centerX - positions[i].x) * 0.01
          positions[i].vy += (centerY - positions[i].y) * 0.01

          // Repulsion between nodes
          for (let j = i + 1; j < positions.length; j++) {
            const dx = positions[j].x - positions[i].x
            const dy = positions[j].y - positions[i].y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const force = (1500 / (dist * dist))
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force

            positions[i].vx -= fx
            positions[i].vy -= fy
            positions[j].vx += fx
            positions[j].vy += fy
          }
        }

        // Edge attraction
        filteredData.edges.forEach((edge) => {
          const sourceIdx = positions.findIndex((p) => p.id === edge.source)
          const targetIdx = positions.findIndex((p) => p.id === edge.target)
          if (sourceIdx !== -1 && targetIdx !== -1) {
            const dx = positions[targetIdx].x - positions[sourceIdx].x
            const dy = positions[targetIdx].y - positions[sourceIdx].y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const force = (dist - 150) * 0.01
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force

            positions[sourceIdx].vx += fx
            positions[sourceIdx].vy += fy
            positions[targetIdx].vx -= fx
            positions[targetIdx].vy -= fy
          }
        })

        // Apply velocity with damping
        return positions.map((node) => ({
          ...node,
          x: Math.max(nodeSize, Math.min(dimensions.width - nodeSize, node.x + node.vx * 0.5)),
          y: Math.max(nodeSize, Math.min(dimensions.height - nodeSize, node.y + node.vy * 0.5)),
        }))
      })

      animationId = requestAnimationFrame(runSimulation)
    }

    animationId = requestAnimationFrame(runSimulation)
    return () => cancelAnimationFrame(animationId)
  }, [filteredData.edges, dimensions, layoutMode, nodeSize])

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const handleNodeClick = useCallback((node: GraphNode) => {
    selectNode(node)
  }, [selectNode])

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    setIsDragging(nodeId)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !svgRef.current) return

    const rect = svgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setNodePositions((prev) =>
      prev.map((node) =>
        node.id === isDragging
          ? { ...node, x, y }
          : node
      )
    )
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
  }, [])

  // Zoom controls
  const [scale, setScale] = useState(1)
  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 2))
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5))
  const handleReset = () => {
    setScale(1)
    resetFilters()
  }

  // Get related nodes for selected node
  const relatedNodes = useMemo(() => {
    if (!selectedNode) return []
    const relatedIds = new Set<string>()
    edges.forEach((edge) => {
      if (edge.source === selectedNode.id) relatedIds.add(edge.target)
      if (edge.target === selectedNode.id) relatedIds.add(edge.source)
    })
    return nodes.filter((n) => relatedIds.has(n.id))
  }, [selectedNode, edges, nodes])

  // Get edges for selected node
  const selectedNodeEdges = useMemo(() => {
    if (!selectedNode) return []
    return edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
  }, [selectedNode, edges])

  return (
    <div className="h-full flex" style={{ background: '#0f172a' }}>
      {/* Left Control Panel */}
      <div className="w-64 flex-shrink-0 border-r border-slate-700 flex flex-col" style={{ background: '#0f172a' }}>
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">知识图谱</h2>
          <p className="text-sm text-slate-400 mt-1">实体关系网络可视化</p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-700">
          <Input
            placeholder="搜索实体..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-800 border-slate-600 text-white placeholder-slate-400"
          />
        </div>

        {/* Entity Type Filters */}
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3">实体类型</h3>
          <div className="space-y-2">
            {(Object.keys(ENTITY_CONFIG) as Array<keyof typeof ENTITY_CONFIG>).map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={entityFilters[type]}
                  onChange={() => toggleEntityFilter(type)}
                  className="rounded border-slate-600"
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: ENTITY_CONFIG[type].color }}
                />
                <span className="text-sm text-slate-300">{ENTITY_CONFIG[type].label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Relation Type Filters */}
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3">关系类型</h3>
          <div className="space-y-2">
            {(Object.keys(RELATION_CONFIG) as Array<keyof typeof RELATION_CONFIG>).map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={relationFilters[type]}
                  onChange={() => toggleRelationFilter(type)}
                  className="rounded border-slate-600"
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: RELATION_CONFIG[type].color }}
                />
                <span className="text-sm text-slate-300">{RELATION_CONFIG[type].label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Display Settings */}
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3">显示设置</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400">节点大小</label>
              <input
                type="range"
                min="20"
                max="50"
                value={nodeSize}
                onChange={(e) => setNodeSize(Number(e.target.value))}
                className="w-full mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">布局方式</label>
              <select
                value={layoutMode}
                onChange={(e) => setLayoutMode(e.target.value as 'force' | 'circular' | 'tree')}
                className="w-full mt-1 bg-slate-800 border-slate-600 text-white rounded px-3 py-2 text-sm"
              >
                <option value="force">力导向布局</option>
                <option value="circular">环形布局</option>
                <option value="tree">树形布局</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="p-4 mt-auto">
          <Button
            variant="outline"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={handleReset}
          >
            重置筛选
          </Button>
        </div>
      </div>

      {/* Center Graph Area */}
      <div className="flex-1 flex flex-col" style={{ background: '#0f172a' }}>
        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">
              节点: {filteredData.nodes.length} | 关系: {filteredData.edges.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={handleZoomOut}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </Button>
            <span className="text-sm text-slate-400 w-12 text-center">{Math.round(scale * 100)}%</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={handleZoomIn}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={handleReset}
            >
              重置
            </Button>
          </div>
        </div>

        {/* Graph Canvas */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden">
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="absolute inset-0"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <g transform={`scale(${scale})`}>
              {/* Edges */}
              {filteredData.edges.map((edge) => {
                const source = nodePositions.find((n) => n.id === edge.source)
                const target = nodePositions.find((n) => n.id === edge.target)
                if (!source || !target) return null

                const isHighlighted = selectedNode &&
                  (edge.source === selectedNode.id || edge.target === selectedNode.id)

                return (
                  <line
                    key={edge.id}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={isHighlighted ? RELATION_CONFIG[edge.type].color : '#475569'}
                    strokeWidth={isHighlighted ? 2 : 1}
                    opacity={isHighlighted ? 1 : 0.6}
                  />
                )
              })}

              {/* Nodes */}
              {nodePositions.map((node) => {
                const isSelected = selectedNode?.id === node.id
                const isRelated = selectedNode && relatedNodes.some((n) => n.id === node.id)
                const color = ENTITY_CONFIG[node.type].color

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => handleNodeClick(node)}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Node circle */}
                    <circle
                      r={isSelected ? nodeSize + 5 : nodeSize}
                      fill={color}
                      stroke={isSelected ? '#fff' : isRelated ? '#fff' : 'transparent'}
                      strokeWidth={isSelected ? 3 : isRelated ? 2 : 0}
                      opacity={selectedNode && !isSelected && !isRelated ? 0.4 : 1}
                    />
                    {/* Node label */}
                    <text
                      textAnchor="middle"
                      dy={nodeSize + 18}
                      fill="#fff"
                      fontSize="12"
                      opacity={selectedNode && !isSelected && !isRelated ? 0.4 : 1}
                    >
                      {node.label}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-slate-800/90 rounded-lg p-3 border border-slate-700">
            <h4 className="text-xs font-medium text-slate-300 mb-2">图例</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(ENTITY_CONFIG).map(([key, value]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: value.color }} />
                  <span className="text-xs text-slate-400">{value.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Detail Panel */}
      <div className="w-72 flex-shrink-0 border-l border-slate-700 flex flex-col" style={{ background: '#0f172a' }}>
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">实体详情</h2>
        </div>

        {selectedNode ? (
          <div className="flex-1 overflow-auto p-4">
            {/* Node Header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: ENTITY_CONFIG[selectedNode.type].color }}
              >
                <span className="text-white text-lg font-semibold">
                  {selectedNode.label.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="text-white font-semibold">{selectedNode.label}</h3>
                <Badge
                  variant="outline"
                  className="text-xs mt-1"
                  style={{
                    borderColor: ENTITY_CONFIG[selectedNode.type].color,
                    color: ENTITY_CONFIG[selectedNode.type].color
                  }}
                >
                  {ENTITY_CONFIG[selectedNode.type].label}
                </Badge>
              </div>
            </div>

            {/* Properties */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-300 mb-3">属性</h4>
              <div className="space-y-2">
                {Object.entries(selectedNode.properties || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-slate-400">{key}</span>
                    <span className="text-slate-200">{String(value)}</span>
                  </div>
                ))}
                {Object.keys(selectedNode.properties || {}).length === 0 && (
                  <span className="text-sm text-slate-500">暂无属性</span>
                )}
              </div>
            </div>

            {/* Relations */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-300 mb-3">关系统计</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{relatedNodes.length}</div>
                  <div className="text-xs text-slate-400">关联实体</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{selectedNodeEdges.length}</div>
                  <div className="text-xs text-slate-400">关系数</div>
                </div>
              </div>
            </div>

            {/* Related Nodes */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">关联实体</h4>
              <div className="space-y-2">
                {relatedNodes.map((node) => (
                  <div
                    key={node.id}
                    className="flex items-center gap-2 p-2 rounded bg-slate-800 cursor-pointer hover:bg-slate-700 transition-colors"
                    onClick={() => selectNode(node)}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: ENTITY_CONFIG[node.type].color }}
                    >
                      <span className="text-white text-xs font-medium">
                        {node.label.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{node.label}</div>
                      <div className="text-xs text-slate-400">
                        {ENTITY_CONFIG[node.type].label}
                      </div>
                    </div>
                  </div>
                ))}
                {relatedNodes.length === 0 && (
                  <span className="text-sm text-slate-500">暂无关联实体</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">点击节点查看详情</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}