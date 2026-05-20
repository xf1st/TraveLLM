"use client"

import Link from "next/link"
import { Logo } from "@/components/logo"
import { useTranslations } from "next-intl"
import { LEGAL } from "@/lib/legal"
import { cn } from "@/lib/utils"

interface FooterProps {
    className?: string
    contentClassName?: string
}

export function Footer({ className, contentClassName }: FooterProps = {}) {
    const t = useTranslations("footer")
    const tCommon = useTranslations("common")

    return (
        <footer className={cn("border-t border-white/10 bg-background/60 backdrop-blur-md md:backdrop-blur-xl mt-auto", className)}>
            <div className={cn("container px-3 sm:px-4 md:px-6 py-10 sm:py-12", contentClassName)}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
                    {/* Brand */}
                    <div className="space-y-4">
                        <Logo />
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                            {t("tagline")}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {tCommon("online")}
                            </span>
                        </div>
                    </div>

                    {/* Links */}
                    <div className="grid grid-cols-2 gap-8 md:col-span-2">
                        <div className="space-y-4">
                            <h4 className="font-semibold text-xs tracking-widest uppercase text-muted-foreground/60">{t("product")}</h4>
                            <ul className="space-y-2.5">
                                <li>
                                    <Link href="/plan" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
                                        <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                        {t("createRoute")}
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/trips" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
                                        <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                        {t("myTrips")}
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
                                        <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                        {t("profile")}
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-semibold text-xs tracking-widest uppercase text-muted-foreground/60">{t("support")}</h4>
                            <ul className="space-y-2.5">
                                <li>
                                    <Link href="https://t.me/travellm_support_bot" target="_blank" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
                                        <span className="w-1 h-1 rounded-full bg-sky-400/40 group-hover:bg-sky-400 transition-colors" />
                                        {t("telegramSupport")}
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
                                        <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                        {t("privacy")}
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
                                        <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                        {t("terms")}
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
                                        <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                        {t("cookies")}
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/personal-data-consent" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
                                        <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                        {t("personalDataConsent")}
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/contacts" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
                                        <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                        {t("contacts")}
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mb-6 rounded-2xl border border-white/5 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground/70">
                    <p className="font-semibold text-foreground/80">{t("operatorTitle")}</p>
                    <p>{LEGAL.operatorName}</p>
                    <p>{LEGAL.operatorInn} · {LEGAL.operatorOgrn}</p>
                    <p>{LEGAL.operatorAddress}</p>
                    <p>
                        <a href={`mailto:${LEGAL.privacyEmail}`} className="hover:text-muted-foreground transition-colors">
                            {LEGAL.privacyEmail}
                        </a>
                    </p>
                </div>

                <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground/50">
                    <p>© {new Date().getFullYear()} TraveLLM AI. {t("rights")}</p>
                    <p className="flex items-center gap-2">
                        <span className="flex items-center gap-1">{t("madeWith")} <span className="text-rose-400">♥</span> {t("forTravelers")}</span>
                        <span className="opacity-40">·</span>
                        <Link href="/terms#affiliate" className="hover:text-muted-foreground/80 transition-colors">{t("affiliate")}</Link>
                    </p>
                </div>
            </div>
        </footer>
    )
}
