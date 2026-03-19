"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Vote, CheckCircle, Calendar, Clock, LogOut, ShieldCheck, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import toast, { Toaster } from 'react-hot-toast';

function useCountdown(
  targetDate: string | null,
  onComplete?: () => void
) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number; hours: number; minutes: number; seconds: number;
  } | null>(null);
  const completedRef = useRef(false);
  const cbRef = useRef(onComplete);
  cbRef.current = onComplete;

  useEffect(() => {
    if (!targetDate) { setTimeLeft(null); return; }
    completedRef.current = false;
    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (!completedRef.current) {
          completedRef.current = true;
          cbRef.current?.();
        }
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

function CountdownDisplay({
  countdown,
  label,
  pad,
}: {
  countdown: { days: number; hours: number; minutes: number; seconds: number };
  label: string;
  pad: (n: number) => string;
}) {
  return (
    <div className="inline-flex items-center gap-3 bg-white/10 px-5 py-3 rounded-xl mb-6">
      <Clock size={16} className="text-green-200" />
      <span className="text-xs text-green-200 mr-1">{label}</span>
      {[
        { l: 'D', v: countdown.days },
        { l: 'H', v: countdown.hours },
        { l: 'M', v: countdown.minutes },
        { l: 'S', v: countdown.seconds },
      ].map(({ l, v }) => (
        <div key={l} className="bg-white/15 rounded-lg px-2.5 py-1.5 text-center min-w-11">
          <p className="text-base font-bold font-mono leading-none">{pad(v)}</p>
          <p className="text-xs text-green-200 mt-0.5">{l}</p>
        </div>
      ))}
    </div>
  );
}

function ElectionHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token');

  const [voterData, setVoterData] = useState<any>(null);
  const [publicElection, setPublicElection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refreshVoterData = async (voterToken: string) => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/elections/voter-status?token=${voterToken}`);
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('voterData', JSON.stringify(data.data));
        setVoterData(data.data);
      }
    } catch {}
    setRefreshing(false);
  };

  useEffect(() => {
    const storedToken = urlToken || localStorage.getItem('voterToken');
    const storedData = localStorage.getItem('voterData');

    if (storedToken && storedData) {
      try {
        setVoterData(JSON.parse(storedData));
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem('voterData');
      }
    }

    // Not logged in — fetch public election for landing page
    fetch('/api/elections/public')
      .then(r => r.json())
      .then(d => { if (d.success) setPublicElection(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [urlToken]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();

  // ── Voter dashboard state (computed from dates, not cached status) ──
  const election = voterData?.election ?? null;
  const vStart = election ? new Date(election.startDate) : null;
  const vEnd = election ? new Date(election.endDate) : null;
  const vIsActive = election ? (now >= vStart! && now <= vEnd!) : false;
  const vHasEnded = election ? (election.status === 'ended' || now > vEnd!) : false;
  const vIsUpcoming = election ? (!vIsActive && !vHasEnded) : false;
  const voterCountdownTarget = election
    ? vIsUpcoming ? election.startDate
    : vIsActive ? election.endDate
    : null
    : null;

  // ── Public landing state ──
  const pStart = publicElection ? new Date(publicElection.startDate) : null;
  const pEnd = publicElection ? new Date(publicElection.endDate) : null;
  const pIsActive = publicElection ? (now >= pStart! && now <= pEnd!) : false;
  const pHasEnded = publicElection ? (publicElection.status === 'ended' || now > pEnd!) : false;
  const pIsUpcoming = publicElection ? (!pIsActive && !pHasEnded) : false;
  const publicCountdownTarget = !voterData && publicElection
    ? pIsUpcoming ? publicElection.startDate
    : pIsActive ? publicElection.endDate
    : null
    : null;

  // ── Countdown hooks (always called) ──
  const voterCountdown = useCountdown(
    voterData ? voterCountdownTarget : null,
    () => {
      const storedToken = urlToken || localStorage.getItem('voterToken');
      if (storedToken) refreshVoterData(storedToken);
    }
  );

  const publicCountdown = useCountdown(
    !voterData ? publicCountdownTarget : null,
    () => {
      // When upcoming countdown ends, redirect to login automatically
      if (pIsUpcoming) router.push('/election/login');
    }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading election portal…</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  //  PUBLIC LANDING — voter not logged in
  // ══════════════════════════════════════════════
  if (!voterData) {
    return (
      <>
        <Toaster position="top-center" toastOptions={{ style: { fontSize: '14px' } }} />
        <div className="min-h-screen bg-gray-50">
          {/* Navbar */}
          <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Image src="/images/logo.png" alt="Pawavotes" width={36} height={36} />
                <span className="font-semibold text-green-700 text-sm hidden sm:block">Pawavotes</span>
              </div>
              {pIsActive && (
                <button
                  onClick={() => router.push('/election/login')}
                  className="inline-flex items-center gap-1.5 text-sm text-white bg-green-700 hover:bg-green-800 px-4 py-2 rounded-lg transition font-medium"
                >
                  Login to Vote
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </header>

          {/* Hero */}
          <div className="bg-green-700 text-white">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
              {publicElection ? (
                <>
                  {/* Status pill */}
                  <div className="mb-5 flex justify-center">
                    {pIsActive ? (
                      <span className="inline-flex items-center gap-2 bg-white/15 px-4 py-1.5 rounded-full text-sm font-medium">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        Voting is Live
                      </span>
                    ) : pIsUpcoming ? (
                      <span className="inline-flex items-center gap-2 bg-white/15 px-4 py-1.5 rounded-full text-sm font-medium">
                        <Clock size={15} /> Voting Starts Soon
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 bg-white/15 px-4 py-1.5 rounded-full text-sm font-medium">
                        Voting Closed
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 leading-tight">
                    {publicElection.title}
                  </h1>

                  {publicElection.description && (
                    <p className="text-green-200 text-sm sm:text-base max-w-xl mx-auto mb-6">
                      {publicElection.description}
                    </p>
                  )}

                  {/* Countdown */}
                  {publicCountdown && !pHasEnded && (
                    <div className="flex justify-center">
                      <CountdownDisplay
                        countdown={publicCountdown}
                        label={pIsUpcoming ? 'Voting opens in' : 'Voting closes in'}
                        pad={pad}
                      />
                    </div>
                  )}

                  {/* CTA when active */}
                  {pIsActive && (
                    <div className="flex justify-center mt-2">
                      <button
                        onClick={() => router.push('/election/login')}
                        className="inline-flex items-center gap-2.5 bg-white text-green-700 px-7 py-3 rounded-xl font-bold text-sm hover:bg-green-50 transition shadow-lg"
                      >
                        <Vote size={18} />
                        Login to Cast Your Vote
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}

                  {pIsUpcoming && (
                    <p className="text-green-200 text-sm mt-1">
                      The voting portal will open automatically when the countdown reaches zero.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-3">Welcome to Pawavotes</h1>
                  <p className="text-green-200 text-sm">No active election at this time.</p>
                </>
              )}
            </div>
          </div>

          {/* Info cards */}
          {publicElection && (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                      <Calendar className="text-green-700" size={18} />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm">Voting Period</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Opens</p>
                      <p className="text-sm font-medium text-gray-800">{new Date(publicElection.startDate).toLocaleString()}</p>
                    </div>
                    <div className="border-t border-gray-50 pt-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Closes</p>
                      <p className="text-sm font-medium text-gray-800">{new Date(publicElection.endDate).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                      <ShieldCheck className="text-green-700" size={18} />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm">How to Vote</h3>
                  </div>
                  <ul className="space-y-2">
                    {[
                      'Wait for voting to open',
                      'Login with your voter token & password',
                      'Select your preferred candidates',
                      'Confirm and submit your vote securely',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 bg-green-700 rounded-full mt-1.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <footer className="border-t border-gray-100 py-5 text-center">
            <p className="text-xs text-gray-400">
              Powered by <span className="font-medium text-green-700">Pawavotes</span> · Secure, transparent elections
            </p>
          </footer>
        </div>
      </>
    );
  }

  // ══════════════════════════════════════════════
  //  VOTER DASHBOARD — logged in
  // ══════════════════════════════════════════════
  const handleVoteNow = () => {
    if (voterData?.hasVoted) { toast.error('You have already voted!'); return; }
    if (vIsUpcoming) { toast.error('Voting has not started yet'); return; }
    if (vHasEnded) { toast.error('Voting has ended'); return; }
    router.push(`/election/vote?token=${urlToken || localStorage.getItem('voterToken')}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('voterToken');
    localStorage.removeItem('voterData');
    localStorage.removeItem('voterTokenTimestamp');
    router.push('/election');
  };

  return (
    <>
      <Toaster position="top-center" toastOptions={{ style: { fontSize: '14px' } }} />
      <div className="min-h-screen bg-gray-50">
        {/* Navbar */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Image src="/images/logo.png" alt="Pawavotes" width={36} height={36} />
              <span className="font-semibold text-green-700 text-sm hidden sm:block">Pawavotes</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-green-700">
                    {voterData.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{voterData.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition"
              >
                <LogOut size={15} />
                <span className="hidden sm:block">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Hero */}
        <div className="bg-green-700 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
            {/* Status pill */}
            <div className="mb-5 flex justify-center">
              {voterData.hasVoted ? (
                <span className="inline-flex items-center gap-2 bg-white/15 px-4 py-1.5 rounded-full text-sm font-medium">
                  <CheckCircle size={15} /> You have voted
                </span>
              ) : vIsActive ? (
                <span className="inline-flex items-center gap-2 bg-white/15 px-4 py-1.5 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Voting is Live
                </span>
              ) : vIsUpcoming ? (
                <span className="inline-flex items-center gap-2 bg-white/15 px-4 py-1.5 rounded-full text-sm font-medium">
                  <Clock size={15} /> Voting Starts Soon
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 bg-white/15 px-4 py-1.5 rounded-full text-sm font-medium">
                  Voting Closed
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 leading-tight">
              {election.title}
            </h1>

            {election.description && (
              <p className="text-green-200 text-sm sm:text-base max-w-xl mx-auto mb-6">
                {election.description}
              </p>
            )}

            {/* Countdown */}
            {voterCountdown && !vHasEnded && !voterData.hasVoted && (
              <div className="flex justify-center">
                <CountdownDisplay
                  countdown={voterCountdown}
                  label={vIsUpcoming ? 'Voting opens in' : 'Voting closes in'}
                  pad={pad}
                />
              </div>
            )}

            {/* Refreshing indicator */}
            {refreshing && (
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-2 text-green-200 text-sm">
                  <div className="w-4 h-4 border-2 border-green-200/30 border-t-green-200 rounded-full animate-spin" />
                  Checking election status…
                </div>
              </div>
            )}

            {/* Vote CTA — shown when active and not voted */}
            {vIsActive && !voterData.hasVoted && (
              <div className="flex justify-center">
                <button
                  onClick={handleVoteNow}
                  className="inline-flex items-center gap-2.5 bg-white text-green-700 px-7 py-3 rounded-xl font-bold text-sm hover:bg-green-50 transition shadow-lg"
                >
                  <Vote size={18} />
                  Cast Your Vote
                  <ArrowRight size={16} />
                </button>
              </div>
            )}

            {voterData.hasVoted && (
              <p className="text-green-200 text-sm mt-2">
                Thank you for participating. Your vote has been recorded.
              </p>
            )}
          </div>
        </div>

        {/* Info cards */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Voting Period */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                  <Calendar className="text-green-700" size={18} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Voting Period</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Opens</p>
                  <p className="text-sm font-medium text-gray-800">{new Date(election.startDate).toLocaleString()}</p>
                </div>
                <div className="border-t border-gray-50 pt-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Closes</p>
                  <p className="text-sm font-medium text-gray-800">{new Date(election.endDate).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Voter status */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="text-green-700" size={18} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Your Status</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Voter Token</p>
                  <p className="font-mono text-sm font-semibold text-gray-800 bg-gray-50 px-2 py-1 rounded-md inline-block">
                    {voterData.token}
                  </p>
                </div>
                <div className="border-t border-gray-50 pt-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Vote Status</p>
                  <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${voterData.hasVoted ? 'text-green-700' : 'text-amber-600'}`}>
                    {voterData.hasVoted
                      ? <><CheckCircle size={14} /> Voted</>
                      : <><Clock size={14} /> Not yet voted</>}
                  </div>
                </div>
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                  <Vote className="text-green-700" size={18} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Guidelines</h3>
              </div>
              <ul className="space-y-2">
                {[
                  'You can only vote once',
                  'Your vote is confidential',
                  'Vote only during the active period',
                  'Credentials expire after the election',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 bg-green-700 rounded-full mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* How to vote — only when active and not voted */}
          {!voterData.hasVoted && vIsActive && (
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-5 text-sm">How to cast your vote</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { step: 1, title: 'Click "Cast Your Vote"', desc: 'Access the voting page above' },
                  { step: 2, title: 'Review candidates', desc: 'Browse all positions and candidates' },
                  { step: 3, title: 'Make your selections', desc: 'Choose one candidate per position' },
                  { step: 4, title: 'Submit your vote', desc: 'Confirm and submit your choices' },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex flex-col items-start gap-2">
                    <div className="w-8 h-8 bg-green-700 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                      {step}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-5 border-t border-gray-50 flex justify-center">
                <button
                  onClick={handleVoteNow}
                  className="inline-flex items-center gap-2 bg-green-700 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-green-800 transition"
                >
                  <Vote size={16} />
                  Cast Your Vote Now
                </button>
              </div>
            </div>
          )}

          {/* Voted confirmation */}
          {voterData.hasVoted && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-green-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="text-white" size={24} />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Vote Submitted Successfully</h3>
              <p className="text-sm text-gray-500">Your vote has been securely recorded. Thank you for participating.</p>
            </div>
          )}

          {/* Election ended */}
          {vHasEnded && !voterData.hasVoted && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="text-gray-500" size={24} />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Voting Period Has Ended</h3>
              <p className="text-sm text-gray-500">This election has closed. You are no longer able to cast a vote.</p>
            </div>
          )}
        </div>

        <footer className="border-t border-gray-100 py-5 text-center">
          <p className="text-xs text-gray-400">
            Powered by <span className="font-medium text-green-700">Pawavotes</span> · Secure, transparent elections
          </p>
        </footer>
      </div>
    </>
  );
}

export default function ElectionHomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
      </div>
    }>
      <ElectionHomeContent />
    </Suspense>
  );
}
