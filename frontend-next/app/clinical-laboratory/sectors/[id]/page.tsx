"use client";

import { useParams } from "next/navigation";

import { routeParamToString } from "@/lib/routeParams";
import SectorDetail from "../_detail";

export default function Page() {
  const params = useParams();
  const id = routeParamToString((params as any)?.id);
  return <SectorDetail id={id} />;
}
