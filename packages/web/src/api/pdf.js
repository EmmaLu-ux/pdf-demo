
export const getListApi = (params) => {
    console.log(`[${new Date().toISOString()}] params:`, params);
    return [
        {
            id: 1,
            name: '文件名称',
            icon: '文件图标',
            fileSuffix: '.pdf',
            testTime: '2025-9-23',
            previewUrl: '/sample.pdf',
            detailDTO: {
                displayOne: {
                    fieldOne: '字段1的值',
                    fieldTwo: '字段2的值',
                    fieldThree: '字段3的值',
                    fieldFour: '字段4的值',
                },
                displayTwo: {
                    fieldOne: '字段1的值',
                    fieldTwo: '字段2的值',
                    fieldThree: '字段3的值',
                }
            }
        }
    ]
}
