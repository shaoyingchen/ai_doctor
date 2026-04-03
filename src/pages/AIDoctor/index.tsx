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
  Bot,
  Zap
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
      content: `根据您的问题"${message.slice(0, 30)}..."，我在知识库中找到了相关信息：

根据《数字化转型指南》第三章节的规定，企业进行数字化转型时应当遵循以下原则：

1. 战略先行：制定清晰的数字化转型战略
2. 循序渐进：从易到难，逐步推进
3. 数据驱动：建立完善的数据治理体系
4. 全员参与：培养数字化人才队伍

以上内容仅供参考，如需更详细的信息，建议查阅原文档。`,
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
      content: `我已根据您的要求生成了以下内容：

## 关于${message.slice(0, 20)}的工作方案

### 一、背景与目标

根据当前形势发展需要，特制定本工作方案。主要目标如下：

1. 完善制度建设，建立健全工作机制
2. 加强统筹协调，形成工作合力
3. 强化监督考核，确保落实见效

### 二、主要任务

（一）组织领导方面

成立专项工作领导小组，明确责任分工，定期召开工作推进会议。

（二）具体措施方面

制定详细实施计划，明确时间节点和责任人，建立台账管理制度。

### 三、保障措施

加强经费保障，强化人员配备，完善激励约束机制。

---

如需调整内容或补充细节，请告诉我。`,
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
      content: `## 数据分析报告

基于您提供的内容"${message.slice(0, 30)}..."，以下是分析结果：

### 核心要点分析

1. **关键指标趋势**
   - 本季度数据呈现上升趋势
   - 同比增长15.3%，环比增长8.7%

2. **主要发现**
   - 核心业务指标稳定增长
   - 新业务板块发展迅速
   - 用户满意度持续提升

### 对比分析

| 指标 | 本期 | 上期 | 变化 |
|------|------|------|------|
| 访问量 | 12.5万 | 10.8万 | +15.7% |
| 活跃用户 | 3.2万 | 2.9万 | +10.3% |
| 转化率 | 8.5% | 7.2% | +1.3pp |

### 建议与改进方向

1. 继续优化核心功能体验
2. 加强用户运营策略
3. 持续监控关键指标变化

---

如需深入分析某个维度，请告诉我。`,
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
    <div className="flex h-full bg-white">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-semibold text-slate-800">AI博士对话</h1>
            <Badge variant="outlinePrimary" className="text-[10px]">GPT-4</Badge>
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={newChat} className="text-slate-600">
              <Plus className="w-4 h-4 mr-1.5" />
              新对话
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-slate-600"
            >
              <History className="w-4 h-4 mr-1.5" />
              历史
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport} disabled={messages.length === 0} className="text-slate-600">
              <Download className="w-4 h-4 mr-1.5" />
              导出
            </Button>
          </div>
        </header>

        {/* Mode Tabs */}
        <div className="bg-slate-50/80 border-b border-slate-100 px-6 py-2 flex-shrink-0">
          <Tabs value={mode} onValueChange={(v) => setMode(v as ChatMode)}>
            <TabsList className="bg-white shadow-sm">
              {Object.entries(modeConfig).map(([key, config]) => (
                <TabsTrigger key={key} value={key} className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
                  {config.icon}
                  <span className="text-sm">{config.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                您好，我是AI博士
              </h2>
              <p className="text-slate-500 max-w-md mb-8 text-sm leading-relaxed">
                {mode === 'qa' && '我可以回答您关于政策、规范、业务等方面的各类问题，并提供可溯源的参考依据。'}
                {mode === 'create' && '我可以帮您撰写各类公文、报告、方案等文档，支持多种模板和风格。'}
                {mode === 'analyze' && '我可以对数据和文档进行深度分析，生成专业的分析报告和改进建议。'}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {mode === 'qa' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleSendMessage('什么是数字化转型？')} className="gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      什么是数字化转型？
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleSendMessage('如何制定企业发展战略？')} className="gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      如何制定企业发展战略？
                    </Button>
                  </>
                )}
                {mode === 'create' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleSendMessage('帮我写一份工作总结')} className="gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      写一份工作总结
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleSendMessage('帮我起草一份会议纪要')} className="gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      起草会议纪要
                    </Button>
                  </>
                )}
                {mode === 'analyze' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleSendMessage('分析本季度业务数据')} className="gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      分析业务数据
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleSendMessage('生成项目进度报告')} className="gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      生成进度报告
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto py-2">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isTyping && (
                <div className="flex items-center gap-3 py-4 px-6">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-slate-400">AI正在思考...</span>
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