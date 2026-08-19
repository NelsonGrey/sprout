import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { CreateSchoolPage } from './CreateSchoolPage';
import * as schoolLib from '../../lib/school';
import * as ncesLib from '../../lib/ncesLookup';

const navigateMock = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/app/school', navigateMock],
}));

vi.mock('../../lib/school', () => ({
  createSchool: vi.fn(),
}));

vi.mock('../../lib/ncesLookup', () => ({
  useNcesSchoolSearch: vi.fn(),
}));

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;

describe('CreateSchoolPage', () => {
  it('founds a school manually with the current user as founder', async () => {
    vi.mocked(ncesLib.useNcesSchoolSearch).mockReturnValue({ results: [], loading: false });
    vi.mocked(schoolLib.createSchool).mockResolvedValue('school-1');
    render(<CreateSchoolPage user={user} />);

    fireEvent.click(screen.getByText("Can't find your school? Enter it manually"));
    fireEvent.change(screen.getByPlaceholderText('School name'), {
      target: { value: 'Riverside Elementary' },
    });
    fireEvent.click(screen.getByText('Create School'));

    await waitFor(() =>
      expect(schoolLib.createSchool).toHaveBeenCalledWith({
        name: 'Riverside Elementary',
        founderUid: 'teacher-1',
        founderDisplayName: 'Ms. Lord',
        founderEmail: 'lord@example.com',
      }),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/app/school'));
  });

  it('founds a school from an NCES search result, storing its NCES metadata', async () => {
    vi.mocked(ncesLib.useNcesSchoolSearch).mockReturnValue({
      results: [
        { ncesId: '123456', name: 'Lincoln Elementary', street: '1 Main St', city: 'Lincoln', state: 'AL', zip: '35096' },
      ],
      loading: false,
    });
    vi.mocked(schoolLib.createSchool).mockResolvedValue('school-1');
    render(<CreateSchoolPage user={user} />);

    fireEvent.change(screen.getByPlaceholderText('Search for your school'), {
      target: { value: 'Lincoln' },
    });
    fireEvent.click(screen.getByText('Lincoln Elementary'));
    fireEvent.click(screen.getByText('Create School'));

    await waitFor(() =>
      expect(schoolLib.createSchool).toHaveBeenCalledWith({
        name: 'Lincoln Elementary',
        founderUid: 'teacher-1',
        founderDisplayName: 'Ms. Lord',
        founderEmail: 'lord@example.com',
        nces: { ncesId: '123456', street: '1 Main St', city: 'Lincoln', state: 'AL', zip: '35096' },
      }),
    );
  });

  it('has a back button to the classroom list', () => {
    vi.mocked(ncesLib.useNcesSchoolSearch).mockReturnValue({ results: [], loading: false });
    render(<CreateSchoolPage user={user} />);

    fireEvent.click(screen.getByLabelText('Back'));
    expect(navigateMock).toHaveBeenCalledWith('/app');
  });
});
