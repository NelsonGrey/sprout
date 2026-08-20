import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LessonReturnBanner } from './LessonReturnBanner';

describe('LessonReturnBanner', () => {
  it('renders nothing when there is no lesson-return context in the URL', () => {
    window.history.pushState({}, '', '/app/me');
    const { container } = render(<LessonReturnBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('links back to the exact lesson step when fromLesson/fromStep are present', () => {
    window.history.pushState({}, '', '/app/me?fromLesson=goal-trail&fromStep=2');
    render(<LessonReturnBanner />);
    const link = screen.getByText(/Build a Goal Trail/).closest('a');
    expect(link?.getAttribute('href')).toBe('/app/learn/goal-trail/run?step=2');
  });

  it('renders nothing for an unknown lesson slug', () => {
    window.history.pushState({}, '', '/app/me?fromLesson=not-real&fromStep=0');
    const { container } = render(<LessonReturnBanner />);
    expect(container.innerHTML).toBe('');
  });
});
