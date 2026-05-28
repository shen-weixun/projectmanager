import re

# 讀取文件
file_path = "frontend/src/pages/work-report/WorkReportPage.tsx"
with open(file_path, 'rb') as f:
    raw_bytes = f.read()

# 用 UTF-8 解碼，使用 replace 模式來處理無效字符
content = raw_bytes.decode('utf-8', errors='replace')

# 尋找所有包含特殊字符（可能是亂碼）的行
lines = content.split('\n')
print("所有包含 ? 或非標準中文字符的行：\n")

for i, line in enumerate(lines, 1):
    # 檢查是否包含問號或奇怪的字符
    if '?' in line or '甈' in line or '蝺' in line or '銝' in line or '撱' in line or '隢' in line:
        print(f"行 {i}: {line.strip()}")
