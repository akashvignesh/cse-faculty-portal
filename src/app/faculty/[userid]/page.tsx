"use client";

import { useParams } from "next/navigation";
import FacultyDetailView from "@/components/faculty-detail/FacultyDetailView";

export default function FacultyDetailPage() {
  const params = useParams<{ userid: string }>();
  const userid = typeof params?.userid === "string" ? params.userid : "";

  return <FacultyDetailView userid={userid} />;
}
