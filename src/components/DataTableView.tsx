"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

// jQuery DataTables wrapper. The library is browser-only, so it is imported
// dynamically inside the effect (never during SSR), initialised imperatively
// on the <table> ref, and destroyed on unmount. React must not re-render the
// table contents after initialisation — bump `refreshKey` to rebuild instead.

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

interface DataTableInstance {
  destroy(): void;
}

export interface DataTableViewProps {
  children: ReactNode;
  className?: string;
  config: Record<string, unknown>;
  refreshKey?: string;
  wrapperClassName?: string;
}

export default function DataTableView({
  children,
  className = "display faculty-preference-table",
  config,
  refreshKey = "",
  wrapperClassName = "faculty-preference-table-wrapper",
}: DataTableViewProps) {
  const tableRef = useRef<HTMLTableElement | null>(null);
  const instanceRef = useRef<DataTableInstance | null>(null);
  const configRef = useRef(config);

  configRef.current = config;

  useBrowserLayoutEffect(() => {
    let isActive = true;

    async function initialiseTable() {
      if (!tableRef.current) {
        return;
      }

      const DataTableModule = await import("datatables.net-dt");
      await import("datatables.net-buttons-dt");
      // @ts-expect-error side-effect plugin import without type declarations
      await import("datatables.net-buttons/js/buttons.html5");
      // @ts-expect-error side-effect plugin import without type declarations
      await import("datatables.net-buttons/js/buttons.colVis");

      const DataTable = DataTableModule.default;

      if (!isActive || !tableRef.current) {
        return;
      }

      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }

      instanceRef.current = new DataTable(
        tableRef.current,
        configRef.current
      ) as unknown as DataTableInstance;
    }

    initialiseTable();

    return () => {
      isActive = false;

      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    };
  }, [refreshKey]);

  return (
    <div className={wrapperClassName} data-datatable-refresh-key={refreshKey}>
      <table ref={tableRef} className={className}>
        {children}
      </table>
    </div>
  );
}
