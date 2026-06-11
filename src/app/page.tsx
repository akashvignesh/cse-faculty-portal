"use client";

import { useEffect, useState } from "react";
import FacultyTable from "@/components/FacultyTable";
import { APP_TITLE } from "@/config/appConfig";
import { loadFacultyRecords } from "@/services/faculty/facultyService";
import type { Faculty } from "@/types/faculty";

export default function FacultyRosterPage() {
  const [records, setRecords] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadRecords() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const nextRecords = await loadFacultyRecords();

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
      <section className="portal-page-intro" aria-label="Page introduction">
        <h1 className="portal-page-title">{APP_TITLE}</h1>
      </section>

      <FacultyTable records={records} isLoading={isLoading} errorMessage={errorMessage} />
    </>
  );
}
