import type { AlgorithmView } from '../sim/session.ts';
import { pidColor } from '../ui/pidColor.ts';

interface RamBarProps {
  title: string;
  view: AlgorithmView;
}

/** The 100 RAM frames, colored by the process that owns each page. */
export function RamBar({ title, view }: RamBarProps) {
  const pagesById = new Map(view.pages.map((page) => [page.id, page]));

  return (
    <figure className="ram">
      <figcaption>{title}</figcaption>
      <ol className="ram-frames">
        {view.frames.map((pageId, frame) => {
          const page = pageId === null ? undefined : pagesById.get(pageId);
          const description =
            page === undefined
              ? `Frame ${frame}: free`
              : `Frame ${frame}: PID ${page.pid}, page ${page.id}, ptr ${page.ptr}`;
          return (
            <li
              key={frame}
              className="ram-frame"
              style={page === undefined ? undefined : { backgroundColor: pidColor(page.pid) }}
              title={description}
            >
              {page?.pid}
            </li>
          );
        })}
      </ol>
    </figure>
  );
}