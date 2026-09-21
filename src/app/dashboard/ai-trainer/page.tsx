"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { aiTrainerApi } from "@/lib/aiTrainerApi";
import { mountAtomPipeline, type AtomPipelineHandle } from "./engine/atomPipeline";
import "./engine/atomPipeline.css";

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap";

export default function AITrainerPage() {
  const router = useRouter();
  const { user, token, loading, logout } = useAuth();
  const mountRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<AtomPipelineHandle | null>(null);
  const userRef = useRef({ name: "", email: "" });
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  userRef.current = { name: fullName || user?.email?.split("@")[0] || "", email: user?.email || "" };

  useEffect(() => {
    if (!loading && !token) router.push("/login");
  }, [loading, token, router]);

  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_HREF;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!token || !mountRef.current) return;
    let cancelled = false;

    (async () => {
      let initialState: Record<string, unknown> | null = null;
      let saveEnabled = true;
      try {
        initialState = await aiTrainerApi.loadWorkspace(token);
      } catch (err) {
        // Don't start autosaving over a workspace we failed to read.
        saveEnabled = false;
        setLoadError(
          `Couldn't load your saved work (${err instanceof Error ? err.message : "unknown error"}). ` +
            "You can keep working, but nothing will be saved until you reload."
        );
      }
      if (cancelled || !mountRef.current) return;
      handleRef.current = mountAtomPipeline(mountRef.current, {
        initialState,
        saveEnabled,
        complete: (system, messages, maxTokens) => aiTrainerApi.complete(token, system, messages, maxTokens),
        saveState: (state) => aiTrainerApi.saveWorkspace(token, state),
        getUser: () => userRef.current,
        onHome: () => router.push("/dashboard"),
        onLogout: () => {
          logout();
          router.push("/login");
        },
      });
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
    // Mount once per session token; router/logout identities are stable enough here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // The profile can arrive after the engine mounts — redraw the top bar then.
  useEffect(() => {
    handleRef.current?.refresh();
  }, [fullName, user?.email]);

  return (
    <>
      {loadError && (
        <div style={{ background: "#FBEAE8", color: "#C4472E", padding: "10px 16px", fontSize: 13.5 }}>{loadError}</div>
      )}
      {status === "loading" && (
        <div style={{ padding: 48, textAlign: "center", color: "#7A8496", fontFamily: "Manrope, sans-serif" }}>
          Loading your workspace…
        </div>
      )}
      <div ref={mountRef} className="atom-app" />
    </>
  );
}
