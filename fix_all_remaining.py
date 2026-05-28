import re

# 讀取文件
file_path = "frontend/src/pages/work-report/WorkReportPage.tsx"
with open(file_path, 'rb') as f:
    raw_bytes = f.read()

content = raw_bytes.decode('utf-8', errors='replace')

# 定義所有替換 - 針對所有找到的亂碼
replacements = [
    # console.error 亂碼
    (r'console\.error\("[^"]*?撌[^"]*?", error\);', 'console.error("載入工作紀錄失敗", error);'),
    
    # response.data?.message 亂碼
    (r'response\.data\?\.message \|\| "[^"]*?脣[^"]*?XLSX[^"]*?"', 'response.data?.message || "欄位設定儲存失敗，請確認後端 API 與資料庫狀態"'),
    
    # title 屬性亂碼 (XLSX 相關)
    (r'title="[^"]*?臬[^"]*?交[^"]*?XLSX[^"]*?"', 'title="匯出當週工作紀錄為 XLSX"'),
    
    # 導出按鈕文本亂碼
    (r'{\s*exportingXlsx\s?\?\s?"[^"]*?臬[^"]*?"\s?:\s?"[^"]*?臬[^"]*?XLSX[^"]*?"\s*}', '{exportingXlsx ? "匯出中..." : "匯出 XLSX"}'),
    
    # 新增表格按鈕亂碼
    (r'{\s*creating\s?\?\s?"[^"]*?撱[^"]*?"\s?:\s?"[^"]*?銵[^"]*?"\s*}', '{creating ? "建立中..." : "新增空白表格"}'),
    
    # 用戶名後面的亂碼 - 尋找模式 "用戶名 ?極雿???"
    (r'{block\.user_name}\s+[^}]*?極[^}]*?', '{block.user_name} (目前用戶)'),
    
    # "無表格提示" 亂碼
    (r'"尚未建立任何表格"', '"尚未建立任何表格"'),  # 保持原樣，這個是正確的
]

# 執行替換
modified_count = 0
for pattern, replacement in replacements:
    try:
        matches = re.findall(pattern, content)
        if matches:
            old_content = content
            content = re.sub(pattern, replacement, content, flags=re.DOTALL)
            if content != old_content:
                modified_count += len(matches)
                print(f"✓ 已修復 {len(matches)} 個: {pattern[:60]}...")
    except Exception as e:
        print(f"✗ 模式錯誤: {pattern[:60]}... ({e})")

# 寫回文件
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n修復完成！共修復 {modified_count} 處亂碼。")
