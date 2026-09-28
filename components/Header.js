"use client";

import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { titleForPath } from "@/lib/nav";
import Icon from "./Icon";
import styles from "./Header.module.css";

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export default function Header({ user, onMenu }) {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button type="button" className={styles.menu} onClick={onMenu} aria-label="Open navigation">
          <Icon name="menu" size={22} />
        </button>
        <div className={styles.title}>{titleForPath(pathname)}</div>
      </div>
      <div className={styles.right}>
        <div className={styles.user}>
          <div className={styles.avatar} aria-hidden="true">
            {initials(user.name)}
          </div>
          <div className={styles.who}>
            <div className={styles.name}>{user.name}</div>
            <div className={styles.role}>{user.role}</div>
          </div>
        </div>
        <form action={logout}>
          <button type="submit" className={styles.logout} aria-label="Sign out">
            <Icon name="logout" size={18} />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
