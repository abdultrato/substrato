"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateSkillPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo Skill</h1>
        
        <AutoForm
          endpoint="/api/v1/education/skills/"
          method="post"
          submitLabel="Criar Skill"
          onSuccess={(data) => router.push(`./skills/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
