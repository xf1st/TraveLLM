
import { AppLayout } from "@/components/app-layout"
import { Card } from "@/components/ui/card"

export default function TermsPage() {
    return (
        <AppLayout title="Условия использования" description="Правила использования сервиса TravelMind AI">
            <div className="container py-12 max-w-4xl">
                <Card className="p-8 space-y-6">
                    <h2 className="text-2xl font-bold">1. Принятие условий</h2>
                    <p>
                        Используя сервис TravelMind AI, вы соглашаетесь с данными условиями. Сервис предоставляется "как есть".
                    </p>

                    <h2 className="text-2xl font-bold">2. Ограничение ответственности</h2>
                    <p>
                        AI-ассистент предоставляет рекомендации, но не несет ответственности за актуальность цен, расписания транспорта или доступность мест. Всегда проверяйте информацию перед бронированием.
                    </p>

                    <h2 className="text-2xl font-bold">3. Использование контента</h2>
                    <p>
                        Сгенерированные маршруты предназначены для личного использования.
                    </p>
                </Card>
            </div>
        </AppLayout>
    )
}
