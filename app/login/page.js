import Image from "next/image";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { PO_STAGES } from "@/lib/po-constants";
import { brand } from "@/lib/brand";
import LoginForm from "./login-form";
import styles from "./login.module.css";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect("/");

  return (
    <main className={styles.page}>
      <section className={styles.aside}>
        <div className={styles.logoCard}>
          <Image src={brand.logoSrc} alt={brand.companyName} width={brand.logoWidth} height={brand.logoHeight} priority />
        </div>
        <div className={styles.pitch}>
          <h2 className={styles.headline}>Every e-waste order, tracked from registration to final report.</h2>
          <p className={styles.lead}>
            One workspace for the BD, Operations, Factory and Admin teams to move each purchase order through its
            lifecycle.
          </p>
          <ol className={styles.stages} aria-label="Order lifecycle">
            {PO_STAGES.map((stage) => (
              <li key={stage}>{stage}</li>
            ))}
          </ol>
        </div>
        <p className={styles.asideFoot}>{brand.companyName}</p>
      </section>

      <section className={styles.formSide}>
        <div className={styles.panel}>
          <div className={styles.mobileBrand}>
            <Image src={brand.logoSrc} alt={brand.companyName} width={brand.logoWidth} height={brand.logoHeight} priority />
          </div>
          <span className={styles.tag}>MIS Portal</span>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>{brand.loginSubtitle}</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
