import { API_BASE_URL } from '@/config/api'
import type { QA } from '@/types'

export interface GenerateQAConfig {
  model?: string
  granularity?: 'fine' | 'medium' | 'coarse'
  maxQAPerDoc?: number
  autoApprove?: boolean
}

export interface GenerateQAResponse {
  success: boolean
  docId: string
  qaPairs: QA[]
  totalGenerated: number
}

export interface GeneralizeResponse {
  success: boolean
  originalQuestion: string
  variations: string[]
}

export interface QAPairsResponse {
  success: boolean
  docId: string
  qaPairs: QA[]
  total: number
}

export interface ApprovalResponse {
  success: boolean
  qaId: string
  status: 'approved' | 'rejected'
}

class EnhanceService {
  private baseUrl = `${API_BASE_URL}/api/enhance`

  /**
   * Generate QA pairs from a document
   */
  async generateQA(docId: string, config?: GenerateQAConfig): Promise<GenerateQAResponse> {
    const response = await fetch(`${this.baseUrl}/generate-qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        docId,
        config: config || {},
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to generate QA: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Generate question variations (generalization)
   */
  async generalizeQuestion(question: string): Promise<GeneralizeResponse> {
    const response = await fetch(`${this.baseUrl}/generalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    })

    if (!response.ok) {
      throw new Error(`Failed to generalize question: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get all QA pairs for a document
   */
  async getQAPairs(docId: string): Promise<QAPairsResponse> {
    const response = await fetch(`${this.baseUrl}/qa-pairs/${docId}`)

    if (!response.ok) {
      throw new Error(`Failed to get QA pairs: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get all QA pairs (all documents)
   */
  async getAllQAPairs(): Promise<QAPairsResponse> {
    const response = await fetch(`${this.baseUrl}/qa-pairs`)

    if (!response.ok) {
      throw new Error(`Failed to get all QA pairs: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Approve a QA pair
   */
  async approveQA(qaId: string): Promise<ApprovalResponse> {
    const response = await fetch(`${this.baseUrl}/qa/${qaId}/approve`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`Failed to approve QA: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Reject a QA pair
   */
  async rejectQA(qaId: string): Promise<ApprovalResponse> {
    const response = await fetch(`${this.baseUrl}/qa/${qaId}/reject`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`Failed to reject QA: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Batch approve QA pairs
   */
  async batchApprove(qaIds: string[]): Promise<{ success: boolean; approved: string[] }> {
    const response = await fetch(`${this.baseUrl}/qa/batch-approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ qaIds }),
    })

    if (!response.ok) {
      throw new Error(`Failed to batch approve: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Export QA pairs to dataset
   */
  async exportQA(docIds?: string[], format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const params = new URLSearchParams()
    if (docIds && docIds.length > 0) {
      params.append('docIds', docIds.join(','))
    }
    params.append('format', format)

    const response = await fetch(`${this.baseUrl}/export?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`Failed to export QA: ${response.statusText}`)
    }

    return response.blob()
  }
}

export const enhanceService = new EnhanceService()
