import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StoreManager } from './StoreManager';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../lib/firestore', () => ({
  useStoreItems: vi.fn(),
  createStoreItem: vi.fn(),
  updateStoreItem: vi.fn(),
  deleteStoreItem: vi.fn(),
}));

const item = {
  id: 'item-1',
  contextId: 'ctx-1',
  name: 'Pencil pouch',
  priceCents: 250,
  createdByUid: 'teacher-1',
  createdAt: new Date(),
};

describe('StoreManager', () => {
  it('shows an empty state with no items', () => {
    vi.mocked(firestoreLib.useStoreItems).mockReturnValue([]);
    render(<StoreManager contextId="ctx-1" createdByUid="teacher-1" />);

    expect(screen.getByText('No items yet.')).toBeTruthy();
  });

  it('lists items with their price', () => {
    vi.mocked(firestoreLib.useStoreItems).mockReturnValue([item]);
    render(<StoreManager contextId="ctx-1" createdByUid="teacher-1" />);

    expect(screen.getByText('Pencil pouch')).toBeTruthy();
    expect(screen.getByText('$2.50')).toBeTruthy();
  });

  it('adds a new item', async () => {
    vi.mocked(firestoreLib.useStoreItems).mockReturnValue([]);
    vi.mocked(firestoreLib.createStoreItem).mockResolvedValue(undefined);
    render(<StoreManager contextId="ctx-1" createdByUid="teacher-1" />);

    fireEvent.click(screen.getByText('New item'));
    fireEvent.change(screen.getByPlaceholderText('Item name'), { target: { value: 'Sticker sheet' } });
    fireEvent.change(screen.getByPlaceholderText('Price'), { target: { value: '1.5' } });
    fireEvent.click(screen.getByText('Add item'));

    await waitFor(() =>
      expect(firestoreLib.createStoreItem).toHaveBeenCalledWith({
        contextId: 'ctx-1',
        name: 'Sticker sheet',
        priceCents: 150,
        createdByUid: 'teacher-1',
      }),
    );
  });

  it('edits an item — the lesson\'s "meet a surprise" price change', async () => {
    vi.mocked(firestoreLib.useStoreItems).mockReturnValue([item]);
    vi.mocked(firestoreLib.updateStoreItem).mockResolvedValue(undefined);
    render(<StoreManager contextId="ctx-1" createdByUid="teacher-1" />);

    fireEvent.click(screen.getByLabelText('Edit Pencil pouch'));
    const priceInput = screen.getByDisplayValue('2.50');
    fireEvent.change(priceInput, { target: { value: '3.00' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(firestoreLib.updateStoreItem).toHaveBeenCalledWith('ctx-1', 'item-1', {
        name: 'Pencil pouch',
        priceCents: 300,
      }),
    );
  });

  it('deletes an item', () => {
    vi.mocked(firestoreLib.useStoreItems).mockReturnValue([item]);
    render(<StoreManager contextId="ctx-1" createdByUid="teacher-1" />);

    fireEvent.click(screen.getByLabelText('Delete Pencil pouch'));
    expect(firestoreLib.deleteStoreItem).toHaveBeenCalledWith('ctx-1', 'item-1');
  });
});
