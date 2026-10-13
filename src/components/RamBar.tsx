import type { AlgorithmView } from '../sim/session.ts';
import { pidColor } from '../ui/pidColor.ts';
import type { Page } from '../sim/types.ts';

interface RamBarProps {
  title: string;
  view: AlgorithmView;
}

/** The 100 RAM frames, colored by the process that owns each page. */
export function RamBar({ title, view }: RamBarProps) {
  const pagesById = new Map(view.pages.map((page) => [page.id, page]));
  const touched = new Set(view.activity.touchedPageIds);

  return (
    <figure className="ram">
      <figcaption>{title}</figcaption>
      <ol className="ram-frames">
        {view.frames.map((pageId, frame) => {
          const page = pageId === null ? undefined : pagesById.get(pageId);
          const isTouched = page !== undefined && touched.has(page.id);
          return (
            <li
              key={frame}
              className={isTouched ? 'ram-frame is-touched' : 'ram-frame'}
              style={page === undefined ? undefined : { backgroundColor: pidColor(page.pid) }}
              title={describeFrame(frame, page, isTouched)}
            >
              {page?.pid}
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

function describeFrame(frame: number, page: Page | undefined, isTouched: boolean): string {
  if (page === undefined) return `Frame ${frame}: free`;
  const usage = isTouched ? ', used by the last operation' : '';
  return `Frame ${frame}: PID ${page.pid}, page ${page.id}, ptr ${page.ptr}${usage}`;
}
