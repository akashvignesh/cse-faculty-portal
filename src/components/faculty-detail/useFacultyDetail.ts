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
        if (!isActive) return;
        setFaculty(record);

        // Background prefetch: once the core profile is painted, pull the lazy
        // tab sections in parallel (non-blocking, fail-soft) so opening a tab is
        // instant. We mark each section fetched up front so a later tab click
        // won't double-fetch; on failure we unmark it so the click can retry.
        const id = record.userid || record.personNumber;
        const merge = (patch: Partial<Faculty>) =>
          isActive && setFaculty((current) => (current ? { ...current, ...patch } : current));

        if (record.teachingHistory.rows.length === 0) {
          fetchedSections.current.add("teaching-history");
          void fetchTeachingHistory(id)
            .then((teachingHistory) => merge({ teachingHistory }))
            .catch(() => fetchedSections.current.delete("teaching-history"));
        }
        if (record.committees.length === 0) {
          fetchedSections.current.add("committees");
          void fetchCommitteeMemberships(record.userid || id)
            .then((committees) => merge({ committees }))
            .catch(() => fetchedSections.current.delete("committees"));
        }
        if (record.coursePreferences.length === 0) {
          fetchedSections.current.add("course-preferences");
          void fetchCoursePreferences(id)
            .then((coursePreferences) => merge({ coursePreferences }))
            .catch(() => fetchedSections.current.delete("course-preferences"));
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
