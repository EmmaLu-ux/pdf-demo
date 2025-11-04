export const PDF_CARD_DEFINITIONS = [
  {
    key: 'fieldOne',
    label: '字段一Label',
    image: '/mock-images/image-1.png',
  },
  {
    key: 'fieldTwo',
    label: '字段二Label',
    image: '/mock-images/image-2.png',
  },
  {
    key: 'fieldThree',
    label: '字段三Label',
    image: '/mock-images/image-3.png',
  },
  {
    key: 'fieldFour',
    label: '字段四Label',
    image: '/mock-images/image-4.png',
  },
]

/**
 * 基于 `displayOne` 数据构造卡片展示信息。
 * @param {Record<string, unknown>} displayOne
 * @returns {Array<{key: string; label: string; image: string; value: string}>}
 */
export const buildDisplayCards = (displayOne = {}) =>
  PDF_CARD_DEFINITIONS.map((item) => ({
    ...item,
    value: displayOne[item.key] ?? '',
  }))
