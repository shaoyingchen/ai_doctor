import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { useKBStore, type KBTreeNode } from '@/stores/kbStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Database,
  FileText,
  Plus,
  FolderPlus,
  Trash2,
} from 'lucide-react'

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

function TreeNode({ node, level = 0 }: { node: KBTreeNode; level?: number }) {
  const { selectedKBId, selectKB, expandedNodes, toggleNode } = useKBStore()
  const isExpanded = expandedNodes.includes(node.id)
  const isSelected = selectedKBId === node.id
  const hasChildren = (node.children || []).length > 0

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
        {hasChildren ? (
          <button onClick={handleToggle} className="p-0.5 hover:bg-slate-200 rounded">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {node.type === 'kb' ? (
          getKBIcon(node.knowledgeBaseType)
        ) : isExpanded ? (
          <FolderOpen className="w-4 h-4 text-yellow-500" />
        ) : (
          <Folder className="w-4 h-4 text-yellow-500" />
        )}

        <span className="flex-1 text-sm truncate">{node.name}</span>

        {node.documentCount !== undefined && (
          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {node.documentCount}
          </span>
        )}
      </div>

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
  const {
    knowledgeBases,
    selectedKBId,
    getDocumentCount,
    loadKnowledgeBases,
    addKBNode,
    deleteKBNode,
  } = useKBStore()

  const [dialogMode, setDialogMode] = useState<'create-kb' | 'create-folder' | 'delete' | null>(null)
  const [nodeName, setNodeName] = useState('')
  const [dialogError, setDialogError] = useState('')
  const [panelError, setPanelError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadKnowledgeBases().catch(() => {})
  }, [loadKnowledgeBases])

  const selectedNode = useMemo(() => {
    const findNode = (nodes: KBTreeNode[]): KBTreeNode | null => {
      for (const node of nodes) {
        if (node.id === selectedKBId) return node
        const childHit = findNode(node.children || [])
        if (childHit) return childHit
      }
      return null
    }

    return selectedKBId ? findNode(knowledgeBases) : null
  }, [knowledgeBases, selectedKBId])

  const closeDialog = () => {
    setDialogMode(null)
    setNodeName('')
    setDialogError('')
    setIsSubmitting(false)
  }

  const handleCreateKB = async () => {
    const trimmedName = nodeName.trim()
    if (!trimmedName) {
      setDialogError('请输入知识库名称')
      return
    }

    setIsSubmitting(true)
    setDialogError('')
    try {
      await addKBNode({
        name: trimmedName,
        nodeType: 'kb',
        knowledgeBaseType: 'personal',
      })
      setPanelError('')
      closeDialog()
    } catch {
      setDialogError('新增知识库失败，请稍后重试')
      setIsSubmitting(false)
    }
  }

  const handleCreateFolder = async () => {
    const trimmedName = nodeName.trim()
    if (!trimmedName) {
      setDialogError('请输入下级目录名称')
      return
    }

    if (!selectedNode) {
      setDialogError('请先选择一个知识库或目录')
      return
    }

    setIsSubmitting(true)
    setDialogError('')
    try {
      await addKBNode({
        name: trimmedName,
        nodeType: 'folder',
        parentId: selectedNode.id,
      })
      setPanelError('')
      closeDialog()
    } catch {
      setDialogError('新增下级目录失败，请稍后重试')
      setIsSubmitting(false)
    }
  }

  const handleDeleteNode = async () => {
    if (!selectedNode) return

    setIsSubmitting(true)
    setDialogError('')
    try {
      await deleteKBNode(selectedNode.id)
      setPanelError('')
      closeDialog()
    } catch {
      setDialogError('删除失败，请稍后重试')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-slate-700">知识库</h3>
            <p className="text-xs text-slate-500 mt-0.5">选择知识库或目录节点</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              title="新增知识库"
              onClick={() => {
                setDialogMode('create-kb')
                setNodeName('')
                setDialogError('')
              }}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              title="新增下级目录"
              onClick={() => {
                if (!selectedNode) {
                  setPanelError('请先选择一个知识库或目录，再新增下级目录')
                  return
                }
                setDialogMode('create-folder')
                setNodeName('')
                setDialogError('')
              }}
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              title="删除当前节点"
              disabled={!selectedNode}
              onClick={() => {
                setDialogMode('delete')
                setDialogError('')
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        {panelError && <p className="mt-2 text-xs text-red-500">{panelError}</p>}
      </div>

      <div className="flex-1 overflow-auto py-2">
        {knowledgeBases.map((kb) => (
          <TreeNode key={kb.id} node={kb} />
        ))}
      </div>

      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <FileText className="w-3.5 h-3.5" />
          <span>共 {knowledgeBases.reduce((acc, kb) => acc + getDocumentCount(kb.id), 0)} 个文档</span>
        </div>
      </div>

      <Modal open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <ModalContent className="max-w-md">
          {dialogMode === 'create-kb' && (
            <>
              <ModalHeader>
                <ModalTitle>新增知识库</ModalTitle>
                <ModalDescription>创建一个新的知识库作为顶级节点</ModalDescription>
              </ModalHeader>
              <Input
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                placeholder="请输入知识库名称"
                autoFocus
              />
            </>
          )}

          {dialogMode === 'create-folder' && (
            <>
              <ModalHeader>
                <ModalTitle>新增下级目录</ModalTitle>
                <ModalDescription>
                  将在「{selectedNode?.name || '当前节点'}」下创建新的子目录
                </ModalDescription>
              </ModalHeader>
              <Input
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                placeholder="请输入目录名称"
                autoFocus
              />
            </>
          )}

          {dialogMode === 'delete' && (
            <ModalHeader>
              <ModalTitle>删除节点</ModalTitle>
              <ModalDescription>
                确认删除「{selectedNode?.name}」吗？该节点下的所有子级也会一起删除。
              </ModalDescription>
            </ModalHeader>
          )}

          {dialogError && <p className="text-xs text-red-500">{dialogError}</p>}

          <ModalFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              取消
            </Button>
            {dialogMode === 'create-kb' && (
              <Button type="button" onClick={handleCreateKB} disabled={isSubmitting}>
                {isSubmitting ? '创建中...' : '确认创建'}
              </Button>
            )}
            {dialogMode === 'create-folder' && (
              <Button type="button" onClick={handleCreateFolder} disabled={isSubmitting}>
                {isSubmitting ? '创建中...' : '确认创建'}
              </Button>
            )}
            {dialogMode === 'delete' && (
              <Button type="button" variant="destructive" onClick={handleDeleteNode} disabled={isSubmitting}>
                {isSubmitting ? '删除中...' : '确认删除'}
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
