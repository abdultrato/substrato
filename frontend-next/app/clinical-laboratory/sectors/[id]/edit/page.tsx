"use client";

import { useParams } from "next/navigation";

import { routeParamToString } from "@/lib/routeParams";
import SectorForm from "../../_form";

export default function Page() {
  const params = useParams();
  const id = routeParamToString((params as any)?.id);
  return <SectorForm id={id} />;
}
