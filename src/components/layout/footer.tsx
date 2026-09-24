import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-[#1E2B4D] bg-[#070B19]/90 mt-12 py-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center space-x-3">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#FDB827]/40 bg-[#0D152B] p-0.5 flex items-center justify-center shrink-0">
            <Image
              src="/assets/logo.png"
              alt="República Caraquista"
              width={26}
              height={26}
              className="object-contain"
            />
          </div>
          <div>
            <div className="text-xs font-bold tracking-wider text-slate-100 uppercase">
              REPUBLICARAQUISTAPP
            </div>
            <div className="text-[11px] text-slate-400">
              Plataforma Sabermétrica de los Leones del Caracas y la LVBP
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:items-end text-xs">
          <div className="text-slate-300 font-medium flex items-center justify-center sm:justify-end gap-1.5">
            <span>Desarrollado y modelado por</span>
            <span className="font-bold text-[#FDB827]">Jorge Leonardo Loreto</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            @republicaraquista • Datos vía MLB Stats API
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-4 pt-4 border-t border-[#1E2B4D]/50 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 font-mono gap-2 text-center sm:text-left">
        <span>© 2026 Jorge Leonardo Loreto • Todos los derechos reservados</span>
        <span className="text-[#FDB827]/80">Econ. & Data Scientist • Sabermetría LVBP</span>
      </div>
    </footer>
  );
}
