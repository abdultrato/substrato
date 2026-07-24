"use client";

import { useParams } from "next/navigation";
import ProtocolFormPage from "../../ProtocolFormPage";

export default function RadiologyProtocolsEditPage() {
  const params = useParams();
  return <ProtocolFormPage id={String((params as { id?: string })?.id || "")} />;
}
