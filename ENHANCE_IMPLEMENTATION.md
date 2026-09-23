# 知识增强功能实现总结

## 实现的组件

### 1. 前端服务层
**文件**: `src/services/enhanceService.ts`

实现的API方法:
- `generateQA(docId, config)` - 生成QA对
- `generalizeQuestion(question)` - 问题泛化
- `getQAPairs(docId)` - 获取指定文档的QA对
- `getAllQAPairs()` - 获取所有QA对
- `approveQA(qaId)` - 审核通过QA对
- `rejectQA(qaId)` - 驳回QA对
- `batchApprove(qaIds)` - 批量审核通过
- `exportQA(docIds, format)` - 导出QA数据集

### 2. 状态管理
**文件**: `src/stores/enhanceStore.ts`

新增功能:
- 集成API服务调用
- `loadDocuments()` - 从后端加载文档列表
- `loadQAPairs(docId)` - 加载QA对数据
- `generateQA()` - 异步生成QA
- `generalizeQuestion(question)` - 异步问题泛化
- `approveQA(qaId)` - 异步审核通过
- `rejectQA(qaId)` - 异步驳回
- 添加loading和error状态管理

### 3. 前端页面
**文件**: `src/pages/Enhance/index.tsx`

实现的功能:
- **左侧面板**: 
  - 任务统计卡片（已通过/待审核/总计）
  - 文档列表（从API加载，支持选择）
  - 数据集列表
  
- **中间区域** - 四个Tab:
  - **QA生成Tab**:
    - 搜索和过滤功能
    - QA卡片展示（问题/答案/来源/置信度）
    - 审核操作（通过/驳回按钮）
    - 生成QA按钮（需先选择文档）
    - 加载状态和错误提示
  
  - **泛化Tab**:
    - 输入问题
    - 生成变体按钮
    - 显示生成的变体列表
    - 历史泛化记录
  
  - **拆解Tab**:
    - 显示知识单元拆解结果
  
  - **数据集Tab**:
    - 数据集管理界面
    - 导出/预览/删除操作

- **右侧面板**:
  - 生成配置（模型选择/粒度/最大QA数/自动审核）
  - 质量统计（总QA数/已通过/待审核/置信度/覆盖率）
  - 审核进度条
  - 快捷操作

### 4. 后端API
**文件**: `backend/api/enhance.py`

实现的端点:
- `POST /api/enhance/generate-qa` - 生成QA对
- `POST /api/enhance/generalize` - 问题泛化
- `GET /api/enhance/qa-pairs/{doc_id}` - 获取文档QA对
- `GET /api/enhance/qa-pairs` - 获取所有QA对
- `POST /api/enhance/qa/{qa_id}/approve` - 审核通过
- `POST /api/enhance/qa/{qa_id}/reject` - 驳回
- `POST /api/enhance/qa/batch-approve` - 批量审核
- `GET /api/enhance/export` - 导出数据集

## API调用流程

### 1. 页面初始化
```
组件挂载 → loadDocuments() → GET /api/documents
       → 显示文档列表
```

### 2. 选择文档后
```
选择文档 → loadQAPairs(docId) → GET /api/enhance/qa-pairs/{docId}
        → 显示该文档的QA对列表
```

### 3. 生成QA
```
点击"生成QA" → generateQA() → POST /api/enhance/generate-qa
            → 返回新生成的QA对
            → 更新qaList和质量统计
```

### 4. 审核操作
```
点击"通过" → approveQA(qaId) → POST /api/enhance/qa/{qaId}/approve
           → 更新QA状态为approved
           → 更新统计数据

点击"驳回" → rejectQA(qaId) → POST /api/enhance/qa/{qaId}/reject
           → 更新QA状态为rejected
           → 更新统计数据
```

### 5. 问题泛化
```
输入问题 → 点击"生成变体" → generalizeQuestion(question)
        → POST /api/enhance/generalize
        → 显示生成的变体列表
```

## 数据结构

### QA对象
```typescript
{
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
```

### 文档对象
```typescript
{
  id: string
  name: string
  qaCount: number
  generalizeCount: number
  decomposeCount: number
  status: 'pending' | 'processing' | 'completed'
}
```

## 核心特性

1. **完整的API集成**: 所有操作都通过真实API调用
2. **状态管理**: 使用Zustand管理全局状态，支持异步操作
3. **加载状态**: 所有异步操作都有loading状态提示
4. **错误处理**: 完整的错误捕获和用户提示
5. **数据联动**: 选择文档后自动加载对应QA对
6. **实时更新**: 审核操作后立即更新UI和统计数据
7. **响应式设计**: 三栏布局，支持独立滚动

## 文件清单

### 新增文件
- `src/services/enhanceService.ts` - 增强服务API客户端
- `backend/api/enhance.py` - 增强功能后端API

### 修改文件
- `src/stores/enhanceStore.ts` - 添加API集成和异步操作
- `src/pages/Enhance/index.tsx` - 添加API调用和交互逻辑
- `backend/app.py` - 注册enhance路由

## 使用方法

1. 启动后端服务
2. 访问知识增强页面
3. 左侧选择一个已完成的文档
4. 点击"生成QA"按钮生成问答对
5. 查看生成的QA卡片，进行审核操作
6. 切换到"泛化"Tab生成问题变体
7. 在右侧配置生成参数和查看统计信息
