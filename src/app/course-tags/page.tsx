"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APP_TITLE } from "@/config/appConfig";
import {
  loadAreaTagMaster,
  loadCourseTags,
  saveCourseTags,
  type AreaTag,
  type CourseTagAssignment,
} from "@/services/courseTags/courseTagService";

interface ActiveCourse {
  subject: string;
  courseName: string;
  courseId: string;
}

export default function CourseAreaTagsPage() {
  const [courses, setCourses] = useState<ActiveCourse[]>([]);
  const [tags, setTags] = useState<AreaTag[]>([]);
  const [available, setAvailable] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [baseline, setBaseline] = useState<CourseTagAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: string }>({ text: "", type: "" });

  useEffect(() => {
    document.title = `Course Area Tags | ${APP_TITLE}`;
  }, []);

  // Load the course list + the canonical tag list once.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [coursesRes, master] = await Promise.all([
          fetch("/api/v1/courses/active", { headers: { Accept: "application/json" } }).then((r) =>
            r.json()
          ),
          loadAreaTagMaster(),
        ]);
        if (!active) return;
        if (coursesRes?.success && Array.isArray(coursesRes.data)) {
          setCourses(coursesRes.data as ActiveCourse[]);
        }
        setTags(master.tags);
        setAvailable(master.available);
      } catch {
        if (active) setAvailable(false);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSelectCourse(courseId: string) {
    setSelectedCourseId(courseId);
    setMessage({ text: "", type: "" });
    if (!courseId) {
      setSelectedTagIds([]);
      setBaseline([]);
      return;
    }
    try {
      const { available: ok, assignments } = await loadCourseTags(courseId);
      setAvailable(ok);
      setBaseline(assignments);
      setSelectedTagIds(assignments.map((a) => a.tagId));
    } catch {
      setBaseline([]);
      setSelectedTagIds([]);
    }
  }

  function toggleTag(tagId: number) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
    setMessage({ text: "", type: "" });
  }

  async function handleSave() {
    if (!selectedCourseId) return;
    if (!available) {
      setMessage({ text: "Editing requires the database backend.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const result = await saveCourseTags(selectedCourseId, selectedTagIds, baseline);
      const refreshed = await loadCourseTags(selectedCourseId);
      setBaseline(refreshed.assignments);
      setSelectedTagIds(refreshed.assignments.map((a) => a.tagId));
      setMessage({
        text: `Saved (${result.created} added, ${result.removed} removed).`,
        type: "success",
      });
    } catch (error) {
      setMessage({
        text: `Save failed — ${error instanceof Error ? error.message : "Unknown error."}`,
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  const selectedCourse = useMemo(
    () => courses.find((c) => c.courseId === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  return (
    <>
      <section className="portal-page-intro" aria-label="Page introduction">
        <h1 className="portal-page-title">{APP_TITLE}</h1>
        <nav className="portal-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">CSE Faculty Portal</Link>
          <span aria-hidden="true">&gt;</span>
          <span>Course Area Tags</span>
        </nav>
      </section>

      <div className="faculty-secondary-section">
        <div className="faculty-preference-heading">
          <h2>Course Area Tags</h2>
        </div>

        {loading ? (
          <div className="faculty-table-status" role="status">
            Loading course catalog…
          </div>
        ) : (
          <div className="course-tags-editor">
            {!available && (
              <div className="faculty-table-status" role="status">
                Editing requires the database backend (mock mode has no persistence).
              </div>
            )}

            <label className="course-tags-picker">
              <span>Course</span>
              <select
                value={selectedCourseId}
                onChange={(e) => handleSelectCourse(e.target.value)}
              >
                <option value="">Select a course…</option>
                {courses.map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    {c.subject} {c.courseName}
                  </option>
                ))}
              </select>
            </label>

            {selectedCourse && (
              <fieldset className="course-tags-fieldset" disabled={!available}>
                <legend>Area tags for {selectedCourse.subject} {selectedCourse.courseName}</legend>
                <div className="cp-role-options">
                  {tags.map((tag) => {
                    const checked = selectedTagIds.includes(tag.tagId);
                    return (
                      <label
                        key={tag.tagId}
                        className={`cp-role-option${checked ? " is-checked" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTag(tag.tagId)}
                        />
                        <span>{tag.name}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="leave-editor-actions">
                  <button
                    type="button"
                    className="cp-save-btn"
                    onClick={handleSave}
                    disabled={saving || !available}
                  >
                    {saving ? "Saving…" : "Save Tags"}
                  </button>
                  {message.text && (
                    <span
                      className={`cp-save-message cp-save-message-${message.type}`}
                      role="status"
                    >
                      {message.text}
                    </span>
                  )}
                </div>
              </fieldset>
            )}
          </div>
        )}
      </div>
    </>
  );
}
