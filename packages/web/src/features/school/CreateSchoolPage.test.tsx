import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { CreateSchoolPage } from './CreateSchoolPage';
import * as schoolLib from '../../lib/school';

const navigateMock = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/school', navigateMock],
}));

vi.mock('../../lib/school', () => ({
  createSchool: vi.fn(),
}));

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;

describe('CreateSchoolPage', () => {
  it('founds a school with the current user as principal', async () => {
    vi.mocked(schoolLib.createSchool).mockResolvedValue('school-1');
    render(<CreateSchoolPage user={user} />);

    fireEvent.change(screen.getByPlaceholderText('School name'), {
      target: { value: 'Riverside Elementary' },
    });
    fireEvent.click(screen.getByText('Found School'));

    await waitFor(() =>
      expect(schoolLib.createSchool).toHaveBeenCalledWith({
        name: 'Riverside Elementary',
        principalUid: 'teacher-1',
        principalDisplayName: 'Ms. Lord',
        principalEmail: 'lord@example.com',
      }),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/school'));
  });
});
