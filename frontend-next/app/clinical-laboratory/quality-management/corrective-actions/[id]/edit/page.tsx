"use client";

import { useParams } from "next/navigation";

import { routeParamToString } from "@/lib/routeParams";
import CorrectiveActionForm from "../../_form";

export default function Page() {
  const params = useParams();
  const id = routeParamToString((params as any)?.id);
  return <CorrectiveActionForm id={id} />;
}
