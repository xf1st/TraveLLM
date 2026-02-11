"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme = "system" } = useTheme()

    return (
        <Sonner
            theme={theme as ToasterProps["theme"]}
            className="toaster group"
            closeButton
            expand={false}
            visibleToasts={4}
            toastOptions={{
                duration: 4200,
                classNames: {
                    toast: "travelm-toast",
                    title: "travelm-toast-title",
                    description: "travelm-toast-description",
                    actionButton: "travelm-toast-action",
                    cancelButton: "travelm-toast-cancel",
                    closeButton: "travelm-toast-close",
                    success: "travelm-toast-success",
                    error: "travelm-toast-error",
                    warning: "travelm-toast-warning",
                    info: "travelm-toast-info",
                    loading: "travelm-toast-loading",
                },
            }}
            {...props}
        />
    )
}

export { Toaster }
