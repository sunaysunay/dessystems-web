"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Cookie, X } from "lucide-react"
import { useTranslations } from "next-intl"

export function CookieConsent() {
    const [showBanner, setShowBanner] = useState(false)
    const t = useTranslations("CookieConsent")

    useEffect(() => {
        const consent = localStorage.getItem("cookie-consent")
        if (!consent) {
            const timer = setTimeout(() => setShowBanner(true), 2000)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem("cookie-consent", "accepted")
        setShowBanner(false)
        window.location.reload()
    }

    const handleDecline = () => {
        localStorage.setItem("cookie-consent", "declined")
        setShowBanner(false)
    }

    if (!showBanner) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-[400px] z-[99999]"
            >
                <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl overflow-hidden relative group">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/30 transition-colors duration-500" />
                    <div className="flex items-start gap-4 relative z-10">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Cookie className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg mb-1">{t("title")}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                                {t("description")}
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleAccept}
                                    className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex-1"
                                >
                                    {t("accept")}
                                </button>
                                <button
                                    onClick={handleDecline}
                                    className="px-5 py-2 bg-white/5 text-zinc-300 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors flex-1 border border-white/5"
                                >
                                    {t("decline")}
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowBanner(false)}
                            className="text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
