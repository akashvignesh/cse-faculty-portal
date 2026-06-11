"use client";

import { useParams } from "next/navigation";
import CommitteeMatrixView from "@/components/committee-preference/CommitteeMatrixView";

export default function CommitteePreferencePage() {
  const params = useParams<{ userid: string }>();
  const userid = typeof params?.userid === "string" ? params.userid : "";

  return <CommitteeMatrixView userid={userid} />;
}
