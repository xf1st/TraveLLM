import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function AuthCodeError() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
            <div className="mb-4 rounded-full bg-destructive/10 p-3 text-destructive">
                <AlertCircle className="h-10 w-10" />
            </div>
            <h1 className="mb-2 text-2xl font-bold">Ошибка авторизации</h1>
            <p className="mb-6 max-w-md text-muted-foreground">
                Не удалось завершить вход в систему. Возможно, ссылка устарела или произошла ошибка на сервере.
            </p>
            <div className="flex gap-4">
                <Button asChild>
                    <Link href="/auth">Попробовать снова</Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/">На главную</Link>
                </Button>
            </div>
        </div>
    )
}
