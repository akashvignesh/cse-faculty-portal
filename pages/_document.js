import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* jQuery */}
        <script
          src="https://code.jquery.com/jquery-3.7.1.min.js"
          integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo="
          crossOrigin="anonymous"
        />

        {/* DataTables CSS */}
        <link
          rel="stylesheet"
          href="https://cdn.datatables.net/2.0.7/css/dataTables.dataTables.min.css"
        />
        {/* DataTables Buttons CSS */}
        <link
          rel="stylesheet"
          href="https://cdn.datatables.net/buttons/3.0.2/css/buttons.dataTables.min.css"
        />
        {/* DataTables Select CSS */}
        <link
          rel="stylesheet"
          href="https://cdn.datatables.net/select/2.0.3/css/select.dataTables.min.css"
        />
        {/* DataTables Responsive CSS */}
        <link
          rel="stylesheet"
          href="https://cdn.datatables.net/responsive/3.0.2/css/responsive.dataTables.min.css"
        />
        {/* DataTables SearchPanes CSS */}
        <link
          rel="stylesheet"
          href="https://cdn.datatables.net/searchpanes/2.3.1/css/searchPanes.dataTables.min.css"
        />

        {/* DataTables JS */}
        <script
          src="https://cdn.datatables.net/2.0.7/js/dataTables.min.js"
          defer
        />
        {/* DataTables Buttons */}
        <script
          src="https://cdn.datatables.net/buttons/3.0.2/js/dataTables.buttons.min.js"
          defer
        />
        <script
          src="https://cdn.datatables.net/buttons/3.0.2/js/buttons.html5.min.js"
          defer
        />
        <script
          src="https://cdn.datatables.net/buttons/3.0.2/js/buttons.print.min.js"
          defer
        />
        {/* DataTables Select */}
        <script
          src="https://cdn.datatables.net/select/2.0.3/js/dataTables.select.min.js"
          defer
        />
        {/* DataTables Responsive */}
        <script
          src="https://cdn.datatables.net/responsive/3.0.2/js/dataTables.responsive.min.js"
          defer
        />
        {/* DataTables SearchPanes */}
        <script
          src="https://cdn.datatables.net/searchpanes/2.3.1/js/dataTables.searchPanes.min.js"
          defer
        />
        {/* JSZip for Excel export */}
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
          defer
        />
        {/* PDFMake for PDF export */}
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js"
          defer
        />
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js"
          defer
        />

        {/* Google Font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
