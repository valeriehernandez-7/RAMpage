import type { CSSProperties } from 'react';
import type { AlgorithmView } from '../sim/session.ts';
import { pidColor } from '../ui/pidColor.ts';

interface MmuTableProps {
  view: AlgorithmView;
}

const COLUMNS = ['PAGE ID', 'PID', 'LOADED', 'L-ADDR', 'M-ADDR', 'D-ADDR', 'LOADED-T', 'MARK'] as const;

/** Every live page of one simulation, with the columns of Annex 2. */
export function MmuTable({ view }: MmuTableProps) {
  const titleId = `mmu-title-${view.name}`;

  return (
    <>
      <h2 id={titleId}>MMU - {view.name}</h2>
      {/* Focusable so keyboard users can scroll the table. */}
      <div className="mmu" tabIndex={0} role="region" aria-labelledby={titleId}>
        <table aria-labelledby={titleId}>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.pages.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="empty">
                  No pages in memory
                </td>
              </tr>
            )}
            {view.pages.map((page) => (
              <tr key={page.id} style={{ '--row-color': pidColor(page.pid) } as CSSProperties}>
                <td>{page.id}</td>
                <td>{page.pid}</td>
                <td>{page.inRam ? 'X' : ''}</td>
                <td>{page.ptr}</td>
                <td>{page.frame ?? ''}</td>
                <td>{page.diskSlot ?? ''}</td>
                <td>{page.loadedAtS === null ? '' : `${page.loadedAtS}s`}</td>
                <td>{view.marks.get(page.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}