import re

# 讀取文件
file_path = "frontend/src/pages/work-report/WorkReportPage.tsx"
with open(file_path, 'rb') as f:
    raw_bytes = f.read()

content = raw_bytes.decode('utf-8', errors='replace')

# 尋找包含亂碼的特定行
lines = content.split('\n')

print("檢查包含亂碼的關鍵行：\n")
key_lines = {
    254: "console.error",
    436: "response.data?.message",
    837: "title XLSX",
    841: "exportingXlsx",
    849: "creating"
}

for line_num in key_lines:
    if line_num <= len(lines):
        line = lines[line_num - 1]
        if '?' in line or 'XLSX' in line.upper():
            print(f"行 {line_num}: {line.strip()}\n")
