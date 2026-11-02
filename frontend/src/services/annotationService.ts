import { API_BASE_WITH_PATH } from '@/config/api'
import type { AnnotationTask, NLPAnnotationResult } from '@/types'

export interface GetTasksParams {
  status?: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'all'
  page?: number
  pageSize?: number
  search?: string
}

export interface GetTasksResponse {
  tasks: AnnotationTask[]
  total: number
  page: number
  pageSize: number
}

export interface SaveAnnotationParams {
  taskId: string
  annotations: {
    categories: string[]
    entities: Array<{ type: string; value: string }>
    keywords: string[]
  }
}

export interface SaveAnnotationResponse {
  success: boolean
  message?: string
}

export interface ApproveTaskParams {
  taskId: string
  reviewer?: string
  comment?: string
}

export interface RejectTaskParams {
  taskId: string
  reviewer?: string
  reason: string
}

export interface TaskActionResponse {
  success: boolean
  message?: string
}

/**
 * Annotation Service
 * Handles all annotation-related API calls
 */
export class AnnotationService {
  /**
   * Get annotation tasks with optional filters
   */
  static async getAnnotationTasks(params: GetTasksParams = {}): Promise<GetTasksResponse> {
    const { status = 'all', page = 1, pageSize = 20, search = '' } = params

    const queryParams = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    })

    if (status !== 'all') {
      queryParams.append('status', status)
    }

    if (search) {
      queryParams.append('search', search)
    }

    try {
      const response = await fetch(
        API_BASE_WITH_PATH(`/api/annotations/tasks?${queryParams.toString()}`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching annotation tasks:', error)
      throw error
    }
  }

  /**
   * Auto-annotate a document using NLP service
   */
  static async autoAnnotate(docId: string, content?: string): Promise<NLPAnnotationResult> {
    try {
      const response = await fetch(API_BASE_WITH_PATH('/api/annotate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: docId,
          content: content,
        }),
      })

      if (!response.ok) {
        throw new Error(`Auto-annotation failed: ${response.statusText}`)
      }

      const result: NLPAnnotationResult = await response.json()
      return result
    } catch (error) {
      console.error('Error auto-annotating document:', error)
      throw error
    }
  }

  /**
   * Save manual annotations for a task
   */
  static async saveAnnotation(
    taskId: string,
    annotations: SaveAnnotationParams['annotations']
  ): Promise<SaveAnnotationResponse> {
    try {
      const response = await fetch(API_BASE_WITH_PATH(`/api/annotations/tasks/${taskId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          annotations,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to save annotations: ${response.statusText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error saving annotations:', error)
      throw error
    }
  }

  /**
   * Approve an annotation task
   */
  static async approveTask(
    taskId: string,
    params: Omit<ApproveTaskParams, 'taskId'> = {}
  ): Promise<TaskActionResponse> {
    try {
      const response = await fetch(API_BASE_WITH_PATH(`/api/annotations/tasks/${taskId}/approve`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewer: params.reviewer || 'Current User',
          comment: params.comment,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to approve task: ${response.statusText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error approving task:', error)
      throw error
    }
  }

  /**
   * Reject an annotation task
   */
  static async rejectTask(
    taskId: string,
    params: Omit<RejectTaskParams, 'taskId'>
  ): Promise<TaskActionResponse> {
    try {
      const response = await fetch(API_BASE_WITH_PATH(`/api/annotations/tasks/${taskId}/reject`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewer: params.reviewer || 'Current User',
          reason: params.reason,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to reject task: ${response.statusText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error rejecting task:', error)
      throw error
    }
  }

  /**
   * Batch approve multiple tasks
   */
  static async batchApprove(taskIds: string[]): Promise<TaskActionResponse> {
    try {
      const response = await fetch(API_BASE_WITH_PATH('/api/annotations/tasks/batch/approve'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_ids: taskIds,
          reviewer: 'Current User',
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to batch approve tasks: ${response.statusText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error batch approving tasks:', error)
      throw error
    }
  }

  /**
   * Batch reject multiple tasks
   */
  static async batchReject(taskIds: string[], reason: string): Promise<TaskActionResponse> {
    try {
      const response = await fetch(API_BASE_WITH_PATH('/api/annotations/tasks/batch/reject'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_ids: taskIds,
          reviewer: 'Current User',
          reason,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to batch reject tasks: ${response.statusText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error batch rejecting tasks:', error)
      throw error
    }
  }

  /**
   * Get a single annotation task by ID
   */
  static async getTask(taskId: string): Promise<AnnotationTask> {
    try {
      const response = await fetch(API_BASE_WITH_PATH(`/api/annotations/tasks/${taskId}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.statusText}`)
      }

      const task = await response.json()
      return task
    } catch (error) {
      console.error('Error fetching task:', error)
      throw error
    }
  }

  /**
   * Get document content for annotation
   */
  static async getDocumentContent(docId: string): Promise<{ content: string; metadata: any }> {
    try {
      const response = await fetch(API_BASE_WITH_PATH(`/api/documents/${docId}/content`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch document content: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching document content:', error)
      throw error
    }
  }
}

export default AnnotationService
