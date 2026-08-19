import { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import Papa from 'papaparse';
import { useLocation } from 'wouter';
import {
  commitStudentImport,
  useClassroomsInSchool,
  useStudentsInSchool,
  type StudentImportRow,
} from '../../lib/firestore';
import { useSchoolIdsForUser } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';

type RowStatus = 'new' | 'update' | 'error';

interface PreviewRow extends StudentImportRow {
  status: RowStatus;
  error?: string;
  rawStudentId: string;
}

const CHUNK_SIZE = 400;

function buildPreview(rawRows: Record<string, string>[], existingByStudentId: Map<string, string>): PreviewRow[] {
  return rawRows.map((raw) => {
    const firstName = (raw.firstName ?? '').trim();
    const lastName = (raw.lastName ?? '').trim();
    const studentId = (raw.studentId ?? '').trim();
    const gradeLevel = (raw.gradeLevel ?? '').trim();

    if (!firstName || !lastName) {
      return {
        firstName,
        lastName,
        studentId: studentId || undefined,
        gradeLevel: gradeLevel || undefined,
        rawStudentId: studentId,
        status: 'error' as const,
        error: 'Missing first or last name',
      };
    }

    const existingId = studentId ? existingByStudentId.get(studentId) : undefined;
    return {
      firstName,
      lastName,
      studentId: studentId || undefined,
      gradeLevel: gradeLevel || undefined,
      existingId,
      rawStudentId: studentId,
      status: existingId ? ('update' as const) : ('new' as const),
    };
  });
}

/** Bulk CSV import for students — directly answers ETM Machine's worst
 * complaint (a class-roster transfer taking ~15 clicks per student, one
 * at a time). One classroom per import batch, chosen up front, rather
 * than a per-row classroom-name column — fuzzy name-matching is a real
 * footgun on an irreversible bulk write. */
export function StudentImportPage({ user }: { user: User }) {
  const [, navigate] = useLocation();
  const schoolIds = useSchoolIdsForUser(user.uid);
  const schoolId = schoolIds[0];
  const classrooms = useClassroomsInSchool(schoolId);
  const existingStudents = useStudentsInSchool(schoolId);

  const existingByStudentId = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of existingStudents) {
      if (s.studentId) map.set(s.studentId, s.id);
    }
    return map;
  }, [existingStudents]);

  const [targetContextId, setTargetContextId] = useState('');
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [committing, setCommitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (file: File) => {
    setError('');
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Could not parse ${file.name}: ${results.errors[0].message}`);
          setRows(null);
          return;
        }
        setRows(buildPreview(results.data, existingByStudentId));
      },
      error: (err) => setError(err.message),
    });
  };

  const validRows = rows?.filter((r) => r.status !== 'error') ?? [];
  const hasBlankStudentId = validRows.some((r) => !r.studentId);

  const handleCommit = async () => {
    const target = classrooms.find((c) => c.id === targetContextId);
    if (!target || !target.schoolId || validRows.length === 0 || committing) return;
    setCommitting(true);
    await commitStudentImport(validRows, {
      contextId: target.id,
      ownerUids: target.ownerUids,
      schoolId: target.schoolId,
      gradeLevel: target.gradeLevel,
      contextName: target.name,
    });
    setCommitting(false);
    setDone(true);
  };

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader title="Import students" backTo="/app/students" />

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {done ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-brand">
              Imported {validRows.length} student{validRows.length === 1 ? '' : 's'}.
            </p>
            <Button onClick={() => navigate('/app/students')}>Back to Students</Button>
          </div>
        ) : (
          <div className="flex max-w-2xl flex-col gap-6">
            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink-muted">1. Destination classroom</h2>
              <select
                value={targetContextId}
                onChange={(e) => setTargetContextId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink sm:w-80"
              >
                <option value="">Choose a classroom…</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-ink-muted">
                Every new student in this file joins this classroom. Matched (existing) students keep their
                current classroom — importing never reassigns them.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink-muted">2. CSV file</h2>
              <p className="mb-2 text-xs text-ink-muted">
                Columns: <code>firstName,lastName,studentId,gradeLevel</code> (header row required;{' '}
                <code>studentId</code> and <code>gradeLevel</code> are optional per row).
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={!targetContextId}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                className="text-sm text-ink-muted disabled:opacity-50"
              />
              {fileName && <p className="mt-1 text-xs text-ink-muted">{fileName}</p>}
              {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            </section>

            {rows && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-ink-muted">3. Preview</h2>
                {hasBlankStudentId && (
                  <p className="mb-2 rounded-lg border border-border bg-bg px-3 py-2 text-xs text-ink-muted">
                    Some rows have no student ID — those will always create a new student, even if you import
                    this same file again.
                  </p>
                )}
                <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-bg text-xs text-ink-muted">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">ID</th>
                        <th className="px-3 py-2">Grade</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-3 py-2">
                            {row.firstName} {row.lastName}
                          </td>
                          <td className="px-3 py-2">{row.rawStudentId || '—'}</td>
                          <td className="px-3 py-2">{row.gradeLevel || '—'}</td>
                          <td className="px-3 py-2">
                            {row.status === 'error' ? (
                              <span className="text-danger">Error: {row.error}</span>
                            ) : row.status === 'update' ? (
                              <span className="text-ink-muted">Will update</span>
                            ) : (
                              <span className="text-brand">New</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-ink-muted">
                  {validRows.length} of {rows.length} row{rows.length === 1 ? '' : 's'} will be imported
                  {rows.length - validRows.length > 0 ? ` (${rows.length - validRows.length} skipped)` : ''}.
                  {validRows.length > CHUNK_SIZE && ' Imported in batches automatically.'}
                </p>
                <Button className="mt-3" onClick={handleCommit} disabled={committing || validRows.length === 0}>
                  {committing ? 'Importing…' : `Import ${validRows.length} student${validRows.length === 1 ? '' : 's'}`}
                </Button>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
