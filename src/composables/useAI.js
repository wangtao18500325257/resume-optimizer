import { ref } from 'vue'

/**
 * 解析 Dashscope OpenAI 兼容模式的 SSE 行，将增量文本交给 onChunk
 * @param {string} line
 * @param {(chunk: string) => void} onChunk
 */
function parseSseDataLine(line, onChunk) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return
  const payload = trimmed.slice(5).trimStart()
  if (payload === '[DONE]') return
  try {
    const json = JSON.parse(payload)
    const piece = json.choices?.[0]?.delta?.content
    if (typeof piece === 'string' && piece) onChunk(piece)
  } catch {
    // 半包或无关行，忽略
  }
}

/**
 * 调用本地 /api/optimize，消费通义千问流式 SSE，逐段回调文本增量
 * @param {string} resumeText
 * @param {{ onChunk?: (chunk: string) => void; signal?: AbortSignal }} [options]
 * @returns {Promise<void>}
 */
export async function streamOptimizeResume(resumeText, options = {}) {
  const { onChunk, signal } = options
  const res = await fetch('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText }),
    signal,
  })

  const ct = res.headers.get('content-type') || ''

  if (!res.ok) {
    let msg = `请求失败 (${res.status})`
    if (ct.includes('application/json')) {
      try {
        const data = await res.json()
        if (data?.error) {
          msg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        }
      } catch {
        /* noop */
      }
    } else {
      try {
        const t = await res.text()
        if (t) msg = t.slice(0, 500)
      } catch {
        /* noop */
      }
    }
    throw new Error(msg)
  }

  if (!res.body) return

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let carry = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    carry += decoder.decode(value, { stream: true })
    const lines = carry.split('\n')
    carry = lines.pop() ?? ''
    for (const line of lines) parseSseDataLine(line, onChunk)
  }
  if (carry.trim()) parseSseDataLine(carry, onChunk)
}

/**
 * 简历优化：loading / 累积 Markdown 正文的组合式封装
 */
export function useResumeAI() {
  const loading = ref(false)
  const markdown = ref('')

  /**
   * @param {string} text
   * @param {{ signal?: AbortSignal }} [opts]
   */
  async function optimize(text, opts = {}) {
    const { signal } = opts
    markdown.value = ''
    loading.value = true
    try {
      await streamOptimizeResume(text, {
        signal,
        onChunk: (c) => {
          markdown.value += c
        },
      })
    } finally {
      loading.value = false
    }
  }

  return { loading, markdown, optimize }
}
