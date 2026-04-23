export type FamilyMemberFormValue = {
  id?: string;
  relationship: string;
  fullName: string;
  birthYear: string;
  job: string;
  phone: string;
  ethnicity: string;
  religion: string;
  nationality: string;
  workplace: string;
  position: string;
  address: string;
};

type FamilyMembersEditorProps = {
  value: FamilyMemberFormValue[];
  onChange: (value: FamilyMemberFormValue[]) => void;
};

export function createEmptyFamilyMember(): FamilyMemberFormValue {
  return {
    relationship: "Cha/Mẹ",
    fullName: "",
    birthYear: "",
    job: "",
    phone: "",
    ethnicity: "",
    religion: "",
    nationality: "Việt Nam",
    workplace: "",
    position: "",
    address: "",
  };
}

export function normalizeFamilyMembers(values: any): FamilyMemberFormValue[] {
  if (!Array.isArray(values) || values.length === 0) {
    return [createEmptyFamilyMember()];
  }

  return values.map((item) => ({
    id: item?.id,
    relationship: `${item?.relationship || ""}`.trim() || "Cha/Mẹ",
    fullName: `${item?.fullName || ""}`.trim(),
    birthYear:
      item?.birthYear === undefined || item?.birthYear === null
        ? ""
        : `${item.birthYear}`,
    job: `${item?.job || ""}`.trim(),
    phone: `${item?.phone || ""}`.trim(),
    ethnicity: `${item?.ethnicity || ""}`.trim(),
    religion: `${item?.religion || ""}`.trim(),
    nationality: `${item?.nationality || ""}`.trim() || "Việt Nam",
    workplace: `${item?.workplace || ""}`.trim(),
    position: `${item?.position || ""}`.trim(),
    address: `${item?.address || ""}`.trim(),
  }));
}

export function serializeFamilyMembers(values: FamilyMemberFormValue[]) {
  return values
    .map((item) => ({
      relationship: item.relationship.trim(),
      fullName: item.fullName.trim(),
      birthYear: item.birthYear.trim() ? Number(item.birthYear) : undefined,
      job: item.job.trim() || undefined,
      phone: item.phone.trim() || undefined,
      ethnicity: item.ethnicity.trim() || undefined,
      religion: item.religion.trim() || undefined,
      nationality: item.nationality.trim() || undefined,
      workplace: item.workplace.trim() || undefined,
      position: item.position.trim() || undefined,
      address: item.address.trim() || undefined,
    }))
    .filter((item) => item.relationship && item.fullName);
}

export default function FamilyMembersEditor({
  value,
  onChange,
}: FamilyMembersEditorProps) {
  const updateMember = (
    index: number,
    field: keyof FamilyMemberFormValue,
    nextValue: string,
  ) => {
    onChange(
      value.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: nextValue } : item,
      ),
    );
  };

  const addMember = () => {
    onChange([...value, createEmptyFamilyMember()]);
  };

  const removeMember = (index: number) => {
    const next = value.filter((_, itemIndex) => itemIndex !== index);
    onChange(next.length > 0 ? next : [createEmptyFamilyMember()]);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-wider">
            Thông tin gia đình
          </h3>
          <p className="mt-1 text-[12px] text-slate-500">
            Chỉ lưu các dòng có quan hệ và họ tên.
          </p>
        </div>
        <button
          type="button"
          onClick={addMember}
          className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-bold text-slate-700 transition hover:border-uneti-blue hover:text-uneti-blue"
        >
          Thêm thành viên
        </button>
      </div>

      <div className="space-y-4">
        {value.map((member, index) => (
          <div
            key={member.id || `${member.relationship}-${index}`}
            className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-black text-slate-900">
                  {member.fullName || `Thành viên ${index + 1}`}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {member.relationship || "Chưa chọn quan hệ"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeMember(index)}
                className="rounded-xl px-3 py-2 text-[12px] font-bold text-rose-600 transition hover:bg-rose-50"
              >
                Xóa
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Field
                label="Quan hệ"
                value={member.relationship}
                onChange={(nextValue) =>
                  updateMember(index, "relationship", nextValue)
                }
                placeholder="Cha, Mẹ, Anh, Chị..."
              />
              <Field
                label="Họ và tên"
                value={member.fullName}
                onChange={(nextValue) =>
                  updateMember(index, "fullName", nextValue)
                }
                placeholder="Nguyễn Văn B"
              />
              <Field
                label="Số điện thoại"
                value={member.phone}
                onChange={(nextValue) => updateMember(index, "phone", nextValue)}
                placeholder="09..."
              />
              <Field
                label="Năm sinh"
                value={member.birthYear}
                onChange={(nextValue) =>
                  updateMember(index, "birthYear", nextValue)
                }
                placeholder="1975"
                type="number"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Field
                label="Nghề nghiệp"
                value={member.job}
                onChange={(nextValue) => updateMember(index, "job", nextValue)}
                placeholder="Kinh doanh, công chức..."
              />
              <Field
                label="Nơi công tác"
                value={member.workplace}
                onChange={(nextValue) =>
                  updateMember(index, "workplace", nextValue)
                }
                placeholder="Công ty, trường học..."
              />
              <Field
                label="Chức vụ"
                value={member.position}
                onChange={(nextValue) =>
                  updateMember(index, "position", nextValue)
                }
                placeholder="Nhân viên, quản lý..."
              />
            </div>

            <div className="mt-4">
              <Field
                label="Địa chỉ"
                value={member.address}
                onChange={(nextValue) => updateMember(index, "address", nextValue)}
                placeholder="Số nhà, phường/xã, quận/huyện, tỉnh/thành"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Field
                label="Quốc tịch"
                value={member.nationality}
                onChange={(nextValue) =>
                  updateMember(index, "nationality", nextValue)
                }
                placeholder="Việt Nam"
              />
              <Field
                label="Dân tộc"
                value={member.ethnicity}
                onChange={(nextValue) =>
                  updateMember(index, "ethnicity", nextValue)
                }
                placeholder="Kinh"
              />
              <Field
                label="Tôn giáo"
                value={member.religion}
                onChange={(nextValue) =>
                  updateMember(index, "religion", nextValue)
                }
                placeholder="Không"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-medium text-slate-800 outline-none transition focus:border-uneti-blue focus:ring-2 focus:ring-uneti-blue/10"
      />
    </div>
  );
}
