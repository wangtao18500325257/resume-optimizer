<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { useResumeAI } from './composables/useAI.js'

const resumeText = ref('')
const { loading, markdown, optimize } = useResumeAI()

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const renderedHtml = computed(() =>
  DOMPurify.sanitize(md.render(markdown.value || '')),
)

async function handleOptimize() {
  const text = resumeText.value.trim()
  if (!text) {
    ElMessage.warning('请先粘贴简历内容')
    return
  }
  try {
    await optimize(text)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '优化失败，请稍后重试'
    ElMessage.error(msg)
  }
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <h1 class="title">AI 简历优化器</h1>
      <p class="desc">粘贴原始简历，通义千问将给出可执行的优化建议（支持 Markdown 展示）</p>
    </header>

    <div class="columns">
      <el-card class="panel" shadow="hover">
        <template #header>
          <span class="card-title">原始简历</span>
        </template>
        <el-input
          v-model="resumeText"
          type="textarea"
          :rows="18"
          placeholder="请在此粘贴您的简历全文…"
          :disabled="loading"
          class="resume-input"
        />
        <div class="toolbar">
          <el-button type="primary" :loading="loading" @click="handleOptimize">
            {{ loading ? 'AI分析中...' : '开始优化' }}
          </el-button>
        </div>
      </el-card>

      <el-card class="panel" shadow="hover">
        <template #header>
          <span class="card-title">优化建议</span>
        </template>
        <div v-if="loading && !markdown" class="hint">正在连接模型并生成内容…</div>
        <div v-else-if="!markdown" class="hint muted">优化结果将显示在此，请先点击「开始优化」</div>
        <div v-else class="markdown-body" v-html="renderedHtml" />
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  box-sizing: border-box;
}

.page-head {
  margin-bottom: 20px;
  text-align: left;
}

.title {
  margin: 0 0 8px;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-h, #1f2937);
}

.desc {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text, #6b7280);
  line-height: 1.5;
}

.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: stretch;
}

@media (max-width: 768px) {
  .columns {
    grid-template-columns: 1fr;
  }
}

.panel {
  min-height: 420px;
  display: flex;
  flex-direction: column;
}

.panel :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-title {
  font-weight: 600;
}

.resume-input {
  flex: 1;
}

.resume-input :deep(textarea) {
  font-family: ui-sans-serif, system-ui, sans-serif;
  line-height: 1.5;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
}

.hint {
  font-size: 0.95rem;
  color: var(--text, #6b7280);
}

.hint.muted {
  opacity: 0.85;
}

.markdown-body {
  flex: 1;
  text-align: left;
  font-size: 0.95rem;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 1em 0 0.5em;
  font-weight: 600;
  color: var(--text-h, #111827);
}

.markdown-body :deep(h1:first-child),
.markdown-body :deep(h2:first-child),
.markdown-body :deep(h3:first-child) {
  margin-top: 0;
}

.markdown-body :deep(p) {
  margin: 0.5em 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.25em;
}

.markdown-body :deep(code) {
  font-size: 0.9em;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: var(--code-bg, #f3f4f6);
}

.markdown-body :deep(pre) {
  padding: 12px;
  border-radius: 8px;
  overflow: auto;
  background: var(--code-bg, #f3f4f6);
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
}

.markdown-body :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.markdown-body :deep(blockquote) {
  margin: 0.75em 0;
  padding-left: 12px;
  border-left: 3px solid #e5e7eb;
  color: #4b5563;
}
</style>
