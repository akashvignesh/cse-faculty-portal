import { useEffect, useLayoutEffect, useRef } from "react";

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function DataTableView({
  children,
  className = "display faculty-preference-table",
  config,
  refreshKey = "",
  wrapperClassName = "faculty-preference-table-wrapper",
}) {
  const tableRef = useRef(null);
  const instanceRef = useRef(null);
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
      await import("datatables.net-buttons/js/buttons.html5");
      await import("datatables.net-buttons/js/buttons.colVis");

      const DataTable = DataTableModule.default;

      if (!isActive || !tableRef.current) {
        return;
      }

      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }

      instanceRef.current = new DataTable(tableRef.current, configRef.current);
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
