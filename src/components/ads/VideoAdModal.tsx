'use client';

import { useEffect, useRef, useState } from 'react';
import { Advertisement } from '@/types/admin';
import { advertisementService } from '@/lib/advertisement';

interface VideoAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip: () => void;
  slot?: string;
}

export default function VideoAdModal({ isOpen, onClose, onSkip, slot }: VideoAdModalProps) {
  const [advertisement, setAdvertisement] = useState<Advertisement | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoEnded, setVideoEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const DURATION = 5000; // 5 seconds in milliseconds

  // Probeer met geluid af te spelen; lukt dat niet (autoplay-blokkade), val terug op muted.
  const handleLoadedMetadata = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.muted = false;
      await video.play();
      setIsMuted(false);
    } catch {
      video.muted = true;
      setIsMuted(true);
      try {
        await video.play();
      } catch {
        // Niets meer te doen; gebruiker kan handmatig starten.
      }
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setIsMuted(next);
    if (!next) void video.play().catch(() => {});
  };

  useEffect(() => {
    if (!isOpen) return;

    // Reset bij (her)openen van de modal
    setTimeElapsed(0);
    setCanSkip(false);
    setVideoEnded(false);
    setIsMuted(false);
    setAdvertisement(null);

    const fetchAd = async () => {
      setIsLoading(true);
      try {
        const ad = await advertisementService.getRandomActive(slot);
        if (ad) {
          setAdvertisement(ad);
          await advertisementService.recordView(ad.id);
        }
      } catch {
        console.error('Failed to load advertisement');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAd();
  }, [isOpen, slot]);

  useEffect(() => {
    if (!isOpen || isLoading) return;

    // Start timer
    intervalRef.current = setInterval(() => {
      setTimeElapsed((prev) => {
        const newTime = prev + 100;
        if (newTime >= DURATION) {
          setCanSkip(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
          return DURATION;
        }
        return newTime;
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOpen, isLoading]);

  const handleSkip = async () => {
    if (advertisement) {
      try {
        await advertisementService.recordClick(advertisement.id);
      } catch {
        console.error('Failed to record click');
      }
    }
    onSkip();
  };

  // Aan het einde van de video: blur de laatste beelden en laat overslaan toe.
  const handleVideoEnded = () => {
    setVideoEnded(true);
    setCanSkip(true);
    setTimeElapsed(DURATION);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const progressPercentage = (timeElapsed / DURATION) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-black shadow-2xl overflow-hidden">
        {/* Close/Skip Button */}
        {canSkip && (
          <button
            onClick={handleSkip}
            className="absolute right-4 top-4 z-10 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            ⊗ Overslaan
          </button>
        )}

        {/* Video or Loading */}
        <div className="relative aspect-video bg-gray-900">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-emerald-600"></div>
                <p className="mt-2 text-sm text-gray-300">Advertentie laden...</p>
              </div>
            </div>
          ) : advertisement && advertisement.video_url ? (
            <>
              <video
                ref={videoRef}
                src={advertisement.video_url}
                autoPlay
                playsInline
                onLoadedMetadata={handleLoadedMetadata}
                className={`h-full w-full object-cover transition-[filter,transform] duration-700 ${videoEnded ? 'scale-105 blur-lg' : ''}`}
                onEnded={handleVideoEnded}
              />
              {/* Geluid aan/uit */}
              {!videoEnded && (
                <button
                  onClick={toggleMute}
                  className="absolute bottom-3 right-3 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                  aria-label={isMuted ? 'Geluid aanzetten' : 'Geluid uitzetten'}
                >
                  {isMuted ? (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                  ) : (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                  )}
                </button>
              )}
              {videoEnded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-xl bg-black/40 px-5 py-3 text-center backdrop-blur-sm">
                    <p className="text-sm font-semibold text-white">Advertentie afgelopen</p>
                    <p className="mt-0.5 text-xs text-gray-200">Klik op &quot;Overslaan&quot; om door te gaan</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400">Geen video beschikbaar</p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
            <div
              className="h-full bg-emerald-600 transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Ad Info */}
          {advertisement && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="font-semibold text-white text-sm">{advertisement.company_name}</p>
              <p className="text-gray-200 text-xs mt-1">{advertisement.title}</p>
            </div>
          )}
        </div>

        {/* Mobile Close Button (always visible) */}
        <button
          onClick={onClose}
          className="absolute left-4 top-4 z-10 rounded-full bg-gray-800/80 p-2 text-white hover:bg-gray-700 transition-colors md:hidden"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
