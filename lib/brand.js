const BRANDS = {
  cynosure: {
    theme: "cynosure",
    appName: "Cynosure MIS",
    description: "Cynosure Recycling — MIS portal",
    companyName: "Cynosure Recycling Private Limited",
    companyShort: "Cynosure Recycling Pvt. Ltd.",
    staffLabel: "Cynosure",
    emailPlaceholder: "you@cynosure.com",
    loginSubtitle: "Sign in with your Cynosure staff account to continue.",
    logoSrc: "/cynosure-logo.png",
    logoWidth: 207,
    logoHeight: 40,
    iconSrc: "/cynosure-icon.png",
    appleIconSrc: "/cynosure-apple-icon.png",
    ogImageSrc: "/cynosure-og.png",
    defaultSiteUrl: "https://cynosure.reviens.in",
  },
  lterp: {
    theme: "lterp",
    appName: "Lifecycle & Traceability ERP",
    description: "Reviens Tech — MIS portal",
    companyName: "Reviens Tech",
    companyShort: "Reviens Tech",
    staffLabel: "Reviens Tech",
    emailPlaceholder: "you@company.com",
    loginSubtitle: "Sign in with your staff account to continue.",
    logoSrc: "/brand-logo.png",
    logoWidth: 207,
    logoHeight: 56,
    iconSrc: "/brand-mark.png",
    appleIconSrc: "/brand-mark.png",
    ogImageSrc: "/lterp-og.png",
    defaultSiteUrl: "https://lterp.reviens.in",
  },
};

export function getBrand() {
  const raw = (process.env.NEXT_PUBLIC_THEME ?? process.env.THEME ?? "cynosure").trim().toLowerCase();
  return raw === "lterp" ? BRANDS.lterp : BRANDS.cynosure;
}

export const brand = getBrand();

export function pageTitle(label) {
  return `${label} — ${brand.appName}`;
}
