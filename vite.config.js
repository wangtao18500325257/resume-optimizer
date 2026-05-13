import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

const DASHSCOPE_URL =
  'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

const SYSTEM_PROMPT = `你是一位资深HR，请分析以下简历，给出3-5条具体优化建议，包括：
①表达方式改进 ②关键词补充 ③结构调整建议，用中文回复`

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** 开发环境在 Vite 内处理 /api/optimize，等价于将请求转发到 Dashscope（密钥仅在服务端） */
function optimizeApiPlugin(env) {
  return {
    name: 'vite-plugin-optimize-api',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        let pathname
        try {
          pathname = new URL(req.url || '/', 'http://localhost').pathname
        } catch {
          return next()
        }
        if (pathname !== '/api/optimize' || req.method !== 'POST') {
          return next()
        }

        const apiKey = env.DASHSCOPE_API_KEY
        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(
            JSON.stringify({
              error:
                '未配置 DASHSCOPE_API_KEY：请在项目根目录创建 .env 并写入通义千问 API Key',
            }),
          )
          return
        }

        let rawBody
        try {
          rawBody = await readRequestBody(req)
        } catch {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: '读取请求体失败' }))
          return
        }

        let resumeText = ''
        try {
          const body = JSON.parse(rawBody || '{}')
          resumeText = typeof body.resumeText === 'string' ? body.resumeText : ''
        } catch {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: '请求体须为 JSON，且包含 resumeText 字段' }))
          return
        }

        if (!resumeText.trim()) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: '简历内容不能为空' }))
          return
        }

        let upstream
        try {
          upstream = await fetch(DASHSCOPE_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'qwen-turbo',
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: resumeText },
              ],
              stream: true,
            }),
          })
        } catch (e) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(
            JSON.stringify({
              error: e instanceof Error ? e.message : '连接通义千问服务失败',
            }),
          )
          return
        }

        if (!upstream.ok) {
          const text = await upstream.text()
          res.statusCode = upstream.status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(
            JSON.stringify({
              error: text || '通义千问接口返回错误',
            }),
          )
          return
        }

        res.statusCode = 200
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no')

        if (!upstream.body) {
          res.end()
          return
        }

        const reader = upstream.body.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(Buffer.from(value))
          }
        } catch (e) {
          console.error('[optimize-api] stream error', e)
        }
        res.end()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [optimizeApiPlugin(env), vue()],
    /** 若将 /api 抽到独立后端，可在此使用 server.proxy 把 /api 转发到该服务地址 */
  }
})
