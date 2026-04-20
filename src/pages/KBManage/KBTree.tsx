import { cn } from '@/lib/cn'
import { useKBStore, type KBTreeNode } from '@/stores/kbStore'
import { ChevronRight, ChevronDown, Folder, FolderOpen, Database, FileText } from 'lucide-react'

// Get icon based on knowledge base type
function getKBIcon(type?: string) {
  switch (type) {
    case 'personal':
      return <Database className="w-4 h-4 text-blue-500" />
    case 'department':
      return <Database className="w-4 h-4 text-purple-500" />
    case 'public':
      return <Database className="w-4 h-4 text-green-500" />
    default:
      return <Database className="w-4 h-4 text-slate-500" />
  }
}

// Tree node component
function TreeNode({ node, level = 0 }: { node: KBTreeNode; level?: number }) {
  const { selectedKBId, selectKB, expandedNodes, toggleNode } = useKBStore()
  const isExpanded = expandedNodes.includes(node.id)
  const isSelected = selectedKBId === node.id
  const hasChildren = node.children && node.children.length > 0

  const handleClick = () => {
    selectKB(node.id)
    if (hasChildren) {
      toggleNode(node.id)
    }
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleNode(node.id)
  }

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded-md transition-colors',
          'hover:bg-slate-100',
          isSelected && 'bg-green-50 text-green-700 hover:bg-green-100'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse toggle */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-slate-200 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        {node.type === 'kb' ? (
          getKBIcon(node.knowledgeBaseType)
        ) : isExpanded ? (
          <FolderOpen className="w-4 h-4 text-yellow-500" />
        ) : (
          <Folder className="w-4 h-4 text-yellow-500" />
        )}

        {/* Name */}
        <span className="flex-1 text-sm truncate">{node.name}</span>

        {/* Document count badge */}
        {node.documentCount !== undefined && (
          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {node.documentCount}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function KBTree() {
  const { knowledgeBases, getDocumentCount } = useKBStore()

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-medium text-slate-700">知识库</h3>
        <p className="text-xs text-slate-500 mt-0.5">选择知识库或文件夹</p>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto py-2">
        {knowledgeBases.map((kb) => (
          <TreeNode key={kb.id} node={kb} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <FileText className="w-3.5 h-3.5" />
          <span>共 {knowledgeBases.reduce((acc, kb) => acc + getDocumentCount(kb.id), 0)} 个文档</span>
        </div>
      </div>
    </div>
  )
}