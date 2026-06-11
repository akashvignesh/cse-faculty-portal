"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCommitteeMemberships,
  fetchCoursePreferences,
  fetchFacultyDetail,
  fetchTeachingHistory,
} from "@/services/faculty/facultyDetailService";
import type { Faculty } from "@/types/faculty";

export type LazySection = "teaching-history" | "committees" | "course-preferences";

export interface FacultyDetailState {
  faculty: Faculty | null;
  isLoading: boolean;
  errorMessage: string;
  notFound: boolean;
  /** Fetches a section on first tab open if the detail record lacks it. */
  ensureSection: (section: LazySection) => void;
}

export function useFacultyDetail(userid: string): FacultyDetailState {
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notFound, setNotFound] = useState(false);
  const fetchedSections = useRef<Set<LazySection>>(new Set());

  useEffect(() => {
    let isActive = true;
    fetchedSections.current = new Set();

    async function load() {
      setIsLoading(true);
      setErrorMessage("");
      setNotFound(false);
      setFaculty(null);

      try {
        const record = await fetchFacultyDetail(userid);
        if (isActive) {
          setFaculty(record);
        }
      } catch (error) {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : "Unknown error.";
        if (/not found/i.test(message)) {
          setNotFound(true);
        } else {
          setErrorMessage(`Unable to load faculty data. ${message}`);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    if (userid) {
      load();
    }

    return () => {
      isActive = false;
    };
  }, [userid]);

  const ensureSection = useCallback(
    (section: LazySection) => {
      if (!faculty || fetchedSections.current.has(section)) {
        return;
      }

      const needsFetch =
        (section === "teaching-history" && faculty.teachingHistory.rows.length === 0) ||
        (section === "committees" && faculty.committees.length === 0) ||
        (section === "course-preferences" && faculty.coursePreferences.length === 0);

      if (!needsFetch) {
        fetchedSections.current.add(section);
        return;
      }

      fetchedSections.current.add(section);
      const id = faculty.userid || faculty.personNumber;

      (async () => {
        try {
          if (section === "teaching-history") {
            const teachingHistory = await fetchTeachingHistory(id);
            setFaculty((current) => (current ? { ...current, teachingHistory } : current));
          } else if (section === "committees") {
            const committees = await fetchCommitteeMemberships(faculty.userid || id);
            setFaculty((current) => (current ? { ...current, committees } : current));
          } else {
            const coursePreferences = await fetchCoursePreferences(id);
            setFaculty((current) => (current ? { ...current, coursePreferences } : current));
          }
        } catch {
          // Lazy sections fail soft — the tab simply shows its empty state.
          fetchedSections.current.delete(section);
        }
      })();
    },
    [faculty]
  );

  return { faculty, isLoading, errorMessage, notFound, ensureSection };
}
