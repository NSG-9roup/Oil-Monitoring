/**
 * useWindowSize — SSR-safe hook untuk mendapatkan ukuran window
 * Mengembalikan nilai default yang aman saat server-side rendering
 */
import { useState, useEffect } from 'react'

interface WindowSize {
  width: number
  height: number
}

const DEFAULT_SIZE: WindowSize = { width: 1024, height: 768 }

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(DEFAULT_SIZE)

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight })
    }

    // Set nilai awal setelah mount (client-side)
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return size
}

/**
 * useChartHeight — mengembalikan tinggi chart yang responsif
 * @param sm  tinggi untuk layar < 640px (default: 200)
 * @param md  tinggi untuk layar 640-1023px (default: 250)
 * @param lg  tinggi untuk layar ≥ 1024px (default: 300)
 */
export function useChartHeight(sm = 200, md = 250, lg = 300): number {
  const { width } = useWindowSize()
  if (width < 640) return sm
  if (width < 1024) return md
  return lg
}
