# KMS 知识管理系统 - 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个完整的知识管理系统前端应用，包含11个页面、共享组件库、状态管理和路由配置。

**Architecture:** React 18 + Vite + Tailwind CSS + shadcn/ui 组件库，采用模块化设计，每个页面独立目录，共享组件统一管理，使用 Zustand 进行状态管理。

**Tech Stack:** React 18, Vite, Tailwind CSS, shadcn/ui, Zustand, React Router v6, Lucide React Icons, Recharts, D3.js

---

## 文件结构规划

```
ai_doctor/
├── src/
│   ├── components/          # 共享组件
│   │   ├── ui/              # shadcn/ui 基础组件
│   │   ├── layout/          # 布局组件
│   │   └── shared/          # 业务共享组件
│   ├── pages/               # 页面组件
│   │   ├── AIDoctor/
│   │   ├── Search/
│   │   ├── Write/
│   │   ├── KBManage/
│   │   ├── Pipeline/
│   │   ├── Annotation/
│   │   ├── Enhance/
│   │   ├── Flywheel/
│   │   ├── Template/
│   │   ├── Graph/
│   │   └── Analytics/
│   ├── stores/              # Zustand 状态管理
│   ├── hooks/               # 自定义 Hooks
│   ├── lib/                 # 工具函数
│   ├── types/               # TypeScript 类型定义
│   └── styles/              # 全局样式
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## Phase 1: 项目初始化与基础架构

### Task 1.1: 创建项目并安装依赖

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `tsconfig.json`
- Create: `postcss.config.js`

- [ ] **Step 1: 创建 Vite + React + TypeScript 项目**

```bash
cd D:/personalProject/ai_doctor
npm create vite@latest . -- --template react-ts
```

- [ ] **Step 2: 安装核心依赖**

```bash
npm install react-router-dom zustand lucide-react recharts d3
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 3: 安装 shadcn/ui 相关依赖**

```bash
npm install class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-checkbox @radix-ui/react-select @radix-ui/react-popover
```

- [ ] **Step 4: 配置 Tailwind CSS**

更新 `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#22c55e',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        accent: {
          blue: '#0ea5e9',
          purple: '#d946ef',
          yellow: '#eab308',
          red: '#ef4444',
        }
      },
      borderRadius: {
        'lg': '12px',
        'md': '10px',
        'sm': '8px',
        'xs': '6px',
      }
    },
  },
  plugins: [],
}
```

- [ ] **Step 5: 创建全局样式文件**

创建 `src/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 142.1 76.2% 36.3%;
    --primary-foreground: 355.7 100% 97.3%;
    --secondary: 210 40% 96.1%;
    --muted: 210 40% 96.1%;
    --border: 214.3 31.8% 91.4%;
    --ring: 142.1 76.2% 36.3%;
  }
  
  * {
    border-color: hsl(var(--border));
  }
  
  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}

@layer components {
  .card {
    @apply bg-white rounded-lg border border-slate-200 shadow-sm;
  }
  
  .card-hover {
    @apply transition-all hover:shadow-md hover:-translate-y-0.5;
  }
  
  .btn-primary {
    @apply bg-primary text-white px-4 py-2 rounded-md font-medium 
           hover:bg-primary-600 transition-colors;
  }
  
  .btn-secondary {
    @apply bg-slate-100 text-slate-700 px-4 py-2 rounded-md font-medium
           hover:bg-slate-200 transition-colors;
  }
  
  .input-base {
    @apply w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg
           focus:ring-2 focus:ring-primary-100 focus:border-primary transition-all;
  }
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
```

- [ ] **Step 6: 更新入口文件**

更新 `src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 7: 提交初始化代码**

```bash
git add .
git commit -m "chore: init project with Vite + React + TypeScript + Tailwind"
```

---

### Task 1.2: 创建工具函数和类型定义

**Files:**
- Create: `src/lib/utils.ts`
- Create: `src/lib/cn.ts`
- Create: `src/types/index.ts`

- [ ] **Step 1: 创建 className 合并工具**

创建 `src/lib/cn.ts`:

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: 创建通用工具函数**

创建 `src/lib/utils.ts`:

```typescript
// 格式化日期
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// 格式化数字（千分位）
export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 截断文本
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

// 延迟函数
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 生成唯一ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
```

- [ ] **Step 3: 创建类型定义**

创建 `src/types/index.ts`:

```typescript
// 用户相关
export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'user'
  department?: string
  createdAt: string
}

// 知识库相关
export interface KnowledgeBase {
  id: string
  name: string
  type: 'personal' | 'department' | 'public' | 'business'
  description: string
  documentCount: number
  createdAt: string
  updatedAt: string
}

export interface Document {
  id: string
  name: string
  type: 'pdf' | 'doc' | 'docx' | 'txt' | 'md'
  size: number
  knowledgeBaseId: string
  status: 'pending' | 'parsing' | 'parsed' | 'failed'
  version: string
  tags: string[]
  category: string
  createdAt: string
  updatedAt: string
  parsedAt?: string
}

// 解析流水线相关
export interface ParseTask {
  id: string
  documentId: string
  documentName: string
  status: 'pending' | 'uploading' | 'parsing' | 'chunking' | 'vectorizing' | 'completed' | 'failed'
  progress: number
  currentStage: string
  error?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export interface ParseStage {
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
}

// 对话相关
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  sources?: SourceReference[]
  verified?: boolean
}

export interface SourceReference {
  knowledgeBase: string
  document: string
  location: string
  confidence: number
}

// 搜索相关
export interface SearchResult {
  id: string
  title: string
  excerpt: string
  highlightedExcerpt: string
  documentType: string
  knowledgeBase: string
  matchScore: number
  createdAt: string
}

// 标注相关
export interface AnnotationTask {
  id: string
  documentId: string
  documentName: string
  status: 'pending' | 'in_progress' | 'approved' | 'rejected'
  autoAnnotations: AutoAnnotation[]
  manualAnnotations: ManualAnnotation[]
  createdAt: string
  reviewedAt?: string
  reviewer?: string
}

export interface AutoAnnotation {
  type: 'category' | 'entity' | 'keyword'
  value: string
  confidence: number
  location?: string
}

export interface ManualAnnotation {
  type: 'category' | 'entity' | 'keyword'
  value: string
  verified: boolean
}

// 知识增强相关
export interface QA {
  id: string
  question: string
  answer: string
  sourceDocument: string
  sourceLocation: string
  confidence: number
  status: 'pending' | 'approved' | 'rejected'
  variations: string[]
  createdAt: string
}

// 模板相关
export interface Template {
  id: string
  name: string
  type: 'document' | 'prompt' | 'agent'
  category: string
  description: string
  content: string
  variables: TemplateVariable[]
  usageCount: number
  isOfficial: boolean
  createdAt: string
  updatedAt: string
}

export interface TemplateVariable {
  name: string
  label: string
  type: 'text' | 'select' | 'date' | 'knowledge_base'
  required: boolean
  defaultValue?: string
  options?: string[]
}

// 图谱相关
export interface GraphNode {
  id: string
  label: string
  type: 'person' | 'organization' | 'event' | 'location' | 'document'
  properties: Record<string, any>
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: 'belongs_to' | 'collaborates' | 'references' | 'related'
  properties: Record<string, any>
}

// 统计相关
export interface Statistics {
  totalDocuments: number
  totalKnowledgeBases: number
  monthlyVisits: number
  activeUsers: number
  accuracy: number
  growthRate: {
    documents: number
    visits: number
    users: number
  }
}

export interface HotDocument {
  id: string
  title: string
  views: number
  trend: 'up' | 'down' | 'stable'
}

export interface KnowledgeGap {
  id: string
  keyword: string
  searchCount: number
  priority: 'urgent' | 'medium' | 'low'
  status: 'identified' | 'processing' | 'resolved'
}
```

- [ ] **Step 4: 提交类型定义**

```bash
git add src/lib src/types
git commit -m "feat: add utility functions and type definitions"
```

---

### Task 1.3: 创建基础 UI 组件

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/modal.tsx`

- [ ] **Step 1: 创建 Button 组件**

创建 `src/components/ui/button.tsx`:

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary-600",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-slate-200 bg-white hover:bg-slate-50 hover:text-primary",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        ghost: "hover:bg-slate-100 hover:text-slate-900",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

- [ ] **Step 2: 创建 Card 组件**

创建 `src/components/ui/card.tsx`:

```tsx
import * as React from "react"
import { cn } from "@/lib/cn"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }
>(({ className, hover = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-slate-200 bg-white shadow-sm",
      hover && "transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-slate-500", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

- [ ] **Step 3: 创建 Input 组件**

创建 `src/components/ui/input.tsx`:

```tsx
import * as React from "react"
import { cn } from "@/lib/cn"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, error, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm",
            "ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            icon && "pl-10",
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
```

- [ ] **Step 4: 创建 Badge 组件**

创建 `src/components/ui/badge.tsx`:

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-white",
        secondary: "border-transparent bg-slate-100 text-slate-900",
        destructive: "border-transparent bg-red-500 text-white",
        success: "border-transparent bg-green-500 text-white",
        warning: "border-transparent bg-yellow-500 text-white",
        info: "border-transparent bg-blue-500 text-white",
        outline: "text-slate-700 border-slate-200",
        outlinePrimary: "text-primary border-primary bg-primary-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

- [ ] **Step 5: 创建 Tabs 组件**

创建 `src/components/ui/tabs.tsx`:

```tsx
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/cn"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-slate-100 p-1 text-slate-500",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5",
      "text-sm font-medium ring-offset-white transition-all",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
```

- [ ] **Step 6: 创建 Modal 组件**

创建 `src/components/ui/modal.tsx`:

```tsx
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/cn"

const Modal = DialogPrimitive.Root

const ModalTrigger = DialogPrimitive.Trigger

const ModalPortal = DialogPrimitive.Portal

const ModalClose = DialogPrimitive.Close

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
ModalOverlay.displayName = DialogPrimitive.Overlay.displayName

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <ModalPortal>
    <ModalOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
        "gap-4 border border-slate-200 bg-white p-6 shadow-lg duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        "rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-slate-100 data-[state=open]:text-slate-500">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </ModalPortal>
))
ModalContent.displayName = DialogPrimitive.Content.displayName

const ModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
ModalHeader.displayName = "ModalHeader"

const ModalFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
ModalFooter.displayName = "ModalFooter"

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
ModalTitle.displayName = DialogPrimitive.Title.displayName

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-slate-500", className)}
    {...props}
  />
))
ModalDescription.displayName = DialogPrimitive.Description.displayName

export {
  Modal,
  ModalPortal,
  ModalOverlay,
  ModalClose,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
}
```

- [ ] **Step 7: 提交基础组件**

```bash
git add src/components/ui
git commit -m "feat: add base UI components (Button, Card, Input, Badge, Tabs, Modal)"
```

---

### Task 1.4: 创建布局组件

**Files:**
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/MainLayout.tsx`
- Create: `src/stores/layoutStore.ts`

- [ ] **Step 1: 创建布局状态管理**

创建 `src/stores/layoutStore.ts`:

```tsx
import { create } from 'zustand'

interface LayoutState {
  sidebarOpen: boolean
  activeMenu: string
  toggleSidebar: () => void
  setActiveMenu: (menu: string) => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarOpen: true,
  activeMenu: 'ai-doctor',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveMenu: (menu) => set({ activeMenu: menu }),
}))
```

- [ ] **Step 2: 创建侧边栏组件**

创建 `src/components/layout/Sidebar.tsx`:

```tsx
import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Cpu, Search, PenTool, Book, Database,
  Settings, User, Building2, Briefcase, Globe,
  FolderOpen, RefreshCw, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLayoutStore } from '@/stores/layoutStore'

interface MenuItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
  children?: MenuItem[]
}

const menuItems: MenuItem[] = [
  {
    id: 'ai-doctor',
    label: 'AI博士对话',
    icon: <Cpu size={18} />,
    path: '/ai-doctor',
  },
  {
    id: 'search',
    label: '智能搜索',
    icon: <Search size={18} />,
    path: '/search',
  },
  {
    id: 'write',
    label: '智能写作',
    icon: <PenTool size={18} />,
    path: '/write',
  },
  {
    id: 'kb',
    label: '知识库',
    icon: <Book size={18} />,
    path: '/kb',
  },
  {
    id: 'pipeline',
    label: '解析流水线',
    icon: <RefreshCw size={18} />,
    path: '/pipeline',
  },
  {
    id: 'annotation',
    label: '语料标注',
    icon: <PenTool size={18} />,
    path: '/annotation',
  },
  {
    id: 'enhance',
    label: '知识增强',
    icon: <Sparkles size={18} />,
    path: '/enhance',
  },
  {
    id: 'flywheel',
    label: '知识运营',
    icon: <RefreshCw size={18} />,
    path: '/flywheel',
  },
  {
    id: 'template',
    label: '模板库',
    icon: <Database size={18} />,
    path: '/template',
  },
  {
    id: 'graph',
    label: '知识图谱',
    icon: <FolderOpen size={18} />,
    path: '/graph',
  },
  {
    id: 'analytics',
    label: '数据分析',
    icon: <Database size={18} />,
    path: '/analytics',
  },
]

export const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { sidebarOpen, activeMenu, setActiveMenu } = useLayoutStore()

  const handleMenuClick = (item: MenuItem) => {
    setActiveMenu(item.id)
    navigate(item.path)
  }

  return (
    <div
      className={cn(
        "bg-slate-50 border-r border-slate-200 h-screen flex flex-col shrink-0 transition-all duration-300",
        sidebarOpen ? "w-64" : "w-20"
      )}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-slate-200 bg-white">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
          <Book size={20} />
        </div>
        {sidebarOpen && (
          <span className="font-bold text-slate-700 tracking-tight truncate">
            知识管理系统
          </span>
        )}
      </div>

      {/* Menu */}
      <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <nav className="px-2 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                location.pathname === item.path
                  ? "bg-primary text-white font-medium shadow-md"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
            张
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-700 truncate">张三</div>
              <div className="text-[10px] text-slate-400 truncate">在线 · 浦东办公室</div>
            </div>
          )}
          {sidebarOpen && <Settings size={14} className="text-slate-300 hover:text-slate-600 cursor-pointer" />}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 创建主布局组件**

创建 `src/components/layout/MainLayout.tsx`:

```tsx
import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useLayoutStore } from '@/stores/layoutStore'
import { LayoutDashboard } from 'lucide-react'

export const MainLayout: React.FC = () => {
  const { toggleSidebar } = useLayoutStore()

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden relative">
        {/* Toggle Button */}
        <div className="absolute top-4 right-8 z-50">
          <button
            onClick={toggleSidebar}
            className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
          >
            <LayoutDashboard size={18} className="text-slate-400" />
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: 导出布局组件**

创建 `src/components/layout/index.ts`:

```tsx
export { Sidebar } from './Sidebar'
export { MainLayout } from './MainLayout'
```

- [ ] **Step 5: 提交布局组件**

```bash
git add src/components/layout src/stores
git commit -m "feat: add layout components (Sidebar, MainLayout) and layout store"
```

---

### Task 1.5: 配置路由和入口

**Files:**
- Create: `src/App.tsx`
- Create: `src/router.tsx`

- [ ] **Step 1: 创建路由配置**

创建 `src/router.tsx`:

```tsx
import { createBrowserRouter } from 'react-router-dom'
import { MainLayout } from '@/components/layout'

// 页面组件（稍后创建）
const AIDoctor = React.lazy(() => import('@/pages/AIDoctor'))
const Search = React.lazy(() => import('@/pages/Search'))
const Write = React.lazy(() => import('@/pages/Write'))
const KBManage = React.lazy(() => import('@/pages/KBManage'))
const Pipeline = React.lazy(() => import('@/pages/Pipeline'))
const Annotation = React.lazy(() => import('@/pages/Annotation'))
const Enhance = React.lazy(() => import('@/pages/Enhance'))
const Flywheel = React.lazy(() => import('@/pages/Flywheel'))
const Template = React.lazy(() => import('@/pages/Template'))
const Graph = React.lazy(() => import('@/pages/Graph'))
const Analytics = React.lazy(() => import('@/pages/Analytics'))

import React from 'react'

// 加载中组件
const Loading = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-slate-400">加载中...</div>
  </div>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <React.Suspense fallback={<Loading />}>
            <AIDoctor />
          </React.Suspense>
        ),
      },
      {
        path: 'ai-doctor',
        element: (
          <React.Suspense fallback={<Loading />}>
            <AIDoctor />
          </React.Suspense>
        ),
      },
      {
        path: 'search',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Search />
          </React.Suspense>
        ),
      },
      {
        path: 'write',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Write />
          </React.Suspense>
        ),
      },
      {
        path: 'kb',
        element: (
          <React.Suspense fallback={<Loading />}>
            <KBManage />
          </React.Suspense>
        ),
      },
      {
        path: 'pipeline',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Pipeline />
          </React.Suspense>
        ),
      },
      {
        path: 'annotation',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Annotation />
          </React.Suspense>
        ),
      },
      {
        path: 'enhance',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Enhance />
          </React.Suspense>
        ),
      },
      {
        path: 'flywheel',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Flywheel />
          </React.Suspense>
        ),
      },
      {
        path: 'template',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Template />
          </React.Suspense>
        ),
      },
      {
        path: 'graph',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Graph />
          </React.Suspense>
        ),
      },
      {
        path: 'analytics',
        element: (
          <React.Suspense fallback={<Loading />}>
            <Analytics />
          </React.Suspense>
        ),
      },
    ],
  },
])
```

- [ ] **Step 2: 创建 App 入口**

更新 `src/App.tsx`:

```tsx
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

function App() {
  return <RouterProvider router={router} />
}

export default App
```

- [ ] **Step 3: 更新 vite.config.ts 配置别名**

更新 `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 4: 更新 tsconfig.json 配置别名**

更新 `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: 提交路由配置**

```bash
git add src/App.tsx src/router.tsx vite.config.ts tsconfig.json
git commit -m "feat: add router configuration and App entry"
```

---

## Phase 2: AI 能力中心页面

### Task 2.1: 创建 AI 博士对话页面

**Files:**
- Create: `src/pages/AIDoctor/index.tsx`
- Create: `src/pages/AIDoctor/ChatMessage.tsx`
- Create: `src/pages/AIDoctor/SourceCard.tsx`
- Create: `src/pages/AIDoctor/ChatInput.tsx`
- Create: `src/pages/AIDoctor/SidePanel.tsx`
- Create: `src/stores/chatStore.ts`

- [ ] **Step 1: 创建对话状态管理**

创建 `src/stores/chatStore.ts`:

```tsx
import { create } from 'zustand'
import type { ChatMessage, SourceReference } from '@/types'

interface ChatState {
  messages: ChatMessage[]
  mode: 'qa' | 'create' | 'analyze'
  input: string
  isLoading: boolean
  selectedKB: string[]
  addMessage: (message: ChatMessage) => void
  setMode: (mode: 'qa' | 'create' | 'analyze') => void
  setInput: (input: string) => void
  setLoading: (loading: boolean) => void
  toggleKB: (kbId: string) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [
    {
      id: '1',
      role: 'assistant',
      content: '您好，我是AI博士。我可以帮您进行知识问答、内容创作和数据分析。请问有什么可以帮您？',
      timestamp: new Date().toISOString(),
      verified: true,
    }
  ],
  mode: 'qa',
  input: '',
  isLoading: false,
  selectedKB: ['public'],
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setMode: (mode) => set({ mode }),
  setInput: (input) => set({ input }),
  setLoading: (loading) => set({ isLoading: loading }),
  toggleKB: (kbId) => set((state) => ({
    selectedKB: state.selectedKB.includes(kbId)
      ? state.selectedKB.filter(id => id !== kbId)
      : [...state.selectedKB, kbId]
  })),
  clearMessages: () => set({ messages: [] }),
}))
```

- [ ] **Step 2: 创建溯源卡片组件**

创建 `src/pages/AIDoctor/SourceCard.tsx`:

```tsx
import React from 'react'
import { Book, FileText, CheckCircle2 } from 'lucide-react'
import type { SourceReference } from '@/types'

interface SourceCardProps {
  sources: SourceReference[]
}

export const SourceCard: React.FC<SourceCardProps> = ({ sources }) => {
  if (!sources || sources.length === 0) return null

  return (
    <div className="mt-4 bg-primary-50 rounded-lg p-4 border border-primary-100">
      <div className="flex items-center gap-2 text-primary-700 text-sm font-medium mb-3">
        <Book size={16} />
        <span>引用来源</span>
      </div>
      {sources.map((source, index) => (
        <div key={index} className="text-sm text-primary-600 mb-2 last:mb-0">
          <div className="flex items-center gap-2">
            <FileText size={14} className="shrink-0" />
            <span>知识库: {source.knowledgeBase}</span>
          </div>
          <div className="ml-6 mt-1 text-primary-500">
            文档: {source.document} ({source.location})
          </div>
          <div className="ml-6 mt-1 flex items-center gap-2">
            <span className="text-primary-500">置信度: {source.confidence}%</span>
            {source.confidence >= 95 && (
              <span className="flex items-center gap-1 text-primary">
                <CheckCircle2 size={14} /> 已验证
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: 创建聊天消息组件**

创建 `src/pages/AIDoctor/ChatMessage.tsx`:

```tsx
import React from 'react'
import { Cpu, User } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '@/types'
import { SourceCard } from './SourceCard'
import { cn } from '@/lib/cn'

interface ChatMessageProps {
  message: ChatMessageType
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user'

  return (
    <div className={cn("flex gap-4", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
          isUser ? "bg-primary text-white" : "bg-primary text-white"
        )}
      >
        {isUser ? <User size={20} /> : <Cpu size={20} />}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "max-w-[80%] p-4 rounded-2xl shadow-sm border",
          isUser
            ? "bg-primary text-white border-primary"
            : "bg-white border-slate-100"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>

        {/* Source Card for AI messages */}
        {!isUser && message.sources && <SourceCard sources={message.sources} />}

        {/* Timestamp */}
        <div
          className={cn(
            "text-[10px] mt-2",
            isUser ? "text-primary-100" : "text-slate-400"
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 创建输入框组件**

创建 `src/pages/AIDoctor/ChatInput.tsx`:

```tsx
import React, { useState } from 'react'
import { Send, Paperclip, Mic, BookOpen, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chatStore'

export const ChatInput: React.FC = () => {
  const { input, setInput, addMessage, setLoading, isLoading, mode } = useChatStore()

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      timestamp: new Date().toISOString(),
    }

    addMessage(userMessage)
    setInput('')
    setLoading(true)

    // 模拟 AI 回复
    setTimeout(() => {
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: `这是对您问题的回答。当前模式: ${mode === 'qa' ? '问答' : mode === 'create' ? '创作' : '分析'}`,
        timestamp: new Date().toISOString(),
        sources: [
          {
            knowledgeBase: '公共政策库',
            document: '数字化转型指南.pdf',
            location: '第12-15段',
            confidence: 98,
          }
        ],
        verified: true,
      }
      addMessage(aiMessage)
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="bg-white border-t border-slate-200 p-6">
      <div className="max-w-4xl mx-auto relative">
        {/* Tools */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-2">
          <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-50 rounded-lg transition-all">
            <Paperclip size={18} />
          </button>
          <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-50 rounded-lg transition-all">
            <Mic size={18} />
          </button>
          <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-50 rounded-lg transition-all">
            <BookOpen size={18} />
          </button>
          <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-50 rounded-lg transition-all">
            <Hash size={18} />
          </button>
        </div>

        {/* Input */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入您的问题，如：帮我起草一份会议通知..."
          className="w-full pl-28 pr-16 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary transition-all"
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
            input.trim() && !isLoading
              ? "bg-primary text-white shadow-lg shadow-primary-200"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          )}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

import { cn } from '@/lib/cn'
```

- [ ] **Step 5: 创建侧边面板组件**

创建 `src/pages/AIDoctor/SidePanel.tsx`:

```tsx
import React from 'react'
import { Sparkles, Book, User, Building2, Globe } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useChatStore } from '@/stores/chatStore'

const knowledgeBases = [
  { id: 'personal', label: '个人库', icon: <User size={16} /> },
  { id: 'department', label: '单位库', icon: <Building2 size={16} /> },
  { id: 'public', label: '公共库', icon: <Globe size={16} /> },
]

const skills = [
  { id: 'draft', label: '公文起草' },
  { id: 'polish', label: '内容润色' },
  { id: 'analyze', label: '数据分析' },
]

export const SidePanel: React.FC = () => {
  const { selectedKB, toggleKB, messages } = useChatStore()

  return (
    <div className="w-80 bg-white border-l border-slate-200 shrink-0 flex flex-col">
      {/* Session Info */}
      <div className="p-5 border-b border-slate-200">
        <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
          <div className="text-sm font-medium text-primary-700 mb-2">当前会话</div>
          <div className="text-xs text-primary-600">
            对话轮次: {messages.filter(m => m.role === 'user').length}
          </div>
          <div className="text-xs text-primary-600">
            引用文档: {messages.filter(m => m.sources).length}
          </div>
        </div>
      </div>

      {/* Knowledge Base Selection */}
      <div className="p-5 border-b border-slate-200">
        <div className="text-sm font-medium text-slate-700 mb-3">检索范围</div>
        <div className="space-y-2">
          {knowledgeBases.map((kb) => (
            <button
              key={kb.id}
              onClick={() => toggleKB(kb.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                selectedKB.includes(kb.id)
                  ? 'bg-primary text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {kb.icon}
              <span>{kb.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Verification Status */}
      <div className="p-5 border-b border-slate-200">
        <div className="text-sm font-medium text-slate-700 mb-3">真实性验证</div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          <div className="space-y-2 text-xs text-yellow-700">
            <div>• 内容来源已追溯</div>
            <div>• 时效性已检查</div>
            <div>• 无冲突信息</div>
          </div>
          <Badge variant="warning" className="mt-3">验证通过 ✅</Badge>
        </div>
      </div>

      {/* Quick Skills */}
      <div className="p-5">
        <div className="text-sm font-medium text-slate-700 mb-3">快捷技能</div>
        <div className="space-y-2">
          {skills.map((skill) => (
            <button
              key={skill.id}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg text-sm text-slate-600 hover:bg-primary-50 hover:border-primary transition-all"
            >
              {skill.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 创建主页面组件**

创建 `src/pages/AIDoctor/index.tsx`:

```tsx
import React from 'react'
import { Share2, Trash2, Plus, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { SidePanel } from './SidePanel'
import { useChatStore } from '@/stores/chatStore'

const AIDoctor: React.FC = () => {
  const { messages, mode, setMode, clearMessages } = useChatStore()
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="h-14 border-b px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary-100">
            <span className="text-sm font-bold">AI</span>
          </div>
          <span className="font-bold text-slate-800">AI博士对话</span>
          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">
            Online
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm">
            <Plus size={16} className="mr-2" /> 新对话
          </Button>
          <Button variant="ghost" size="sm">
            <History size={16} className="mr-2" /> 历史
          </Button>
          <button className="text-slate-400 hover:text-slate-600">
            <Share2 size={18} />
          </button>
          <button onClick={clearMessages} className="text-slate-400 hover:text-red-500">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mode Tabs */}
          <div className="px-6 pt-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
              <TabsList>
                <TabsTrigger value="qa">问答模式</TabsTrigger>
                <TabsTrigger value="create">创作模式</TabsTrigger>
                <TabsTrigger value="analyze">分析模式</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <ChatInput />
        </div>

        {/* Side Panel */}
        <SidePanel />
      </div>
    </div>
  )
}

export default AIDoctor
```

- [ ] **Step 7: 提交 AI 博士页面**

```bash
git add src/pages/AIDoctor src/stores/chatStore.ts
git commit -m "feat: add AI Doctor chat page with mode switching and source tracking"
```

---

### Task 2.2: 创建智能搜索页面

**Files:**
- Create: `src/pages/Search/index.tsx`
- Create: `src/pages/Search/SearchBar.tsx`
- Create: `src/pages/Search/FilterPanel.tsx`
- Create: `src/pages/Search/ResultCard.tsx`
- Create: `src/stores/searchStore.ts`

- [ ] **Step 1: 创建搜索状态管理**

创建 `src/stores/searchStore.ts`:

```tsx
import { create } from 'zustand'
import type { SearchResult } from '@/types'

interface SearchState {
  query: string
  mode: 'hybrid' | 'semantic' | 'keyword'
  results: SearchResult[]
  filters: {
    types: string[]
    dateRange: string
    kb: string[]
  }
  sortBy: 'relevance' | 'date'
  setQuery: (query: string) => void
  setMode: (mode: 'hybrid' | 'semantic' | 'keyword') => void
  setResults: (results: SearchResult[]) => void
  toggleFilter: (type: string, value: string) => void
  setSortBy: (sort: 'relevance' | 'date') => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  mode: 'hybrid',
  results: [],
  filters: { types: [], dateRange: 'all', kb: [] },
  sortBy: 'relevance',
  setQuery: (query) => set({ query }),
  setMode: (mode) => set({ mode }),
  setResults: (results) => set({ results }),
  toggleFilter: (type, value) => set((state) => {
    const current = state.filters[type as keyof typeof state.filters] as string[]
    return {
      filters: {
        ...state.filters,
        [type]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value]
      }
    }
  }),
  setSortBy: (sortBy) => set({ sortBy }),
}))
```

- [ ] **Step 2: 创建搜索结果卡片组件**

创建 `src/pages/Search/ResultCard.tsx`:

```tsx
import React from 'react'
import { FileText, Bookmark, Copy, Clock } from 'lucide-react'
import type { SearchResult } from '@/types'
import { Badge } from '@/components/ui/badge'

interface ResultCardProps {
  result: SearchResult
}

export const ResultCard: React.FC<ResultCardProps> = ({ result }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
    <div className="flex items-start justify-between mb-2">
      <h4 className="text-lg font-bold text-slate-800 group-hover:text-primary flex items-center gap-2">
        <FileText className="text-primary" size={20} />
        {result.title}
      </h4>
      <div className="flex gap-2">
        <button className="text-slate-300 hover:text-primary">
          <Bookmark size={18} />
        </button>
        <button className="text-slate-300 hover:text-primary">
          <Copy size={18} />
        </button>
      </div>
    </div>
    <p className="text-sm text-slate-500 leading-relaxed mb-4"
      dangerouslySetInnerHTML={{ __html: result.highlightedExcerpt }}
    />
    <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
      <span className="flex items-center gap-1">
        <Clock size={12} /> {result.createdAt}
      </span>
      <span>KB: {result.knowledgeBase}</span>
      <Badge variant="outlinePrimary">匹配度 {result.matchScore}%</Badge>
    </div>
  </div>
)
```

- [ ] **Step 3: 创建搜索页面主组件**

创建 `src/pages/Search/index.tsx`:

```tsx
import React, { useState } from 'react'
import { Search as SearchIcon, Filter, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ResultCard } from './ResultCard'
import { useSearchStore } from '@/stores/searchStore'

const Search: React.FC = () => {
  const { query, setQuery, mode, setMode, sortBy, setSortBy } = useSearchStore()
  const [results] = useState([]) // Mock results

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Search Header */}
      <div className="p-8 bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto">
          <Input
            icon={<SearchIcon size={20} />}
            placeholder="搜索全库知识..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-lg py-4"
          />
          <div className="mt-4 flex gap-2 flex-wrap">
            {['全部', '公文', '政策文件', '内部制度', '法律法规'].map((f, i) => (
              <Badge key={i} variant={i === 0 ? 'default' : 'secondary'} className="cursor-pointer">
                {f}
              </Badge>
            ))}
          </div>
          <div className="mt-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
              <TabsList>
                <TabsTrigger value="hybrid">混合检索</TabsTrigger>
                <TabsTrigger value="semantic">语义检索</TabsTrigger>
                <TabsTrigger value="keyword">关键词检索</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">约有 0 条结果</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSortBy('relevance')}>相关度</Button>
              <Button variant="ghost" size="sm" onClick={() => setSortBy('date')}>时间</Button>
              <Button variant="outline" size="sm"><Download size={14} className="mr-2" />导出</Button>
            </div>
          </div>
          {results.length === 0 && (
            <div className="text-center text-slate-400 py-12">输入关键词开始搜索</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Search
```

- [ ] **Step 4: 提交搜索页面**

```bash
git add src/pages/Search src/stores/searchStore.ts
git commit -m "feat: add Search page with hybrid/semantic/keyword modes"
```

---

### Task 2.3: 创建智能写作页面

**Files:**
- Create: `src/pages/Write/index.tsx`
- Create: `src/pages/Write/TemplatePanel.tsx`
- Create: `src/pages/Write/Editor.tsx`
- Create: `src/pages/Write/ConfigPanel.tsx`
- Create: `src/stores/writeStore.ts`

- [ ] **Step 1: 创建写作状态管理**

创建 `src/stores/writeStore.ts`:

```tsx
import { create } from 'zustand'

interface WriteState {
  template: string | null
  config: {
    organization: string
    topic: string
    date: string
  }
  content: string
  referenceKB: string[]
  setTemplate: (template: string | null) => void
  setConfig: (config: Partial<WriteState['config']>) => void
  setContent: (content: string) => void
  toggleReferenceKB: (kb: string) => void
}

export const useWriteStore = create<WriteState>((set) => ({
  template: null,
  config: { organization: '', topic: '', date: '' },
  content: '',
  referenceKB: ['public'],
  setTemplate: (template) => set({ template }),
  setConfig: (config) => set((state) => ({ config: { ...state.config, ...config } })),
  setContent: (content) => set({ content }),
  toggleReferenceKB: (kb) => set((state) => ({
    referenceKB: state.referenceKB.includes(kb)
      ? state.referenceKB.filter(k => k !== kb)
      : [...state.referenceKB, kb]
  })),
}))
```

- [ ] **Step 2: 创建写作页面主组件**

创建 `src/pages/Write/index.tsx`:

```tsx
import React from 'react'
import { PenTool, Sparkles, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWriteStore } from '@/stores/writeStore'

const templates = ['会议通知', '请示报告', '工作方案', '任免通知', '函件']

const Write: React.FC = () => {
  const { template, setTemplate, config, setConfig, content, setContent } = useWriteStore()

  return (
    <div className="flex h-full bg-slate-50">
      {/* Left: Template Panel */}
      <div className="w-80 border-r bg-white p-6 overflow-y-auto">
        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
          <PenTool size={18} className="text-primary" /> 写作助手
        </h3>
        <div className="space-y-4">
          <div className="p-4 bg-primary-50 border border-primary rounded-xl">
            <div className="text-xs font-bold text-primary mb-1">当前任务</div>
            <div className="text-sm font-bold text-slate-700">新公文起草</div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-2">选择公文模板</label>
            <div className="space-y-2">
              {templates.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setTemplate(t)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    template === t
                      ? 'border-primary bg-primary-50 font-bold text-primary'
                      : 'border-slate-100 hover:border-primary text-slate-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Center: Editor */}
      <div className="flex-1 flex flex-col p-8">
        <div className="bg-white rounded-xl border flex-1 flex flex-col overflow-hidden">
          <div className="h-12 border-b px-4 flex items-center justify-between bg-slate-50">
            <div className="text-sm text-slate-500">文档编辑器</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Sparkles size={14} className="mr-2" />AI生成</Button>
              <Button size="sm"><Save size={14} className="mr-2" />保存草稿</Button>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-y-auto">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="在此输入或使用AI生成内容..."
              className="w-full h-full resize-none border-none outline-none text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Right: Config Panel */}
      <div className="w-80 border-l bg-white p-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400">发文单位</label>
            <input
              value={config.organization}
              onChange={(e) => setConfig({ organization: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400">主题</label>
            <input
              value={config.topic}
              onChange={(e) => setConfig({ topic: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Write
```

- [ ] **Step 3: 提交写作页面**

```bash
git add src/pages/Write src/stores/writeStore.ts
git commit -m "feat: add Write page with template selection and AI generation"
```

---

### Task 2.4: 创建知识库管理页面

**Files:**
- Create: `src/pages/KBManage/index.tsx`
- Create: `src/pages/KBManage/KBTree.tsx`
- Create: `src/pages/KBManage/FileTable.tsx`
- Create: `src/pages/KBManage/MetadataPanel.tsx`
- Create: `src/stores/kbStore.ts`

- [ ] **Step 1: 创建知识库状态管理**

创建 `src/stores/kbStore.ts`:

```tsx
import { create } from 'zustand'
import type { Document } from '@/types'

interface KBState {
  currentKB: string | null
  currentFolder: string | null
  documents: Document[]
  selectedDocs: string[]
  viewMode: 'files' | 'pipeline'
  setCurrentKB: (kb: string | null) => void
  setCurrentFolder: (folder: string | null) => void
  toggleSelectDoc: (docId: string) => void
  setViewMode: (mode: 'files' | 'pipeline') => void
}

export const useKBStore = create<KBState>((set) => ({
  currentKB: null,
  currentFolder: null,
  documents: [],
  selectedDocs: [],
  viewMode: 'files',
  setCurrentKB: (kb) => set({ currentKB: kb }),
  setCurrentFolder: (folder) => set({ currentFolder: folder }),
  toggleSelectDoc: (docId) => set((state) => ({
    selectedDocs: state.selectedDocs.includes(docId)
      ? state.selectedDocs.filter(id => id !== docId)
      : [...state.selectedDocs, docId]
  })),
  setViewMode: (mode) => set({ viewMode: mode }),
}))
```

- [ ] **Step 2: 创建知识库管理页面主组件**

创建 `src/pages/KBManage/index.tsx`:

```tsx
import React from 'react'
import { ArrowLeft, Upload, Database, Filter, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useKBStore } from '@/stores/kbStore'

const KBManage: React.FC = () => {
  const { viewMode, setViewMode, selectedDocs } = useKBStore()

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="h-14 border-b px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon"><ArrowLeft size={18} /></Button>
          <h2 className="font-bold text-slate-800">知识库管理中心</h2>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList>
              <TabsTrigger value="files">文件库</TabsTrigger>
              <TabsTrigger value="pipeline">解析流水线</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button><Upload size={14} className="mr-2" />上传文件</Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: KB Tree */}
        <div className="w-64 border-r bg-slate-50 p-5 overflow-y-auto shrink-0">
          <div className="text-xs font-bold text-slate-400 uppercase mb-4">知识分层</div>
          <div className="space-y-2">
            {['政策文件库', '内部规章制度', '业务知识文档'].map((kb, i) => (
              <div key={i} className="p-3 bg-white rounded-lg border cursor-pointer hover:border-primary">
                <div className="text-sm font-medium text-slate-700">{kb}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: File Table */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {selectedDocs.length > 0 && (
            <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-4">
              <span className="text-sm text-yellow-700">已选择 {selectedDocs.length} 个文件</span>
              <Button size="sm" variant="outline">批量解析</Button>
              <Button size="sm" variant="outline">批量删除</Button>
            </div>
          )}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">文件名</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">状态</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase">更新时间</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">暂无文件</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Metadata Panel */}
        <div className="w-80 border-l bg-white shrink-0 p-6">
          <div className="text-sm font-bold text-slate-700 mb-4">元数据配置</div>
          <div className="text-slate-400 text-sm">选择文件查看详情</div>
        </div>
      </div>
    </div>
  )
}

export default KBManage
```

- [ ] **Step 3: 提交知识库管理页面**

```bash
git add src/pages/KBManage src/stores/kbStore.ts
git commit -m "feat: add KB management page with file table and metadata panel"
```

---

### Task 2.5 ~ 2.11: 创建剩余页面（简化步骤）

由于篇幅限制，剩余页面按照相同模式创建：

| Task | 页面 | 主要文件 | 提交信息 |
|------|------|---------|---------|
| 2.5 | Pipeline | `src/pages/Pipeline/index.tsx`, `src/stores/pipelineStore.ts` | "feat: add Pipeline page with task progress tracking" |
| 2.6 | Annotation | `src/pages/Annotation/index.tsx`, `src/stores/annotationStore.ts` | "feat: add Annotation page for document labeling" |
| 2.7 | Enhance | `src/pages/Enhance/index.tsx`, `src/stores/enhanceStore.ts` | "feat: add Enhance page for QA generation and generalization" |
| 2.8 | Flywheel | `src/pages/Flywheel/index.tsx`, `src/stores/flywheelStore.ts` | "feat: add Flywheel page for knowledge operations" |
| 2.9 | Template | `src/pages/Template/index.tsx`, `src/stores/templateStore.ts` | "feat: add Template page for template management" |
| 2.10 | Graph | `src/pages/Graph/index.tsx`, `src/stores/graphStore.ts` | "feat: add Graph page for knowledge graph visualization" |
| 2.11 | Analytics | `src/pages/Analytics/index.tsx`, `src/stores/analyticsStore.ts` | "feat: add Analytics page for data statistics" |

每个页面遵循相同模式：
1. 创建 Zustand store
2. 创建页面主组件
3. 提交代码

---

## Phase 3: 共享组件补充

### Task 3.1: 创建业务共享组件

**Files:**
- Create: `src/components/shared/ProgressBar.tsx`
- Create: `src/components/shared/StatusBadge.tsx`
- Create: `src/components/shared/EmptyState.tsx`
- Create: `src/components/shared/Loading.tsx`

- [ ] **Step 1: 创建进度条组件**

创建 `src/components/shared/ProgressBar.tsx`:

```tsx
import React from 'react'
import { cn } from '@/lib/cn'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  className,
  showLabel = false,
  variant = 'default'
}) => {
  const percentage = Math.min((value / max) * 100, 100)

  const colors = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-300", colors[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-slate-600">{Math.round(percentage)}%</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 创建状态徽章组件**

创建 `src/components/shared/StatusBadge.tsx`:

```tsx
import React from 'react'
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'

type Status = 'success' | 'pending' | 'processing' | 'error'

interface StatusBadgeProps {
  status: Status
  label?: string
}

const statusConfig = {
  success: { icon: CheckCircle2, variant: 'success' as const, text: '成功' },
  pending: { icon: Clock, variant: 'secondary' as const, text: '待处理' },
  processing: { icon: Clock, variant: 'info' as const, text: '处理中' },
  error: { icon: XCircle, variant: 'destructive' as const, text: '失败' },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon size={12} />
      {label || config.text}
    </Badge>
  )
}
```

- [ ] **Step 3: 创建空状态组件**

创建 `src/components/shared/EmptyState.tsx`:

```tsx
import React from 'react'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action
}) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="text-slate-300 mb-4">
      {icon || <FileQuestion size={48} />}
    </div>
    <h3 className="text-lg font-medium text-slate-700 mb-2">{title}</h3>
    {description && <p className="text-sm text-slate-400 mb-4">{description}</p>}
    {action && <Button onClick={action.onClick}>{action.label}</Button>}
  </div>
)
```

- [ ] **Step 4: 提交共享组件**

```bash
git add src/components/shared
git commit -m "feat: add shared components (ProgressBar, StatusBadge, EmptyState)"
```

---

## Phase 4: 最终检查与构建

### Task 4.1: 验证项目构建

- [ ] **Step 1: 运行 TypeScript 类型检查**

```bash
npm run build
```

预期: 构建成功，无类型错误

- [ ] **Step 2: 运行开发服务器**

```bash
npm run dev
```

预期: 开发服务器启动，可访问 http://localhost:5173

- [ ] **Step 3: 验证所有页面路由**

访问以下路由确认页面正常显示：
- /ai-doctor
- /search
- /write
- /kb
- /pipeline
- /annotation
- /enhance
- /flywheel
- /template
- /graph
- /analytics

- [ ] **Step 4: 最终提交**

```bash
git add .
git commit -m "feat: complete KMS frontend implementation with all 11 pages"
```

---

## 执行选项

**Plan complete and saved to `docs/superpowers/plans/2026-04-02-kms-implementation.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**