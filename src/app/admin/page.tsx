import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { NotiCuevaAdmin } from "@/components/noticueva/noticueva-admin";
import { getActiveSeason } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Redacción NotiCueva • Gilberto Méndez | REPUBLICARAQUISTAPP",
  description: "Panel de administración y redacción de notas de la NotiCueva para Gilberto Méndez.",
};

export default async function AdminPage() {
  const activeSeason = await getActiveSeason();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Panel de Redacción • NotiCueva"
        subtitle="Espacio de Publicación • Gilberto Méndez"
        season={activeSeason}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        <NotiCuevaAdmin />
      </main>
    </div>
  );
}
