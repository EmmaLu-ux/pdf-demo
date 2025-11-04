<template>
  <div>
    <Flex justify="space-around">
      <Flex v-for="item in constantsMap" :key="item.key" vertical justify="center" align="center">
        <img :src="item.image" class="w-[100px] h-[60px] object-cover" />
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

import { buildDisplayCards } from '@/constants/pdfDetail'

const constantsMap = ref(buildDisplayCards())

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

  constantsMap.value = buildDisplayCards(displayOne)

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
