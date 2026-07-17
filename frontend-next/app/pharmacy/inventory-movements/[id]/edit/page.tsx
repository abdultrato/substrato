"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PharmacyInventoryMovementsEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = String((params as any)?.id || "");

  useEffect(() => {
    router.replace(`/pharmacy/inventory-movements/${id}`);
  }, [id, router]);

  return (
    <div className="p-4 text-sm text-muted-foreground">
      Edição de movimento de stock bloqueada. A redireccionar...
    </div>
  );
}
