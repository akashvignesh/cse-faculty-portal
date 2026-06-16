// DataTables configuration factories. The configs are consumed by the jQuery
// DataTables runtime, whose option surface is too dynamic to type strictly —
// the API objects are deliberately typed loosely at this boundary.

const EXPORT_OPTIONS = {
  columns: ":visible",
  modifier: {
    search: "applied",
    order: "applied",
  },
};

const BUTTON_ICONS = {
  copy: '<span class="faculty-export-icon faculty-export-icon-copy" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3 3h8v10H3V3Zm1.5 1.5v7h5v-7h-5ZM6 0h7v10h-1.5V1.5H6V0Z"/></svg></span>',
  csv: '<span class="faculty-export-icon faculty-export-icon-file" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3 1h6l4 4v10H3V1Zm5.5 1.5v4h3.75L8.5 2.5ZM5 9h6v1.2H5V9Zm0 2.2h6v1.2H5v-1.2Z"/></svg></span>',
  print:
    '<span class="faculty-export-icon faculty-export-icon-print" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M4 1h8v4H4V1Zm1.5 1.5v1h5v-1h-5ZM2 6h12a1 1 0 0 1 1 1v5h-3v3H4v-3H1V7a1 1 0 0 1 1-1Zm3.5 5.5v2h5v-2h-5ZM12.5 8a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"/></svg></span>',
  columns:
    '<span class="faculty-export-icon faculty-export-icon-columns" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M2 3h12v10H2V3Zm1.5 1.5v7h2.25v-7H3.5Zm3.5 0v7h2v-7H7Zm3.25 0v7h2.25v-7h-2.25Z"/></svg></span><span class="faculty-export-caret" aria-hidden="true">v</span>',
};

function printDataTable(dataTableApi: any): void {
  if (typeof window === "undefined") {
    return;
  }

  const tableNode = dataTableApi?.table?.().node?.();

  if (!tableNode) {
    window.print();
    return;
  }

  const printStage = document.createElement("div");
  const tableClone = tableNode.cloneNode(true) as HTMLElement;

  printStage.className = "faculty-print-stage";
  tableClone.classList.add("faculty-print-table");
  tableClone.removeAttribute("style");
  printStage.appendChild(tableClone);

  function cleanupPrintTarget() {
    document.body.classList.remove("faculty-print-datatable-only");
    printStage.remove();
    window.removeEventListener("afterprint", cleanupPrintTarget);
  }

  document.body.classList.add("faculty-print-datatable-only");
  document.body.appendChild(printStage);
  window.addEventListener("afterprint", cleanupPrintTarget);
  window.setTimeout(() => window.print(), 0);
}

export function createFacultyTableConfig(): Record<string, any> {
  return {
    destroy: true,
    paging: true,
    searching: true,
    ordering: true,
    info: true,
    autoWidth: false,
    pageLength: 10,
    lengthMenu: [10, 25, 50, 100],
    // Sort by the Name column (index 1); Person Number is the first column.
    order: [[1, "asc"]],
    layout: {
      topStart: {
        className: "faculty-datatable-toolbar faculty-datatable-toolbar-left",
        features: ["pageLength"],
      },
      topEnd: {
        className: "faculty-datatable-toolbar faculty-datatable-toolbar-right",
        features: [
          "search",
          {
            buttons: [
              {
                extend: "copyHtml5",
                text: BUTTON_ICONS.copy,
                titleAttr: "Copy table data",
                className: "faculty-export-button faculty-export-button-copy",
                exportOptions: EXPORT_OPTIONS,
              },
              {
                extend: "csvHtml5",
                text: BUTTON_ICONS.csv,
                titleAttr: "Download CSV",
                className: "faculty-export-button faculty-export-button-csv",
                filename: "cse-faculty-roster",
                title: "CSE Faculty Roster",
                exportOptions: EXPORT_OPTIONS,
              },
              {
                text: BUTTON_ICONS.print,
                titleAttr: "Print or save as PDF",
                className: "faculty-export-button faculty-export-button-print",
                action: function (_event: any, dataTableApi: any) {
                  printDataTable(dataTableApi);
                },
              },
              {
                extend: "colvis",
                text: BUTTON_ICONS.columns,
                titleAttr: "Show or hide columns",
                className: "faculty-export-button faculty-export-button-columns",
                align: "button-right",
                collectionLayout: "faculty-column-menu",
                columns: ":not(:first-child)",
              },
            ],
          },
        ],
      },
      bottomStart: "info",
      bottomEnd: "paging",
    },
    language: {
      search: "Search:",
      lengthMenu: "_MENU_ entries per page",
      info: "Showing _START_ to _END_ of _TOTAL_ faculty records",
      infoEmpty: "No faculty members available",
      emptyTable: "No faculty members available",
      zeroRecords: "No matching faculty members found",
      paginate: {
        previous: "<",
        next: ">",
      },
    },
  };
}

export interface FacultyDetailTableConfigOptions {
  filename?: string;
  title?: string;
  order?: [number, "asc" | "desc"][];
  showButtons?: boolean;
  showColumnVisibility?: boolean;
}

export function createFacultyDetailTableConfig({
  filename = "faculty-detail-table",
  title = "Faculty Detail",
  order = [[0, "asc"]],
  showButtons = true,
  showColumnVisibility = true,
}: FacultyDetailTableConfigOptions = {}): Record<string, any> {
  const topEndFeatures: any[] = ["search"];

  if (showButtons) {
    const buttons: any[] = [
      {
        extend: "copyHtml5",
        text: BUTTON_ICONS.copy,
        titleAttr: "Copy table data",
        className: "faculty-export-button faculty-export-button-copy",
        exportOptions: EXPORT_OPTIONS,
      },
      {
        extend: "csvHtml5",
        text: BUTTON_ICONS.csv,
        titleAttr: "Download CSV",
        className: "faculty-export-button faculty-export-button-csv",
        filename,
        title,
        exportOptions: EXPORT_OPTIONS,
      },
      {
        text: BUTTON_ICONS.print,
        titleAttr: "Print or save as PDF",
        className: "faculty-export-button faculty-export-button-print",
        action: function (_event: any, dataTableApi: any) {
          printDataTable(dataTableApi);
        },
      },
    ];

    if (showColumnVisibility) {
      buttons.push({
        extend: "colvis",
        text: BUTTON_ICONS.columns,
        titleAttr: "Show or hide columns",
        className: "faculty-export-button faculty-export-button-columns",
        align: "button-right",
        collectionLayout: "faculty-column-menu",
        columns: ":not(:first-child)",
      });
    }

    topEndFeatures.push({ buttons });
  }

  return {
    destroy: true,
    paging: true,
    searching: true,
    ordering: true,
    info: true,
    autoWidth: false,
    pageLength: 5,
    lengthMenu: [5, 10, 25, 50],
    order,
    layout: {
      topStart: {
        className: "faculty-datatable-toolbar faculty-datatable-toolbar-left",
        features: ["pageLength"],
      },
      topEnd: {
        className: "faculty-datatable-toolbar faculty-datatable-toolbar-right",
        features: topEndFeatures,
      },
      bottomStart: "info",
      bottomEnd: "paging",
    },
    language: {
      search: "Search:",
      lengthMenu: "_MENU_ entries per page",
      info: "Showing _START_ to _END_ of _TOTAL_ records",
      infoEmpty: "No records available",
      emptyTable: "No records available",
      zeroRecords: "No matching records found",
      paginate: {
        previous: "<",
        next: ">",
      },
    },
  };
}
