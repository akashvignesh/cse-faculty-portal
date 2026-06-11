"use client";

import { useParams } from "next/navigation";
import CoursePreferenceView from "@/components/course-preference/CoursePreferenceView";

export default function CoursePreferencePage() {
  const params = useParams<{ userid: string }>();
  const userid = typeof params?.userid === "string" ? params.userid : "";

  return <CoursePreferenceView userid={userid} />;
}
