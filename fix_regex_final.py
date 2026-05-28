import re

# 讀取文件
file_path = "frontend/src/pages/work-report/WorkReportPage.tsx"
with open(file_path, 'rb') as f:
    raw_bytes = f.read()

content = raw_bytes.decode('utf-8', errors='replace')

# 使用正則表達式來修復亂碼（寬鬆的模式）
replacements = [
    (r'<div[^>]*>鞈[^<]*<\/div>', '<div className="text-center py-10 text-slate-500">載入中...</div>'),
    (r'\(目前用戶\)雿[^}]*', '(目前用戶)'),
    (r'>\?航\?<', '>新增<'),
    (r'>\?\?撱箇[^<]*<', '>新增表格<'),
    (r'>撌脤[^<]*<', '>編輯保存中<'),
    (r'>進度\s*繚\s*[^<]*<', '>進度已封存<'),
    (r'>\?\?\?梯[^<]*<', '>載入中<'),
]

modified_count = 0
for pattern, replacement in replacements:
    matches = re.findall(pattern, content)
    if matches:
        old_content = content
        content = re.sub(pattern, replacement, content)
        if content != old_content:
            modified_count += len(matches)
            print(f"✓ 已修復 {len(matches)} 個: {pattern[:50]}...")

# 寫回文件
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n修復完成！共修復 {modified_count} 處亂碼。")
