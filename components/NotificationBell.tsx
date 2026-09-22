'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getInAppNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  InAppNotification,
} from '@/app/actions/notificationActions'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface NotificationBellProps {
  className?: string
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const fetchNotifications = async () => {
    try {
      const res = await getInAppNotificationsAction()
      if (res.success) {
        setNotifications(res.notifications)
        setUnreadCount(res.unreadCount)
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }

  // Update browser tab title with unread count
  useEffect(() => {
    if (typeof document === 'undefined') return
    const originalTitle = document.title.replace(/^\(\d+\+?\)\s*/, '')
    if (unreadCount > 0) {
      document.title = `(${unreadCount > 9 ? '9+' : unreadCount}) ${originalTitle}`
    } else {
      document.title = originalTitle
    }
  }, [unreadCount])

  useEffect(() => {
    fetchNotifications()

    // Real-time listener for instant notification updates
    const channel = supabase
      .channel('in-app-notification-bell')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'oil_notifications' },
        (payload) => {
          fetchNotifications()
          if (payload.eventType === 'INSERT' && payload.new) {
            const newNotif = payload.new as InAppNotification
            const icon = newNotif.type === 'critical' ? '🚨' : newNotif.type === 'warning' ? '⚠️' : newNotif.type === 'success' ? '🧪' : '🔔'
            toast(
              (t) => (
                <div
                  className="flex items-start gap-3 cursor-pointer select-none"
                  onClick={() => {
                    toast.dismiss(t.id)
                    if (newNotif.link_url) window.location.href = newNotif.link_url
                  }}
                >
                  <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 tracking-tight">{newNotif.title}</p>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">{newNotif.message}</p>
                    <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider text-orange-600">
                      Klik untuk melihat detail →
                    </span>
                  </div>
                </div>
              ),
              {
                duration: 6000,
                position: 'top-right',
                style: {
                  borderRadius: '20px',
                  background: '#ffffff',
                  boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.15)',
                  border: '1px solid #e2e8f0',
                  padding: '14px 18px',
                  maxWidth: '380px',
                },
              }
            )
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'oil_audit_logs' },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
    await markNotificationAsReadAction(id)
  }

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    await markAllNotificationsAsReadAction()
  }

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    if (minutes < 1) return 'Baru saja'
    if (minutes < 60) return `${minutes} menit lalu`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} jam lalu`
    const days = Math.floor(hours / 24)
    return `${days} hari lalu`
  }

  const getTypeIcon = (type: InAppNotification['type']) => {
    switch (type) {
      case 'success':
        return '🧪'
      case 'warning':
        return '⚠️'
      case 'critical':
        return '🚨'
      default:
        return '📬'
    }
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Buka notifikasi"
        className="relative p-2.5 rounded-2xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 active:scale-95"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white shadow-2xl border border-slate-100 z-[200] overflow-hidden animate-pop-micro">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Notifikasi</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700">
                  {unreadCount} Baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-orange-600 hover:text-orange-700 transition-colors"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 text-lg">
                  🔔
                </div>
                <p className="text-xs font-bold text-slate-600">Belum ada notifikasi baru</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Semua pemberitahuan hasil uji lab dan penawaran akan muncul di sini.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif.id)}
                  className={`p-4 flex gap-3 transition-colors hover:bg-slate-50 cursor-pointer ${
                    !notif.is_read ? 'bg-orange-50/20' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-sm shrink-0 shadow-sm">
                    {getTypeIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-slate-800 truncate">
                        {notif.title}
                      </p>
                      <span className="text-[9px] text-slate-400 font-semibold shrink-0">
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    {notif.link_url && (
                      <Link
                        href={notif.link_url}
                        className="inline-block mt-2 text-[10px] font-extrabold text-orange-600 hover:text-orange-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsRead(notif.id)
                          setIsOpen(false)
                        }}
                      >
                        Lihat Selengkapnya →
                      </Link>
                    )}
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              OilTrack Live Alert Center
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
