"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { NotiCuevaPost } from "@/types/noticueva";
import { FormattedContent } from "./formatted-content";
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
  Bold,
  Italic,
  Underline,
  Heading3,
  List,
  Quote,
  Minus,
  Eye,
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
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  /**
   * Inserta o envuelve texto seleccionado con formato Markdown / HTML-lite
   */
  const insertFormat = (
    prefix: string,
    suffix: string = "",
    placeholder: string = "texto"
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = content;
    const selectedText = currentVal.substring(start, end);

    let newText = "";
    let newCursorStart = start;
    let newCursorEnd = end;

    if (selectedText.length > 0) {
      newText =
        currentVal.substring(0, start) +
        prefix +
        selectedText +
        suffix +
        currentVal.substring(end);
      newCursorStart = start + prefix.length;
      newCursorEnd = newCursorStart + selectedText.length;
    } else {
      const insertVal = placeholder ? `${prefix}${placeholder}${suffix}` : prefix;
      newText =
        currentVal.substring(0, start) +
        insertVal +
        currentVal.substring(end);
      newCursorStart = start + prefix.length;
      newCursorEnd = placeholder ? newCursorStart + placeholder.length : newCursorStart;
    }

    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 20);
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
      const targetImage = imageUrl.trim() || "/assets/logo.png";

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
            imageUrl: targetImage,
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
            imageUrl: targetImage,
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
    setImageUrl(p.imageUrl === "/assets/logo.png" ? "" : (p.imageUrl || ""));
    setEditorTab("write");
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
    setEditorTab("write");
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
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300 flex items-center justify-between">
              <span className="flex items-center space-x-1.5 font-bold">
                <ImageIcon className="w-3.5 h-3.5 text-[#FDB827]" />
                <span>Foto de Portada (Opcional - Enlace URL):</span>
              </span>
              <span className="text-[10px] text-[#FDB827]/90 font-mono">
                {imageUrl.trim() ? "Foto personalizada activa" : "Logo oficial Caraquista por defecto"}
              </span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://ejemplo.com/foto-jugador.jpg (o déjalo en blanco)"
                className="w-full pl-4 pr-28 py-2 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FDB827]/70 text-xs font-mono"
              />
              {!imageUrl.trim() && (
                <div className="absolute right-2 top-1.5 px-2 py-0.5 rounded-md bg-[#131E3D] border border-[#FDB827]/30 text-[10px] text-[#FDB827] font-mono pointer-events-none">
                  Logo Oficial
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              💡 Si no colocas una foto, se publicará automáticamente con el logo oficial de República Caraquista.
            </p>
          </div>

          {/* Cuerpo de la Nota con Toolbar y Vista Previa */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono text-slate-300 font-bold">
                Contenido de la Nota: <span className="text-rose-400">*</span>
              </label>

              {/* Selector Escribir / Vista Previa */}
              <div className="flex items-center p-0.5 rounded-lg bg-[#070B19] border border-[#1E2B4D]">
                <button
                  type="button"
                  onClick={() => setEditorTab("write")}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                    editorTab === "write"
                      ? "bg-[#131E3D] text-[#FDB827] font-bold shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Escribir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab("preview")}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                    editorTab === "preview"
                      ? "bg-[#131E3D] text-[#FDB827] font-bold shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Vista Previa</span>
                </button>
              </div>
            </div>

            {editorTab === "write" ? (
              <div className="rounded-xl border border-[#1E2B4D] bg-[#070B19] overflow-hidden focus-within:border-[#FDB827]/70 transition-colors">
                {/* Barra de Herramientas de Formato */}
                <div className="flex flex-wrap items-center gap-1 p-2 bg-[#0D152B] border-b border-[#1E2B4D] text-slate-300">
                  <button
                    type="button"
                    onClick={() => insertFormat("**", "**", "texto en negrita")}
                    title="Negrita (**texto**)"
                    className="p-1.5 rounded-lg hover:bg-[#1E2B4D] hover:text-[#FDB827] text-slate-300 transition-colors flex items-center gap-1 text-xs font-bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline font-mono text-[11px]">Negrita</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => insertFormat("*", "*", "texto en cursiva")}
                    title="Cursiva (*texto*)"
                    className="p-1.5 rounded-lg hover:bg-[#1E2B4D] hover:text-[#FDB827] text-slate-300 transition-colors flex items-center gap-1 text-xs italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline font-mono text-[11px]">Cursiva</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => insertFormat("<u>", "</u>", "texto subrayado")}
                    title="Subrayado (<u>texto</u>)"
                    className="p-1.5 rounded-lg hover:bg-[#1E2B4D] hover:text-[#FDB827] text-slate-300 transition-colors flex items-center gap-1 text-xs underline"
                  >
                    <Underline className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline font-mono text-[11px]">Subrayado</span>
                  </button>

                  <span className="h-4 w-px bg-[#1E2B4D] mx-1" />

                  <button
                    type="button"
                    onClick={() => insertFormat("### ", "", "Subtítulo")}
                    title="Subtítulo (### Título)"
                    className="p-1.5 rounded-lg hover:bg-[#1E2B4D] hover:text-[#FDB827] text-slate-300 transition-colors flex items-center gap-1 text-xs"
                  >
                    <Heading3 className="w-3.5 h-3.5 text-[#FDB827]" />
                    <span className="hidden sm:inline font-mono text-[11px]">Subtítulo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => insertFormat("• ", "", "Novedad o elemento")}
                    title="Viñeta (• Elemento)"
                    className="p-1.5 rounded-lg hover:bg-[#1E2B4D] hover:text-[#FDB827] text-slate-300 transition-colors flex items-center gap-1 text-xs"
                  >
                    <List className="w-3.5 h-3.5 text-[#FDB827]" />
                    <span className="hidden sm:inline font-mono text-[11px]">Viñetas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => insertFormat('> "', '" — Autor', 'Declaración del dugout')}
                    title='Cita (> "Declaración")'
                    className="p-1.5 rounded-lg hover:bg-[#1E2B4D] hover:text-[#FDB827] text-slate-300 transition-colors flex items-center gap-1 text-xs"
                  >
                    <Quote className="w-3.5 h-3.5 text-[#FDB827]" />
                    <span className="hidden sm:inline font-mono text-[11px]">Cita</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => insertFormat("\n---\n", "", "")}
                    title="Línea separadora (---)"
                    className="p-1.5 rounded-lg hover:bg-[#1E2B4D] hover:text-[#FDB827] text-slate-300 transition-colors flex items-center gap-1 text-xs"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline font-mono text-[11px]">Separador</span>
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={9}
                  placeholder="Escribe aquí tu nota para la fanaticada caraquista... Puedes seleccionar texto y pulsar los botones de arriba para aplicar Negrita, Cursiva, Subrayado, etc."
                  className="w-full px-4 py-3 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-sm leading-relaxed"
                  required
                />

                <div className="px-3 py-1.5 bg-[#0D152B]/60 border-t border-[#1E2B4D]/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>
                    💡 Tip: Sombrea una palabra o frase y pulsa el botón correspondiente para formatearla.
                  </span>
                  <span>{content.length} caracteres</span>
                </div>
              </div>
            ) : (
              /* Pestaña de Vista Previa en Vivo */
              <div className="rounded-xl border border-[#1E2B4D] bg-[#070B19]/90 p-4 sm:p-5 space-y-4">
                <div className="text-[11px] font-mono text-[#FDB827] uppercase tracking-wider pb-2 border-b border-[#1E2B4D]/70 flex items-center justify-between">
                  <span>Vista Previa de Publicación</span>
                  <span>Así se verá en la NotiCueva</span>
                </div>

                {/* Portada Preview */}
                <div className="relative w-full rounded-xl overflow-hidden border border-[#1E2B4D]">
                  {!imageUrl.trim() || imageUrl.trim() === "/assets/logo.png" ? (
                    <div className="relative w-full h-36 sm:h-44 bg-gradient-to-br from-[#002D62] via-[#0D152B] to-[#070B19] flex items-center justify-center p-4">
                      <div className="relative w-24 h-24 flex items-center justify-center drop-shadow-[0_0_15px_rgba(253,184,39,0.3)]">
                        <Image
                          src="/assets/logo.png"
                          alt="República Caraquista"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <div className="absolute bottom-2 right-3 px-2 py-0.5 rounded-md bg-[#070B19]/80 border border-[#FDB827]/30 text-[10px] font-mono text-[#FDB827]">
                        Logo Oficial Caraquista
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full h-44 sm:h-52 bg-[#070B19]">
                      <Image
                        src={imageUrl.trim()}
                        alt="Portada"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                </div>

                {/* Título y Contenido Formateado */}
                <div className="space-y-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                    {title.trim() || "Título de la nota..."}
                  </h2>
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                    <span className="text-[#FDB827]">Gilberto Méndez</span>
                    <span>•</span>
                    <span>
                      {new Date().toLocaleDateString("es-VE", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="pt-2 font-sans">
                    <FormattedContent
                      content={
                        content ||
                        "El contenido que redactes aparecerá aquí con todo su formato..."
                      }
                    />
                  </div>
                </div>
              </div>
            )}
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
