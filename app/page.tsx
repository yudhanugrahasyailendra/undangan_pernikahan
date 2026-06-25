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

// ── Countdown Hook ─────────────────────────────────────────────────────────
function useCountdown(targetTs: number) {
  const [time, setTime] = useState({ d: '00', h: '00', m: '00', s: '00' });

  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const tick = () => {
      let diff = targetTs - Date.now();
      if (diff <= 0) { setTime({ d: '00', h: '00', m: '00', s: '00' }); return; }
      const d = Math.floor(diff / 86400000); diff %= 86400000;
      const h = Math.floor(diff / 3600000);  diff %= 3600000;
      const mn = Math.floor(diff / 60000);   diff %= 60000;
      const s = Math.floor(diff / 1000);
      setTime({ d: pad(d), h: pad(h), m: pad(mn), s: pad(s) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetTs]);

  return time;
}

// ── Web Audio Music Player Hook ────────────────────────────────────────────
function useMusicPlayer() {
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const masterGainRef  = useRef<GainNode | null>(null);
  const reverbNodeRef  = useRef<ConvolverNode | null>(null);
  const activeNodesRef = useRef<AudioNode[]>([]);
  const chordTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chordIndexRef  = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const chordSets = [
    [220.00, 261.63, 329.63, 440.00],
    [174.61, 220.00, 261.63, 349.23],
    [261.63, 329.63, 392.00, 523.25],
    [196.00, 246.94, 293.66, 392.00],
  ];

  const setupReverb = (ctx: AudioContext, master: GainNode) => {
    const convolver = ctx.createConvolver();
    const rate = ctx.sampleRate;
    const length = rate * 2.5;
    const impulse = ctx.createBuffer(2, length, rate);
    for (let c = 0; c < 2; c++) {
      const ch = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    convolver.buffer = impulse;
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.35;
    convolver.connect(reverbGain);
    reverbGain.connect(master);
    reverbNodeRef.current = convolver;
  };

  const createAudioCtx = () => {
    if (audioCtxRef.current) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.connect(ctx.destination);
    audioCtxRef.current = ctx;
    masterGainRef.current = master;
    setupReverb(ctx, master);
  };

  const playChord = useCallback((freqs: number[]) => {
    const ctx    = audioCtxRef.current!;
    const master = masterGainRef.current!;
    const reverb = reverbNodeRef.current;
    const now    = ctx.currentTime;
    const dur    = 3.2;

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      const lfo    = ctx.createOscillator();
      const lfoG   = ctx.createGain();
      lfo.frequency.value = 4.5 + i * 0.3;
      lfoG.gain.value     = freq * 0.003;
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      lfo.start(now);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.07 / (i + 1), now + 0.8);
      g.gain.setValueAtTime(0.07 / (i + 1), now + dur - 0.8);
      g.gain.linearRampToValueAtTime(0, now + dur);
      osc.connect(g);
      g.connect(master);
      if (reverb) g.connect(reverb);
      osc.start(now);
      osc.stop(now + dur);
      activeNodesRef.current.push(osc, lfo, g);
    });

    const bass  = ctx.createOscillator();
    const bassG = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.value = freqs[0] / 2;
    bassG.gain.setValueAtTime(0, now);
    bassG.gain.linearRampToValueAtTime(0.09, now + 1.2);
    bassG.gain.setValueAtTime(0.09, now + dur - 1);
    bassG.gain.linearRampToValueAtTime(0, now + dur);
    bass.connect(bassG);
    bassG.connect(master);
    bass.start(now);
    bass.stop(now + dur);
    activeNodesRef.current.push(bass, bassG);
  }, []);

  const scheduleNextChord = useCallback(() => {
    chordIndexRef.current = (chordIndexRef.current + 1) % chordSets.length;
    playChord(chordSets[chordIndexRef.current]);
    chordTimerRef.current = setTimeout(scheduleNextChord, 3000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playChord]);

  const startMusic = useCallback((vol = 60) => {
    createAudioCtx();
    const ctx    = audioCtxRef.current!;
    const master = masterGainRef.current!;
    if (ctx.state === 'suspended') ctx.resume();
    const v = vol / 100;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(v, ctx.currentTime + 1);
    playChord(chordSets[chordIndexRef.current]);
    chordTimerRef.current = setTimeout(scheduleNextChord, 2800);
    setIsPlaying(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playChord, scheduleNextChord]);

  const stopMusic = useCallback(() => {
    const ctx    = audioCtxRef.current;
    const master = masterGainRef.current;
    if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    }
    setTimeout(() => {
      activeNodesRef.current.forEach(n => {
        try { (n as any).stop?.(); n.disconnect?.(); } catch (_) {}
      });
      activeNodesRef.current = [];
    }, 1600);
    setIsPlaying(false);
  }, []);

  const toggleMusic = useCallback((vol = 60) => {
    if (isPlaying) stopMusic();
    else startMusic(vol);
  }, [isPlaying, startMusic, stopMusic]);

  const applyVolume = useCallback((val: number) => {
    const ctx    = audioCtxRef.current;
    const master = masterGainRef.current;
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(val / 100, ctx.currentTime);
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
  const [cornersBloom, setCornersBloom] = useState(false);
  const [playerVisible, setPlayerVisible] = useState(false);

  // RSVP state
  const [rsvpSubmitted, setRsvpSubmitted]   = useState(false);
  const [rsvpMsg, setRsvpMsg]               = useState('');
  const [rsvpName, setRsvpName]             = useState('');
  const [rsvpStatus, setRsvpStatus]         = useState<AttendanceStatus | null>(null);
  const [rsvpNote, setRsvpNote]             = useState('');
  const [rsvpList, setRsvpList]             = useState<RsvpEntry[]>([]);

  // volume / player UI state
  const [volume, setVolume]   = useState(60);
  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef         = useRef(60);
  const volIconText = isMuted || volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊';

  const { isPlaying, startMusic, toggleMusic, applyVolume } = useMusicPlayer();
  const countdown = useCountdown(new Date('2025-09-20T08:00:00+08:00').getTime());

  // load RSVP list from localStorage on mount
  useEffect(() => { setRsvpList(loadRsvpList()); }, []);

  // ── Open invitation (triggered by button click) ──
  const openInvitation = () => {
    setEnvelopeOpen(true);
    setTimeout(() => setCornersBloom(true), 300);
    // autoplay music after a brief delay (user gesture already happened via button)
    setTimeout(() => {
      setPlayerVisible(true);
      startMusic(volume);
    }, 900);
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
    if (!rsvpStatus)      { alert('Mohon pilih status kehadiran Anda.');   return; }
    const msg =
      rsvpStatus === 'hadir'  ? `Terima kasih, ${rsvpName}! Kami sangat menantikan kehadiran Anda. 🌹` :
      rsvpStatus === 'tidak'  ? `Terima kasih atas konfirmasinya, ${rsvpName}. Doa Anda sangat berarti bagi kami. 🙏` :
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
    ragu:  rsvpList.filter(r => r.status === 'ragu').length,
    total: rsvpList.length,
  };

  return (
    <>
      {/* ── ENVELOPE / COVER SCREEN ── */}
      <div id="envelope-screen" className={envelopeOpen ? 'hidden' : ''}>
        <p className="envelope-label">Anda mendapat undangan dari</p>
        <div className="envelope-names">
          Rizky<br />& Aulia
        </div>
        <div className="envelope-divider" />
        <p className="envelope-music-note">♫</p>
        {/* Tombol Buka Undangan */}
        <button className="envelope-open-btn" onClick={openInvitation}>
          Buka Undangan ✦
        </button>
      </div>

      {/* ── HERO ── */}
      <section id="hero">
        <BotanicalCorner className={`corner-tl${cornersBloom ? ' bloomed' : ''}`} />
        <BotanicalCorner className={`corner-tr${cornersBloom ? ' bloomed' : ''}`} />
        <BotanicalCorner className={`corner-bl${cornersBloom ? ' bloomed' : ''}`} />
        <BotanicalCorner className={`corner-br${cornersBloom ? ' bloomed' : ''}`} />

        <div className="hero-inner">
          <p className="hero-eyebrow">— Undangan Pernikahan —</p>
          <div className="hero-script">Rizky</div>
          <span className="hero-amp">&amp;</span>
          <div className="hero-script">Aulia</div>
          <div className="hero-divider" />
          <p className="hero-date">Sabtu, 20 September 2025</p>
          <p className="hero-location" style={{ marginTop: '.6rem' }}>Makassar, Sulawesi Selatan</p>
        </div>

        <div className="scroll-hint">
          <div className="scroll-line" />
          <span>Gulir ke bawah</span>
        </div>
      </section>

      {/* ── OPENING / BISMILLAH ── */}
      <section id="opening">
        <p className="arabic-text">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        <div className="gold-rule" />
        <p className="opening-verse">
          &ldquo;Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.&rdquo;
        </p>
        <p style={{ marginTop: '1rem', fontSize: '.7rem', letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--gold)', opacity: .6 }}>
          — QS. Ar-Rum: 21
        </p>
      </section>

      {/* ── COUPLE ── */}
      <section id="couple">
        <div className="center">
          <span className="section-label">Yang Berbahagia</span>
          <h2 className="section-title">Mempelai</h2>
          <div className="gold-rule" />
        </div>

        <div className="couple-grid">
          {/* Groom */}
          <div className="person">
            <div className="person-photo">🤵</div>
            <p className="person-role">Mempelai Pria</p>
            <p className="person-name">Rizky</p>
            <p className="person-full">Muhammad Rizky Pratama, S.T.</p>
            <p className="person-parents">Putra pertama dari<br />Bpk. H. Ahmad Fauzi &amp; Ibu Hj. Siti Rahayu</p>
          </div>

          {/* Divider — "&" tengah */}
          <div className="couple-divider">
            <div className="v-line" />
            <span className="couple-amp">&amp;</span>
            <div className="v-line" />
          </div>

          {/* Bride */}
          <div className="person">
            <div className="person-photo">👰</div>
            <p className="person-role">Mempelai Wanita</p>
            <p className="person-name">Aulia</p>
            <p className="person-full">Nur Aulia Fitri, S.Pd.</p>
            <p className="person-parents">Putri kedua dari<br />Bpk. Drs. Hasan Basri &amp; Ibu Fatimah, M.Pd.</p>
          </div>
        </div>
      </section>

      {/* ── EVENTS (dengan tombol Lihat Lokasi di tiap card) ── */}
      <section id="events">
        <div className="center">
          <span className="section-label">Rangkaian Acara</span>
          <h2 className="section-title" style={{ color: 'var(--cream)' }}>Waktu &amp; Tempat</h2>
          <div className="gold-rule" style={{ background: 'var(--gold)' }} />
        </div>

        <div className="events-grid">
          {/* Akad Nikah */}
          <div className="event-card">
            <div className="event-icon">🕌</div>
            <p className="event-type">Prosesi Pertama</p>
            <h3 className="event-name">Akad Nikah</h3>
            <div className="event-detail">
              <strong>Sabtu, 20 September 2025</strong>
              08.00 WITA — selesai<br /><br />
              <strong>Masjid Raya Makassar</strong>
              Jl. Masjid Raya No.57,<br />Bontoala, Kota Makassar
            </div>
            <a
              className="event-map-btn"
              href="https://maps.google.com/?q=Masjid+Raya+Makassar"
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
              <strong>Sabtu, 20 September 2025</strong>
              11.00 – 15.00 WITA<br /><br />
              <strong>The Sultan Hotel Makassar</strong>
              Jl. Sultan Hasanuddin No.12,<br />Ujung Pandang, Makassar
            </div>
            <a
              className="event-map-btn"
              href="https://maps.google.com/?q=The+Sultan+Hotel+Makassar"
              target="_blank"
              rel="noopener noreferrer"
            >
              📍 Lihat Lokasi
            </a>
          </div>
        </div>
      </section>

      {/* ── COUNTDOWN ── */}
      <section id="countdown">
        <div className="center">
          <span className="section-label" style={{ color: 'var(--green-light)' }}>Menghitung Hari</span>
          <h2 className="section-title">Hari Bahagia Tiba Dalam</h2>
          <div className="gold-rule" />
        </div>

        <div className="timer-grid">
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
      </section>

      {/* ── QUOTE ── */}
      <section id="quote">
        <blockquote className="quote-text">
          &ldquo;Menikah bukan tentang menemukan seseorang yang sempurna, melainkan tentang belajar melihat orang yang tidak sempurna dengan cara yang sempurna.&rdquo;
        </blockquote>
        <div className="gold-rule" />
        <p className="quote-source">✦ Sebuah doa untuk Rizky &amp; Aulia ✦</p>
      </section>

      {/* ── RSVP ── */}
      <section id="rsvp">
        {/* ── Dashboard kehadiran (selalu tampil) ── */}
        {rsvpCounts.total > 0 && (
          <div className="rsvp-dashboard">
            <p className="rsvp-dashboard-title">Status Kehadiran Tamu</p>
            <div className="rsvp-dashboard-grid">
              <div className="rsvp-stat rsvp-stat--hadir">
                <span className="rsvp-stat-num">{rsvpCounts.hadir}</span>
                <span className="rsvp-stat-label">✓ Hadir</span>
              </div>
              <div className="rsvp-stat rsvp-stat--tidak">
                <span className="rsvp-stat-num">{rsvpCounts.tidak}</span>
                <span className="rsvp-stat-label">✗ Tidak Hadir</span>
              </div>
              <div className="rsvp-stat rsvp-stat--ragu">
                <span className="rsvp-stat-num">{rsvpCounts.ragu}</span>
                <span className="rsvp-stat-label">? Ragu-ragu</span>
              </div>
            </div>
            <p className="rsvp-dashboard-total">{rsvpCounts.total} tamu telah mengonfirmasi</p>
          </div>
        )}

        {rsvpSubmitted ? (
          <div className="rsvp-success">
            <p className="rsvp-success-icon">🌿</p>
            <p className="rsvp-success-title">Terima Kasih</p>
            <p className="rsvp-success-msg">{rsvpMsg}</p>
          </div>
        ) : (
          <>
            <span className="section-label">Konfirmasi Kehadiran</span>
            <h2 className="section-title">RSVP</h2>
            <div className="gold-rule" style={{ background: 'var(--gold)' }} />
            <p className="rsvp-sub">Mohon konfirmasi kehadiran Anda paling lambat 5 September 2025</p>

            <div className="rsvp-form">
              <input
                className="rsvp-input"
                type="text"
                placeholder="Nama lengkap Anda"
                value={rsvpName}
                onChange={e => setRsvpName(e.target.value)}
              />

              {/* Attendance buttons */}
              <div className="rsvp-attend-group">
                <button
                  className={`rsvp-attend-btn rsvp-attend-btn--hadir${rsvpStatus === 'hadir' ? ' active' : ''}`}
                  onClick={() => setRsvpStatus('hadir')}
                  type="button"
                >
                  ✓ Hadir
                </button>
                <button
                  className={`rsvp-attend-btn rsvp-attend-btn--tidak${rsvpStatus === 'tidak' ? ' active' : ''}`}
                  onClick={() => setRsvpStatus('tidak')}
                  type="button"
                >
                  ✗ Tidak Hadir
                </button>
                <button
                  className={`rsvp-attend-btn rsvp-attend-btn--ragu${rsvpStatus === 'ragu' ? ' active' : ''}`}
                  onClick={() => setRsvpStatus('ragu')}
                  type="button"
                >
                  ? Ragu-ragu
                </button>
              </div>

              <textarea
                className="rsvp-input"
                rows={3}
                placeholder="Ucapan & doa untuk mempelai (opsional)"
                style={{ resize: 'vertical' }}
                value={rsvpNote}
                onChange={e => setRsvpNote(e.target.value)}
              />
              <button className="rsvp-btn" onClick={submitRsvp}>Kirim Konfirmasi</button>
            </div>
          </>
        )}
      </section>

      {/* ── AMPLOP DIGITAL ── */}
      <section id="amplop">
        <div className="center">
          <span className="section-label" style={{ color: 'var(--gold)' }}>Hadiah &amp; Ucapan</span>
          <h2 className="section-title" style={{ color: 'var(--cream)' }}>Amplop Digital</h2>
          <div className="gold-rule" style={{ background: 'var(--gold)' }} />
          <p className="amplop-sub">
            Bagi yang ingin memberikan hadiah, kami menerima dengan tulus melalui transfer rekening berikut:
          </p>
        </div>

        <div className="amplop-grid">
          {/* BCA */}
          <div className="amplop-card">
            <div className="amplop-bank-logo">🏦</div>
            <p className="amplop-bank-name">Bank BCA</p>
            <div className="amplop-divider" />
            <p className="amplop-norek">1234 5678 90</p>
            <p className="amplop-owner">a/n Muhammad Rizky Pratama</p>
            <button
              className="amplop-copy-btn"
              onClick={() => {
                navigator.clipboard.writeText('1234567890');
                alert('Nomor rekening disalin! ✓');
              }}
            >
              Salin Nomor Rekening
            </button>
          </div>

          {/* GoPay / DANA */}
          <div className="amplop-card">
            <div className="amplop-bank-logo">📱</div>
            <p className="amplop-bank-name">GoPay / DANA</p>
            <div className="amplop-divider" />
            <p className="amplop-norek">0812 3456 7890</p>
            <p className="amplop-owner">a/n Nur Aulia Fitri</p>
            <button
              className="amplop-copy-btn"
              onClick={() => {
                navigator.clipboard.writeText('081234567890');
                alert('Nomor disalin! ✓');
              }}
            >
              Salin Nomor
            </button>
          </div>
        </div>

        <p className="amplop-note">
          ❤️ Kehadiran dan doa restu Anda adalah hadiah terbesar bagi kami
        </p>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="footer-hearts">♥ ♥ ♥</div>
        <p className="footer-script">Rizky &amp; Aulia</p>
        <p className="footer-sub" style={{ marginTop: '1rem' }}>20 · 09 · 2025 &nbsp;|&nbsp; Makassar</p>
        <p className="footer-sub" style={{ marginTop: '.75rem', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif", letterSpacing: '.1em', fontSize: '.9rem', opacity: .45 }}>
          Merupakan kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir
        </p>
      </footer>

      {/* ── MUSIC PLAYER (float) ── */}
      <div
        id="music-player"
        className={`${playerVisible ? 'visible' : ''} ${isPlaying ? 'playing' : ''}`}
      >
        <div className="player-meta">
          <p className="player-title">Enchanted Wedding</p>
          <p className="player-artist">Ambient · Romantis</p>
        </div>
        <div className="player-wave">
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
        </div>
        <button
          className="player-btn"
          id="play-btn"
          onClick={() => toggleMusic(volume)}
          title="Play / Stop musik"
        >
          <div className="btn-icon" />
        </button>
        <div className="player-vol">
          <span className="vol-icon" onClick={handleToggleMute} id="vol-icon">
            {volIconText}
          </span>
          <input
            className="vol-slider"
            type="range"
            id="vol-slider"
            min={0}
            max={100}
            value={volume}
            onChange={e => handleVolumeChange(Number(e.target.value))}
            title="Volume"
          />
        </div>
      </div>
    </>
  );
}
