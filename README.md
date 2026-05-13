# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).


使用方式
复制 .env.example 为 .env，填入 DASHSCOPE_API_KEY（Dashscope 控制台 API Key）。
在项目根目录执行：npm run dev，浏览器访问终端提示的本地地址。
npm run build / vite preview 不会带上该中间件，静态预览里没有 /api/optimize；上线需把同样逻辑放到独立 Node/网关服务，并在 vite.config.js 的 server.proxy 把 /api 指过去（已在配置里用注释标出位置）。
