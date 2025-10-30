<template>
  <div>
    <Flex justify="space-around">
      <Flex v-for="item in constantsMap" :key="item.key" vertical justify="center" align="center">
        <img :src="item.img" class="w-[100px] h-[60px] object-cover" />
        <span>{{ item.label }}</span>
        <span>{{ item.value }}</span>
      </Flex>
    </Flex>
    <Divider />
    <span>其他结构...</span>
  </div>
</template>

<script setup>
import { Divider, Flex } from 'ant-design-vue'
import { ref, watch } from 'vue'

const mockImages = [
  '/mock-images/image-1.png',
  '/mock-images/image-2.png',
  '/mock-images/image-3.png',
  '/mock-images/image-4.png',
  '/mock-images/image-5.png',
  '/mock-images/image-6.png',
  '/mock-images/image-7.png',
]

const getRandomImage = () => {
  const index = Math.floor(Math.random() * mockImages.length)
  return mockImages[index]
}

const constantsMap = ref([
  {
    img: getRandomImage(),
    key: 'fieldOne',
    label: '字段一Label',
    value: '',
  },
  {
    img: getRandomImage(),
    key: 'fieldTwo',
    label: '字段二Label',
    value: '',
  },
  {
    img: getRandomImage(),
    key: 'fieldThree',
    label: '字段三Label',
    value: '',
  },
  {
    img: getRandomImage(),
    key: 'fieldFour',
    label: '字段四Label',
    value: '',
  },
])

const props = defineProps({
  info: {
    type: Object,
    default: () => ({}),
  },
})

const displayOneInfo = ref({})
const displayTwoInfo = ref({})

const applyInfo = (info = {}) => {
  const displayOne = info.displayOne || {}
  const displayTwo = info.displayTwo || {}

  constantsMap.value = constantsMap.value.map((item) => ({
    ...item,
    value: displayOne[item.key] ?? '',
  }))

  displayOneInfo.value = displayOne
  displayTwoInfo.value = displayTwo
}

watch(
  () => props.info,
  (info) => {
    applyInfo(info || {})
  },
  { immediate: true, deep: true },
)
</script>

<style lang="scss" scoped></style>
