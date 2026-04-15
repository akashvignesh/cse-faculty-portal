export function createFacultyTableConfig() {
  return {
    destroy: true,
    paging: true,
    searching: true,
    ordering: true,
    info: true,
    autoWidth: false,
    pageLength: 10,
    lengthMenu: [10, 25, 50],
    order: [[0, "asc"]],
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
