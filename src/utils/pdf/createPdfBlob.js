import { jsPDF } from 'jspdf'

import { buildDisplayCards } from '@/constants/pdfDetail'
import fontUrl from '@/assets/fonts/NotoSansSC-Regular.ttf?url'

const imageDataUrlCache = new Map()
let cachedFontBase64 = ''

/**
 * 将路径转换为当前站点下的绝对 URL。
 * @param {string} src 原始路径
 * @returns {string} 规范化后的绝对地址
 */
const toAbsoluteUrl = (src) => {
  if (!src) return ''
  try {
    return new URL(src, window.location.origin).toString()
  } catch {
    return src
  }
}

/**
 * 拉取图片并转换成 base64 data URL。
 * @param {string} src 图片路径
 * @returns {Promise<string | null>} 图片的 base64，失败返回 null
 */
const loadImageAsDataUrl = async (src) => {
  if (!src) return null
  const absoluteSrc = toAbsoluteUrl(src)

  if (imageDataUrlCache.has(absoluteSrc)) {
    return imageDataUrlCache.get(absoluteSrc)
  }

  try {
    const response = await fetch(absoluteSrc) // 请求图片的实际文件，返回一个 Response 对象
    if (!response.ok) {
      throw new Error(`请求图片失败：${response.status}`)
    }
    const blob = await response.blob()
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error || new Error('读取图片失败'))
      reader.readAsDataURL(blob) // 读取成base64 data url
    })
    imageDataUrlCache.set(absoluteSrc, dataUrl)
    return dataUrl
  } catch (error) {
    console.warn(`图片加载失败：${absoluteSrc}`, error)
    return null
  }
}

/**
 * 将 ArrayBuffer 转换为 base64 字符串，按块处理避免栈溢出。
 * @param {ArrayBuffer} buffer 原始二进制数据
 * @returns {string} base64 表示
 */
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

/**
 * 加载并缓存 PDF 需要的字体数据。
 * @returns {Promise<string>} 字体的 base64 编码
 */
const loadFontData = async () => {
  if (cachedFontBase64) return cachedFontBase64

  const response = await fetch(toAbsoluteUrl(fontUrl))
  if (!response.ok) {
    throw new Error(`字体加载失败：${response.status}`)
  }

  const bytes = await response.arrayBuffer()
  cachedFontBase64 = arrayBufferToBase64(bytes)
  return cachedFontBase64
}

/**
 * 将所需中文字体注册到 jsPDF 实例。
 * @param {import('jspdf').jsPDF} pdfInstance 当前 PDF 实例
 * @returns {Promise<void>} 字体注册完成
 */
const ensureFontLoaded = async (pdfInstance) => {
  if (!pdfInstance?.addFileToVFS) return
  const fontList = (pdfInstance.getFontList && pdfInstance.getFontList()) || {}
  if (fontList.NotoSansSC) return

  const base64 = await loadFontData()
  pdfInstance.addFileToVFS('NotoSansSC-Regular.ttf', base64)
  pdfInstance.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal')
  pdfInstance.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'bold')
}

/**
 * 基于指定目标信息生成 PDF blob。
 * @param {{ name?: string; detailDTO?: Record<string, unknown> }} target 列表项数据
 * @returns {Promise<Blob>} 生成的 PDF 二进制
 */
export const createPdfBlob = async (target) => {
  if (!target?.detailDTO) {
    throw new Error('缺少可生成的 PDF 内容')
  }

  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const marginX = 20
  const marginY = 20
  const contentWidth = pageWidth - marginX * 2
  let cursorY = marginY

  await ensureFontLoaded(pdf)
  pdf.setFont('NotoSansSC', 'bold')
  pdf.setFontSize(16)
  pdf.text(target.name || 'PDF 文档', marginX, cursorY)
  cursorY += 10

  pdf.setFont('NotoSansSC', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(100)
  pdf.text(`生成时间：${new Date().toLocaleString()}`, marginX, cursorY)
  cursorY += 12
  pdf.setTextColor(0)

  // 构造卡片展示信息
  const cards = buildDisplayCards(target.detailDTO.displayOne || {})
  const cardsWithImage = await Promise.all(
    cards.map(async (card) => ({
      ...card,
      imageDataUrl: await loadImageAsDataUrl(card.image),
    })),
  )

  console.log('cardsWithImage', cardsWithImage)

  const cardGap = 4
  const cardWidth =
    cardsWithImage.length > 0
      ? (contentWidth - cardGap * (cardsWithImage.length - 1)) / cardsWithImage.length
      : contentWidth
  const imageHeight = 24
  let rowBottomY = cursorY

  cardsWithImage.forEach((card, index) => {
    const cardX = marginX + index * (cardWidth + cardGap)

    if (card.imageDataUrl) {
      pdf.addImage(card.imageDataUrl, 'PNG', cardX, cursorY, cardWidth, imageHeight)
    } else {
      pdf.setDrawColor(220)
      pdf.rect(cardX, cursorY, cardWidth, imageHeight)
      pdf.setFontSize(10)
      pdf.setTextColor(150)
      pdf.text('图片缺失', cardX + cardWidth / 2, cursorY + imageHeight / 2 + 3, {
        align: 'center',
      })
      pdf.setTextColor(0)
    }

    const labelY = cursorY + imageHeight + 6
    pdf.setFontSize(11)
    pdf.text(card.label, cardX + cardWidth / 2, labelY, { align: 'center' })

    const valueText = card.value ? String(card.value) : '-'
    const valueLines = pdf.splitTextToSize(valueText, cardWidth)
    const lineHeight = 5
    const valueStartY = labelY + 6

    pdf.setFontSize(12)
    valueLines.forEach((line, lineIndex) => {
      pdf.text(line, cardX + cardWidth / 2, valueStartY + lineIndex * lineHeight, {
        align: 'center',
      })
    })

    const cardBottom = valueStartY + (valueLines.length - 1) * lineHeight + 2
    rowBottomY = Math.max(rowBottomY, cardBottom)
  })

  cursorY = rowBottomY + 8

  pdf.setDrawColor(220)
  pdf.setLineWidth(0.5)
  pdf.line(marginX, cursorY, pageWidth - marginX, cursorY)

  cursorY += 10

  pdf.setFontSize(12)
  pdf.setTextColor(100)
  pdf.text('其他结构...', marginX, cursorY)
  cursorY += 6
  pdf.setTextColor(0)

  const extraEntries = Object.entries(target.detailDTO.displayTwo || {})
  const extraLineHeight = 6

  extraEntries.forEach(([key, value]) => {
    const label = `${key}: ${value ?? ''}`
    const textLines = pdf.splitTextToSize(label, contentWidth)

    textLines.forEach((line) => {
      if (cursorY > pageHeight - marginY) {
        pdf.addPage()
        cursorY = marginY
      }
      pdf.text(line, marginX, cursorY)
      cursorY += extraLineHeight
    })

    cursorY += extraLineHeight / 2
  })

  return pdf.output('blob')
}
