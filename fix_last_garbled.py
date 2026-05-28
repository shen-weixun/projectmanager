import re

# 讀取文件
file_path = "frontend/src/pages/work-report/WorkReportPage.tsx"
with open(file_path, 'rb') as f:
    raw_bytes = f.read()

content = raw_bytes.decode('utf-8', errors='replace')

# 直接替換這行亂碼（使用更寬鬆的模式）
old_text = 'response.data?.message || "?脣?憭望?嚗?蝣箄?敺垢?????澈 migration"'
new_text = 'response.data?.message || "欄位設定儲存失敗，請確認後端 API 與資料庫狀態"'

if old_text in content:
    content = content.replace(old_text, new_text)
    print("✓ 已修復 response.data?.message 亂碼")
else:
    # 嘗試用正則表達式（更寬鬆的匹配）
    pattern = r'response\.data\?\.message \|\| "[^"]*?脣[^"]*?migration[^"]*?"'
    if re.search(pattern, content):
        content = re.sub(pattern, new_text, content)
        print("✓ 已修復 response.data?.message 亂碼 (正則)")
    else:
        print("✗ 未找到 response.data?.message 亂碼")

# 寫回文件
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("修復完成！")
