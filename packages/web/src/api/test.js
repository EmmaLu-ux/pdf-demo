export const getReportDataApi = () => {
    return {
        templateNo: 'TEMPLATE-001',
        generatedAt: '2025-02-12 09:30',
        client: {
            name: '示例科技有限公司',
            id: 'C-2025-001',
            contactPerson: '李晓华',
            contactPhone: '138-0000-0000',
        },
        results: [
            { index: '1', item: '样品外观检查', result: '合格', remark: '无可见缺陷' },
            { index: '2', item: '尺寸测量', result: '合格', remark: '公差 ±0.2mm' },
            { index: '3', item: '材料检测', result: '合格', remark: '符合 GB/T 标准' },
            { index: '4', item: '性能测试', result: '不合格', remark: '高温耐受未达标' },
        ],
        conclusion: '样品整体符合出厂要求，但需关注性能测试项目的改进措施。',
        recommendation: '建议加强耐高温材料选型，并在下一批次前完成验证测试。',
        reviewer: '王工程师',
        reviewDate: '2025-02-11',
    }
}
