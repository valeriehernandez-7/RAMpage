import { useEffect, useRef, type CSSProperties } from 'react';
import type { AlgorithmView } from '../sim/session.ts';
import { pidColor } from '../ui/pidColor.ts';

interface MmuTableProps {
  view: AlgorithmView;
  /** Scroll to the page used by the last operation; off while playing to avoid jumpy scrolling. */
  followActivity: boolean;
}

const COLUMNS = ['PAGE ID', 'PID', 'LOADED', 'L-ADDR', 'M-ADDR', 'D-ADDR', 'LOADED-T', 'MARK'] as const;

/** Every live page of one simulation, with the columns of Annex 2. */
export function MmuTable({ view, followActivity }: MmuTableProps) {
  const titleId = `mmu-title-${view.name}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const touched = new Set(view.activity.touchedPageIds);
  const evicted = new Set(view.activity.evictedPageIds);
  const firstTouchedId = view.activity.touchedPageIds.at(0);

  useEffect(() => {
    if (!followActivity || firstTouchedId === undefined) return;
    containerRef.current
      ?.querySelector(`[data-page-id="${firstTouchedId}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [followActivity, firstTouchedId]);

  return (
    <>
      <h2 id={titleId}>MMU - {view.name}</h2>
      {/* Focusable so keyboard users can scroll the table. */}
      <div ref={containerRef} className="mmu" tabIndex={0} role="region" aria-labelledby={titleId}>
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
            {view.pages.map((page) => {
              const isTouched = touched.has(page.id);
              const isEvicted = evicted.has(page.id);
              return (
                <tr
                  key={page.id}
                  data-page-id={page.id}
                  className={isTouched ? 'is-touched' : isEvicted ? 'is-evicted' : undefined}
                  style={{ '--row-color': pidColor(page.pid) } as CSSProperties}
                >
                  <td>
                    <ActivityMarker isTouched={isTouched} isEvicted={isEvicted} />
                    {page.id}
                  </td>
                  <td>{page.pid}</td>
                  <td>{page.inRam ? 'X' : ''}</td>
                  <td>{page.ptr}</td>
                  <td>{page.frame ?? ''}</td>
                  <td>{page.diskSlot ?? ''}</td>
                  <td>{page.loadedAtS === null ? '' : `${page.loadedAtS}s`}</td>
                  <td>{view.marks.get(page.id)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface ActivityMarkerProps {
  isTouched: boolean;
  isEvicted: boolean;
}

function ActivityMarker({ isTouched, isEvicted }: ActivityMarkerProps) {
  if (isTouched) return <Marker symbol="▶" description="Used by the last operation" />;
  if (isEvicted) return <Marker symbol="↓" description="Moved to disk by the last operation" />;
  return null;
}

function Marker({ symbol, description }: { symbol: string; description: string }) {
  return (
    <>
      <span className="marker" aria-hidden="true">
        {symbol}
      </span>
      <span className="visually-hidden">{description}: </span>
    </>
  );
}
