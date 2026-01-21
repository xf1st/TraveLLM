import Link from "next/link"
import { Logo } from "@/components/logo"
import { Separator } from "@/components/ui/separator"

export function Footer() {
    return (
        <footer className="bg-muted/30 border-t py-12 mt-auto">
            <div className="container px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-4">
                        <Logo />
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Ваш персональный ИИ-гид. Планируйте, бронируйте и наслаждайтесь путешествиями без стресса.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm tracking-wider uppercase">Продукт</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/plan" className="hover:text-primary transition-colors">Создать маршрут</Link></li>
                            <li><Link href="/guide" className="hover:text-primary transition-colors">AI Гид</Link></li>
                            <li><Link href="/my-trips" className="hover:text-primary transition-colors">Мои поездки</Link></li>
                            <li><Link href="/features" className="hover:text-primary transition-colors">Возможности</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm tracking-wider uppercase">Компания</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/about" className="hover:text-primary transition-colors">О нас</Link></li>
                            <li><Link href="/blog" className="hover:text-primary transition-colors">Блог</Link></li>
                            <li><Link href="/careers" className="hover:text-primary transition-colors">Вакансии</Link></li>
                            <li><Link href="/privacy" className="hover:text-primary transition-colors">Конфиденциальность</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm tracking-wider uppercase">Поддержка</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/help" className="hover:text-primary transition-colors">Справка</Link></li>
                            <li><Link href="/contact" className="hover:text-primary transition-colors">Контакты</Link></li>
                            <li><Link href="/terms" className="hover:text-primary transition-colors">Условия использования</Link></li>
                        </ul>
                    </div>
                </div>

                <Separator className="my-8" />

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
                    <p>© {new Date().getFullYear()} TravelMind AI. Все права защищены.</p>
                    <div className="flex gap-4">
                        <Link href="#" className="hover:text-primary transition-colors">Twitter</Link>
                        <Link href="#" className="hover:text-primary transition-colors">GitHub</Link>
                        <Link href="#" className="hover:text-primary transition-colors">Discord</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
