import type { DesignNote } from '../physics/types';

/**
 * Always-rendered, fixed-height status strip: warnings appear and disappear
 * inside it without shifting the layout below. Overflow scrolls internally.
 */
export function NotesBar({ notes }: { notes: DesignNote[] }) {
  return (
    <div className="notes" role="status">
      {notes.length === 0 ? (
        <div className="note note-ok">
          <span className="note-icon">✓</span>
          All constraints satisfied — the design is self-consistent.
        </div>
      ) : (
        notes.map((n) => (
          <div key={n.id} className={`note note-${n.severity}`}>
            <span className="note-icon">
              {n.severity === 'error' ? '✕' : n.severity === 'warning' ? '⚠' : 'ℹ'}
            </span>
            {n.message}
          </div>
        ))
      )}
    </div>
  );
}
