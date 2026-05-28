import re

# 讀取文件
file_path = "frontend/src/pages/work-report/WorkReportPage.tsx"
with open(file_path, 'rb') as f:
    raw_bytes = f.read()

content = raw_bytes.decode('utf-8', errors='replace')

# 尋找真正的亂碼（非 ASCII 且不是中文）
lines = content.split('\n')
print("找到的真正亂碼：\n")

count = 0
for i, line in enumerate(lines, 1):
    # 檢查是否包含特定的破損字符
    if any(c in line for c in ['鞈', '頛', '銝', '雿', '航', '撱', '啗', '撌', '脤', '摰', '繚', '儭', '芷', '∟', '隢', '梧', '冽', '迨', '憛', '楊', '梯', '勗', '極', '乩', '葉']):
        print(f"行 {i}: {line}")
        count += 1

print(f"\n共找到 {count} 行亂碼。")
