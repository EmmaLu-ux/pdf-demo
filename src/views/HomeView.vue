<template>
  <div class="p-4">
    <div>
      <Card>
        <Collapse v-model:activeKey="activeKey" accordion :bordered="false" ghost>
          <Collapse.Panel :show-arrow="false" v-for="ld in listData" :key="ld.id">
            <template #header>
              <Flex justify="space-between" align="center" class="w-full gap-4">
                <Flex align="center" gap="small">
                  <span>{{ ld.name }}</span>
                  <span>{{ ld.fileSuffix }}</span>
                  <span>{{ ld.testTime }}</span>
                </Flex>
                <Flex>
                  <Button type="link" @click.stop="onPreviewPdf(ld)">预览</Button>
                  <Button type="link" @click.stop="onDownloadPdf(ld)">下载</Button>
                </Flex>
              </Flex>
            </template>
            <PdfDetail :info="ld.detailDTO" />
          </Collapse.Panel>
        </Collapse>
      </Card>
    </div>
    <Modal
      v-model:open="previewVisible"
      :title="previewTarget?.name || 'PDF 预览'"
      width="80vw"
      :footer="null"
      @cancel="onPreviewClose"
      destroyOnClose
    >
      <div v-if="previewLoading" class="py-8 text-center text-gray-500">PDF 生成中，请稍候...</div>
      <iframe
        v-else-if="previewPdfUrl"
        :src="previewPdfUrl"
        class="w-full h-[70vh]"
        frameborder="0"
      ></iframe>
      <div v-else class="py-8 text-center text-gray-500">暂无可预览的文件</div>
    </Modal>
  </div>
</template>

<script setup>
import { Button, Card, Collapse, Flex, Modal, message } from 'ant-design-vue'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import PdfDetail from '@/views/components/PdfDetail.vue'

import { getListApi } from '@/api/pdf'
import { createPdfBlob } from '@/utils/pdf/createPdfBlob'

const activeKey = ref([])
const pageParams = ref({
  pageNum: 1,
  pageSize: 10,
})
const listData = ref([])
const previewVisible = ref(false)
const previewTarget = ref(null)
const previewPdfUrl = ref('')
const previewLoading = ref(false)

/**
 * 拉取 PDF 列表数据并写入状态。
 * @returns {Promise<void>} 列表加载完成后 resolve
 */
const getList = async () => {
  const result = await getListApi(pageParams.value)
  listData.value = result
}

/**
 * 销毁现有的预览 URL，避免内存泄漏。
 * @returns {void}
 */
const revokePreviewUrl = () => {
  if (previewPdfUrl.value) {
    URL.revokeObjectURL(previewPdfUrl.value)
    previewPdfUrl.value = ''
  }
}

/**
 * 根据给定项目或列表第一项生成 PDF 并触发下载。
 * @param {object} [item] 可选的列表项数据
 * @returns {Promise<void>} 下载流程完成后 resolve
 */
const onDownloadPdf = async (item) => {
  try {
    let target = item

    if (!target && !listData.value.length) {
      await getList()
    }

    if (!target) {
      target = listData.value[0]
    }

    if (!target?.detailDTO) {
      message.warning('暂无可下载的数据')
      return
    }

    const blob = await createPdfBlob(target)
    const objectUrl = URL.createObjectURL(blob)

    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = `${target.name || 'document'}.pdf`
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(objectUrl)
  } catch (error) {
    console.error(error)
    message.error('文件下载失败，请稍后重试')
  }
}

/**
 * 生成预览用的 PDF 链接地址。
 * @returns {Promise<void>} 预览内容生成完毕后 resolve
 */
const generatePreviewPdf = async () => {
  if (!previewTarget.value?.detailDTO) {
    previewLoading.value = false
    return
  }
  previewLoading.value = true

  try {
    const blob = await createPdfBlob(previewTarget.value)
    revokePreviewUrl()
    previewPdfUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    console.error(error)
    message.error('PDF 生成失败，请稍后重试')
  } finally {
    previewLoading.value = false
  }
}

/**
 * 打开预览弹窗并生成预览 PDF。
 * @param {object} item 列表项数据
 * @returns {Promise<void>} 预览流程完成后 resolve
 */
const onPreviewPdf = async (item) => {
  if (!item?.detailDTO) {
    message.warning('暂无可预览的数据')
    return
  }

  previewTarget.value = item
  previewVisible.value = true
  previewLoading.value = true
  revokePreviewUrl()
  await generatePreviewPdf()
}

/**
 * 关闭预览弹窗并清理状态。
 * @returns {void}
 */
const onPreviewClose = () => {
  previewVisible.value = false
  previewLoading.value = false
  previewTarget.value = null
  revokePreviewUrl()
}

onMounted(() => {
  getList()
})

onBeforeUnmount(() => {
  revokePreviewUrl()
})
</script>

<style lang="scss" scoped></style>
