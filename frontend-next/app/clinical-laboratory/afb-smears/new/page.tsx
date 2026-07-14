import AfbSmearCreateForm from "@/components/clinical-laboratory/AfbSmearCreateForm";
import { Suspense } from "react";

export default function ClinicalLaboratoryAfbSmearsCreatePage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">A carregar...</div>}>
      <AfbSmearCreateForm />
    </Suspense>
  );
}
