"use client";

import { useEffect, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import styles from "./Shell.module.css";

// Sidebar + top bar + content. On narrow screens the sidebar becomes a drawer.
export default function Shell({ user, children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event) => event.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className={styles.shell}>
      <Sidebar role={user.role} open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {menuOpen && <div className={styles.backdrop} onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <div className={styles.column}>
        <Header user={user} onMenu={() => setMenuOpen(true)} />
        <main className={styles.main}>
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </div>
  );
}
