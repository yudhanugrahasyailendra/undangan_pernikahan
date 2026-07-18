'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
type AttendanceStatus = 'hadir' | 'tidak' | 'ragu';

interface RsvpEntry {
  name: string;
  status: AttendanceStatus;
  note: string;
  timestamp: number;
}

// ── Botanical SVG Corner Ornament ──────────────────────────────────────────
function BotanicalCorner({ className }: { className: string }) {
  return (
    <svg className={`corner ${className}`} viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 10 Q40 80 20 180" />
      <path d="M20 60 Q-20 90 10 130 Q40 100 20 60" />
      <path d="M22 80 Q70 60 60 110 Q30 110 22 80" />
      <path d="M14 35 Q0 10 30 5 Q25 30 14 35 M14 35 Q30 15 45 25 Q35 45 14 35 M14 35 Q10 55 30 60 Q30 38 14 35 M14 35 Q-5 45 -5 65 Q15 55 14 35" />
      <path d="M18 110 Q-10 120 0 150 Q20 135 18 110" />
      <path d="M21 140 Q50 145 45 170 Q25 160 21 140" />
      <path d="M10 175 Q5 160 20 158 Q20 172 10 175" />
      <path d="M25 30 Q35 10 50 15 Q40 28 25 30" />
    </svg>
  );
}

// ── Full-bleed Couple Photo Overlay ─────────────────────────────────────────
function CouplePhotoOverlay() {
  return (
    <div className="photo-overlay" aria-hidden="true">
      <div className="photo-overlay-img" style={{ backgroundImage: "url('/images/gallery/gallery-1.jpeg')", backgroundPosition: 'center 30%' }} />
      <div className="photo-overlay-scrim" />
    </div>
  );
}

// ── Countdown Hook ─────────────────────────────────────────────────────────
function useCountdown(targetTs: number) {
  const [time, setTime] = useState({ d: '00', h: '00', m: '00', s: '00' });

  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const tick = () => {
      let diff = targetTs - Date.now();
      if (diff <= 0) { setTime({ d: '00', h: '00', m: '00', s: '00' }); return; }
      const d = Math.floor(diff / 86400000); diff %= 86400000;
      const h = Math.floor(diff / 3600000); diff %= 3600000;
      const mn = Math.floor(diff / 60000); diff %= 60000;
      const s = Math.floor(diff / 1000);
      setTime({ d: pad(d), h: pad(h), m: pad(mn), s: pad(s) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetTs]);

  return time;
}

// ── HTML5 Audio Music Player Hook ────────────────────────────────────────────
function useMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Buat elemen audio saat komponen di-mount
    const audio = new Audio('/music/Dewa 19 - Aku Milikmu.mp3');
    audio.loop = true;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const startMusic = useCallback((vol = 60) => {
    if (audioRef.current) {
      audioRef.current.volume = vol / 100;
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, []);

  const stopMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMusic = useCallback((vol = 60) => {
    if (isPlaying) stopMusic();
    else startMusic(vol);
  }, [isPlaying, startMusic, stopMusic]);

  const applyVolume = useCallback((val: number) => {
    if (audioRef.current) {
      audioRef.current.volume = val / 100;
    }
  }, []);

  return { isPlaying, startMusic, stopMusic, toggleMusic, applyVolume };
}

// ── RSVP Storage (localStorage) ───────────────────────────────────────────
const RSVP_KEY = 'undangan_rsvp_list';
function loadRsvpList(): RsvpEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RSVP_KEY) || '[]'); } catch { return []; }
}
function saveRsvpList(list: RsvpEntry[]) {
  localStorage.setItem(RSVP_KEY, JSON.stringify(list));
}

// ── Main Page Component ────────────────────────────────────────────────────
export default function Home() {
  // envelope / invitation state
  const [envelopeOpen, setEnvelopeOpen] = useState(false);
  const [envelopeRemoved, setEnvelopeRemoved] = useState(false);
  const [cornersBloom, setCornersBloom] = useState(false);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [playerCollapsed, setPlayerCollapsed] = useState(false);

  // RSVP state
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);
  const [rsvpMsg, setRsvpMsg] = useState('');
  const [rsvpName, setRsvpName] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<AttendanceStatus | null>(null);
  const [rsvpNote, setRsvpNote] = useState('');
  const [rsvpList, setRsvpList] = useState<RsvpEntry[]>([]);

  // volume / player UI state
  const [volume, setVolume] = useState(60);
  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef = useRef(60);
  const volIconText = isMuted || volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊';

  const { isPlaying, startMusic, toggleMusic, applyVolume } = useMusicPlayer();
  const countdown = useCountdown(new Date('2026-07-08T09:00:00+08:00').getTime());

  // load RSVP list from localStorage on mount
  useEffect(() => { setRsvpList(loadRsvpList()); }, []);

  // Scroll Animations using IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      { threshold: 0.15 }
    );

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      revealElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // Kunci scroll saat cover belum dibuka
  useEffect(() => {
    if (!envelopeOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [envelopeOpen]);
  // ── Open invitation (triggered by button click) ──
  const openInvitation = () => {
    setEnvelopeOpen(true);
    setTimeout(() => {
      setEnvelopeRemoved(true);
      window.scrollTo(0, 0);
    }, 1000); // Hapus cover dari DOM setelah animasi fade
    setTimeout(() => setCornersBloom(true), 300);
    // autoplay music after a brief delay (user gesture already happened via button)
    setTimeout(() => {
      setPlayerVisible(true);
      startMusic(volume);
      // tampilkan info lagu sebentar, lalu ciutkan jadi gambar album saja
      setTimeout(() => setPlayerCollapsed(true), 5000);
    }, 900);
  };

  // ── Toggle play/pause dari widget player; setiap kali diputar (ulang),
  // tampilkan lagi info lagu sebentar lalu ciutkan setelah 5 detik ──
  const handlePlayerToggle = () => {
    const willPlay = !isPlaying;
    toggleMusic(volume);
    if (willPlay) {
      setPlayerCollapsed(false);
      setTimeout(() => setPlayerCollapsed(true), 5000);
    }
  };

  // ── Volume helpers ──
  const handleVolumeChange = (val: number) => {
    setVolume(val);
    setIsMuted(val === 0);
    applyVolume(val);
  };
  const handleToggleMute = () => {
    if (isMuted) {
      const v = prevVolumeRef.current || 60;
      setVolume(v); setIsMuted(false); applyVolume(v);
    } else {
      prevVolumeRef.current = volume;
      setVolume(0); setIsMuted(true); applyVolume(0);
    }
  };

  // ── RSVP submit ──
  const submitRsvp = () => {
    if (!rsvpName.trim()) { alert('Mohon isi nama Anda terlebih dahulu.'); return; }
    if (!rsvpStatus) { alert('Mohon pilih status kehadiran Anda.'); return; }
    const msg =
      rsvpStatus === 'hadir' ? `Terima kasih, ${rsvpName}! Kami sangat menantikan kehadiran Anda. 🌹` :
        rsvpStatus === 'tidak' ? `Terima kasih atas konfirmasinya, ${rsvpName}. Doa Anda sangat berarti bagi kami. 🙏` :
          `Terima kasih, ${rsvpName}. Kami tunggu keputusan Anda ya! 💛`;
    const entry: RsvpEntry = {
      name: rsvpName.trim(),
      status: rsvpStatus,
      note: rsvpNote.trim(),
      timestamp: Date.now(),
    };
    const updated = [entry, ...rsvpList];
    setRsvpList(updated);
    saveRsvpList(updated);
    setRsvpMsg(msg);
    setRsvpSubmitted(true);
  };

  // ── RSVP counts ──
  const rsvpCounts = {
    hadir: rsvpList.filter(r => r.status === 'hadir').length,
    tidak: rsvpList.filter(r => r.status === 'tidak').length,
    ragu: rsvpList.filter(r => r.status === 'ragu').length,
    total: rsvpList.length,
  };

  return (
    <>
      {/* ── ENVELOPE / COVER SCREEN ── */}
      {!envelopeRemoved && (
        <div id="envelope-screen" className={envelopeOpen ? 'hidden' : ''}>
          <CouplePhotoOverlay />
          <div className="envelope-content">
            <p className="envelope-label">The Wedding of</p>
            <div className="envelope-names">
              Ilyas<br />&amp;<br />Hikmah
            </div>
            <div className="envelope-divider" />
            {/* Tombol Buka Undangan */}
            <button className="envelope-open-btn" onClick={openInvitation}>
              Buka Undangan ✦
            </button>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section id="hero">
        <CouplePhotoOverlay />
        <BotanicalCorner className={`corner-tl${cornersBloom ? ' bloomed' : ''}`} />
        <BotanicalCorner className={`corner-tr${cornersBloom ? ' bloomed' : ''}`} />
        <BotanicalCorner className={`corner-bl${cornersBloom ? ' bloomed' : ''}`} />
        <BotanicalCorner className={`corner-br${cornersBloom ? ' bloomed' : ''}`} />

        <div className="hero-inner">
          <p className="hero-eyebrow">— The Wedding Of —</p>
          <div className="hero-script">Ilyas</div>
          <br />
          <span className="hero-amp">&amp;</span>
          <br />
          <div className="hero-script">Hikmah</div>
          <div className="hero-divider" />
          <p className="hero-date">Rabu, 8 Juli 2026</p>
          <p className="hero-location" style={{ marginTop: '.6rem' }}>Pangkep, Sulawesi Selatan</p>
        </div>

        <div className="scroll-hint">
          <div className="scroll-line" />
          <span>Gulir ke bawah</span>
        </div>
      </section>

      {/* ── COUPLE ── */}
      <section id="couple">
        <div className="center reveal">
          <h2 className="section-title">Bride & Groom</h2>
          <span className="section-label">Tanpa mengurangi rasa hormat, kami bermaksud mengundang Bapak/Ibu/Saudara/I untuk menghadiri acara pernikahan kami :</span>
          <div className="gold-rule" />
        </div>

        <div className="couple-grid reveal delay-1">
          {/* Groom */}
          <div className="person">
            <div className="person-photo" style={{ padding: 0, overflow: 'hidden', width: '100%', maxWidth: '260px', height: '380px', borderRadius: '130px 130px 12px 12px', border: '4px solid var(--gold)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', margin: '0 auto 1.5rem', background: 'none' }}>
              <img src="/images/mempelai/Ilyas.jpeg" alt="Ilyas" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }} />
            </div>
            <p className="person-role">Mempelai Pria</p>
            <p className="person-name">Ilyas</p>
            <p className="person-full">Muhammad Ilyas</p>
            <p className="person-parents">Putra Ketujuh dari Alm. Bapak Abd. Latif & Ibu Nurhaedah</p>
            <a href="https://www.instagram.com/muhammadkaddi?igsh=Nm5pbGJic2FqM2xw" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none', marginTop: '0.5rem', display: 'inline-block', fontSize: '0.9rem' }}>✦ Instagram</a>
          </div>

          {/* Divider — "&" tengah */}
          <div className="couple-divider">
            <div className="v-line" />
            <span className="couple-amp">&amp;</span>
            <div className="v-line" />
          </div>

          {/* Bride */}
          <div className="person">
            <div className="person-photo" style={{ padding: 0, overflow: 'hidden', width: '100%', maxWidth: '260px', height: '380px', borderRadius: '130px 130px 12px 12px', border: '4px solid var(--gold)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', margin: '0 auto 1.5rem', background: 'none' }}>
              <img src="/images/mempelai/Hikmah.jpeg" alt="Hikmah" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
            </div>
            <p className="person-role">Mempelai Wanita</p>
            <p className="person-name">Hikmah</p>
            <p className="person-full">Nur Hikmah</p>
            <p className="person-parents">Putri Ketujuh dari Bapak Jumaleng dg. Solo & Ibu Kartia Mahaseng</p>
            <a href="https://www.instagram.com/_____nrrhkmaa?igsh=MXg3MHc2enRiMjl5MQ==" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none', marginTop: '0.5rem', display: 'inline-block', fontSize: '0.9rem' }}>✦ Instagram</a>
          </div>
        </div>
      </section>

      {/* ── COUNTDOWN & AYAT SUCI (digabung) ── */}
      <section id="countdown">
        <CouplePhotoOverlay />
        <div className="countdown-ayat-content">
          <div className="center reveal">
            <span className="section-label" style={{ color: 'var(--gold-light)' }}>Menghitung Hari</span>
            <h2 className="section-title" style={{ color: 'var(--cream)' }}>Hari Bahagia Tiba Dalam</h2>
            <div className="gold-rule" />
          </div>

          <div className="timer-grid reveal delay-1">
            <div className="timer-box">
              <span className="timer-num">{countdown.d}</span>
              <p className="timer-label">Hari</p>
            </div>
            <span className="timer-sep">:</span>
            <div className="timer-box">
              <span className="timer-num">{countdown.h}</span>
              <p className="timer-label">Jam</p>
            </div>
            <span className="timer-sep">:</span>
            <div className="timer-box">
              <span className="timer-num">{countdown.m}</span>
              <p className="timer-label">Menit</p>
            </div>
            <span className="timer-sep">:</span>
            <div className="timer-box">
              <span className="timer-num">{countdown.s}</span>
              <p className="timer-label">Detik</p>
            </div>
          </div>

          <div className="ayat-suci reveal delay-2">
            <p className="arabic-text">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
            <div className="gold-rule" />
            <p className="opening-verse">
              &ldquo;Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.&rdquo;
            </p>
            <p style={{ marginTop: '1rem', fontSize: '.7rem', letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--gold)', opacity: .8 }}>
              — QS. Ar-Rum: 21
            </p>
          </div>
        </div>
      </section>

      {/* ── EVENTS (dengan tombol Lihat Lokasi di tiap card) ── */}
      <section id="events">
        <div className="center reveal">
          <h2 className="section-title" style={{ color: 'var(--cream)' }}>Wedding Event</h2>
          <div className="gold-rule" style={{ background: 'var(--gold)' }} />
        </div>

        <div className="events-grid reveal delay-1">
          {/* Akad Nikah */}
          <div className="event-card">
            <div className="event-icon">🕌</div>
            <p className="event-type">Prosesi Pertama</p>
            <h3 className="event-name">Akad Nikah</h3>
            <div className="event-detail">
              <strong>Rabu, 8 Juli 2026</strong>
              09.00 WITA — selesai<br /><br />
              <strong>Kediaman Mempelai Wanita</strong>
              Jl. Coppo Tompong No.63,<br />Kel. Tumampua, Kec. Pangkajene, Kab. Pangkep
            </div>
            <a
              className="event-map-btn"
              href="https://maps.app.goo.gl/NNNYf5AHnRBdHnCa9"
              target="_blank"
              rel="noopener noreferrer"
            >
              📍 Lihat Lokasi
            </a>
          </div>

          {/* Resepsi */}
          <div className="event-card">
            <div className="event-icon">🌹</div>
            <p className="event-type">Prosesi Kedua</p>
            <h3 className="event-name">Resepsi</h3>
            <div className="event-detail">
              <strong>Rabu, 8 Juli 2026</strong>
              12.00 WITA — selesai (Pesta Siang Malam)<br /><br />
              <strong>Kediaman Mempelai Wanita</strong>
              Jl. Coppo Tompong No.63,<br />Kel. Tumampua, Kec. Pangkajene, Kab. Pangkep
            </div>
            <a
              className="event-map-btn"
              href="https://maps.app.goo.gl/NNNYf5AHnRBdHnCa9"
              target="_blank"
              rel="noopener noreferrer"
            >
              📍 Lihat Lokasi
            </a>
          </div>
        </div>
      </section>

      {/* ── LOVE STORY ── */}
      <section id="lovestory">
        <div className="center reveal">
          <span className="section-label">Perjalanan Cinta</span>
          <h2 className="section-title">Love Story</h2>
          <div className="gold-rule" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid var(--gold)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: '#2c2c2c', marginBottom: '0.5rem', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 600 }}>Awal Bertemu</h3>
            <span style={{ fontSize: '0.9rem', color: 'var(--gold)', fontWeight: 'bold' }}>2018</span>
            <p style={{ marginTop: '0.5rem', color: '#555', lineHeight: '1.6', fontSize: '0.95rem' }}>Kami pertama kali bertemu di bangku kuliah. Awalnya hanya sebatas teman biasa yang sering mengerjakan tugas bersama.</p>
          </div>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid var(--gold)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: '#2c2c2c', marginBottom: '0.5rem', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 600 }}>Menjalin Kasih</h3>
            <span style={{ fontSize: '0.9rem', color: 'var(--gold)', fontWeight: 'bold' }}>2021</span>
            <p style={{ marginTop: '0.5rem', color: '#555', lineHeight: '1.6', fontSize: '0.95rem' }}>Setelah lulus, takdir mempertemukan kami kembali di satu tempat kerja. Kebersamaan menumbuhkan benih cinta di antara kami.</p>
          </div>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid var(--gold)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: '#2c2c2c', marginBottom: '0.5rem', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 600 }}>Melangkah Bersama</h3>
            <span style={{ fontSize: '0.9rem', color: 'var(--gold)', fontWeight: 'bold' }}>2025</span>
            <p style={{ marginTop: '0.5rem', color: '#555', lineHeight: '1.6', fontSize: '0.95rem' }}>Dengan restu kedua orang tua, kami memutuskan untuk mengikat janji suci pernikahan.</p>
          </div>
        </div>
      </section>

      {/* ── UNTAIAN DOA (heading + paragraf + frame foto pengantin) ── */}
      <section id="lovenote">
        <div className="center reveal">
          <span className="section-label">Sebuah Doa</span>
          <h2 className="section-title">Menuju Satu Nama, Satu Tujuan</h2>
          <div className="gold-rule" />
        </div>

        <p className="lovenote-text reveal delay-1">
          Setiap kisah punya jalannya masing-masing, dan kami percaya jalan ini telah dituntun oleh-Nya. Dari pertemuan sederhana hingga langkah besar yang akan kami ambil, terima kasih telah menjadi bagian dari perjalanan cinta kami. Doa dan restu Bapak/Ibu/Saudara/i akan menjadi bekal terindah menuju babak baru kehidupan kami.
        </p>

        <div className="lovenote-frame reveal delay-2">
          <div className="lovenote-photo">
            <img src="/images/mempelai/Ilyas.jpeg" alt="Ilyas" style={{ objectPosition: 'center 40%' }} />
          </div>
          <div className="lovenote-photo">
            <img src="/images/mempelai/Hikmah.jpeg" alt="Hikmah" />
          </div>
        </div>
      </section>

      {/* ── WEDDING GALLERY ── */}
      <section id="gallery">
        <div className="center reveal">
          <span className="section-label">Momen Indah</span>
          <h2 className="section-title">Wedding Gallery</h2>
          <div className="gold-rule" />
        </div>

        <div className="reveal delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '2rem' }}>
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <div key={num} style={{ width: '100%', aspectRatio: '1', backgroundColor: '#222', borderRadius: '8px', overflow: 'hidden' }}>
              <img src={`/images/gallery/gallery-${num}.jpeg`} alt={`Gallery ${num}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── RSVP ── */}
      <section id="rsvp">

        <div className="reveal">
          <span className="section-label">Konfirmasi Kehadiran</span>
          <h2 className="section-title">RSVP</h2>
          <div className="gold-rule" style={{ background: 'var(--gold)' }} />
          {!rsvpSubmitted && <p className="rsvp-sub">Mohon konfirmasi kehadiran Anda paling lambat 1 Juli 2026</p>}
        </div>

        {/* ── Dashboard kehadiran ── */}
        <div className="rsvp-dashboard reveal delay-1" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
          <div className="rsvp-dashboard-grid">
            <div className="rsvp-stat">
              <span className="rsvp-stat-num">{rsvpCounts.hadir}</span>
              <span className="rsvp-stat-label">Hadir</span>
            </div>
            <div className="rsvp-stat">
              <span className="rsvp-stat-num">{rsvpCounts.tidak}</span>
              <span className="rsvp-stat-label">Tidak hadir</span>
            </div>
            <div className="rsvp-stat">
              <span className="rsvp-stat-num">{rsvpCounts.ragu}</span>
              <span className="rsvp-stat-label">Masih ragu</span>
            </div>
          </div>
          {rsvpCounts.total > 0 && (
            <p className="rsvp-dashboard-total">{rsvpCounts.total} tamu telah mengonfirmasi</p>
          )}
        </div>

        {rsvpSubmitted ? (
          <div className="rsvp-success reveal">
            <p className="rsvp-success-icon">🌿</p>
            <p className="rsvp-success-title">Terima Kasih</p>
            <p className="rsvp-success-msg">{rsvpMsg}</p>
          </div>
        ) : (
          <div className="reveal">
            <div className="rsvp-form">
              <input
                className="rsvp-input"
                type="text"
                placeholder="Nama lengkap Anda"
                value={rsvpName}
                onChange={e => setRsvpName(e.target.value)}
              />

              <textarea
                className="rsvp-input"
                rows={3}
                placeholder="Ucapan & doa untuk mempelai (opsional)"
                style={{ resize: 'vertical', marginTop: '1rem' }}
                value={rsvpNote}
                onChange={e => setRsvpNote(e.target.value)}
              />

              <select
                className="rsvp-input"
                value={rsvpStatus || ''}
                onChange={e => setRsvpStatus(e.target.value as AttendanceStatus)}
                style={{ marginTop: '1rem', appearance: 'none' }}
              >
                <option value="" disabled>-- Pilih Status Kehadiran --</option>
                <option value="hadir">✓ Hadir</option>
                <option value="tidak">✗ Tidak Hadir</option>
                <option value="ragu">? Ragu-ragu</option>
              </select>

              <button className="rsvp-btn" onClick={submitRsvp} disabled={!rsvpName.trim() || !rsvpStatus} style={{ marginTop: '1rem' }}>Kirim Konfirmasi</button>
            </div>
          </div>
        )}

        {/* ── Kotak Daftar Ucapan & Kehadiran ── */}
        <div className="rsvp-messages" style={{ marginTop: '3rem', textAlign: 'left', borderTop: '1px solid rgba(201,168,76,0.2)', paddingTop: '2rem' }}>
          <h3 style={{ color: 'var(--cream)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.3rem' }}>Ucapan & Doa</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
            {rsvpList.map((item, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--cream)', fontSize: '1.05rem' }}>{item.name}</strong>
                  <span title={item.status === 'hadir' ? 'Hadir' : item.status === 'tidak' ? 'Tidak Hadir' : 'Ragu-ragu'} style={{ fontSize: '1.2rem' }}>
                    {item.status === 'hadir' ? '✅' : item.status === 'tidak' ? '❌' : '❓'}
                  </span>
                </div>
                {item.note && <p style={{ fontSize: '0.95rem', color: '#ccc', fontStyle: 'italic', margin: 0, lineHeight: '1.5' }}>"{item.note}"</p>}
                <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '0.75rem' }}>
                  {new Date(item.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
            ))}
            {rsvpList.length === 0 && (
              <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic' }}>Belum ada ucapan. Jadilah yang pertama!</p>
            )}
          </div>
        </div>
      </section>

      {/* ── AMPLOP DIGITAL ── */}
      <section id="amplop">
        <div className="center reveal">
          <span className="section-label" style={{ color: 'var(--gold)' }}>Hadiah &amp; Ucapan</span>
          <h2 className="section-title" style={{ color: 'var(--cream)' }}>Amplop Digital</h2>
          <div className="gold-rule" style={{ background: 'var(--gold)' }} />
          <p className="amplop-sub">
            Bagi yang ingin memberikan hadiah, kami menerima dengan tulus melalui transfer rekening berikut:
          </p>
        </div>

        <div className="amplop-grid">
          {/* SeaBank */}
          <div className="amplop-card reveal delay-1">
            <div className="amplop-bank-logo" style={{ marginBottom: '1rem' }}>
              <img src="/images/logo/seabank.png" alt="SeaBank" style={{ height: '75px', width: 'auto', display: 'block', margin: '0 auto', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }} />
            </div>
            <div className="amplop-divider" />
            <p className="amplop-norek">9016 5015 8763</p>
            <p className="amplop-owner">a/n Nur Hikmah</p>
            <button
              className="amplop-copy-btn"
              onClick={() => {
                navigator.clipboard.writeText('901650158763');
                alert('Nomor rekening disalin! ✓');
              }}
            >
              Copy
            </button>
          </div>

          {/* BRI */}
          <div className="amplop-card reveal delay-2">
            <div className="amplop-bank-logo" style={{ marginBottom: '1rem' }}>
              <img src="/images/logo/bri.png" alt="BRI" style={{ height: '75px', width: 'auto', display: 'block', margin: '0 auto', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }} />
            </div>
            <div className="amplop-divider" />
            <p className="amplop-norek">5009 0103 9697 538</p>
            <p className="amplop-owner">a/n Muhammad Ilyas</p>
            <button
              className="amplop-copy-btn"
              onClick={() => {
                navigator.clipboard.writeText('500901039697538');
                alert('Nomor rekening disalin! ✓');
              }}
            >
              Copy
            </button>
          </div>
        </div>

        <div className="reveal delay-3" style={{ marginTop: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.3)' }}>
          <p style={{ color: 'var(--gold)', fontWeight: 'bold', marginBottom: '0.5rem' }}>Alamat Pengiriman Kado</p>
          <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5' }}>
            Jl. Coppo Tompong No.63 Kel. Tumampua,<br />
            Kec. Pangkajene, Kab. Pangkep
          </p>
        </div>

        <p className="amplop-note reveal delay-3">
          ❤️ Kehadiran dan doa restu Anda adalah hadiah terbesar bagi kami
        </p>
      </section>

      {/* ── THANK YOU ── */}
      <footer id="thankyou">
        <CouplePhotoOverlay />
        <div className="footer-content">
          <div className="footer-hearts">♥ ♥ ♥</div>
          <p className="footer-thanks">Thank You</p>
          <p className="footer-script">Ilyas &amp; Hikmah</p>
          <p className="footer-sub" style={{ marginTop: '1rem' }}>08 · 07 · 2026 &nbsp;|&nbsp; Pangkep</p>
          <p className="footer-sub" style={{ marginTop: '.75rem', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif", letterSpacing: '.1em', fontSize: '.9rem', opacity: .45 }}>
            Merupakan kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir
          </p>
          <div className="footer-credit">
            <span className="footer-credit-label">Created By</span>
            <div className="footer-credit-badge">
              <img className="footer-logo" src="/images/logo/Logo Square 2.png" alt="Putri Invitation" />
            </div>
          </div>
        </div>
      </footer>

      {/* ── MUSIC PLAYER ── */}
      <div id="music-player" className={`${isPlaying ? 'playing' : ''} ${playerVisible ? 'visible' : ''} ${playerCollapsed ? 'collapsed' : ''}`}>
        <div
          className="player-art"
          style={{ backgroundImage: "url('/images/logo/formatmasadepan.png')" }}
          onClick={handlePlayerToggle}
          title="Play / Stop musik"
        />
        <div className="player-meta">
          <p className="player-title">Aku Milikmu</p>
          <p className="player-artist">Dewa 19</p>
        </div>
        <div className="player-wave">
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
        </div>
        <button className="player-btn" onClick={handlePlayerToggle} title="Play / Stop musik">
          {isPlaying ? (
            <span className="btn-icon--pause">
              <span className="pause-bar" />
              <span className="pause-bar" />
            </span>
          ) : (
            <span className="btn-icon--play" />
          )}
        </button>
      </div>
    </>
  );
}
