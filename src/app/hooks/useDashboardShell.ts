import { useEffect, useRef, useState } from 'react'

/**
 * Estado e efeitos do “chrome” do dashboard: online, scroll-to-top, PWA install.
 * Sem lógica de domínio financeiro.
 */
export function useDashboardShell() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBar, setShowInstallBar] = useState(false)

  useEffect(() => {
    const onOn = () => setOnline(true)
    const onOff = () => setOnline(false)
    window.addEventListener('online', onOn)
    window.addEventListener('offline', onOff)
    return () => {
      window.removeEventListener('online', onOn)
      window.removeEventListener('offline', onOff)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 380)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const installVisitsRecorded = useRef(false)
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    if (mq.matches) return

    const onBip = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBip)

    if (!installVisitsRecorded.current) {
      installVisitsRecorded.current = true
      if (!sessionStorage.getItem('mmc_visit_bumped')) {
        sessionStorage.setItem('mmc_visit_bumped', '1')
        const dismissed = localStorage.getItem('mmc_install_dismissed') === '1'
        const prev = parseInt(localStorage.getItem('mmc_visits') ?? '0', 10)
        const visits = Number.isFinite(prev) ? prev + 1 : 1
        localStorage.setItem('mmc_visits', String(visits))
        if (visits >= 3 && !dismissed) {
          queueMicrotask(() => setShowInstallBar(true))
        }
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  const showPwaInstallChrome =
    showInstallBar &&
    installPrompt != null &&
    !window.matchMedia('(display-mode: standalone)').matches

  async function onPwaInstallClick() {
    const p = installPrompt
    if (!p) return
    await p.prompt()
    setInstallPrompt(null)
    setShowInstallBar(false)
    void p.userChoice
  }

  function dismissPwaInstall() {
    localStorage.setItem('mmc_install_dismissed', '1')
    setShowInstallBar(false)
  }

  return {
    online,
    showScrollTop,
    showPwaInstallChrome,
    onPwaInstallClick,
    dismissPwaInstall,
  }
}
