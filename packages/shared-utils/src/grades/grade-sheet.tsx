import * as React from 'react';

export type GradeCellField =
  | 'attendanceScore'
  | 'regular'
  | 'coef1'
  | 'coef2'
  | 'practice'
  | 'examScore1'
  | 'examScore2'
  | 'notes';

export interface GradeSheetRow {
  id: string;
  primaryText: string;
  secondaryText?: string | null;
  credits?: number | null;
  attendanceScore?: number | null;
  regularScores?: (number | null)[];
  coef1Scores?: (number | null)[];
  coef2Scores?: (number | null)[];
  practiceScores?: (number | null)[];
  tbThuongKy?: number | null;
  isEligibleForExam?: boolean | null;
  isAbsentFromExam?: boolean;
  examScore1?: number | null;
  examScore2?: number | null;
  finalScore1?: number | null;
  finalScore2?: number | null;
  totalScore10?: number | null;
  totalScore4?: number | null;
  letterGrade?: string | null;
  isPassed?: boolean;
  resultLabel?: string | null;
  notes?: string | null;
  isLocked?: boolean;
  status?: string | null;
  isPlaceholder?: boolean;
  adminClassCode?: string | null;
  semesterLabel?: string | null;
  gpa?: number | null;
  cpa?: number | null;
}

export interface GradeSheetTableProps {
  rows: GradeSheetRow[];
  labelHeader?: string;
  coefColumns?: number;
  practiceColumns?: number;
  showNotes?: boolean;
  showSemester?: boolean;
  emptyMessage?: string;
  editableFields?: GradeCellField[];
  onCellChange?: (
    rowId: string,
    field: Exclude<GradeCellField, 'notes'>,
    value: number | null,
    index?: number,
  ) => void;
  onNoteChange?: (rowId: string, value: string) => void;
  onToggleAbsent?: (rowId: string) => void;
  isRestricted?: boolean;
}

type ScoreArrayField = Extract<GradeCellField, 'regular' | 'coef1' | 'coef2' | 'practice'>;

type ScoreGroupConfig = {
  field: ScoreArrayField;
  label: string;
  prefix: string;
  count: number;
  groupHeaderClassName: string;
  subHeaderClassName: string;
  bodyCellClassName: string;
};

const DEFAULT_SCORE_DIGITS = 1;
const SCORE_MIN = 0;
const SCORE_MAX = 10;

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');

const fixedFormatterCache = new Map<number, Intl.NumberFormat>();

function getFixedFormatter(digits: number) {
  if (!fixedFormatterCache.has(digits)) {
    fixedFormatterCache.set(
      digits,
      new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }),
    );
  }

  return fixedFormatterCache.get(digits)!;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    if (!normalized) return null;
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function roundScoreValue(
  value: unknown,
  digits = DEFAULT_SCORE_DIGITS,
): number | null {
  const num = toNullableNumber(value);
  if (num === null) return null;
  const factor = 10 ** digits;
  return Math.round(num * factor) / factor;
}

export function sanitizeScoreValue(
  value: unknown,
  digits = DEFAULT_SCORE_DIGITS,
  min = SCORE_MIN,
  max = SCORE_MAX,
): number | null {
  const rounded = roundScoreValue(value, digits);
  if (rounded === null) return null;
  return Math.max(min, Math.min(max, rounded));
}

export function parseScoreArray(
  value: string | null | undefined,
): (number | null)[] {
  if (!value || value === 'null') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => sanitizeScoreValue(item))
      : [];
  } catch {
    return [];
  }
}

export function serializeScoreArray(values: (number | null)[]): string {
  return JSON.stringify(values);
}

export function normalizeScoreArray(
  values: (number | null)[] | null | undefined,
  length: number,
): (number | null)[] {
  const normalized = [...(values || [])];
  while (normalized.length < length) normalized.push(null);
  return normalized.slice(0, length);
}

function formatScore(value: unknown, digits = DEFAULT_SCORE_DIGITS) {
  const num = roundScoreValue(value, digits);
  if (num === null) return '';
  return getFixedFormatter(digits).format(num);
}

function toScoreInputValue(value: unknown, digits = DEFAULT_SCORE_DIGITS) {
  const num = roundScoreValue(value, digits);
  return num === null ? '' : num.toFixed(digits);
}

function getResultLabel(row: GradeSheetRow) {
  if (row.resultLabel !== undefined && row.resultLabel !== null) {
    return row.resultLabel;
  }
  if (row.tbThuongKy === null || row.tbThuongKy === undefined) return '';
  if (row.isEligibleForExam === false) return 'Học lại';
  if (row.isAbsentFromExam && (row.examScore2 === null || row.examScore2 === undefined)) {
    return 'Thi lại';
  }
  if (
    row.examScore1 !== null &&
    row.examScore1 !== undefined &&
    row.finalScore1 !== null &&
    row.finalScore1 !== undefined &&
    !row.isPassed &&
    (row.examScore2 === null || row.examScore2 === undefined)
  ) {
    return 'Thi lại';
  }
  if (row.finalScore2 !== null && row.finalScore2 !== undefined && !row.isPassed) {
    return 'Học lại';
  }
  if (!row.letterGrade) return '';
  return row.isPassed ? 'Đạt' : 'Học lại';
}

function getRankLabel(letterGrade?: string | null) {
  switch (letterGrade) {
    case 'A':
      return 'Xuất sắc';
    case 'B+':
      return 'Giỏi';
    case 'B':
      return 'Khá';
    case 'C+':
      return 'Khá TB';
    case 'C':
      return 'Trung bình';
    case 'D+':
    case 'D':
      return 'Yếu';
    case 'F+':
    case 'F':
      return 'Kém';
    default:
      return '';
  }
}

function isEditable(
  row: GradeSheetRow,
  field: GradeCellField,
  editableFields?: GradeCellField[],
) {
  if (!editableFields?.includes(field)) return false;
  if (row.isPlaceholder) return false;
  return true;
}

function ScoreInput({
  value,
  disabled,
  onChange,
}: {
  value: number | null | undefined;
  disabled: boolean;
  onChange?: (value: number | null) => void;
}) {
  if (disabled || !onChange) {
    return (
      <span className="flex h-9 min-w-[74px] items-center justify-center px-1.5 text-[13px] font-semibold text-slate-700 tabular-nums whitespace-nowrap">
        {formatScore(value)}
      </span>
    );
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.1"
      min="0"
      max="10"
      value={toScoreInputValue(value)}
      onChange={(event) => {
        const raw = `${event.target.value}`.trim();
        if (!raw) {
          onChange(null);
          return;
        }

        onChange(sanitizeScoreValue(raw));
      }}
      className="h-8 w-full min-w-[68px] border-0 bg-transparent px-1.5 text-center text-[12px] font-semibold text-slate-800 outline-none focus:bg-blue-50/70 tabular-nums whitespace-nowrap"
    />
  );
}

const firstHeaderCellClass =
  'border-r border-b border-slate-300 px-3 py-2 text-center text-[11px] font-bold text-slate-700 whitespace-nowrap';
const secondHeaderCellClass =
  'border-r border-b border-slate-300 px-2 py-1.5 text-center text-[10px] font-semibold text-slate-500 whitespace-nowrap';

export function GradeSheetTable({
  rows,
  labelHeader = 'Họ và tên',
  coefColumns = 3,
  practiceColumns = 2,
  showNotes = true,
  showSemester = false,
  emptyMessage = 'Chưa có dữ liệu bảng điểm.',
  editableFields,
  onCellChange,
  onNoteChange,
  onToggleAbsent,
  isRestricted = false,
}: GradeSheetTableProps) {
  const scoreGroups: ScoreGroupConfig[] = [
    {
      field: 'regular',
      label: 'Thường kỳ',
      prefix: 'TX',
      count: 3,
      groupHeaderClassName: 'bg-sky-100/80',
      subHeaderClassName: 'bg-sky-50',
      bodyCellClassName: 'bg-sky-50/40',
    },
    {
      field: 'coef1',
      label: 'LT hệ số 1',
      prefix: 'HS1',
      count: coefColumns,
      groupHeaderClassName: 'bg-indigo-100/80',
      subHeaderClassName: 'bg-indigo-50',
      bodyCellClassName: 'bg-indigo-50/35',
    },
    {
      field: 'coef2',
      label: 'LT hệ số 2',
      prefix: 'HS2',
      count: coefColumns,
      groupHeaderClassName: 'bg-violet-100/80',
      subHeaderClassName: 'bg-violet-50',
      bodyCellClassName: 'bg-violet-50/35',
    },
    ...(practiceColumns > 0
      ? [
          {
            field: 'practice' as const,
            label: 'Thực hành',
            prefix: 'TH',
            count: practiceColumns,
            groupHeaderClassName: 'bg-emerald-100/80',
            subHeaderClassName: 'bg-emerald-50',
            bodyCellClassName: 'bg-emerald-50/35',
          },
        ]
      : []),
  ];

  const scoreColumnCount = scoreGroups.reduce((total, group) => total + group.count, 0);
  const totalColumns = 19 + scoreColumnCount + (showNotes ? 1 : 0) + (showSemester ? 1 : 0);

  return (
    <div className="h-full overflow-auto overscroll-contain border border-slate-300 bg-white [scrollbar-gutter:stable]">
      <table className="min-w-full w-max border-separate border-spacing-0 text-[13px] text-slate-800 whitespace-nowrap">
        <thead className="sticky top-0 z-40 bg-white shadow-sm">
          <tr className="h-9">
            <th
              rowSpan={2}
              className={cx(
                firstHeaderCellClass,
                'sticky left-0 z-50 min-w-[60px] bg-slate-100',
              )}
            >
              STT
            </th>
            {showSemester && (
              <th
                rowSpan={2}
                className={cx(
                  firstHeaderCellClass,
                  'sticky left-[60px] z-50 min-w-[100px] bg-slate-100',
                )}
              >
                Học kỳ
              </th>
            )}
            <th
              rowSpan={2}
              className={cx(
                firstHeaderCellClass,
                'sticky z-50 min-w-[140px] bg-slate-100 text-left',
                showSemester ? 'left-[160px]' : 'left-[60px]',
              )}
            >
              Mã HP
            </th>
            <th
              rowSpan={2}
              className={cx(
                firstHeaderCellClass,
                'sticky z-50 min-w-[220px] bg-slate-100 text-left',
                showSemester ? 'left-[300px]' : 'left-[200px]',
              )}
            >
              {labelHeader}
            </th>
            <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[64px] bg-slate-100')}>
              TC
            </th>
            <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[86px] bg-amber-100/70')}>
              CC
            </th>
            {scoreGroups.map((group) => (
              <th
                key={`${group.field}-group`}
                colSpan={group.count}
                className={cx(
                  firstHeaderCellClass,
                  'min-w-[74px]',
                  group.groupHeaderClassName,
                )}
              >
                {group.label}
              </th>
            ))}
            <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[92px] bg-orange-100/70')}>
              TB TK
            </th>
            <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[88px] bg-orange-100/70')}>
              Dự thi
            </th>
            {!isRestricted && (
              <>
                <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[88px] bg-rose-100/70')}>
                  Điểm 1
                </th>
                <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[74px] bg-rose-100/70')}>
                  Vắng
                </th>
                <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[88px] bg-rose-100/70')}>
                  Điểm 2
                </th>
                <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[88px] bg-emerald-100/70')}>
                  TK 1
                </th>
                <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[88px] bg-emerald-100/70')}>
                  TK 2
                </th>
                <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[88px] bg-slate-100')}>
                  TK 10
                </th>
                <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[78px] bg-slate-100')}>
                  Hệ 4
                </th>
                <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[72px] bg-slate-100')}>
                  Chữ
                </th>
                <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[78px] bg-slate-100')}>
                  GPA
                </th>
                <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[78px] bg-slate-100')}>
                  CPA
                </th>
                <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[108px] bg-slate-100')}>
                  Xếp loại
                </th>
                <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[98px] bg-slate-100')}>
                  Kết quả
                </th>
              </>
            )}
            {showNotes ? (
              <th rowSpan={2} className={cx(firstHeaderCellClass, 'min-w-[220px] bg-slate-100')}>
                Ghi chú
              </th>
            ) : null}
          </tr>
          <tr className="h-8">
            {scoreGroups.map((group) =>
              Array.from({ length: group.count }).map((_, index) => (
                <th
                  key={`${group.field}-${index}`}
                  className={cx(secondHeaderCellClass, group.subHeaderClassName)}
                >
                  {group.prefix}
                  {index + 1}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={totalColumns} className="px-4 py-12 text-center text-sm text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const regularScores = normalizeScoreArray(row.regularScores, 3);
              const coef1Scores = normalizeScoreArray(row.coef1Scores, coefColumns);
              const coef2Scores = normalizeScoreArray(row.coef2Scores, coefColumns);
              const practiceScores = normalizeScoreArray(
                row.practiceScores,
                practiceColumns,
              );

              const rowBaseClass = row.isPlaceholder ? 'bg-slate-50' : 'bg-white';
              const rowHoverClass = row.isPlaceholder ? '' : 'group-hover:bg-blue-50/30';
              const stickyCellClass = (leftClass: string) =>
                cx(
                  'sticky z-20 border-r border-b border-slate-300 px-3 py-2 whitespace-nowrap',
                  leftClass,
                  rowBaseClass,
                  rowHoverClass,
                );

              const scoreGroupValues: Array<{
                config: ScoreGroupConfig;
                values: (number | null)[];
              }> = [
                { config: scoreGroups[0], values: regularScores },
                { config: scoreGroups[1], values: coef1Scores },
                { config: scoreGroups[2], values: coef2Scores },
                ...(practiceColumns > 0 && scoreGroups[3]
                  ? [{ config: scoreGroups[3], values: practiceScores }]
                  : []),
              ];

              const eligibleText =
                row.tbThuongKy === null || row.tbThuongKy === undefined
                  ? ''
                  : row.isEligibleForExam
                    ? 'Đạt'
                    : 'Cấm';

              return (
                <tr key={row.id} className={cx('group', rowBaseClass)}>
                  <td className={cx(stickyCellClass('left-0'), 'min-w-[60px] text-center text-slate-500 tabular-nums')}>
                    {index + 1}
                  </td>
                  {showSemester && (
                    <td className={cx(stickyCellClass('left-[60px]'), 'min-w-[100px] text-center font-bold text-blue-700')}>
                      {row.semesterLabel || ''}
                    </td>
                  )}
                  <td className={cx(stickyCellClass(showSemester ? 'left-[160px]' : 'left-[60px]'), 'min-w-[140px] font-semibold text-slate-700')}>
                    {row.secondaryText || ''}
                  </td>
                  <td className={cx(stickyCellClass(showSemester ? 'left-[300px]' : 'left-[200px]'), 'min-w-[220px] font-semibold text-slate-900')}>
                    {row.primaryText}
                  </td>
                  <td className={cx('border-r border-b border-slate-300 px-2 py-2 text-center tabular-nums', rowHoverClass)}>
                    {row.credits ?? ''}
                  </td>
                  <td className={cx('border-r border-b border-slate-300 px-1 py-2 text-center bg-amber-50/50', rowHoverClass)}>
                    <ScoreInput
                      value={row.attendanceScore}
                      disabled={!isEditable(row, 'attendanceScore', editableFields)}
                      onChange={
                        onCellChange
                          ? (value) => onCellChange(row.id, 'attendanceScore', value)
                          : undefined
                      }
                    />
                  </td>
                  {scoreGroupValues.map(({ config, values }) =>
                    values.map((value, cellIndex) => (
                      <td
                        key={`${row.id}-${config.field}-${cellIndex}`}
                        className={cx(
                          'border-r border-b border-slate-300 px-1 py-2 text-center',
                          config.bodyCellClassName,
                          rowHoverClass,
                        )}
                      >
                        <ScoreInput
                          value={value}
                          disabled={!isEditable(row, config.field, editableFields)}
                          onChange={
                            onCellChange
                              ? (nextValue) =>
                                  onCellChange(row.id, config.field, nextValue, cellIndex)
                              : undefined
                          }
                        />
                      </td>
                    )),
                  )}
                  <td className={cx('border-r border-b border-slate-300 px-2 py-2 text-center bg-orange-50/50 text-slate-700 tabular-nums', rowHoverClass)}>
                    {formatScore(row.tbThuongKy)}
                  </td>
                  <td className={cx('border-r border-b border-slate-300 px-2 py-2 text-center bg-orange-50/50', rowHoverClass)}>
                    <span
                      className={cx(
                        'font-semibold whitespace-nowrap',
                        row.isEligibleForExam === true && 'text-emerald-700',
                        row.isEligibleForExam === false && 'text-rose-700',
                      )}
                    >
                      {eligibleText}
                    </span>
                  </td>
                  {!isRestricted && (
                    <>
                      <td className={cx('border-r border-b border-slate-300 px-1 py-2 text-center bg-rose-50/40', rowHoverClass)}>
                        <ScoreInput
                          value={row.examScore1}
                          disabled={!isEditable(row, 'examScore1', editableFields)}
                          onChange={
                            onCellChange
                              ? (value) => onCellChange(row.id, 'examScore1', value)
                              : undefined
                          }
                        />
                      </td>
                      <td className={cx('border-r border-b border-slate-300 px-2 py-2 text-center bg-rose-50/40', rowHoverClass)}>
                        {isEditable(row, 'examScore1', editableFields) ? (
                          <input
                            type="checkbox"
                            checked={Boolean(row.isAbsentFromExam)}
                            onChange={() => onToggleAbsent?.(row.id)}
                            className="h-4 w-4"
                          />
                        ) : (
                          <span className="font-medium text-slate-700">
                            {row.isAbsentFromExam ? 'Có' : ''}
                          </span>
                        )}
                      </td>
                      <td className={cx('border-r border-b border-slate-300 px-1 py-2 text-center bg-rose-50/40', rowHoverClass)}>
                        <ScoreInput
                          value={row.examScore2}
                          disabled={!isEditable(row, 'examScore2', editableFields)}
                          onChange={
                            onCellChange
                              ? (value) => onCellChange(row.id, 'examScore2', value)
                              : undefined
                          }
                        />
                      </td>
                      <td className={cx('border-r border-b border-slate-300 px-2 py-2 text-center bg-emerald-50/40 text-slate-700 tabular-nums', rowHoverClass)}>
                        {formatScore(row.finalScore1)}
                      </td>
                      <td className={cx('border-r border-b border-slate-300 px-2 py-2 text-center bg-emerald-50/40 text-slate-700 tabular-nums', rowHoverClass)}>
                        {formatScore(row.finalScore2)}
                      </td>
                      <td className={cx('border-r border-b border-slate-300 px-2 py-2 text-center bg-slate-50 text-slate-700 tabular-nums font-semibold', rowHoverClass)}>
                        {formatScore(row.totalScore10)}
                      </td>
                      <td className={cx('border-r border-b border-slate-300 px-2 py-2 text-center bg-slate-50 text-slate-700 tabular-nums', rowHoverClass)}>
                        {formatScore(row.totalScore4)}
                      </td>
                      <td className={cx('border-r border-b border-slate-300 px-2 py-2 text-center bg-slate-50 text-slate-700', rowHoverClass)}>
                        {row.letterGrade || ''}
                      </td>
                      <td className={cx('border-r border-b border-slate-300 px-2 py-2 text-center bg-slate-50 text-slate-700 tabular-nums', rowHoverClass)}>
                        {formatScore(row.gpa, 2)}
                      </td>
                      <td className={cx('border-r border-b border-slate-300 px-2 py-2 text-center bg-slate-50 text-slate-700 tabular-nums', rowHoverClass)}>
                        {formatScore(row.cpa, 2)}
                      </td>
                      <td className={cx('border-r border-b border-slate-300 px-2 py-2 text-center bg-slate-50 text-slate-700', rowHoverClass)}>
                        {getRankLabel(row.letterGrade)}
                      </td>
                      <td className={cx('border-r border-b border-slate-300 px-2 py-2 text-center bg-slate-50 text-slate-700', rowHoverClass)}>
                        {getResultLabel(row)}
                      </td>
                    </>
                  )}
                  {showNotes ? (
                    <td className={cx('border-r border-b border-slate-300 px-2 py-2 bg-slate-50', rowHoverClass)}>
                      {isEditable(row, 'notes', editableFields) && onNoteChange ? (
                        <input
                          type="text"
                          value={row.notes || ''}
                          onChange={(event) => onNoteChange(row.id, event.target.value)}
                          className="h-9 w-full min-w-[200px] border-0 bg-transparent px-2 text-[13px] text-slate-800 outline-none focus:bg-blue-50/70 whitespace-nowrap"
                        />
                      ) : (
                        <span className="block min-w-[200px] text-slate-700 whitespace-nowrap">
                          {row.notes || ''}
                        </span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
