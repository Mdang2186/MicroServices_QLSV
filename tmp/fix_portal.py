
import os

file_path = r'd:\KHOA_LUAN_TOT_NGHIEP\MicroServices_QLSV\apps\web-portal\src\app\(student)\portal\tuition\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip_to = -1

for i, line in enumerate(lines):
    if i < skip_to:
        continue

    # 1. Update semesterSubjects useMemo
    if 'const semesterSubjects = useMemo(() => {' in line:
        # Find the end of the useMemo
        end_idx = i
        while '}, [enrollments, selectedSemester]);' not in lines[end_idx]:
            end_idx += 1
        
        # Replace the entire useMemo block
        indent = line[:line.find('const')]
        new_lines.append(f'{indent}const semesterSubjects = useMemo(() => {{\n')
        new_lines.append(f'{indent}    const filtered = enrollments.filter(e => e.courseClass?.semester?.name === selectedSemester || !selectedSemester);\n')
        new_lines.append(f'{indent}    \n')
        new_lines.append(f'{indent}    // Deduplicate by Subject ID\n')
        new_lines.append(f'{indent}    const grouped: Record<string, any> = {{}};\n')
        new_lines.append(f'{indent}    filtered.forEach(e => {{\n')
        new_lines.append(f'{indent}        const subjectId = e.courseClass?.subjectId;\n')
        new_lines.append(f'{indent}        if (!grouped[subjectId]) {{\n')
        new_lines.append(f'{indent}            grouped[subjectId] = {{ ...e, type: "ENROLLMENT" }};\n')
        new_lines.append(f'{indent}        }} else if (e.status === "PAID") {{\n')
        new_lines.append(f'{indent}            grouped[subjectId] = {{ ...e, type: "ENROLLMENT" }};\n')
        new_lines.append(f'{indent}        }}\n')
        new_lines.append(f'{indent}    }});\n')
        new_lines.append(f'{indent}    \n')
        new_lines.append(f'{indent}    // Add other fees (like BHYT)\n')
        new_lines.append(f'{indent}    const otherFees = fees.filter(f => \n')
        new_lines.append(f'{indent}        f.semester === selectedSemester && \n')
        new_lines.append(f'{indent}        !f.id.toString().startsWith("tuition-")\n')
        new_lines.append(f'{indent}    ).map(f => ({{\n')
        new_lines.append(f'{indent}        id: f.id,\n')
        new_lines.append(f'{indent}        type: "FIXED_FEE",\n')
        new_lines.append(f'{indent}        status: f.status,\n')
        new_lines.append(f'{indent}        tuitionFee: Number(f.totalAmount),\n')
        new_lines.append(f'{indent}        courseClass: {{\n')
        new_lines.append(f'{indent}            subject: {{ name: f.name, code: "—", credits: 0 }}\n')
        new_lines.append(f'{indent}        }}\n')
        new_lines.append(f'{indent}    }}));\n')
        new_lines.append(f'{indent}    \n')
        new_lines.append(f'{indent}    return [...Object.values(grouped), ...otherFees];\n')
        new_lines.append(f'{indent}}}, [enrollments, fees, selectedSemester]);\n')
        
        skip_to = end_idx + 1
        continue

    # 2. Update Label in Table
    if 'Học phần chính khóa' in line and '<span' in line:
        indent = line[:line.find('<span')]
        new_lines.append(f'{indent}<span className={{\n')
        new_lines.append(f'{indent}    "text-[10px] font-bold uppercase tracking-widest mt-0.5 " + \n')
        new_lines.append(f'{indent}    (en.type === "FIXED_FEE" ? "text-emerald-500/60" : "text-emerald-500")\n')
        new_lines.append(f'{indent}}}>\n')
        new_lines.append(f'{indent}    {{en.type === "FIXED_FEE" ? "Khoản thu cố định" : "Học phần chính khóa"}}\n')
        new_lines.append(f'{indent}</span>\n')
        continue

    # 3. Update Credits to show — for 0
    if '{en.courseClass?.subject?.credits}' in line:
        new_lines.append(line.replace('{en.courseClass?.subject?.credits}', '{en.courseClass?.subject?.credits > 0 ? en.courseClass?.subject?.credits : "—"}'))
        continue

    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Student Portal file updated successfully.")
