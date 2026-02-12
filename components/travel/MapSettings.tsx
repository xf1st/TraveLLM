"use client"

import { X, Map as MapIcon, Layers, Navigation, Globe as GlobeIcon, MapPin } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

interface MapSettingsProps {
  onClose: () => void
  settings: {
    showTraffic: boolean
    showLabels: boolean
    show3DBuildings: boolean
    showSocialLayer: boolean
    showGlobe: boolean
    mapStyle: "dark" | "satellite" | "street"
  }
  onUpdateSettings: (newSettings: any) => void
}

export function MapSettings({ onClose, settings, onUpdateSettings }: MapSettingsProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <MapIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Настройки карты</h2>
            <p className="text-sm text-white/50">Управление видом и слоями</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl border border-blue-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <GlobeIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-white">3D Глобус β</span>
                <span className="text-xs text-blue-200/70">Режим планеты</span>
              </div>
            </div>
            <Switch checked={settings.showGlobe} onCheckedChange={(c) => onUpdateSettings({ ...settings, showGlobe: c })} className="data-[state=checked]:bg-blue-500" />
          </div>

          <div className="h-px bg-white/10" />

          {!settings.showGlobe && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
              <span className="text-xs uppercase tracking-widest text-white/40 font-bold ml-1">Стиль карты</span>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "dark", label: "Тёмная", icon: MapIcon },
                  { id: "satellite", label: "Спутник", icon: Layers },
                  { id: "street", label: "Улицы", icon: Navigation },
                ].map((style: any) => (
                  <button
                    key={style.id}
                    onClick={() => onUpdateSettings({ ...settings, mapStyle: style.id })}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300 ${
                      settings.mapStyle === style.id
                        ? "bg-indigo-600/20 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                    }`}
                  >
                    <style.icon className={`w-6 h-6 ${settings.mapStyle === style.id ? "text-indigo-400" : "text-white/60"}`} />
                    <span className={`text-xs font-medium ${settings.mapStyle === style.id ? "text-white" : "text-white/60"}`}>{style.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <span className="text-xs uppercase tracking-widest text-white/40 font-bold ml-1">Слои</span>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <Navigation className="w-5 h-5 text-emerald-400" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">Трафик</span>
                  <span className="text-[10px] text-white/40">Загруженность дорог</span>
                </div>
              </div>
              <Switch checked={settings.showTraffic} onCheckedChange={(c) => onUpdateSettings({ ...settings, showTraffic: c })} />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">Соцслой POI</span>
                  <span className="text-[10px] text-white/40">Дороги, места, рестораны и достопримечательности</span>
                </div>
              </div>
              <Switch checked={settings.showSocialLayer} onCheckedChange={(c) => onUpdateSettings({ ...settings, showSocialLayer: c })} />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-blue-400" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">Подписи</span>
                  <span className="text-[10px] text-white/40">Названия мест</span>
                </div>
              </div>
              <Switch checked={settings.showLabels} onCheckedChange={(c) => onUpdateSettings({ ...settings, showLabels: c })} />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-1 bg-zinc-800 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                    <path d="M3 21h18" />
                    <path d="M5 21V7l8-4 8 4v14" />
                    <path d="M13 11v6" />
                    <path d="M9 21v-8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">3D здания</span>
                  <span className="text-[10px] text-white/40">Объёмные модели</span>
                </div>
              </div>
              <Switch checked={settings.show3DBuildings} onCheckedChange={(c) => onUpdateSettings({ ...settings, show3DBuildings: c })} />
            </div>
          </div>

          <Button onClick={onClose} className="w-full bg-white text-black hover:bg-white/90 font-bold rounded-xl h-12 mt-4">
            Готово
          </Button>
        </div>
      </div>
    </div>
  )
}
