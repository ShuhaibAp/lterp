"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeHref, navForRole } from "@/lib/nav";
import Icon from "./Icon";
import styles from "./Sidebar.module.css";

export default function Sidebar({ role, open, onNavigate }) {
  const pathname = usePathname();
  const items = navForRole(role);
  const current = activeHref(pathname, items);

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
      <div className={styles.brand}>
        <Image src="/cynosure-logo.png" alt="Cynosure Recycling Private Limited" width={207} height={40} priority />
        <span className={styles.portal}>MIS Portal</span>
      </div>
      <nav className={styles.nav} aria-label="Main">
        <div className={styles.menuLabel}>Workspace</div>
        {items.map((item) => {
          const active = item.href === current;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`${styles.item} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className={styles.foot}>Cynosure Recycling Pvt. Ltd.</div>
    </aside>
  );
}
