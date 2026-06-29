"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/* Lightweight scroll-reveal wrapper using IntersectionObserver */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const FEATURES = [
  {
    title: "Matchen op niveau",
    desc: "We koppelen je aan spelers van jouw niveau met een eerlijke ELO-rating, zodat elke wedstrijd competitief en leuk blijft.",
    accent: "from-emerald-500 to-teal-500",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    ),
  },
  {
    title: "Plan je wedstrijden",
    desc: "Deel wanneer je vrij bent en plan in een paar seconden een wedstrijd op een moment dat jullie allebei uitkomt.",
    accent: "from-sky-500 to-cyan-500",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
  },
  {
    title: "Klim in de ranglijst",
    desc: "Win wedstrijden, verdien punten en stijg in de ranking. Zie precies waar je staat ten opzichte van de concurrentie.",
    accent: "from-amber-500 to-orange-500",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 11V3a1 1 0 00-1-1H9a1 1 0 00-1 1v8m8 0H8m8 0l1 9H7l1-9"
      />
    ),
  },
  {
    title: "Chat met spelers",
    desc: "Een match gevonden? Regel de details — tijd, locatie en een beetje trash talk — in de ingebouwde chat.",
    accent: "from-rose-500 to-pink-500",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    ),
  },
  {
    title: "Bouw je netwerk op",
    desc: "Voeg de spelers waarmee het klikt toe als vrienden en bouw een vaste groep om mee te trainen en te spelen.",
    accent: "from-indigo-500 to-blue-500",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-2.5-1.35"
      />
    ),
  },
  {
    title: "Speel dichtbij",
    desc: "Ontdek tegenstanders bij jou in de buurt en filter op afstand, zodat je nooit verder reist dan je wilt.",
    accent: "from-violet-500 to-purple-500",
    icon: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
  },
];

const STEPS = [
  {
    title: "Maak je profiel aan",
    desc: "Kies je sport, stel je niveau in en vertel ons waar je speelt.",
  },
  {
    title: "Vind je match",
    desc: "Bekijk spelers bij jou in de buurt en stuur met één tik een uitnodiging.",
  },
  {
    title: "Speel & klim",
    desc: "Speel je wedstrijd, leg het resultaat vast en stijg in de ranglijst.",
  },
];

const HIGHLIGHTS = ["ELO-ranking", "Lokale spelers", "Realtime chat", "100% gratis"];

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace("/find-players");
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Laden...
      </main>
    );
  }

  if (user) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Doorsturen...
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#F4F5F4]">
      {/* Decorative background (stays fixed while scrolling) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 top-20 h-52 w-52 animate-blob rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -right-24 bottom-24 h-64 w-64 animate-blob rounded-full bg-teal-100/45 blur-3xl" style={{ animationDelay: "4s" }} />
        <div className="absolute -left-20 top-8 h-52 w-80 rounded-[999px] border border-emerald-200/60" />
        <div className="absolute -right-24 top-16 h-44 w-72 rounded-[999px] border border-emerald-200/60" />
      </div>

      {/* ===== Hero ===== */}
      <section className="relative mx-auto flex min-h-[100svh] w-full max-w-md flex-col justify-between px-3 pb-8 pt-14 sm:max-w-xl sm:justify-center sm:px-6 sm:pt-12 sm:pb-10">
        <div className="text-center">
          <h1 className="text-[46px] font-extrabold leading-[0.95] tracking-tight text-emerald-800 sm:text-[56px]">
            Welkom bij
            <span className="block">SportMatch!</span>
          </h1>

          <div className="relative mx-auto mt-5 w-full max-w-[320px] sm:mt-7 sm:max-w-[360px]">
            <div className="absolute inset-x-1 top-10 h-[68%] rounded-[50%] bg-emerald-100/85" />
            <div className="relative">
              <Image
                src="/images/landing/landingpage.png"
                alt="Illustratie van een voetballer"
                width={506}
                height={494}
                className="h-auto w-full object-contain"
                priority
              />
            </div>
          </div>

          <p className="mx-auto mt-4 max-w-[310px] text-[32px] font-bold leading-[1.08] tracking-tight text-slate-700 sm:mt-6 sm:max-w-[410px] sm:text-[36px]">
            Vind en match met lokale voetballers of teams!
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-3.5">
            <Link
              href="/login"
              className="block rounded-xl bg-emerald-500 px-4 py-2.5 text-center text-base font-semibold text-white shadow-[0_8px_20px_-12px_rgba(16,185,129,0.95)] transition-all hover:bg-emerald-600 active:scale-95"
            >
              Inloggen
            </Link>

            <Link
              href="/register"
              className="block rounded-xl border-2 border-emerald-200 bg-white px-4 py-2.5 text-center text-base font-semibold text-slate-600 transition-all hover:border-emerald-300 hover:bg-emerald-50 active:scale-95"
            >
              Account aanmaken
            </Link>
          </div>
        </div>

        {/* Scroll-down hint */}
        <button
          onClick={(e) => {
            e.preventDefault();
            const featuresSection = document.getElementById('features');
            if (featuresSection) {
              featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          aria-label="Meer informatie over SportMatch"
          className="mx-auto mt-10 flex flex-col items-center gap-1 text-emerald-600/80 transition-colors hover:text-emerald-700"
        >
          <span className="text-xs font-medium uppercase tracking-wider">Meer weten</span>
          <svg className="h-6 w-6 animate-scroll-hint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </section>

      {/* ===== Highlights strip ===== */}
      <section className="relative mx-auto max-w-5xl px-5">
        <Reveal>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {HIGHLIGHTS.map((h) => (
              <span
                key={h}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {h}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="relative mx-auto max-w-6xl scroll-mt-8 px-5 pt-20 sm:pt-28">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-2 font-semibold text-emerald-600">Functies</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-emerald-900 sm:text-4xl">
            Alles wat je nodig hebt om te spelen
          </h2>
          <p className="mt-3 text-slate-500">
            Van het vinden van een tegenstander tot het bijhouden van je voortgang — SportMatch regelt het.
          </p>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80}>
              <div className="group h-full rounded-2xl border border-emerald-50 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} text-white shadow-sm`}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {f.icon}
                  </svg>
                </div>
                <h3 className="mb-1.5 text-lg font-bold text-slate-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section className="relative mx-auto max-w-5xl px-5 pt-20 sm:pt-28">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-2 font-semibold text-emerald-600">Hoe het werkt</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-emerald-900 sm:text-4xl">
            In 3 stappen het veld op
          </h2>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 100}>
              <div className="h-full rounded-2xl border border-emerald-50 bg-gradient-to-br from-white to-emerald-50/40 p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 font-bold text-white shadow-md shadow-emerald-500/30">
                  {i + 1}
                </div>
                <h3 className="mb-1.5 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="relative mx-auto max-w-5xl px-5 pb-20 pt-20 sm:pt-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 px-6 py-14 text-center text-white shadow-xl sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <h2 className="mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Klaar om te spelen?
              </h2>
              <p className="mx-auto mb-8 max-w-md text-emerald-50/90">
                Maak een gratis account aan en vind vandaag nog je eerste tegenstander.
              </p>
              <Link
                href="/register"
                className="inline-block rounded-2xl bg-white px-8 py-3.5 font-semibold text-emerald-700 shadow-lg transition-all hover:bg-emerald-50 active:scale-95"
              >
                Maak een gratis account →
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== Footer ===== */}
      <footer className="relative border-t border-emerald-100/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
              🏆
            </span>
            <span className="font-bold text-emerald-900">SportMatch</span>
          </div>
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} SportMatch · Vind jouw sportmatch
          </p>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-slate-500 hover:text-slate-900">
              Inloggen
            </Link>
            <Link href="/register" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Registreren
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
