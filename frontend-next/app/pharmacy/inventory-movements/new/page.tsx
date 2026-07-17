"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PharmacyInventoryMovementsCreatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pharmacy/inventory-movements");
  }, [router]);

  return (
    <div className="p-4 text-sm text-muted-foreground">
      Criação manual de movimentos de stock bloqueada. A redireccionar...
    </div>
  );
}
