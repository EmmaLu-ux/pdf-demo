<template>
  <div class="p-6 space-y-4">
    <div>当前模板：<code>public/templates/report-template.pdf</code></div>
    <Button type="primary" :loading="loading" @click="handleGenerate"> 填充模板并下载 </Button>
  </div>
</template>

<script setup>
import { Button, message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'
import { getReportDataApi } from '@/api/test'
import fontUrl from '@/assets/fonts/NotoSansSC-Regular.ttf?url'
import { PDFBool, PDFDict, PDFDocument, PDFName, PDFString } from 'pdf-lib'
import fontkitModule from '@pdf-lib/fontkit'

const reportData = ref(null)
const loading = ref(false)

/**
 * 通过 fetch 读取资源并返回 ArrayBuffer。
 * @param {string} url 资源地址
 * @returns {Promise<ArrayBuffer>} 加载结果
 */
const fetchArrayBuffer = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`资源加载失败：${response.status}`)
  }
  return response.arrayBuffer() // 将响应体读取为二进制数据
}

/**
 * 使用表单模板填充并生成 PDF。
 * @param {ReturnType<typeof getReportDataApi>} data 报告数据
 * @returns {Promise<Blob>} 生成的 PDF Blob
 */
const fillTemplate = async (data) => {
  // 获取pdf模板文件的二进制数据
  const templateBytes = await fetchArrayBuffer('/templates/report-template.pdf')
  const pdfDoc = await PDFDocument.load(templateBytes)

  // 嵌入字体
  const fontkit = fontkitModule.default || fontkitModule
  pdfDoc.registerFontkit(fontkit)
  const fontBytes = await fetchArrayBuffer(fontUrl)
  const notoSans = await pdfDoc.embedFont(fontBytes, { subset: false })
  console.log('notoSans', notoSans)

  // 获取表单对象
  const form = pdfDoc.getForm()
  console.log('pdfDoc', pdfDoc)
  // 获取 AcroForm 字典，设置 NeedAppearances 和默认外观
  const acroFormRef = pdfDoc.catalog.get(PDFName.of('AcroForm'))
  if (acroFormRef) {
    // acroForm 是一个可操作的字典对象
    const acroForm = pdfDoc.context.lookup(acroFormRef, PDFDict) // 去底层对象表里查找该引用对应的对象，并做类型校验
    acroForm.set(PDFName.of('NeedAppearances'), PDFBool.True)
    acroForm.set(PDFName.of('DA'), PDFString.of(`/${notoSans.name} 0 Tf 0 g`))

    let dr = acroForm.lookupMaybe(PDFName.of('DR'), PDFDict)
    if (!dr) {
      dr = pdfDoc.context.obj({})
      acroForm.set(PDFName.of('DR'), dr)
    }

    let fontDict = dr.lookupMaybe(PDFName.of('Font'), PDFDict)
    if (!fontDict) {
      fontDict = pdfDoc.context.obj({})
      dr.set(PDFName.of('Font'), fontDict)
    }

    fontDict.set(PDFName.of(notoSans.name), notoSans.ref)
  }

  /**
   * 写入单个表单字段的值。
   * @param {string} name 字段名称
   * @param {string | undefined} value 对应文本
   * @returns {void}
   */
  const setText = (name, value) => {
    try {
      const field = form.getTextField(name)
      if (name === 'conclusion' || name === 'recommendation') {
        field.enableMultiline()
      }
      field.setText(value ?? '')
    } catch (error) {
      console.warn(`字段 ${name} 填充失败`, error)
    }
  }

  setText('templateNo', data.templateNo)
  setText('generatedAt', data.generatedAt)

  setText('clientName', data.client?.name)
  setText('clientId', data.client?.id)
  setText('contactPerson', data.client?.contactPerson)
  setText('contactPhone', data.client?.contactPhone)

  const results = data.results || []
  for (let i = 0; i < 5; i += 1) {
    const row = results[i] || {}
    const fallbackIndex = results[i] ? String(i + 1) : ''
    setText(`results[${i + 1}].index`, row.index ?? fallbackIndex)
    setText(`results[${i + 1}].item`, row.item)
    setText(`results[${i + 1}].result`, row.result)
    setText(`results[${i + 1}].remark`, row.remark)
  }

  setText('conclusion', data.conclusion)
  setText('recommendation', data.recommendation)
  setText('reviewer', data.reviewer)
  setText('reviewDate', data.reviewDate)

  const pdfBytes = await pdfDoc.save({ updateFieldAppearances: false })
  return new Blob([pdfBytes], { type: 'application/pdf' })
}

/**
 * 点击按钮时生成 PDF 并触发下载。
 * @returns {Promise<void>}
 */
const handleGenerate = async () => {
  if (!reportData.value) {
    message.warning('暂无可用的数据')
    return
  }

  loading.value = true
  try {
    const blob = await fillTemplate(reportData.value)

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${reportData.value.client?.name || 'report'}-filled.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error(error)
    message.error('模板填充失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  reportData.value = getReportDataApi()
})
</script>

<style lang="scss" scoped></style>
