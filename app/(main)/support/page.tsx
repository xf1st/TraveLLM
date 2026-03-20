
import { AppLayout } from "@/components/app-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MessageSquare } from "lucide-react"

export default function SupportPage() {
    return (
        <AppLayout title="Центр поддержки" description="Мы всегда готовы помочь">
            <div className="container py-12 max-w-4xl">
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="p-6 space-y-4">
                        <h3 className="text-xl font-bold">Связаться с нами</h3>
                        <p className="text-muted-foreground">
                            Лучший способ получить оперативную помощь — написать нам в Telegram.
                        </p>
                        <Button asChild className="w-full">
                            <Link href="https://t.me/myszf" target="_blank">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Написать в Telegram @myszf
                            </Link>
                        </Button>
                    </Card>

                    <Card className="p-6 space-y-4">
                        <h3 className="text-xl font-bold">Частые вопросы</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-sm">Маршрут не генерируется?</h4>
                                <p className="text-sm text-muted-foreground">Попробуйте изменить параметры (бюджет или направление) и повторить попытку.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">Как сохранить маршрут?</h4>
                                <p className="text-sm text-muted-foreground">Маршруты сохраняются автоматически в разделе "Мои поездки" для авторизованных пользователей.</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    )
}
