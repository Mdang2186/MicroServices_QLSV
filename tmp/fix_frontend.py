
import os

file_path = r'd:\KHOA_LUAN_TOT_NGHIEP\MicroServices_QLSV\apps\web-admin\src\app\(staff-role)\staff\tuition\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # 1. Add isFixedFee declaration
    if 'const isPaid = status === \'PAID\';' in line:
        new_lines.append(line)
        # Preserve indentation
        indent = line[:line.find('const')]
        new_lines.append(f'{indent}const isFixedFee = e.type === \'FIXED_FEE\';\n')
        continue
    
    # 2. Update Label
    if 'text-[9px] font-bold text-emerald-500 uppercase tracking-tight' in line:
        indent = line[:line.find('<span')]
        new_lines.append(f'{indent}<span className={{\n')
        new_lines.append(f'{indent}    "text-[9px] font-bold uppercase tracking-tight " + \n')
        new_lines.append(f'{indent}    (isFixedFee ? "text-uneti-blue/60" : "text-emerald-500")\n')
        new_lines.append(f'{indent}}}>\n')
        new_lines.append(f'{indent}    {{isFixedFee ? "Khoản thu cố định" : "Học phần chính khóa"}}\n')
        new_lines.append(f'{indent}</span>\n')
        continue
    
    # Skip the original label line if handle separately
    if 'Học phần chính khóa' in line and '<span' in line:
        continue

    # 3. Update Credits
    if '{e.credits}</td>' in line:
        new_lines.append(line.replace('{e.credits}', '{e.credits > 0 ? e.credits : "—"}'))
        continue

    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("File updated successfully via python script.")
