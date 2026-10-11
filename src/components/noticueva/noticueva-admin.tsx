"use client";

import { useState, useEffect } from "react";
import { NotiCuevaPost } from "@/types/noticueva";
import {
  Lock,
  Send,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Newspaper,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";

export function NotiCuevaAdmin() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Estados del formulario de redacción
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  const [posts, setPosts] = useState<NotiCuevaPost[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Recordar sesión en sessionStorage
  useEffect(() => {
    const savedPass = sessionStorage.getItem("noticueva_admin_key");
    if (savedPass) {
      setPassword(savedPass);
      verifyLogin(savedPass);
    }
  }, []);

  const verifyLogin = async (passToTest: string) => {
    try {
      setIsLoggingIn(true);
      setAuthError("");
      const res = await fetch("/api/noticueva/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passToTest }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem("noticueva_admin_key", passToTest);
        loadPosts();
      } else {
        setIsAuthenticated(false);
        setAuthError(data.error || "Contraseña incorrecta.");
        sessionStorage.removeItem("noticueva_admin_key");
      }
    } catch {
      setAuthError("Error de conexión al verificar contraseña.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setAuthError("Por favor ingresa la contraseña.");
      return;
    }
    verifyLogin(password.trim());
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword("");
    sessionStorage.removeItem("noticueva_admin_key");
  };

  const loadPosts = async () => {
    try {
      const res = await fetch("/api/noticueva");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPosts(json.data);
      }
    } catch (err) {
      console.warn("Error al cargar posts:", err);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setFeedback({ type: "error", message: "El título y el contenido son obligatorios." });
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(null);

      if (editingPostId) {
        // Actualizar nota existente
        const res = await fetch(`/api/noticueva/${editingPostId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": password,
          },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            imageUrl: imageUrl.trim() || null,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setFeedback({ type: "success", message: "¡Nota actualizada exitosamente!" });
          resetForm();
          loadPosts();
        } else {
          setFeedback({ type: "error", message: json.error || "No se pudo actualizar la nota." });
        }
      } else {
        // Crear nueva nota
        const res = await fetch("/api/noticueva", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": password,
          },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            imageUrl: imageUrl.trim() || null,
            author: "Gilberto Méndez",
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setFeedback({ type: "success", message: "¡Nota publicada exitosamente en la NotiCueva!" });
          resetForm();
          loadPosts();
        } else {
          setFeedback({ type: "error", message: json.error || "No se pudo publicar la nota." });
        }
      }
    } catch {
      setFeedback({ type: "error", message: "Error al comunicarse con el servidor." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (p: NotiCuevaPost) => {
    setEditingPostId(p.id);
    setTitle(p.title);
    setContent(p.content);
    setImageUrl(p.imageUrl || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = async (id: string, postTitle: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la nota "${postTitle}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/noticueva/${id}?password=${encodeURIComponent(password)}`, {
        method: "DELETE",
        headers: { "x-admin-key": password },
      });
      if (res.ok) {
        setFeedback({ type: "success", message: "Nota eliminada." });
        if (editingPostId === id) resetForm();
        loadPosts();
      } else {
        setFeedback({ type: "error", message: "No se pudo eliminar la nota." });
      }
    } catch {
      setFeedback({ type: "error", message: "Error al eliminar nota." });
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setImageUrl("");
    setEditingPostId(null);
  };

  // ── Vista 1: Pantalla de Login para Gilberto Méndez ──
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#002D62] border border-[#FDB827]/40 flex items-center justify-center text-[#FDB827]">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">
            Redacción de la NotiCueva
          </h2>
          <p className="text-xs text-slate-400">
            Espacio de publicación exclusivo para <strong>Gilberto Méndez</strong>.
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 font-semibold">
              Contraseña de Redactor:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa la contraseña"
              className="w-full px-4 py-2.5 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FDB827]/70 text-sm font-mono"
              autoFocus
            />
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/50 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-2.5 rounded-xl bg-[#FDB827] hover:bg-[#FDB827]/90 text-[#070B19] font-bold text-xs uppercase tracking-wider font-mono transition-all shadow-md flex items-center justify-center space-x-1.5"
          >
            <span>{isLoggingIn ? "Verificando..." : "Entrar a Redactar"}</span>
          </button>
        </form>
      </div>
    );
  }

  // ── Vista 2: Panel de Redacción Activo ──
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Barra de Bienvenida y Logout */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#002D62] border border-[#FDB827]/50 flex items-center justify-center text-sm font-bold text-[#FDB827] shadow-sm shrink-0">
            GM
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-100">
              Panel de Redacción • NotiCueva
            </h2>
            <p className="text-xs text-[#FDB827] font-mono">
              Redactor: Gilberto Méndez
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="/noticueva"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] text-xs text-slate-300 hover:text-white transition-all flex items-center space-x-1 font-mono"
          >
            <span>Ver NotiCueva en vivo</span>
            <ExternalLink className="w-3 h-3 text-[#FDB827]" />
          </a>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-rose-400 transition-colors flex items-center space-x-1 font-mono"
          >
            <LogOut className="w-3 h-3" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs font-mono ${
            feedback.type === "success"
              ? "bg-emerald-950/70 border-emerald-700/60 text-emerald-300"
              : "bg-rose-950/70 border-rose-700/60 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Formulario de Redacción */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0D152B]/90 border border-[#1E2B4D] shadow-lg space-y-5">
        <div className="border-b border-[#1E2B4D] pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <Newspaper className="w-4 h-4 text-[#FDB827]" />
            <span>{editingPostId ? "Editar Nota" : "Escribir Nueva Nota"}</span>
          </h3>
          {editingPostId && (
            <button
              onClick={resetForm}
              className="text-xs font-mono text-slate-400 hover:text-slate-200 underline"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <form onSubmit={handlePublish} className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 font-bold">
              Título de la Nota: <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Leones define su rotación para el debut en Maracaibo"
              className="w-full px-4 py-2.5 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FDB827]/70 text-sm font-bold"
              required
            />
          </div>

          {/* Foto de Portada (Opcional) */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#FDB827]" />
                <span>Foto de Portada (Opcional - Enlace URL):</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Puedes dejarlo en blanco</span>
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://ejemplo.com/foto-jugador.jpg"
              className="w-full px-4 py-2 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FDB827]/70 text-xs font-mono"
            />
          </div>

          {/* Cuerpo de la Nota */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 font-bold">
              Contenido de la Nota: <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="Escribe aquí tu nota para la fanaticada caraquista... Puedes usar saltos de línea y párrafos libremente."
              className="w-full px-4 py-3 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FDB827]/70 text-sm leading-relaxed"
              required
            />
          </div>

          {/* Botón de Publicación */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            {editingPostId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#FDB827] hover:bg-[#FDB827]/90 text-[#070B19] font-bold text-xs uppercase tracking-wider font-mono transition-all shadow-md flex items-center space-x-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? "Guardando..."
                  : editingPostId
                  ? "Guardar Cambios"
                  : "🦁 Publicar en la NotiCueva"}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Gestor de Notas Publicadas */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0D152B]/90 border border-[#1E2B4D] shadow-lg space-y-4">
        <div className="border-b border-[#1E2B4D] pb-3">
          <h3 className="text-sm font-bold text-slate-100">
            Notas Publicadas ({posts.length})
          </h3>
          <p className="text-xs text-slate-400">
            Aquí puedes revisar, editar erratas o eliminar notas anteriores.
          </p>
        </div>

        <div className="divide-y divide-[#1E2B4D]/60">
          {posts.map((p) => (
            <div
              key={p.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#131E3D]/30 px-2 rounded-xl transition-colors"
            >
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                  {p.title}
                </h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  {new Date(p.createdAt).toLocaleDateString("es-VE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })} • {p.author}
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => handleEditClick(p)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] text-slate-300 hover:text-[#FDB827] text-xs font-mono flex items-center space-x-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => handleDeleteClick(p.id, p.title)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-mono flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
