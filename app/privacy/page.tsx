
import { AppLayout } from "@/components/app-layout"
import { Card } from "@/components/ui/card"

export default function PrivacyPage() {
    return (
        <AppLayout title="Политика конфиденциальности" description="Как мы обрабатываем ваши данные">
            <div className="container py-12 max-w-4xl">
                <Card className="p-8 space-y-6">
                    <h2 className="text-2xl font-bold">1. Сбор данных</h2>
                    <p>
                        Мы собираем только те данные, которые необходимы для функционирования сервиса: ваш email (для аутентификации) и предпочтения по путешествиям.
                    </p>

                    <h2 className="text-2xl font-bold">2. Использование данных</h2>
                    <p>
                        Ваши данные используются исключительно для генерации персонализированных маршрутов с помощью AI. Мы не передаем их третьим лицам.
                    </p>

                    <h2 className="text-2xl font-bold">3. Хранение</h2>
                    <p>
                        Данные хранятся в защищенной базе данных Supabase. Вы можете запросить полное удаление ваших данных в любой момент, связавшись с поддержкой.
                    </p>
                </Card>
            </div>
        </AppLayout>
    )
}
