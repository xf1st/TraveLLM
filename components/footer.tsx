import Link from "next/link"
import { Logo } from "@/components/logo"

export function Footer() {
    return (
        <footer className="border-t border-white/10 bg-background/60 backdrop-blur-xl mt-auto">
            <div className="container px-4 md:px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
                    {/* Brand */}
                    <div className="space-y-4">
                        <Logo />
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                            Ваш персональный ИИ-гид. Планируйте путешествия без стресса — умно, быстро, персонализировано.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Онлайн
                            </span>
                        </div>
                    </div>

                    {/* Links */}
                    <div className="grid grid-cols-2 gap-8 md:col-span-2">
                        <div className="space-y-4">
                            <h4 className="font-semibold text-xs tracking-widest uppercase text-muted-foreground/60">Продукт</h4>
                            <ul className="space-y-2.5">
                                <li>
                                    <Link href="/plan" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
                                        <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                        Создать маршрут
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/results" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
                                        <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                        Мои поездки
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
                                        <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                        Профиль
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-semibold text-xs tracking-widest uppercase text-muted-foreground/60">Поддержка</h4>
                            <ul className="space-y-2.5">
                                <li>
                                    <Link href="https://t.me/travellm_support_bot" target="_blank" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
                                        <span className="w-1 h-1 rounded-full bg-sky-400/40 group-hover:bg-sky-400 transition-colors" />
                                        Telegram поддержка
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
                                        <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                        Конфиденциальность
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
                                        <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                        Условия использования
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground/50">
                    <p>© {new Date().getFullYear()} TraveLLM AI. Все права защищены.</p>
                    <p className="flex items-center gap-1">
                        Сделано с <span className="text-rose-400">♥</span> для путешественников
                    </p>
                </div>
            </div>
        </footer>
    )
}
