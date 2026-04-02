import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { SidePanel } from './SidePanel'
import { useChatStore } from '@/stores/chatStore'
import type { ChatMode } from '@/stores/chatStore'
import type { SourceReference } from '@/types'
import {
  Plus,
  History,
  Download,
  MessageSquare,
  Sparkles,
  BarChart3,
  Bot
} from 'lucide-react'

const modeConfig: Record<ChatMode, { label: string; icon: React.ReactNode; description: string }> = {
  qa: {
    label: '问答模式',
    icon: <MessageSquare className="w-4 h-4" />,
    description: '基于知识库进行智能问答'
  },
  create: {
    label: '创作模式',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'AI辅助文档创作'
  },
  analyze: {
    label: '分析模式',
    icon: <BarChart3 className="w-4 h-4" />,
    description: '深度分析与报告生成'
  }
}

// Mock AI response generator
const generateMockResponse = (message: string, mode: ChatMode): { content: string; sources?: SourceReference[] } => {
  const responses: Record<ChatMode, { content: string; sources?: SourceReference[] }> = {
    qa: {
      content: `根据您的问题"${message.slice(0, 30)}..."，我在知识库中找到了相关信息：\n\n根据《数字化转型指南》第三章节的规定，企业进行数字化转型时应当遵循以下原则：\n\n1. 战略先行：制定清晰的数字化转型战略\n2. 循序渐进：从易到难，逐步推进\n3. 数据驱动：建立完善的数据治理体系\n4. 全员参与：培养数字化人才队伍\n\n以上内容仅供参考，如需更详细的信息，建议查阅原文档。`,
      sources: [
        {
          knowledgeBase: '公共政策库',
          document: '2024数字化转型指南.pdf',
          location: '第12-15段',
          confidence: 0.98
        },
        {
          knowledgeBase: '国家标准规范',
          document: '企业数字化能力评估标准.docx',
          location: '第3.2节',
          confidence: 0.92
        }
      ]
    },
    create: {
      content: `我已根据您的要求生成了以下内容：\n\n## 关于${message.slice(0, 20)}的工作方案\n\n### 一、背景与目标\n\n根据当前形势发展需要，特制定本工作方案。主要目标如下：\n\n1. 完善制度建设，建立健全工作机制\n2. 加强统筹协调，形成工作合力\n3. 强化监督考核，确保落实见效\n\n### 二、主要任务\n\n（一）组织领导方面\n\n成立专项工作领导小组，明确责任分工，定期召开工作推进会议。\n\n（二）具体措施方面\n\n制定详细实施计划，明确时间节点和责任人，建立台账管理制度。\n\n### 三、保障措施\n\n加强经费保障，强化人员配备，完善激励约束机制。\n\n---\n\n如需调整内容或补充细节，请告诉我。`,
      sources: [
        {
          knowledgeBase: '部门文档',
          document: '工作规范模板库',
          location: '公文模板-工作方案类',
          confidence: 0.95
        }
      ]
    },
    analyze: {
      content: `## 数据分析报告\n\n基于您提供的内容"${message.slice(0, 30)}..."，以下是分析结果：\n\n### 核心要点分析\n\n1. **关键指标趋势**\n   - 本季度数据呈现上升趋势\n   - 同比增长15.3%，环比增长8.7%\n   \n2. **主要发现**\n   - 核心业务指标稳定增长\n   - 新业务板块发展迅速\n   - 用户满意度持续提升\n\n### 对比分析\n\n| 指标 | 本期 | 上期 | 变化 |\n|------|------|------|------|\n| 访问量 | 12.5万 | 10.8万 | +15.7% |\n| 活跃用户 | 3.2万 | 2.9万 | +10.3% |\n| 转化率 | 8.5% | 7.2% | +1.3pp |\n\n### 建议与改进方向\n\n1. 继续优化核心功能体验\n2. 加强用户运营策略\n3. 持续监控关键指标变化\n\n---\n\n如需深入分析某个维度，请告诉我。`,
      sources: [
        {
          knowledgeBase: '公共政策库',
          document: '数据分析方法论.pdf',
          location: '第4章-对比分析',
          confidence: 0.88
        }
      ]
    }
  }

  return responses[mode]
}

export default function AIDoctor() {
  const {
    mode,
    setMode,
    messages,
    addMessage,
    isTyping,
    setTyping,
    newChat,
  } = useChatStore()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showHistory, setShowHistory] = useState(false)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return

    // Add user message
    addMessage({
      role: 'user',
      content: attachments && attachments.length > 0
        ? `${content}\n\n[附件: ${attachments.map(f => f.name).join(', ')}]`
        : content
    })

    // Simulate AI response
    setTyping(true)

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    const response = generateMockResponse(content, mode)

    addMessage({
      role: 'assistant',
      content: response.content,
      sources: response.sources,
      verified: response.sources?.every(s => s.confidence >= 0.9) ?? false
    })

    setTyping(false)
  }

  const handleExport = () => {
    const chatContent = messages.map(m => `[${m.role === 'user' ? '用户' : 'AI'}]\n${m.content}`).join('\n\n---\n\n')
    const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full bg-slate-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold text-slate-800">AI博士对话</h1>
            </div>
            <Badge variant="outlinePrimary">Beta</Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={newChat}>
              <Plus className="w-4 h-4 mr-2" />
              新对话
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="w-4 h-4 mr-2" />
              历史
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={messages.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
          </div>
        </header>

        {/* Mode Tabs */}
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex-shrink-0">
          <Tabs value={mode} onValueChange={(v) => setMode(v as ChatMode)}>
            <TabsList className="bg-slate-100">
              {Object.entries(modeConfig).map(([key, config]) => (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                  {config.icon}
                  {config.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-sm text-slate-500 mt-2">
            {modeConfig[mode].description}
          </p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Bot className="w-16 h-16 text-slate-300 mb-4" />
              <h2 className="text-xl font-medium text-slate-700 mb-2">
                您好，我是AI博士助手
              </h2>
              <p className="text-slate-500 max-w-md mb-6">
                {mode === 'qa' && '您可以向我提问任何问题，我会基于知识库为您提供准确、可靠的答案。'}
                {mode === 'create' && '我可以帮您撰写各类公文、报告、方案等文档，请告诉我您的需求。'}
                {mode === 'analyze' && '提供数据或文档，我将为您进行深度分析并生成专业的分析报告。'}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {mode === 'qa' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleSendMessage('什么是数字化转型？')}>
                      什么是数字化转型？
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleSendMessage('如何制定企业发展战略？')}>
                      如何制定企业发展战略？
                    </Button>
                  </>
                )}
                {mode === 'create' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleSendMessage('帮我写一份工作总结')}>
                      写一份工作总结
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleSendMessage('帮我起草一份会议纪要')}>
                      起草会议纪要
                    </Button>
                  </>
                )}
                {mode === 'analyze' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleSendMessage('分析本季度业务数据')}>
                      分析业务数据
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleSendMessage('生成项目进度报告')}>
                      生成进度报告
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isTyping && (
                <div className="flex items-center gap-2 p-4 text-slate-500">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm">AI正在思考...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <ChatInput onSend={handleSendMessage} disabled={isTyping} />
      </div>

      {/* Side Panel */}
      <SidePanel />
    </div>
  )
}