#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import jsPDF from '../node_modules/.vite/deps/jspdf.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const fontPath = path.join(rootDir, 'src/assets/fonts/NotoSansSC-Regular.ttf')
const outputPath = path.join(rootDir, 'public/templates/report-template.pdf')

/**
 * 将 Buffer 转为 base64 字符串，供 jsPDF VFS 使用。
 * @param {Buffer} buffer 字体或其他二进制数据
 * @returns {string} base64 表示
 */
const toBase64 = (buffer) => buffer.toString('base64')

/**
 * 向文档中添加文本表单域。
 * @param {import('jspdf').jsPDF} pdf jsPDF 实例
 * @param {Object} options 配置对象
 * @param {string} options.name 字段名称
 * @param {number} options.x 字段左上角 X 坐标（mm）
 * @param {number} options.y 字段基线 Y 坐标（mm）
 * @param {number} options.width 字段宽度（mm）
 * @param {number} [options.height=8] 字段高度（mm）
 * @param {boolean} [options.multiline=false] 是否开启多行
 * @param {string} [options.defaultValue=''] 默认值
 * @returns {any} 创建的表单域实例
 */
const createTextField = (pdf, {
  name,
  x,
  y,
  width,
  height = 4,
  multiline = false,
  defaultValue = '',
}) => {
  const field = new pdf.AcroFormTextField()
  field.T = name
  field.Rect = [x, y - height, width, height]
  field.multiline = multiline
  field.V = defaultValue
  field.defaultValue = defaultValue
  field.fontName = 'NotoSansSC'
  field.fontStyle = 'normal'
  field.fontSize = 11
  pdf.addField(field)
  return field
}

/**
 * 绘制标签与横线，并在横线位置创建单行文本域。
 * @param {import('jspdf').jsPDF} pdf jsPDF 实例
 * @param {Object} params 配置集合
 * @param {string} params.label 标签文字
 * @param {string} params.name 表单字段名称
 * @param {number} params.labelX 标签 x 坐标（mm）
 * @param {number} params.valueX 输入框起始 x 坐标（mm）
 * @param {number} params.y 基线 y 坐标（mm）
 * @param {number} params.lineWidth 横线长度（mm）
 * @returns {void}
 */
const drawUnderlineField = (pdf, {
  label,
  name,
  labelX,
  valueX,
  y,
  lineWidth,
}) => {
  pdf.text(label, labelX, y - 2)
  pdf.setDrawColor(180)
  pdf.line(valueX, y, valueX + lineWidth, y)
  createTextField(pdf, {
    pdf,
    name,
    x: valueX,
    y,
    width: lineWidth,
  })
}

/**
 * 生成带 AcroForm 表单域的 A4 模板并写出到本地。
 * @returns {void}
 */
const main = () => {
  if (!fs.existsSync(fontPath)) {
    throw new Error(`Font not found at ${fontPath}`)
  }

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const fontData = fs.readFileSync(fontPath)
  pdf.addFileToVFS('NotoSansSC-Regular.ttf', toBase64(fontData))
  pdf.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal')
  pdf.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'bold')

  pdf.setFont('NotoSansSC', 'bold')
  pdf.setFontSize(20)
  pdf.text('检测报告模板', 105, 25, { align: 'center' })

  pdf.setDrawColor(180)
  pdf.setLineWidth(0.5)
  pdf.line(20, 40, 190, 40)

  pdf.setFont('NotoSansSC', 'normal')
  pdf.setFontSize(11)

  drawUnderlineField(pdf, {
    label: '模板编号：',
    name: 'templateNo',
    labelX: 20,
    valueX: 50,
    y: 36,
    lineWidth: 60,
  })

  drawUnderlineField(pdf, {
    label: '生成日期：',
    name: 'generatedAt',
    labelX: 130,
    valueX: 160,
    y: 36,
    lineWidth: 30,
  })

  drawUnderlineField(pdf, {
    label: '客户名称',
    name: 'clientName',
    labelX: 20,
    valueX: 60,
    y: 50,
    lineWidth: 110,
  })

  drawUnderlineField(pdf, {
    label: '客户编号',
    name: 'clientId',
    labelX: 20,
    valueX: 60,
    y: 62,
    lineWidth: 110,
  })

  drawUnderlineField(pdf, {
    label: '联系人',
    name: 'contactPerson',
    labelX: 20,
    valueX: 60,
    y: 74,
    lineWidth: 110,
  })

  drawUnderlineField(pdf, {
    label: '联系电话',
    name: 'contactPhone',
    labelX: 20,
    valueX: 60,
    y: 86,
    lineWidth: 110,
  })

  // 表格
  pdf.setFont('NotoSansSC', 'bold')
  pdf.setFontSize(14)
  pdf.text('检测项摘要', 20, 102)

  const tableTop = 110
  const tableLeft = 20
  const tableWidth = 170
  const rowHeight = 10
  const columnWidths = [20, 70, 40, 40]
  const columnTitles = ['序号', '检测项目', '结果', '备注']

  pdf.setDrawColor(200)
  pdf.setLineWidth(0.4)

  // Horizontal lines
  for (let i = 0; i <= 5; i += 1) {
    const y = tableTop + i * rowHeight
    pdf.line(tableLeft, y, tableLeft + tableWidth, y)
  }

  // Vertical lines
  let xCursor = tableLeft
  for (let i = 0; i < columnWidths.length; i += 1) {
    pdf.line(xCursor, tableTop, xCursor, tableTop + 5 * rowHeight)
    xCursor += columnWidths[i]
  }
  pdf.line(tableLeft + tableWidth, tableTop, tableLeft + tableWidth, tableTop + 5 * rowHeight)

  // Column titles
  pdf.setFontSize(11)
  xCursor = tableLeft
  columnTitles.forEach((title, index) => {
    pdf.text(title, xCursor + 2, tableTop + 7)
    xCursor += columnWidths[index]
  })

  pdf.setFont('NotoSansSC', 'normal')

  // Create table text fields
  for (let row = 0; row < 5; row += 1) {
    const rowY = tableTop + (row + 1) * rowHeight - 2
    let cellX = tableLeft
    const fieldHeight = 7

    const cellNames = ['index', 'item', 'result', 'remark']
    columnWidths.forEach((width, colIndex) => {
      const name = `results[${row}].${cellNames[colIndex]}`
      const field = new pdf.AcroFormTextField()
      field.T = name
      field.Rect = [cellX + 2, rowY - fieldHeight, width - 4, fieldHeight]
      field.fontName = 'NotoSansSC'
      field.fontSize = 10
      pdf.addField(field)
      cellX += width
    })
  }

  pdf.setFontSize(10)
  pdf.text('（生成时填充检测项目列表，可按数据条数动态扩展）', tableLeft, tableTop + 5 * rowHeight + 7)

  pdf.setDrawColor(180)
  pdf.setLineWidth(0.5)
  pdf.line(20, tableTop + 5 * rowHeight + 20, 190, tableTop + 5 * rowHeight + 20)

  pdf.setFont('NotoSansSC', 'bold')
  pdf.setFontSize(10)
  pdf.text('结论', 20, tableTop + 5 * rowHeight + 30)

  pdf.setFont('NotoSansSC', 'normal')
  pdf.setFontSize(10)
  pdf.text('结论内容：', 20, tableTop + 5 * rowHeight + 38)
  pdf.text('建议措施：', 20, tableTop + 5 * rowHeight + 50)

  // Multiline fields for conclusion and recommendation
  const conclusionField = new pdf.AcroFormTextField()
  conclusionField.T = 'conclusion'
  conclusionField.Rect = [45, tableTop + 5 * rowHeight + 33, 140, 9]
  conclusionField.multiline = true
  conclusionField.fontName = 'NotoSansSC'
  conclusionField.fontSize = 10
  pdf.addField(conclusionField)

  const recommendationField = new pdf.AcroFormTextField()
  recommendationField.T = 'recommendation'
  recommendationField.Rect = [45, tableTop + 5 * rowHeight + 45, 140, 9]
  recommendationField.multiline = true
  recommendationField.fontName = 'NotoSansSC'
  recommendationField.fontSize = 10
  pdf.addField(recommendationField)

  pdf.text('签发人：', 20, tableTop + 5 * rowHeight + 62)
  pdf.text('签发日期：', 110, tableTop + 5 * rowHeight + 62)

  createTextField(pdf, {
    name: 'reviewer',
    x: 40,
    y: tableTop + 5 * rowHeight + 62,
    width: 50,
  })

  createTextField(pdf, {
    name: 'reviewDate',
    x: 140,
    y: tableTop + 5 * rowHeight + 62,
    width: 45,
  })

  pdf.setFontSize(9)
  pdf.text('提示：表格行数与空白内容可在填充时写入真实数据。', 20, tableTop + 5 * rowHeight + 72)

  const buffer = Buffer.from(pdf.output('arraybuffer'))
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, buffer)
  console.log(`AcroForm template generated at ${outputPath}`)
}

main()
