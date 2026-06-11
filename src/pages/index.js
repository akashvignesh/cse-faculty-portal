import Head from "next/head";
import { useEffect, useState } from "react";
import FacultyPortalHeader from "../components/FacultyPortalHeader";
import FacultyTable from "../components/FacultyTable";
import PortalFooter from "../components/PortalFooter";
import { APP_TITLE, getAppConfig } from "../config/appConfig";
import { loadFacultyRecords } from "../services/faculty/facultyService";

export default function FacultyPortalPage() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadRecords() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const config = getAppConfig();
        const nextRecords = await loadFacultyRecords({ config });

        if (!isActive) {
          return;
        }

        setRecords(nextRecords);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setRecords([]);
        setErrorMessage(
          `Unable to load faculty data. ${error instanceof Error ? error.message : "Unknown error."}`
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadRecords();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <>
      <Head>
        <title>{APP_TITLE}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="portal-page-shell">
        <div className="portal-page">
          <FacultyPortalHeader />

          <section className="portal-page-intro" aria-label="Page introduction">
            <h1 className="portal-page-title">{APP_TITLE}</h1>
          </section>

          <FacultyTable
            records={records}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />

          <PortalFooter />
        </div>
      </div>
    </>
  );
}
