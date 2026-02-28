'use client';

import { useState, useEffect } from 'react';

// ── Small reusable pieces ────────────────────────────────────────────────

/** Circular SVG gauge for Strain score */
function StrainGauge({ value, max = 21 }: { value: number; max?: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = (value / max) * circ;
  const color = value >= 17 ? '#FF4444' : value >= 14 ? '#FFB800' : '#44D62C';
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-label={`Strain ${value}`}>
      {/* Track */}
      <circle cx="36" cy="36" r={r} fill="none" stroke="#222" strokeWidth="7" />
      {/* Progress — rotated so it starts at 12 o'clock */}
      <circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      {/* Value */}
      <text x="36" y="33" textAnchor="middle" dominantBaseline="middle"
            fill={color} fontSize="14" fontWeight="800" fontFamily="Outfit, sans-serif">
        {value}
      </text>
      <text x="36" y="47" textAnchor="middle" dominantBaseline="middle"
            fill="#666" fontSize="8" fontFamily="DM Sans, sans-serif">
        STRAIN
      </text>
    </svg>
  );
}

/** Recovery progress-bar card */
function RecoveryCard({
  name, initials, avatarColor, avatarBg, score, scoreColor,
}: {
  name: string; initials: string; avatarColor: string; avatarBg: string;
  score: number; scoreColor: string;
}) {
  return (
    <div
      className="rounded-2xl p-3 border"
      style={{ backgroundColor: `${scoreColor}12`, borderColor: `${scoreColor}28` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: avatarBg, color: avatarColor }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#F5F5F5] truncate">{name}</p>
          <p className="text-[11px] text-[#666]">Recovery Score</p>
        </div>
        <p className="text-2xl font-black" style={{ color: scoreColor }}>{score}%</p>
      </div>
      <div className="h-1.5 rounded-full bg-[#222]">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, backgroundColor: scoreColor }}
        />
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  // Navbar bg on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-reveal via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.scroll-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const AVATARS = [
    { i: 'AJ', bg: '#3b82f6' }, { i: 'SC', bg: '#8b5cf6' }, { i: 'MR', bg: '#f97316' },
    { i: 'EB', bg: '#ec4899' }, { i: 'TL', bg: '#14b8a6' }, { i: 'KP', bg: '#eab308' },
  ];

  return (
    <div className="min-h-screen bg-bg text-text font-body overflow-x-hidden">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          NAVBAR
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-bg/92 backdrop-blur-md border-b border-[#1a1a1a]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="font-display text-lg font-bold tracking-tight">
            Whoop<span className="text-green">Mate</span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features"     className="text-sm text-muted hover:text-text transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted hover:text-text transition-colors">How it works</a>
          </div>

          {/* CTA */}
          <a
            href="#signup"
            className={`bg-green text-black text-sm font-bold px-5 py-2.5 rounded-xl
              hover:bg-[#3BC427] transition-all duration-200
              ${scrolled ? 'shadow-[0_0_16px_rgba(68,214,44,0.45)] nav-cta-scrolled' : ''}`}
          >
            Start free now
          </a>
        </div>
      </nav>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="min-h-screen flex items-center pt-16 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center py-16 lg:py-24">

          {/* ── Left: Text ─────────────────────────────────────────── */}
          <div className="space-y-7">

            {/* Badge */}
            <div className="fade-in-up" style={{ animationDelay: '0ms' }}>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-green
                               bg-green/10 border border-green/20 rounded-full px-3 py-1">
                🟢 Built by Whoop members, for Whoop members
              </span>
            </div>

            {/* Headline */}
            <div className="fade-in-up" style={{ animationDelay: '100ms' }}>
              <h1
                className="font-display font-black leading-[1.05] text-text"
                style={{ fontSize: 'clamp(2.6rem, 5.5vw, 4.5rem)' }}
              >
                Your Whoop<br />
                activities feed<br />
                <span className="text-green">with your friends</span>
              </h1>
            </div>

            {/* Subtitle */}
            <p
              className="fade-in-up text-lg text-muted max-w-md leading-relaxed"
              style={{ animationDelay: '200ms' }}
            >
              <strong className="text-text font-semibold">Finally</strong> see your friends&apos;
              Strain, Recovery &amp; Sleep scores in one feed.
              Built by Whoop members, for Whoop members.
            </p>

            {/* CTA + objection killer */}
            <div className="fade-in-up space-y-3" style={{ animationDelay: '320ms' }}>
              <a
                href="#signup"
                className="inline-flex items-center gap-2.5 bg-green text-black font-bold
                           text-lg px-8 py-4 rounded-2xl
                           shadow-[0_0_28px_rgba(68,214,44,0.35)]
                           hover:shadow-[0_0_50px_rgba(68,214,44,0.55)]
                           hover:bg-[#3BC427] hover:scale-105
                           transition-all duration-250"
              >
                Start free now
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" />
                </svg>
              </a>
              <p className="text-xs text-[#4a4a4a]">
                Free forever&nbsp;•&nbsp;No credit card&nbsp;•&nbsp;Takes 30 seconds
              </p>
            </div>

            {/* Social proof avatars */}
            <div className="fade-in-up flex items-center gap-3" style={{ animationDelay: '450ms' }}>
              <div className="flex items-center">
                {AVATARS.map((a, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-bg flex items-center
                               justify-center text-[11px] font-bold text-white avatar-pop"
                    style={{
                      backgroundColor: a.bg,
                      marginLeft: i > 0 ? '-8px' : '0',
                      zIndex: 10 - i,
                      animationDelay: `${450 + i * 60}ms`,
                    }}
                  >
                    {a.i}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted">
                <span className="text-text font-semibold">100+</span> Whoop members already joined
              </p>
            </div>
          </div>

          {/* ── Right: Feed Mockup ─────────────────────────────────── */}
          <div className="fade-in-up lg:justify-self-end w-full max-w-[340px] mx-auto lg:mx-0"
               style={{ animationDelay: '150ms' }}>
            <div className="mockup-float">
              <div className="bg-surface border border-[#1e1e1e] rounded-3xl p-4
                              shadow-[0_0_80px_rgba(0,0,0,0.9),0_0_30px_rgba(68,214,44,0.05)]">

                {/* App header bar */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <span className="font-display text-sm font-bold">
                    Whoop<span className="text-green">Mate</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                    <span className="text-[11px] text-green font-medium">Live</span>
                  </div>
                </div>

                {/* Feed cards */}
                <div className="space-y-3">

                  {/* Recovery — Green */}
                  <RecoveryCard
                    name="Alex Johnson" initials="AJ"
                    avatarColor="#3b82f6" avatarBg="#1a2a40"
                    score={89} scoreColor="#44D62C"
                  />

                  {/* Strain — Amber */}
                  <div className="bg-[#1a1108] border border-[#FFB800]/20 rounded-2xl p-3 flex items-center gap-3">
                    <StrainGauge value={18.2} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-6 h-6 rounded-full bg-[#382a06] flex items-center
                                        justify-center text-[10px] font-bold text-[#FFB800]">
                          SC
                        </div>
                        <p className="text-sm font-semibold text-text truncate">Sarah Chen</p>
                      </div>
                      <p className="text-[11px] text-[#666]">Day Strain</p>
                      <p className="text-[11px] text-[#444] mt-0.5">🏋️ CrossFit AM</p>
                    </div>
                  </div>

                  {/* Sleep — Blue */}
                  <div className="bg-[#0d1520] border border-[#3b82f6]/20 rounded-2xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-[#162038] flex items-center
                                      justify-center text-xs font-bold text-[#3b82f6] flex-shrink-0">
                        MR
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text truncate">Mike Rodriguez</p>
                        <p className="text-[11px] text-[#666]">Sleep Performance</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-black text-[#3b82f6]">94%</p>
                        <p className="text-xs">😴</p>
                      </div>
                    </div>
                  </div>

                  {/* Activity blip */}
                  <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-2.5 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green/15 flex items-center justify-center text-xs flex-shrink-0">
                      🔥
                    </div>
                    <p className="text-[11px] text-muted flex-1 min-w-0">
                      <span className="text-text font-medium">Emma</span> just logged a{' '}
                      <span className="text-[#FF4444] font-bold">20.1</span> Strain
                    </p>
                    <span className="text-[10px] text-[#444] flex-shrink-0">2m</span>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PAIN POINT → SOLUTION
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 px-5 text-center scroll-reveal">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-bold text-green uppercase tracking-[0.2em] mb-5">The problem</p>
          <h2 className="font-display font-black text-4xl sm:text-5xl mb-6 leading-tight">
            Whoop is amazing.<br />
            <span className="text-[#444]">But it&apos;s lonely.</span>
          </h2>
          <p className="text-lg text-muted leading-relaxed">
            You check your Recovery every morning. Your friends do too.<br />
            But you never see each other&apos;s data — <strong className="text-text font-semibold">until now.</strong>
          </p>
          {/* Down arrow */}
          <div className="flex justify-center mt-14">
            <div className="flex flex-col items-center gap-1 opacity-30">
              <div className="w-px h-10 bg-gradient-to-b from-transparent to-green" />
              <svg width="16" height="16" viewBox="0 0 20 20" fill="#44D62C">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FEATURES
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="features" className="py-16 px-5 sm:px-8 scroll-reveal">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-14">
            <h2 className="font-display font-black text-3xl sm:text-4xl mb-3">
              Everything you&apos;ve been missing
            </h2>
            <p className="text-muted max-w-md mx-auto">
              All the social features Whoop should have built.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">

            {/* Feature 1 — Live Feed */}
            <div className="bg-surface border border-[#1e1e1e] rounded-2xl p-6
                            hover:border-green/25 transition-colors duration-300">
              <span className="text-3xl">🏋️</span>
              <h3 className="font-display text-lg font-bold mt-3 mb-2">Live Activity Feed</h3>
              <p className="text-sm text-muted leading-relaxed">
                See when your crew hits a PR, crushes a workout, or scores a 90%+ Recovery.
                Stay connected without group chats.
              </p>
              {/* Mini preview */}
              <div className="mt-5 space-y-2">
                {[
                  { e: '💪', n: 'Alex', label: 'Recovery 91%', c: '#44D62C', t: 'now' },
                  { e: '🔥', n: 'Sarah', label: 'Strain 19.3',  c: '#FFB800', t: '5m'  },
                  { e: '😴', n: 'Mike',  label: 'Sleep 94%',    c: '#3b82f6', t: '1h'  },
                ].map((row) => (
                  <div key={row.n} className="flex items-center gap-2 bg-bg rounded-xl p-2.5">
                    <span className="text-sm">{row.e}</span>
                    <p className="flex-1 text-xs text-text">
                      {row.n} &middot; <span style={{ color: row.c }}>{row.label}</span>
                    </p>
                    <span className="text-[10px] text-[#444]">{row.t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 2 — Leaderboard */}
            <div className="bg-surface border border-[#1e1e1e] rounded-2xl p-6
                            hover:border-green/25 transition-colors duration-300">
              <span className="text-3xl">🏆</span>
              <h3 className="font-display text-lg font-bold mt-3 mb-2">Friend Leaderboards</h3>
              <p className="text-sm text-muted leading-relaxed">
                Weekly Strain wars. Recovery consistency streaks. Finally, a reason to push
                harder — or recover smarter.
              </p>
              {/* Mini preview */}
              <div className="mt-5 space-y-1.5">
                {[
                  { rank: '🥇', name: 'Sarah', val: '21.4', c: '#FFB800' },
                  { rank: '🥈', name: 'Alex',  val: '18.9', c: '#9ca3af' },
                  { rank: '🥉', name: 'You',   val: '16.2', c: '#cd7f32', me: true },
                ].map((row) => (
                  <div
                    key={row.name}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                      row.me ? 'bg-green/8 border border-green/15' : 'bg-bg'
                    }`}
                  >
                    <span className="text-sm">{row.rank}</span>
                    <span className="flex-1 text-xs text-text">{row.name}</span>
                    <span className="text-xs font-bold" style={{ color: row.c }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 3 — Privacy */}
            <div className="bg-surface border border-[#1e1e1e] rounded-2xl p-6
                            hover:border-green/25 transition-colors duration-300">
              <span className="text-3xl">🔒</span>
              <h3 className="font-display text-lg font-bold mt-3 mb-2">You&apos;re in Control</h3>
              <p className="text-sm text-muted leading-relaxed">
                Share what you want, hide what you don&apos;t. Your HRV at 3am after pizza?{' '}
                <span className="text-text italic">That stays private.</span>
              </p>
              {/* Mini preview — toggle list */}
              <div className="mt-5 space-y-2">
                {[
                  { label: 'Recovery Score', on: true  },
                  { label: 'Day Strain',     on: true  },
                  { label: 'HRV (raw)',      on: false },
                  { label: 'Sleep details',  on: false },
                ].map((item) => (
                  <div key={item.label}
                       className="flex items-center justify-between bg-bg rounded-lg px-3 py-2">
                    <span className="text-xs text-muted">{item.label}</span>
                    {/* Toggle pill */}
                    <div
                      className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${
                        item.on ? 'bg-green' : 'bg-[#2a2a2a]'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${
                          item.on ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HOW IT WORKS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="how-it-works" className="py-24 px-5 sm:px-8 scroll-reveal">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-16">
            <h2 className="font-display font-black text-3xl sm:text-4xl mb-3">
              Up and running in 30 seconds
            </h2>
            <p className="text-muted">No setup. No config. Just connect and go.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 relative">
            {/* Connector line — desktop only */}
            <div className="hidden md:block absolute top-5 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px
                            bg-gradient-to-r from-green/40 via-green/15 to-green/40" />

            {[
              {
                n: '01', emoji: '🔗',
                title: 'Connect your Whoop',
                desc:  'Secure OAuth link to your Whoop account.',
                trust: '🛡 We only read, never write.',
              },
              {
                n: '02', emoji: '👥',
                title: 'Find your crew',
                desc:  'Search by username or share your invite link.',
                trust: '🏋️ Your gym buddy is probably already here.',
              },
              {
                n: '03', emoji: '📱',
                title: 'Check your feed daily',
                desc:  'Open the app, see everyone\'s scores.',
                trust: '⚡ React, compete, motivate.',
              },
            ].map((step) => (
              <div key={step.n} className="flex flex-col items-center text-center gap-4">
                {/* Number circle */}
                <div className="w-10 h-10 rounded-full bg-green text-black font-display font-black text-sm
                                flex items-center justify-center z-10 flex-shrink-0 shadow-[0_0_16px_rgba(68,214,44,0.4)]">
                  {step.n}
                </div>
                <div>
                  <div className="text-2xl mb-2">{step.emoji}</div>
                  <h3 className="font-display text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted mb-2 leading-relaxed">{step.desc}</p>
                  <p className="text-xs text-green font-medium">{step.trust}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SOCIAL PROOF
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-16 px-5 sm:px-8 scroll-reveal">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-12">
            <h2 className="font-display font-black text-3xl sm:text-4xl">What Whoop members say</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                quote: "I used to screenshot my Recovery and send it to my group chat. Now they just see it.",
                name: 'Alex M.', label: 'Whoop member since 2022', i: 'AM', bg: '#3b82f6',
              },
              {
                quote: "The Strain leaderboard with my CrossFit crew is the best thing that happened to my training.",
                name: 'Sarah C.', label: 'Whoop 4.0 user', i: 'SC', bg: '#8b5cf6',
              },
              {
                quote: "Finally an app that gets what Whoop users actually want.",
                name: 'Mike R.', label: 'Whoop member', i: 'MR', bg: '#f97316',
              },
            ].map((t) => (
              <div key={t.name} className="bg-surface border border-[#1e1e1e] rounded-2xl p-6">
                {/* Stars */}
                <div className="flex gap-0.5 mb-4" aria-label="5 stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} width="14" height="14" viewBox="0 0 20 20" fill="#44D62C">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-muted leading-relaxed mb-5 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                       style={{ backgroundColor: t.bg }}>
                    {t.i}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <span className="text-[10px] bg-green/10 text-green border border-green/20 rounded-full px-2 py-0.5 inline-block mt-0.5">
                      {t.label}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FINAL CTA
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="signup" className="py-28 px-5 scroll-reveal">
        <div className="max-w-2xl mx-auto text-center relative">

          {/* Radial glow behind */}
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                            w-[600px] h-[300px] bg-green/6 rounded-full blur-[100px]" />
          </div>

          <p className="text-xs font-bold text-green uppercase tracking-[0.2em] mb-5">
            Join the community
          </p>
          <h2 className="font-display font-black text-4xl sm:text-5xl mb-4 leading-tight">
            Your friends are already<br />sharing.{' '}
            <span className="text-[#444]">Don&apos;t miss out.</span>
          </h2>
          <p className="text-muted mb-10 text-lg">
            Join 100+ Whoop members who ditched the screenshots.
          </p>

          <a
            href="#signup"
            className="inline-flex items-center gap-3 bg-green text-black font-bold
                       text-xl px-10 py-5 rounded-2xl
                       hover:bg-[#3BC427] hover:scale-105
                       transition-all duration-250 glow-pulse"
          >
            Start free now
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" />
            </svg>
          </a>
          <p className="text-xs text-[#383838] mt-4">
            Free forever&nbsp;•&nbsp;No credit card&nbsp;•&nbsp;30 seconds to set up
          </p>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FOOTER
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="border-t border-[#141414] py-10 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">

          <div className="text-center sm:text-left">
            <p className="font-display font-bold text-base">
              Whoop<span className="text-green">Mate</span>
            </p>
            <p className="text-[11px] text-[#383838] mt-1">
              Whoop Mate is not affiliated with WHOOP Inc.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-[#444] hover:text-muted transition-colors">Privacy</a>
            <a href="#" className="text-xs text-[#444] hover:text-muted transition-colors">Terms</a>
            <a href="#" className="text-xs text-[#444] hover:text-muted transition-colors">Contact</a>
          </div>

          <p className="text-[11px] text-[#2e2e2e]">© 2025 Whoop Mate</p>

        </div>
      </footer>

    </div>
  );
}
