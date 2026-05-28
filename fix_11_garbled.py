import re

# 讀取文件
file_path = "frontend/src/pages/work-report/WorkReportPage.tsx"
with open(file_path, 'rb') as f:
    raw_bytes = f.read()

content = raw_bytes.decode('utf-8', errors='replace')

# 定義所有替換 - 針對找到的11行亂碼
replacements = [
    ('<div className="text-center py-10 text-slate-500">鞈?頛銝?..</div>', '<div className="text-center py-10 text-slate-500">載入中...</div>'),
    ('(目前用戶)雿???', '(目前用戶)'),
    ('?航?', '新增'),
    ('??撱箇??啗"??', '新增表格'),
    ('撌脤?摰?繚 ???仿', '編輯保存中'),
    ('???啣?鞈???', '新增成功'),
    ('??儭??芷', '已刪除'),
    ('?∟???隢????寞憓???', '尚未建立任何行'),
    ('???勗極雿???', '上週進度'),
    ('{prevWeekLabel} 繚 ????梧??⊥??冽迨?憛楊頛?', '{prevWeekLabel} 已封存'),
    ('???梯????乩葉??', '載入封存資料中...'),
]

modified_count = 0
for old_text, new_text in replacements:
    if old_text in content:
        content = content.replace(old_text, new_text)
        modified_count += 1
        print(f"✓ 已修復: {old_text[:50]}...")
    else:
        print(f"✗ 未找到: {old_text[:50]}...")

# 寫回文件
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n修復完成！共修復 {modified_count} 處亂碼。")
