import { useState } from 'react';
import type { StoreItem } from '@sprout/shared';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { createStoreItem, deleteStoreItem, updateStoreItem, useStoreItems } from '../../lib/firestore';
import { Button } from '../../components/ui/button';
import { IconButton } from '../../components/ui/icon-button';
import { Input } from '../../components/ui/input';

/** A classroom's priced item catalog — the Classroom Store Budget starter
 * lesson's decision lab. Lives on ClassroomSettingsPage (classroom-level,
 * like the roster itself); StudentDetailPane reads the same items to
 * offer "buy" shortcuts that pre-fill its ordinary spend form. Gated by
 * the caller the same way the rest of the classroom-level actions are —
 * this component itself doesn't re-check canManage, since firestore.rules
 * already allows any award-access teacher to stock the store. */
export function StoreManager({ contextId, createdByUid }: { contextId: string; createdByUid: string }) {
  const items = useStoreItems(contextId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const handleAdd = async () => {
    const trimmed = name.trim();
    const parsed = Number.parseFloat(price);
    if (!trimmed || !Number.isFinite(parsed) || parsed <= 0 || saving) return;
    setSaving(true);
    await createStoreItem({ contextId, name: trimmed, priceCents: Math.round(parsed * 100), createdByUid });
    setName('');
    setPrice('');
    setSaving(false);
    setAdding(false);
  };

  const startEditing = (item: StoreItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice((item.priceCents / 100).toFixed(2));
  };

  // "Meet a surprise" — the lesson's mid-activity price change.
  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    const parsed = Number.parseFloat(editPrice);
    if (!trimmed || !Number.isFinite(parsed) || parsed <= 0) return;
    await updateStoreItem(contextId, editingId, { name: trimmed, priceCents: Math.round(parsed * 100) });
    setEditingId(null);
  };

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-muted">Classroom Store</h2>
        {!adding && (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus size={14} /> New item
          </Button>
        )}
      </div>

      {adding && (
        <div className="mb-3 flex flex-col gap-2 rounded-lg border border-border p-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" autoFocus />
          <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" inputMode="decimal" />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving}>
              Add item
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">No items yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) =>
            editingId === item.id ? (
              <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" autoFocus />
                <Input
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  inputMode="decimal"
                  className="w-24"
                />
                <Button size="sm" onClick={saveEdit}>
                  Save
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </li>
            ) : (
              <li key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span>{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-muted">${(item.priceCents / 100).toFixed(2)}</span>
                  <IconButton label={`Edit ${item.name}`} variant="secondary" onClick={() => startEditing(item)}>
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton
                    label={`Delete ${item.name}`}
                    variant="secondary"
                    onClick={() => deleteStoreItem(contextId, item.id)}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
