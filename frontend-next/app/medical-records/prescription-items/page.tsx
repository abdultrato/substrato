"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MedicalRecordsPrescriptionItemsListPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/medical-records/prescriptions/"); }, [router]);
  return null;
}
