import type { MemberScope } from '@sprout/shared';

/** Own/grades/whole-school radio group + grade-chip multiselect — used both
 * for editing an existing staff member's scope (StaffDetailPane) and for
 * setting the scope of a new teacher invite (InviteTeacherPage). */
export function ScopePicker({
  value,
  onChange,
  gradeOptions,
}: {
  value: MemberScope;
  onChange: (v: MemberScope) => void;
  gradeOptions: string[];
}) {
  return (
    <div className="flex flex-col gap-2 text-left text-sm">
      <label className="flex items-center gap-2">
        <input type="radio" checked={value.type === 'own'} onChange={() => onChange({ type: 'own' })} />
        Own classrooms only
      </label>
      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={value.type === 'grades'}
          onChange={() => onChange({ type: 'grades', grades: [] })}
        />
        Specific grades
      </label>
      {value.type === 'grades' && (
        <div className="ml-6 flex flex-wrap gap-2">
          {gradeOptions.map((grade) => {
            const checked = value.grades.includes(grade);
            return (
              <button
                key={grade}
                type="button"
                onClick={() =>
                  onChange({
                    type: 'grades',
                    grades: checked ? value.grades.filter((g) => g !== grade) : [...value.grades, grade],
                  })
                }
                className={`rounded border px-2 py-1 text-xs ${checked ? 'border-brand bg-brand/20' : 'border-border'}`}
              >
                {grade}
              </button>
            );
          })}
        </div>
      )}
      <label className="flex items-center gap-2">
        <input type="radio" checked={value.type === 'school'} onChange={() => onChange({ type: 'school' })} />
        Whole school (PE, art, music, etc.)
      </label>
    </div>
  );
}
