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
    <div
      ref="pdfPreviewRef"
      class="bg-white p-[24px] w-[794px] top-[-9999px] left-[-9999px] fixed"
      aria-hidden="true"
    >
      <PdfDetail
        v-if="renderTarget"
        :key="renderTarget ? renderTarget.id : 'preview'"
        :info="renderTarget && renderTarget.detailDTO ? renderTarget.detailDTO : {}"
      />
    </div>
  </div>
</template>

<script setup>
import { Button, Card, Collapse, Flex, Modal, message } from 'ant-design-vue'
import { ref, onMounted, nextTick, onBeforeUnmount, computed } from 'vue'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import PdfDetail from '@/views/components/PdfDetail.vue'

import { getListApi } from '@/api/pdf'

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
const pdfPreviewRef = ref(null)
const downloadTarget = ref(null)
const renderTarget = computed(() => downloadTarget.value || previewTarget.value)

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

    downloadTarget.value = target
    await nextTick()
    if (pdfPreviewRef.value) {
      await nextTick()
    }
    const blob = await createPdfBlob()
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
  } finally {
    downloadTarget.value = null
  }
}

/**
 * 等待容器内所有 <img> 元素完成加载，避免 html2canvas 捕获到空白图像。
 * @param {HTMLElement} rootEl 需要检查的根节点
 * @returns {Promise<void>} 所有图片加载完成后 resolve
 */
const waitForImages = async (rootEl) => {
  const images = Array.from(rootEl.querySelectorAll('img'))

  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth !== 0) return Promise.resolve()
      return new Promise((resolve) => {
        img.onload = () => resolve()
        img.onerror = () => resolve()
      })
    }),
  )
}

/**
 * 将隐藏容器渲染成 pdf 并返回 blob 数据。
 * @returns {Promise<Blob>} 生成完成的 PDF blob 对象
 * @throws {Error} 当缺失渲染目标或容器时抛出
 */
const createPdfBlob = async () => {
  if (!pdfPreviewRef.value || !renderTarget.value) {
    throw new Error('缺少可生成的 PDF 内容')
  }

  await waitForImages(pdfPreviewRef.value)
  const canvas = await html2canvas(pdfPreviewRef.value, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const pdfHeight = (canvas.height * pageWidth) / canvas.width // PDF 内容的高度

  let position = 0
  let heightLeft = pdfHeight

  pdf.addImage(imgData, 'PNG', 0, position, pageWidth, pdfHeight)
  heightLeft -= pageHeight

  // 内容超过一页 PDF 的高度之后，需要新增一页
  while (heightLeft > 0) {
    position = heightLeft - pdfHeight // 计算要把 canvas 截的整张图向上挪多少
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, pdfHeight) // position: 控制图的顶端往下（正值）或往上（负值）偏移多少
    heightLeft -= pageHeight
  }

  return pdf.output('blob')
}

/**
 * 生成预览用的 PDF 链接地址。
 * @returns {Promise<void>} 预览内容生成完毕后 resolve
 */
const generatePreviewPdf = async () => {
  if (!pdfPreviewRef.value || !renderTarget.value) return
  previewLoading.value = true

  try {
    const blob = await createPdfBlob()
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
  downloadTarget.value = null
  previewVisible.value = true
  previewLoading.value = true
  revokePreviewUrl()
  await nextTick() // 等到下一轮 DOM 更新完成再执行代码
  if (pdfPreviewRef.value) {
    await nextTick()
    await generatePreviewPdf()
  } else {
    previewLoading.value = false
  }
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
