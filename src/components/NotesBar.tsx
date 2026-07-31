import type { DesignNote } from '../physics/types';

export function NotesBar({ notes }: { notes: DesignNote[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="notes">
      {notes.map((n) => (
        <div key={n.id} className={`note note-${n.severity}`}>
          <span className="note-icon">
            {n.severity === 'error' ? '✕' : n.severity === 'warning' ? '⚠' : 'ℹ'}
          </span>
          {n.message}
        </div>
      ))}
    </div>
  );
}
