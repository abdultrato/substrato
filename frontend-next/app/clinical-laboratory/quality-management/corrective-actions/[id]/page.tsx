"use client";

import { useParams } from "next/navigation";

import { routeParamToString } from "@/lib/routeParams";
import CorrectiveActionDetail from "../_detail";

export default function Page() {
  const params = useParams();
  const id = routeParamToString((params as any)?.id);
  return <CorrectiveActionDetail id={id} />;
}
