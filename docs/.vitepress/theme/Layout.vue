<script setup lang="ts">
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

const { Layout } = DefaultTheme
const { frontmatter } = useData()
</script>

<template>
  <Layout>
    <template #doc-before>
      <aside v-if="frontmatter.source_url" class="disclaimer">
        <p class="disclaimer-meta">
          <strong>非官方译文</strong>
          <template v-if="frontmatter.status"> · {{ frontmatter.status }}</template>
          <template v-if="frontmatter.source"> · {{ frontmatter.source }}</template>
          <template v-if="frontmatter.date"> · {{ frontmatter.date }}</template>
        </p>
        <p>
          本页只收录中文导读、摘要或译文，不转载原文全文。
          <a
            :href="String(frontmatter.source_url)"
            target="_blank"
            rel="noopener noreferrer"
          >阅读官方原文</a>
        </p>
      </aside>
    </template>
  </Layout>
</template>
